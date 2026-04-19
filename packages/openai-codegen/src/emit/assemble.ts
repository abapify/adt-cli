import {
  attributeDef,
  builtinType,
  classDef,
  methodDef,
  methodImpl,
  methodParam,
  namedTypeRef,
  raw,
  section,
  tableType,
  typeDef,
  type AttributeDef,
  type ClassDef,
  type ConstantDecl,
  type LocalClassDef,
  type MethodDef,
  type MethodImpl,
  type MethodParam,
  type SectionMember,
  type Statement,
  type TypeDef,
  type TypeRef,
} from '@abapify/abap-ast';
import type { NormalizedSpec } from '../oas/types';
import type { TypePlan } from '../types/plan';
import type { TargetProfile } from '../profiles/types';
import { assertClassAllowed } from '../profiles/registry';
import type { CloudRuntime } from '../runtime/s4-cloud/index';
import { emitTypeSection } from '../types/emit';
import { makeNameAllocator } from '../types/naming';
import { buildImportingParams } from './parameters';
import { buildRaising, buildReturning } from './responses';
import { buildOperationBody } from './operation-body';
import { buildExceptionClass } from './exception-class';
import { methodNameFor, exceptionClassNameFor } from './identifiers';
import { emitSecuritySupport } from './security';
import { emitServerConstants, emitServerCtorParams } from './server';

export interface EmitClientOptions {
  className: string;
  typePrefix: string;
}

export interface EmittedClient {
  /** The generated global class (definition + implementation). */
  readonly class: ClassDef;
  /** Extras emitted alongside the main class (e.g. local exception class). */
  readonly extras: readonly LocalClassDef[];
}

/** Rebuild an AttributeDef with a new visibility (AST objects are frozen). */
function reVisibility(
  a: AttributeDef,
  v: 'public' | 'protected' | 'private',
): AttributeDef {
  return attributeDef({
    name: a.name,
    type: a.type,
    visibility: v,
    classData: a.classData,
    readOnly: a.readOnly,
    initial: a.initial,
  });
}

/** Hoist a TypeRef that cannot be used inline (TableType / StructureType) into
 * a named typedef; returns a NamedTypeRef pointing at it. BuiltinType and
 * NamedTypeRef are returned unchanged. */
function makeTypeHoister(
  extraTypes: TypeDef[],
  usedNames: Set<string>,
): (ref: TypeRef, hint: string) => TypeRef {
  return function hoist(ref, hint) {
    if (ref.kind === 'BuiltinType' || ref.kind === 'NamedTypeRef') {
      return ref;
    }
    // For a TableType whose row is a NamedTypeRef, build ty_<hint>_tab.
    let baseName = `ty_${hint}`;
    if (ref.kind === 'TableType') baseName = `${baseName}_tab`;
    let name = baseName;
    let i = 2;
    while (usedNames.has(name)) {
      name = `${baseName}_${i}`;
      i += 1;
    }
    usedNames.add(name);
    if (ref.kind === 'TableType') {
      extraTypes.push(
        typeDef({
          name,
          type: tableType({
            rowType: ref.rowType,
            tableKind: ref.tableKind,
            uniqueness: ref.uniqueness,
            keyFields: ref.keyFields,
          }),
        }),
      );
    } else {
      extraTypes.push(typeDef({ name, type: ref }));
    }
    return namedTypeRef({ name });
  };
}

function rewriteParam(p: MethodParam, newType: TypeRef): MethodParam {
  return methodParam({
    paramKind: p.paramKind,
    name: p.name,
    typeRef: newType,
    optional: p.optional,
    default: p.default,
  });
}

/** Walk a list of TypeDef nodes; for each StructureType field whose type is a
 * TableType or a nested StructureType, hoist it into a sibling typedef and
 * rewrite the field to reference it. The returned list is a superset of the
 * input in topological order. */
function normalizeTypeSection(
  defs: readonly TypeDef[],
  usedNames: Set<string>,
): TypeDef[] {
  const out: TypeDef[] = [];
  const hoistOne = (
    t: TypeRef,
    parentName: string,
    fieldName: string,
  ): TypeRef => {
    if (t.kind === 'BuiltinType' || t.kind === 'NamedTypeRef') return t;
    // Allocate a stable hoisted name.
    let base = `${parentName}__${fieldName}`;
    if (t.kind === 'TableType') base = `${base}_tab`;
    let name = base;
    let i = 2;
    while (usedNames.has(name)) {
      name = `${base}_${i}`;
      i += 1;
    }
    usedNames.add(name);
    // Recursively normalise nested structures.
    let normalised: TypeRef;
    if (t.kind === 'TableType') {
      const rowRef =
        t.rowType.kind === 'StructureType'
          ? hoistOne(t.rowType, name, 'row')
          : t.rowType;
      normalised = tableType({
        rowType: rowRef,
        tableKind: t.tableKind,
        uniqueness: t.uniqueness,
        keyFields: t.keyFields,
      });
    } else {
      // StructureType: rewrite its fields.
      normalised = {
        ...t,
        fields: t.fields.map((f) => ({
          name: f.name,
          type: hoistOne(f.type, name, f.name),
        })),
      };
    }
    out.push(typeDef({ name, type: normalised }));
    return namedTypeRef({ name });
  };
  for (const d of defs) {
    const t = d.type;
    if (t.kind === 'StructureType') {
      const newFields = t.fields.map((f) => ({
        name: f.name,
        type: hoistOne(f.type, d.name, f.name),
      }));
      out.push(
        typeDef({
          name: d.name,
          type: { ...t, fields: newFields },
        }),
      );
    } else {
      out.push(d);
    }
  }
  return out;
}

