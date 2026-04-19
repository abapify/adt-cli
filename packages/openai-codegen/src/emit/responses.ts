import {
  builtinType,
  methodParam,
  namedTypeRef,
  type MethodParam,
  type TypeRef,
} from '@abapify/abap-ast';
import type { NormalizedOperation, NormalizedResponse } from '../oas/types';
import type { TypePlan } from '../types/plan';
import { mapSchemaToTypeRef } from '../types/map';

/** The response we return to the caller on 2xx, plus the media type we read from it. */
export interface ReturnShape {
  /** undefined → no RETURNING param (shouldn't happen; we always emit abap_bool at minimum). */
  returning?: MethodParam;
  /** 'json' | 'binary' | 'bool' */
  kind: 'json' | 'binary' | 'bool';
  selected?: NormalizedResponse;
  mediaType?: string;
}

/** Select the response to treat as the "success" response for RETURNING. */
export function pickSuccessResponse(
  op: NormalizedOperation,
): NormalizedResponse | undefined {
  const byCode = (c: string) => op.responses.find((r) => r.statusCode === c);
  const prefer = byCode('200') ?? byCode('201');
  if (prefer) return prefer;
  const twoXx = op.responses
    .filter((r) => /^2\d\d$/.test(r.statusCode))
    .sort((a, b) => Number(a.statusCode) - Number(b.statusCode));
  if (twoXx.length > 0) return twoXx[0];
  return byCode('default');
}

function pickResponseMediaType(resp: NormalizedResponse): string | undefined {
  const keys = Object.keys(resp.content);
  if (keys.length === 0) return undefined;
  const json = keys.find(
    (k) => k === 'application/json' || k.endsWith('+json'),
  );
  if (json) return json;
  const bin = keys.find(
    (k) => k === 'application/octet-stream' || k.endsWith('binary'),
  );
  if (bin) return bin;
  return keys[0];
}

/** Build the RETURNING parameter for an operation based on its selected 2xx response. */
export function buildReturning(
  op: NormalizedOperation,
  plan: TypePlan,
): ReturnShape {
  const selected = pickSuccessResponse(op);
  if (!selected) {
    return {
      returning: methodParam({
        paramKind: 'returning',
        name: 'rv_success',
        typeRef: builtinType({ name: 'abap_bool' }),
      }),
      kind: 'bool',
    };
  }
  const mediaType = pickResponseMediaType(selected);
  if (!mediaType) {
    return {
      returning: methodParam({
        paramKind: 'returning',
        name: 'rv_success',
        typeRef: builtinType({ name: 'abap_bool' }),
      }),
      kind: 'bool',
      selected,
    };
  }
  const schema = selected.content[mediaType]!.schema;
  const isJson =
    mediaType === 'application/json' || mediaType.endsWith('+json');
  if (isJson) {
    const typeRef: TypeRef = mapSchemaToTypeRef(schema, plan);
    return {
      returning: methodParam({
        paramKind: 'returning',
        name: 'rv_result',
        typeRef,
      }),
      kind: 'json',
      selected,
      mediaType,
    };
  }
  // Binary/other: xstring.
  return {
    returning: methodParam({
      paramKind: 'returning',
      name: 'rv_payload',
      typeRef: builtinType({ name: 'xstring' }),
    }),
    kind: 'binary',
    selected,
    mediaType,
  };
}

/** The RAISING clause always includes the generated exception class. */
export function buildRaising(exceptionClassName: string): readonly TypeRef[] {
  return [namedTypeRef({ name: exceptionClassName })];
}
