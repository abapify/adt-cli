import { describe, it, expect } from 'vitest';
import { assertCleanParse, AclassParseError } from '../src/assert';

describe('assertCleanParse', () => {
  it('returns silently on clean input', () => {
    expect(() =>
      assertCleanParse('INTERFACE zif_foo PUBLIC.\nENDINTERFACE.'),
    ).not.toThrow();
  });

  it('throws AclassParseError on lex errors, including the file label', () => {
    // `@` inside identifier position is not part of the lex vocabulary —
    // … wait, `@` IS a token now. Use something genuinely outside the
    // lexer's alphabet instead.
    // Control character U+0007 (BEL) is guaranteed outside every token
    // pattern, so it's a reliable lex-error trigger.
    const bad = 'CLASS zcl_x DEFINITION\u0007 PUBLIC.\nENDCLASS.';
    expect(() => assertCleanParse(bad, 'demo.clas.abap')).toThrow(
      AclassParseError,
    );
    try {
      assertCleanParse(bad, 'demo.clas.abap');
    } catch (e) {
      expect(e).toBeInstanceOf(AclassParseError);
      const err = e as AclassParseError;
      expect(err.message).toContain('demo.clas.abap');
      expect(err.errors.length).toBeGreaterThan(0);
      expect(err.errors[0].severity).toBe('error');
    }
  });

  it('default fileLabel is `<source>`', () => {
    try {
      assertCleanParse('unknown\u0007garbage.');
    } catch (e) {
      expect((e as Error).message).toContain('<source>');
    }
  });
});
