import { print } from '@abapify/abap-ast';
import { loadSpec } from './oas/index';
import { getProfile, type TargetProfileId } from './profiles/index';
import { planTypes } from './types/index';
import { getCloudRuntime } from './runtime/index';
import { emitClientClass } from './emit/index';
import {
  writeLayout,
  type OutputFormat,
  type ClassArtifact,
  type WriteResult,
} from './format/index';

export interface GenerateOptions {
  /** Path or URL to the OpenAPI spec, or a parsed object. */
  input: string | URL | object;
  /** Output directory (the layout writer creates files inside it). */
  outDir: string;
  /** Target SAP system profile. Only `s4-cloud` is implemented in v1. */
  target: TargetProfileId;
  /** Packaging layout. */
  format: OutputFormat;
  /** Uppercase ABAP class name, e.g. `ZCL_PETSTORE3_CLIENT`. */
  className: string;
  /**
   * Lower-case ABAP type prefix (without `ty_` or trailing underscore),
   * e.g. `ps3` produces `ty_ps3_pet`.
   */
  typePrefix: string;
  /** Optional short description used in the generated `.clas.xml` DESCRIPT. */
  description?: string;
}

export interface GenerateResult extends WriteResult {
  className: string;
  typeCount: number;
  operationCount: number;
  source: string;
}

/**
 * Run the full pipeline:
 *   OpenAPI → normalize → plan types → emit class AST → print → write layout.
 *
 * Deterministic: re-running with the same inputs produces byte-identical files.
 */
export async function generate(
  options: GenerateOptions,
): Promise<GenerateResult> {
  if (options.target !== 's4-cloud') {
    throw new Error(
      `target '${options.target}' is not implemented in v1; only 's4-cloud' is supported`,
    );
  }

  const spec = await loadSpec(options.input);
  const profile = getProfile(options.target);
  const plan = planTypes(spec, { typePrefix: options.typePrefix });
  const runtime = getCloudRuntime();

  const emitted = emitClientClass(spec, plan, profile, runtime, {
    className: options.className,
    typePrefix: options.typePrefix,
  });

  const parts: string[] = [print(emitted.class)];
  for (const extra of emitted.extras) {
    parts.push(print(extra));
  }
  const source = parts.join('\n\n');

  const artifact: ClassArtifact = {
    className: options.className,
    mainSource: source,
    description: options.description,
  };

  const result = await writeLayout(artifact, options.format, options.outDir);

  return {
    files: result.files,
    className: options.className,
    typeCount: plan.entries.length,
    operationCount: spec.operations.length,
    source,
  };
}
