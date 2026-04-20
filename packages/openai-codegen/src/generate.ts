/**
 * End-to-end pipeline for the v2 openai-codegen emitter.
 *
 * Loads an OpenAPI spec, plans types, runs the Layer-1 / Layer-2 / exception
 * / implementation / local-class emitters, prints each ABAP node through
 * `@abapify/abap-ast`, and hands the four artifacts to the configured format
 * writer (`abapgit` or `gcts`).
 */

import { print } from '@abapify/abap-ast';
import { loadSpec } from './oas/index';
import type { NormalizedSpec } from './oas/types';
import { planTypes } from './types/plan';
import {
  resolveNames,
  type NamesConfig,
  type ResolvedNames,
} from './emit/naming';
import { emitTypesInterface } from './emit/types-interface';
import { emitOperationsInterface } from './emit/operations-interface';
import { emitExceptionClass } from './emit/exception-class';
import { emitImplementationClass } from './emit/implementation-class';
import { emitLocalClasses } from './emit/local-classes';
import {
  writeClientBundle,
  type ClassArtifact,
  type InterfaceArtifact,
} from './format/index';

export type GenerateTarget =
  | 's4-cloud'
  | 's4-onprem-modern'
  | 'on-prem-classic';

export interface GenerateOptions {
  /** Path to the OpenAPI spec file, a URL, or a pre-parsed spec object. */
  input: string | URL | object;
  /** Output directory. Created if missing. */
  outDir: string;
  /** Output format (`abapgit` or `gcts`). */
  format: 'abapgit' | 'gcts';
  /** Target profile. Only `s4-cloud` is supported in v1. */
  target?: GenerateTarget;
  /**
   * Naming configuration. Exactly one of `names.base` or the individual
   * overrides must resolve all four global names.
   */
  names: NamesConfig;
  /**
   * Default server path written into the implementation-class constructor
   * DEFAULT clause. When omitted, derived from `spec.servers[0].url`
   * (path component) with a final fallback of `'/'`.
   */
  defaultServer?: string;
  /**
   * Class-level description embedded in `.clas.xml` / `.intf.xml` metadata.
   * Defaults to each artifact's own name.
   */
  description?: string;
  /**
   * When true, nullable fields receive a sibling `<field>_is_null` flag in
   * the types interface. Default false.
   */
  emitNullFlags?: boolean;
}

export interface GenerateResult {
  /** All written files, relative to `outDir`, sorted. */
  files: readonly string[];
  /** Resolved ABAP global / local names used by the pipeline. */
  resolvedNames: ResolvedNames;
  /** Number of type plan entries emitted into the types interface. */
  typeCount: number;
  /** Number of operations emitted into the operations interface. */
  operationCount: number;
}

function assertSupportedTarget(target: GenerateTarget): void {
  if (target !== 's4-cloud') {
    throw new Error(
      `generate: target "${target}" is not supported in v1 (only 's4-cloud').`,
    );
  }
}

function deriveDefaultServer(spec: NormalizedSpec): string {
  const first = spec.servers[0]?.url;
  if (!first || first.length === 0) {
    return '/';
  }
  try {
    const u = new URL(first);
    return u.pathname && u.pathname.length > 0 ? u.pathname : '/';
  } catch {
    // Relative URL — use as-is.
    return first;
  }
}

// ---------------------------------------------------------------------------
// Implementation-class emitter is provided by `./emit/implementation-class`.
// ---------------------------------------------------------------------------

export async function generate(
  options: GenerateOptions,
): Promise<GenerateResult> {
  const target: GenerateTarget = options.target ?? 's4-cloud';
  let step = 'validate-target';
  try {
    assertSupportedTarget(target);

    step = 'resolve-names';
    const names = resolveNames(options.names);

    step = 'load-spec';
    const spec = await loadSpec(options.input);

    step = 'plan-types';
    // planTypes always prepends `ty_` — an empty extra prefix is fine.
    const plan = planTypes(spec, { typePrefix: '' });

    step = 'emit-types-interface';
    const typesIF = emitTypesInterface(spec, plan, {
      name: names.typesInterface,
      emitNullFlags: options.emitNullFlags ?? false,
      interfaceAbapDoc: [`Generated types for ${names.implementationClass}.`],
    });

    step = 'emit-operations-interface';
    const opsIF = emitOperationsInterface(spec, plan, {
      name: names.operationsInterface,
      typesInterfaceName: names.typesInterface,
      exceptionClassName: names.exceptionClass,
    });

    step = 'emit-exception-class';
    const zcx = emitExceptionClass({ name: names.exceptionClass });

    step = 'emit-implementation-class';
    const implResult = emitImplementationClass(spec, opsIF.operations, {
      names,
      defaultServer: options.defaultServer ?? deriveDefaultServer(spec),
    });

    step = 'emit-local-classes';
    const locals = emitLocalClasses(names);

    step = 'print';
    const typesSource = print(typesIF.interface);
    const opsSource = print(opsIF.interface);
    const zcxSource = print(zcx.class);
    const implSource = print(implResult.class);

    step = 'assemble-artifacts';
    const types: InterfaceArtifact = {
      name: names.typesInterface,
      source: typesSource,
      description:
        options.description ?? `Types for ${names.implementationClass}`,
    };
    const operationsArtifact: InterfaceArtifact = {
      name: names.operationsInterface,
      source: opsSource,
      description:
        options.description ?? `Operations for ${names.implementationClass}`,
    };
    const exception: ClassArtifact = {
      className: names.exceptionClass,
      mainSource: zcxSource,
      description:
        options.description ??
        `Error exception for ${names.implementationClass}`,
    };
    const implementation: ClassArtifact = {
      className: names.implementationClass,
      mainSource: implSource,
      description: options.description ?? names.implementationClass,
      localsDefSource: locals.localsDef,
      localsImpSource: locals.localsImp,
    };

    step = 'write';
    const written = await writeClientBundle(
      { types, operations: operationsArtifact, exception, implementation },
      options.format,
      options.outDir,
    );

    return {
      files: written.files,
      resolvedNames: names,
      typeCount: plan.entries.length,
      operationCount: opsIF.operations.length,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const wrapped = new Error(
      `openai-codegen generate failed at step "${step}": ${message}`,
    );
    if (err instanceof Error && err.stack) {
      wrapped.stack = err.stack;
    }
    throw wrapped;
  }
}