/** Convert leading-`*` star comments into `"` line comments so the printer's
 * indentation-prefix machinery doesn't invalidate them (star comments must
 * start at column 1 of the physical line in ABAP; line comments can be
 * indented). */
function sanitizeStarComments(source: string): string {
  return source
    .split('\n')
    .map((l) => {
      const m = /^(\s*)\*(\s?)(.*)$/.exec(l);
      if (!m) return l;
      return `${m[1]}" ${m[3]}`;
    })
    .join('\n');
}

/** Build the whole client class + local exception class. */
export function emitClientClass(
  spec: NormalizedSpec,
  plan: TypePlan,
  profile: TargetProfile,
  runtime: CloudRuntime,
  opts: EmitClientOptions,
): EmittedClient {
  void opts.typePrefix; // prefix already baked into the plan.
  const className = opts.className;
  const exceptionClassName = exceptionClassNameFor(className);

  // Whitelist sanity: every system class the runtime references must be
  // allowed by the profile. Throws WhitelistViolationError on mismatch.
  for (const ref of runtime.allowedClassReferences) {
    assertClassAllowed(profile, ref);
  }
  for (const ref of [
    'if_web_http_client',
    'if_web_http_request',
    'if_web_http_response',
    'cl_http_utility',
  ]) {
    assertClassAllowed(profile, ref);
  }

  // Type section: all planned types (normalized to avoid inline-unsafe types).
  const rawTypes: TypeDef[] = emitTypeSection(plan, profile);
  const typeNameSet = new Set<string>(rawTypes.map((t) => t.name));
  const types: TypeDef[] = normalizeTypeSection(rawTypes, typeNameSet);

  // Server constants (class-constants, public for easy access).
  const serverConstants: ConstantDecl[] = emitServerConstants(spec.servers);

  // Security support.
  const sec = emitSecuritySupport(spec);

  // Protected attributes (server/destination + security).
  const protectedAttributes: AttributeDef[] = [
    attributeDef({
      name: 'mv_server',
      type: builtinType({ name: 'string' }),
      visibility: 'protected',
    }),
    attributeDef({
      name: 'mv_destination',
      type: builtinType({ name: 'string' }),
      visibility: 'protected',
    }),
    ...sec.attributes.map((a) => reVisibility(a, 'protected')),
  ];

  // Constructor.
  const ctorParams: MethodParam[] = [
    ...emitServerCtorParams(spec.servers),
    ...sec.ctorParams,
  ];
  const ctorBody: Statement[] = [
    raw({ source: `me->mv_server = iv_server.` }),
    raw({ source: `me->mv_destination = iv_destination.` }),
    ...sec.ctorStatements,
  ];
  const constructorDef: MethodDef = methodDef({
    name: 'constructor',
    visibility: 'public',
    params: ctorParams,
  });
  const constructorImpl: MethodImpl = methodImpl({
    name: 'constructor',
    body: ctorBody,
  });

  // Per-operation methods.
  const methodAllocator = makeNameAllocator(new Set<string>(['constructor']));
  const extraTypes: TypeDef[] = [];
  const extraTypeNames = new Set<string>(types.map((t) => t.name));
  const hoist = makeTypeHoister(extraTypes, extraTypeNames);
  const operationMethods: MethodDef[] = [];
  const operationImpls: MethodImpl[] = [];
  // Per-operation serialize/deserialize stubs. These are private helpers that
  // live in the private section so the generated class activates cleanly.
  // Byte-level JSON round-trip fidelity is deferred — the stubs return initial
  // values (or abap_true for empty-body success) with a TODO comment.
  const stubDecls: MethodDef[] = [];
  const stubImpls: MethodImpl[] = [];
  for (const op of spec.operations) {
    const methodName = methodNameFor(op, methodAllocator);
    const { params, body } = buildImportingParams(op, plan);
    const ret = buildReturning(op, plan);
    const importingParams: MethodParam[] = params.map((t) => {
      const hoisted = hoist(t.param.typeRef, `${methodName}_${t.param.name}`);
      return hoisted === t.param.typeRef
        ? t.param
        : rewriteParam(t.param, hoisted);
    });
    let hoistedBodyParam: MethodParam | undefined;
    if (body) {
      const hoisted = hoist(body.param.typeRef, `${methodName}_body`);
      hoistedBodyParam =
        hoisted === body.param.typeRef
          ? body.param
          : rewriteParam(body.param, hoisted);
      importingParams.push(hoistedBodyParam);
    }
    const allParams: MethodParam[] = [...importingParams];
    let hoistedReturningParam: MethodParam | undefined;
    if (ret.returning) {
      const hoisted = hoist(
        ret.returning.typeRef,
        `${methodName}_${ret.returning.name}`,
      );
      hoistedReturningParam =
        hoisted === ret.returning.typeRef
          ? ret.returning
          : rewriteParam(ret.returning, hoisted);
      allParams.push(hoistedReturningParam);
    }
    operationMethods.push(
      methodDef({
        name: methodName,
        visibility: 'public',
        params: allParams,
        raising: buildRaising(exceptionClassName),
      }),
    );
    operationImpls.push(
      methodImpl({
        name: methodName,
        body: buildOperationBody({
          op,
          methodName,
          params,
          body: body
            ? { abapName: body.abapName, mediaType: body.mediaType }
            : undefined,
          ret,
          spec,
          exceptionClassName,
        }),
      }),
    );

    // --- _des_<methodName> stub. We emit one stub for every operation so
    // the class is stable and extensible, even though the generated body
    // only invokes it for JSON responses (binary responses call
    // lo_resp->get_binary() directly, and bool responses assign abap_true).
    if (hoistedReturningParam) {
      const desName = `_des_${methodName}`;
      const retName = hoistedReturningParam.name;
      const isBool = ret.kind === 'bool';
      const desBody = isBool
        ? `" TODO: implement JSON → target deserialization if this endpoint ever
" returns a payload. For now this is an empty-body success: ${retName} = abap_true.
${retName} = abap_true.
RETURN.`
        : `" TODO: implement JSON → target deserialization using private _json_tokenize.
" For now ${retName} is returned with its initial value so the class activates cleanly.
CLEAR ${retName}.
RETURN.`;
      stubDecls.push(
        methodDef({
          name: desName,
          visibility: 'private',
          params: [
            methodParam({
              paramKind: 'importing',
              name: 'iv_payload',
              typeRef: builtinType({ name: 'string' }),
            }),
            methodParam({
              paramKind: 'returning',
              name: retName,
              typeRef: hoistedReturningParam.typeRef,
            }),
          ],
        }),
      );
      stubImpls.push(
        methodImpl({
          name: desName,
          body: [raw({ source: desBody })],
        }),
      );
    }

    // --- _ser_<methodName> stub (emitted whenever the operation has a
    // request body, regardless of media type — it is only invoked from the
    // generated body for JSON media types, but we emit the helper
    // unconditionally so the public API is stable for future expansion). ---
    if (body && hoistedBodyParam) {
      const serName = `_ser_${methodName}`;
      stubDecls.push(
        methodDef({
          name: serName,
          visibility: 'private',
          params: [
            methodParam({
              paramKind: 'importing',
              name: hoistedBodyParam.name,
              typeRef: hoistedBodyParam.typeRef,
            }),
            methodParam({
              paramKind: 'returning',
              name: 'rv_json',
              typeRef: builtinType({ name: 'string' }),
            }),
          ],
        }),
      );
      stubImpls.push(
        methodImpl({
          name: serName,
          body: [
            raw({
              source: `" TODO: implement target → JSON serialization using private _json_write_* helpers.
" For now rv_json is returned empty so the class activates cleanly.
CLEAR rv_json.
RETURN.`,
            }),
          ],
        }),
      );
    }
  }

  // Private section: runtime marker method + types. We also embed the runtime
  // signatures as an informational comment in the private-section; the real
  // runtime statements live inside a trailing synthetic method in the
  // IMPLEMENTATION block.
  const runtimeMarkerDecl = methodDef({
    name: '_runtime_stub',
    visibility: 'private',
  });
  const runtimeImpl = methodImpl({
    name: '_runtime_stub',
    body: [raw({ source: sanitizeStarComments(runtime.implementations) })],
  });

  const publicMembers: SectionMember[] = [
    ...serverConstants,
    constructorDef,
    ...sec.publicMethods,
    ...operationMethods,
  ];

  const protectedMembers: SectionMember[] = [
    ...protectedAttributes,
    ...sec.protectedMethods,
  ];

  const privateMembers: SectionMember[] = [
    ...types,
    ...extraTypes,
    ...stubDecls,
    runtimeMarkerDecl,
  ];

  const sections = [
    section({ visibility: 'public', members: publicMembers }),
    section({ visibility: 'protected', members: protectedMembers }),
    section({ visibility: 'private', members: privateMembers }),
  ];

  const clientClass = classDef({
    name: className,
    sections,
    implementations: [
      constructorImpl,
      ...sec.publicImpls,
      ...sec.protectedImpls,
      ...operationImpls,
      ...stubImpls,
      runtimeImpl,
    ],
  });

  const exceptionClass = buildExceptionClass(className);
  return { class: clientClass, extras: [exceptionClass] };
}
