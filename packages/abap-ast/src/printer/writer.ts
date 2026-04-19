import type { ResolvedPrintOptions } from './options';

/** Tiny indentation-aware string builder. */
export class Writer {
  private readonly lines: string[] = [];
  private level = 0;
  private readonly opts: ResolvedPrintOptions;

  constructor(opts: ResolvedPrintOptions) {
    this.opts = opts;
  }

  get options(): ResolvedPrintOptions {
    return this.opts;
  }

  indent(): void {
    this.level += 1;
  }

  dedent(): void {
    if (this.level === 0) {
      throw new Error('Writer: cannot dedent below 0');
    }
    this.level -= 1;
  }

  /** Current indent prefix. */
  prefix(): string {
    return ' '.repeat(this.level * this.opts.indent);
  }

  /** Write a full line with current indent. Empty string = blank line (no whitespace). */
  writeLine(s = ''): void {
    if (s.length === 0) {
      this.lines.push('');
    } else {
      this.lines.push(this.prefix() + s);
    }
  }

  /** Append text to the most recent line (no newline). Starts a new indented line if none exists. */
  write(s: string): void {
    if (this.lines.length === 0) {
      this.lines.push(this.prefix() + s);
    } else {
      this.lines[this.lines.length - 1] += s;
    }
  }

  /** Emit a blank line. */
  blank(): void {
    this.lines.push('');
  }

  /** Emit a line with no indent prefix (used by star comments, which must begin at column 1). */
  rawLine(s: string): void {
    this.lines.push(s);
  }

  /** Transform a keyword according to keywordCase. */
  kw(word: string): string {
    return this.opts.keywordCase === 'lower'
      ? word.toLowerCase()
      : word.toUpperCase();
  }

  toString(): string {
    return this.lines.join(this.opts.eol);
  }
}
