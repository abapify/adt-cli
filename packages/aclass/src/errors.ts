/**
 * Normalised parse errors for `@abapify/aclass`.
 *
 * Both Chevrotain lex errors and parse errors are flattened into a single
 * `ParseError` shape so callers don't need to know which phase produced
 * the diagnostic.
 */
import type { ILexingError, IRecognitionException } from 'chevrotain';

export interface ParseError {
  severity: 'error' | 'warning';
  message: string;
  line: number;
  column: number;
  offset: number;
  length: number;
}

export function fromLexError(err: ILexingError): ParseError {
  return {
    severity: 'error',
    message: err.message,
    line: err.line ?? 1,
    column: err.column ?? 1,
    offset: err.offset,
    length: err.length,
  };
}

export function fromParseError(err: IRecognitionException): ParseError {
  const token = err.token;
  return {
    severity: 'error',
    message: err.message,
    line: token.startLine ?? 1,
    column: token.startColumn ?? 1,
    offset: token.startOffset,
    length: (token.endOffset ?? token.startOffset) - token.startOffset + 1,
  };
}
