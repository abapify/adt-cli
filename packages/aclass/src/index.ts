/**
 * `@abapify/aclass` — ABAP OO source parser.
 *
 * Parses `.clas.abap` / `.intf.abap` source files into a typed AST.
 * Scope is structural: class / interface headers, sections, and member
 * declarations (methods, attributes, types, constants, aliases,
 * implements). Method bodies are captured as opaque source slices.
 *
 * See `packages/aclass/AGENTS.md` for conventions and the
 * `openspec/changes/add-aclass-parser` proposal for scope.
 *
 * Main entry point:
 *
 * ```ts
 * import { parse } from '@abapify/aclass';
 * const { ast, errors } = parse(sourceText);
 * ```
 */
export { parse } from './parser';
export type { ParseResult } from './parser';

export * from './ast';

export { AclassLexer, allTokens } from './tokens';
export * as tokens from './tokens';

export type { ParseError } from './errors';
export { fromLexError, fromParseError } from './errors';

export { tokenize } from './lex';
export type { LexResult } from './lex';

export { assertCleanParse, AclassParseError } from './assert';
