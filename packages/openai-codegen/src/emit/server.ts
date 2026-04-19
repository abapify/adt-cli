import {
  builtinType,
  constantDecl,
  identifierExpr,
  literal,
  methodParam,
  type ConstantDecl,
  type MethodParam,
} from '@abapify/abap-ast';
import type { NormalizedServer } from '../oas/types';

/** Substitute server variables with their declared defaults. */
export function resolveServerUrl(server: NormalizedServer): string {
  return server.url.replace(/\{([^}]+)\}/g, (_m, name) => {
    const v = server.variables[name];
    return v && typeof v.default === 'string' ? v.default : '';
  });
}

export function emitServerConstants(
  servers: readonly NormalizedServer[],
): ConstantDecl[] {
  const list = servers.length > 0 ? servers : [{ url: '', variables: {} }];
  return list.map((s, idx) =>
    constantDecl({
      name: `co_server_${idx}`,
      type: builtinType({ name: 'string' }),
      value: literal({ literalKind: 'string', value: resolveServerUrl(s) }),
    }),
  );
}

/** Constructor server/destination params. */
export function emitServerCtorParams(
  _servers: readonly NormalizedServer[],
): MethodParam[] {
  return [
    methodParam({
      paramKind: 'importing',
      name: 'iv_server',
      typeRef: builtinType({ name: 'string' }),
      default: identifierExpr({ name: 'co_server_0' }),
    }),
    methodParam({
      paramKind: 'importing',
      name: 'iv_destination',
      typeRef: builtinType({ name: 'string' }),
      optional: true,
    }),
  ];
}
