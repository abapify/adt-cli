/**
 * Response-mapper for openai-codegen v2.
 *
 * Produces the `CASE reply->status( ) ... ENDCASE.` block that lives inside
 * each generated implementation method, directly mapping the operation's
 * OpenAPI `responses` object onto ABAP branches.
 *
 * NOTE: `@abapify/abap-ast` does not currently model `CASE`/`WHEN` as a
 * dedicated statement node. To keep this change narrowly scoped (and to
 * avoid racing other agents on abap-ast), the emitted block is returned as
 * a single `raw({ source })` statement. The AST wrapper is only a transport
 * for the final ABAP source; callers append it to a method body exactly
 * like any other statement.
 */
import { raw, type Statement } from '@abapify/abap-ast';
import type { NormalizedOperation, NormalizedResponse } from '../oas/types';

export type SuccessBodyKind =
  | { kind: 'json'; returningName: string }
  | { kind: 'empty'; returningName: string }
  | { kind: 'binary'; returningName: string };

export interface ResponseMapperOptions {
  /** Fully-qualified ABAP exception class name. */
  exceptionClassName: string;
  /** Local class name used for JSON parsing (usually `json`). */
  localJsonClassName: string;
  /** Name of the local variable holding the fetch result. Default `response`. */
  responseVarName?: string;
  /** Determines how the 2xx / success branch is emitted. */
  successBody: SuccessBodyKind;
}

export interface ResponseMapperResult {
  /** AST statement ready to append to a method body (wraps the CASE source). */
  statement: Statement;
  /** Raw ABAP source, formatted for insertion into a METHOD body. */
  source: string;
}

/**
 * Escape an arbitrary string so it can be embedded inside an ABAP single-
 * quoted literal. Single quotes are doubled; newlines collapse to spaces.
 */
function escapeAbapLiteral(input: string): string {
  return input.replaceAll(/[\r\n]+/g, ' ').replaceAll("'", "''");
}

interface PickedSuccess {
  /** Either a numeric HTTP status code as a string, or 'default'. */
  statusCode: string;
  whenLabel: string; // '200' or 'OTHERS'
}

/**
 * Pick which response drives the success branch.
 *
 * Preference order:
 *   1. Lowest numeric 2xx status code.
 *   2. `default` if no 2xx exists (treated as success — WHEN OTHERS).
 *   3. `undefined` — caller falls back to synthesising a generic WHEN.
 */
function pickSuccessStatus(
  responses: readonly NormalizedResponse[],
): PickedSuccess | undefined {
  const twoXX = responses
    .filter((r) => /^2\d\d$/.test(r.statusCode))
    .map((r) => r.statusCode)
    .sort((a, b) => Number(a) - Number(b));
  if (twoXX.length > 0) {
    return { statusCode: twoXX[0], whenLabel: twoXX[0] };
  }
  const def = responses.find((r) => r.statusCode === 'default');
  // Only treat `default` as the success branch when it is NOT marked as an
  // error response. When it IS an error, fall through so the caller emits
  // a synthetic generic success WHEN and lets the error-branch loop /
  // OTHERS branch handle `default`.
  if (def !== undefined && !def.isError) {
    return { statusCode: 'default', whenLabel: 'OTHERS' };
  }
  return undefined;
}

function renderSuccessBody(opts: ResponseMapperOptions): string {
  const { successBody } = opts;
  const responseVar = opts.responseVarName ?? 'response';
  switch (successBody.kind) {
    case 'json':
      return `${opts.localJsonClassName}=>parse( ${responseVar}->body( ) )->to( REF #( ${successBody.returningName} ) ).`;
    case 'empty':
      return `${successBody.returningName} = abap_true.`;
    case 'binary':
      return `${successBody.returningName} = ${responseVar}->body( ).`;
  }
}

function renderErrorBranch(
  statusCode: string,
  description: string | undefined,
  opts: ResponseMapperOptions,
): string[] {
  const responseVar = opts.responseVarName ?? 'response';
  const lines: string[] = [];
  lines.push(`  WHEN ${statusCode}.`);
  lines.push(`    RAISE EXCEPTION NEW ${opts.exceptionClassName}(`);
  lines.push(`      status      = ${statusCode}`);
  if (description !== undefined && description.length > 0) {
    lines.push(`      description = '${escapeAbapLiteral(description)}'`);
  }
  lines.push(`      body        = ${responseVar}->body( ) ).`);
  return lines;
}

function renderOthersBranch(
  description: string | undefined,
  opts: ResponseMapperOptions,
): string[] {
  const responseVar = opts.responseVarName ?? 'response';
  const lines: string[] = [];
  lines.push(`  WHEN OTHERS.`);
  lines.push(`    RAISE EXCEPTION NEW ${opts.exceptionClassName}(`);
  lines.push(`      status      = ${responseVar}->status( )`);
  if (description !== undefined && description.length > 0) {
    lines.push(`      description = '${escapeAbapLiteral(description)}'`);
  }
  lines.push(`      body        = ${responseVar}->body( ) ).`);
  return lines;
}

export function mapResponseHandling(
  operation: NormalizedOperation,
  opts: ResponseMapperOptions,
): ResponseMapperResult {
  const responseVar = opts.responseVarName ?? 'response';
  const lines: string[] = [];
  lines.push(`CASE ${responseVar}->status( ).`);

  const success = pickSuccessStatus(operation.responses);

  const successConsumedOthers =
    success !== undefined && success.whenLabel === 'OTHERS';

  // Emit the explicit success WHEN first unless `default` itself is the
  // success (WHEN OTHERS), in which case we must defer it so it remains
  // the *last* branch — ABAP forbids any WHEN after OTHERS.
  if (success !== undefined && !successConsumedOthers) {
    lines.push(`  WHEN ${success.whenLabel}.`);
    lines.push(`    ${renderSuccessBody(opts)}`);
  }

  // Error branches: every isError response with a numeric status code gets
  // its own WHEN. Same description over multiple codes still emits one
  // branch per code (clarity > compression).
  for (const resp of operation.responses) {
    if (!resp.isError) continue;
    if (resp.statusCode === 'default') continue;
    if (!/^\d+$/.test(resp.statusCode)) continue;
    lines.push(...renderErrorBranch(resp.statusCode, resp.description, opts));
  }

  // Final WHEN OTHERS:
  //   - If `default` is the success (successConsumedOthers), emit it as
  //     the terminal OTHERS branch now that all error WHENs are already
  //     emitted.
  //   - Else, emit a generic error fallback, using `default`'s description
  //     when it exists and is an error.
  if (successConsumedOthers) {
    lines.push(`  WHEN OTHERS.`);
    lines.push(`    ${renderSuccessBody(opts)}`);
  } else {
    const defaultResp = operation.responses.find(
      (r) => r.statusCode === 'default',
    );
    const description =
      defaultResp !== undefined && defaultResp.isError
        ? defaultResp.description
        : undefined;
    lines.push(...renderOthersBranch(description, opts));
  }

  lines.push(`ENDCASE.`);
  const source = lines.join('\n');
  return { statement: raw({ source }), source };
}
