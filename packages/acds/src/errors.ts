/**
 * Parse error types for ABAP CDS
 */
import type { ILexingError, IRecognitionException } from 'chevrotain';

export interface CdsParseError {
  message: string;
  line: number;
  column: number;
  offset: number;
  length: number;
}

export function fromLexError(err: ILexingError): CdsParseError {
  return {
    message: err.message,
    line: err.line ?? 1,
    column: err.column ?? 1,
    offset: err.offset,
    length: err.length,
  };
}

export function fromParseError(err: IRecognitionException): CdsParseError {
  const token = err.token;
  return {
    message: err.message,
    line: token.startLine ?? 1,
    column: token.startColumn ?? 1,
    offset: token.startOffset,
    length: (token.endOffset ?? token.startOffset) - token.startOffset + 1,
  };
}
