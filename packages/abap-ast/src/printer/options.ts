export interface PrintOptions {
  /** Spaces per indentation level. Default 2. */
  indent?: number;
  /** 'upper' (default) or 'lower' for ABAP keywords. */
  keywordCase?: 'upper' | 'lower';
  /** Line ending. Default '\n'. */
  eol?: string;
}

export type ResolvedPrintOptions = Required<PrintOptions>;

export function resolveOptions(o?: PrintOptions): ResolvedPrintOptions {
  return {
    indent: o?.indent ?? 2,
    keywordCase: o?.keywordCase ?? 'upper',
    eol: o?.eol ?? '\n',
  };
}
