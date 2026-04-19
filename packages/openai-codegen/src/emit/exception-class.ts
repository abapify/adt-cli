import {
  attributeDef,
  builtinType,
  call,
  identifierExpr,
  localClassDef,
  methodDef,
  methodImpl,
  methodParam,
  namedTypeRef,
  raw,
  section,
  type LocalClassDef,
} from '@abapify/abap-ast';
import { exceptionClassNameFor } from './identifiers';

/** Emit a local exception class that carries HTTP status + raw payload. */
export function buildExceptionClass(clientClassName: string): LocalClassDef {
  const name = exceptionClassNameFor(clientClassName);
  void identifierExpr;
  void call;

  const publicSection = section({
    visibility: 'public',
    members: [
      attributeDef({
        name: 'mv_status',
        type: builtinType({ name: 'i' }),
        visibility: 'public',
        readOnly: true,
      }),
      attributeDef({
        name: 'mv_payload',
        type: builtinType({ name: 'string' }),
        visibility: 'public',
        readOnly: true,
      }),
      methodDef({
        name: 'constructor',
        visibility: 'public',
        params: [
          methodParam({
            paramKind: 'importing',
            name: 'iv_status',
            typeRef: builtinType({ name: 'i' }),
          }),
          methodParam({
            paramKind: 'importing',
            name: 'iv_payload',
            typeRef: builtinType({ name: 'string' }),
          }),
        ],
      }),
    ],
  });

  return localClassDef({
    name,
    superclass: namedTypeRef({ name: 'cx_static_check' }).name,
    isFinal: true,
    sections: [publicSection],
    implementations: [
      methodImpl({
        name: 'constructor',
        body: [
          raw({ source: `super->constructor( ).` }),
          raw({ source: `me->mv_status = iv_status.` }),
          raw({ source: `me->mv_payload = iv_payload.` }),
        ],
      }),
    ],
  });
}
