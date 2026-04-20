/**
 * Wave 0 entry point: tokenise an ABAP OO source string and return the
 * resulting token list along with any lex errors, normalised to
 * `ParseError`.
 *
 * Wave 1 replaces this with a full `parse()` that feeds the token list
 * into a Chevrotain `CstParser` and yields a typed AST. This function
 * stays around as the low-level primitive.
 */
import { AclassLexer } from './tokens';
import type { IToken } from 'chevrotain';
import { fromLexError, type ParseError } from './errors';

export interface LexResult {
  tokens: IToken[];
  errors: ParseError[];
}

export function tokenize(source: string): LexResult {
  const result = AclassLexer.tokenize(source);
  return {
    tokens: result.tokens,
    errors: result.errors.map(fromLexError),
  };
}
