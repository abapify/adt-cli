/**
 * Emit the generated ABAP exception class that carries HTTP error detail
 * (status code, reason phrase, raw body, response headers).
 *
 * The class inherits from `cx_static_check` and is FINAL with CREATE PUBLIC.
 * It exposes four READ-ONLY attributes and a constructor that assigns them
 * after delegating to `super->constructor( )`.
 */

import {
  assign,
  attributeDef,
  builtinType,
  call,
  classDef,
  identifierExpr,
  methodDef,
  methodImpl,
  methodParam,
  namedTypeRef,
  section,
  structureType,
  tableType,
  typeDef,
  type ClassDef,
  type MethodImpl,
} from '@abapify/abap-ast';

export interface EmitExceptionClassOptions {
  /** Global ABAP class name, e.g. `ZCX_PETSTORE_ERROR`. */
  readonly name: string;
  /** Optional class-level ABAPDoc lines. */
  readonly interfaceAbapDoc?: readonly string[];
}

export interface EmitExceptionClassResult {
  readonly class: ClassDef;
}

/** Build the constructor's IMPLEMENTATION body (super call + 4 assignments). */
function buildConstructorImpl(): MethodImpl {
  const superCall = call({
    receiver: identifierExpr({ name: 'super' }),
    method: 'constructor',
    callKind: 'instance',
    args: [],
  });

  const fields: readonly string[] = [
    'status',
    'description',
    'body',
    'headers',
  ];
  const assignments = fields.map((f) =>
    assign({
      target: identifierExpr({ name: `me->${f}` }),
      value: identifierExpr({ name: f }),
    }),
  );

  return methodImpl({
    name: 'constructor',
    body: [superCall, ...assignments],
  });
}

export function emitExceptionClass(
  opts: EmitExceptionClassOptions,
): EmitExceptionClassResult {
  if (!opts.name) {
    throw new Error('emitExceptionClass: required field "name" is missing');
  }

  const kvType = typeDef({
    name: 'kv',
    type: structureType({
      fields: [
        { name: 'k', type: builtinType({ name: 'string' }) },
        { name: 'v', type: builtinType({ name: 'string' }) },
      ],
    }),
  });

  // Note: the AST cannot model `WITH EMPTY KEY`; `WITH DEFAULT KEY` is the
  // closest equivalent accepted by abaplint and is semantically fine for a
  // payload table of heterogeneous header pairs.
  const kvsType = typeDef({
    name: 'kvs',
    type: tableType({
      rowType: namedTypeRef({ name: 'kv' }),
      tableKind: 'standard',
    }),
  });

  const statusAttr = attributeDef({
    name: 'status',
    type: builtinType({ name: 'i' }),
    visibility: 'public',
    readOnly: true,
  });
  const descriptionAttr = attributeDef({
    name: 'description',
    type: builtinType({ name: 'string' }),
    visibility: 'public',
    readOnly: true,
  });
  const bodyAttr = attributeDef({
    name: 'body',
    type: builtinType({ name: 'xstring' }),
    visibility: 'public',
    readOnly: true,
  });
  const headersAttr = attributeDef({
    name: 'headers',
    type: namedTypeRef({ name: 'kvs' }),
    visibility: 'public',
    readOnly: true,
  });

  const ctor = methodDef({
    name: 'constructor',
    visibility: 'public',
    params: [
      methodParam({
        paramKind: 'importing',
        name: 'status',
        typeRef: builtinType({ name: 'i' }),
      }),
      methodParam({
        paramKind: 'importing',
        name: 'description',
        typeRef: builtinType({ name: 'string' }),
        optional: true,
      }),
      methodParam({
        paramKind: 'importing',
        name: 'body',
        typeRef: builtinType({ name: 'xstring' }),
        optional: true,
      }),
      methodParam({
        paramKind: 'importing',
        name: 'headers',
        typeRef: namedTypeRef({ name: 'kvs' }),
        optional: true,
      }),
    ],
  });

  const publicSection = section({
    visibility: 'public',
    members: [
      kvType,
      kvsType,
      statusAttr,
      descriptionAttr,
      bodyAttr,
      headersAttr,
      ctor,
    ],
  });

  const cls = classDef({
    name: opts.name,
    superclass: 'cx_static_check',
    isFinal: true,
    sections: [publicSection],
    implementations: [buildConstructorImpl()],
    abapDoc: opts.interfaceAbapDoc ? [...opts.interfaceAbapDoc] : undefined,
  });

  return { class: cls };
}
