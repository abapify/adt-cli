/**
 * `@abapify/aclass` — ABAP OO source parser.
 *
 * This package tokenises and parses `.clas.abap` / `.intf.abap` source
 * files into a typed AST. Scope is intentionally structural: class /
 * interface headers, sections, and member declarations (methods,
 * attributes, types, constants, events, aliases, implements). Method
 * bodies are captured as opaque source slices; their statements are NOT
 * parsed in this package.
 *
 * For the AST printer direction see `@abapify/abap-ast`; for CDS sources
 * see `@abapify/acds`.
 *
 * Entry point (grammar-completeness still in progress — Wave 0 ships the
 * lexer + types; Wave 1 will add `parse()`):
 *
 * ```ts
 * import { parse } from '@abapify/aclass';
 * const { ast, errors } = parse(sourceText);
 * ```
 *
 * Until Wave 1 lands, consumers may use the lexer directly via
 * `tokenize()` for inspection / diagnostics.
 */
export { AclassLexer, allTokens } from './tokens';
export * as tokens from './tokens';

export type { ParseError } from './errors';
export { fromLexError, fromParseError } from './errors';

export { tokenize } from './lex';
