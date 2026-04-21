import { describe, expect, it } from 'vitest';
import { tokenize } from '../src/lex';
import * as T from '../src/tokens';

/** Helper: return the human-readable token names produced by the lexer. */
function tokenNames(src: string): string[] {
  const { tokens, errors } = tokenize(src);
  expect(errors).toEqual([]);
  return tokens.map((t) => t.tokenType.name);
}

describe('AclassLexer — Wave 0 smoke coverage', () => {
  it('tokenises a minimal class header + ENDCLASS', () => {
    const src = 'CLASS zcl_foo DEFINITION PUBLIC FINAL.\nENDCLASS.';
    expect(tokenNames(src)).toEqual([
      'Class',
      'Identifier',
      'Definition',
      'Public',
      'Final',
      'Dot',
      'EndClass',
      'Dot',
    ]);
  });

  it('is case-insensitive', () => {
    const lower = tokenNames('class zcl_foo definition.\nendclass.');
    const upper = tokenNames('CLASS zcl_foo DEFINITION.\nENDCLASS.');
    expect(lower).toEqual(upper);
  });

  it('distinguishes CLASS-DATA / CLASS-METHODS / CLASS-EVENTS from CLASS', () => {
    expect(tokenNames('CLASS-DATA mv_x TYPE i.')).toEqual([
      'ClassData',
      'Identifier',
      'Type',
      'Identifier',
      'Dot',
    ]);
    expect(tokenNames('CLASS-METHODS foo.')).toEqual([
      'ClassMethods',
      'Identifier',
      'Dot',
    ]);
    expect(tokenNames('CLASS-EVENTS bar.')).toEqual([
      'ClassEvents',
      'Identifier',
      'Dot',
    ]);
  });

  it('distinguishes INTERFACES (plural, member) from INTERFACE (definition keyword)', () => {
    expect(tokenNames('INTERFACES zif_foo.')).toEqual([
      'Interfaces',
      'Identifier',
      'Dot',
    ]);
    expect(tokenNames('INTERFACE zif_foo PUBLIC.')).toEqual([
      'Interface',
      'Identifier',
      'Public',
      'Dot',
    ]);
  });

  it('distinguishes NON-UNIQUE from UNIQUE', () => {
    expect(tokenNames('WITH NON-UNIQUE KEY field.')).toEqual([
      'With',
      'NonUnique',
      'Key',
      'Identifier',
      'Dot',
    ]);
    expect(tokenNames('WITH UNIQUE KEY field.')).toEqual([
      'With',
      'Unique',
      'Key',
      'Identifier',
      'Dot',
    ]);
  });

  it('captures ABAPDocLine comments but skips regular line comments', () => {
    const { tokens } = tokenize(
      [
        '"! API client',
        '" internal note',
        'CLASS zcl_foo DEFINITION.',
        'ENDCLASS.',
        '',
      ].join('\n'),
    );
    const names = tokens.map((t) => t.tokenType.name);
    expect(names).toContain('ABAPDocLine');
    // Plain line-comment is skipped, so LineComment must not appear.
    expect(names).not.toContain('LineComment');
  });

  it('skips star-comments that start at column 1', () => {
    const { tokens } = tokenize(
      ['* generated header', 'CLASS zcl_foo DEFINITION.', 'ENDCLASS.'].join(
        '\n',
      ),
    );
    expect(tokens[0].tokenType.name).toBe('Class');
  });

  it('does NOT treat a mid-line asterisk as a star-comment', () => {
    // A mid-line `*` (not at column 1) must tokenise as a Star symbol,
    // NOT swallow the rest of the line as a comment. The tokens AFTER
    // the `*` must still be visible to the parser.
    const { tokens, errors } = tokenize('CLASS zcl. *trailing.');
    expect(errors).toEqual([]);
    const names = tokens.map((t) => t.tokenType.name);
    // Must contain Star followed by `trailing` identifier — proving the
    // `*` didn't swallow the rest of the line.
    expect(names).toContain('Star');
    const starIdx = names.indexOf('Star');
    expect(names[starIdx + 1]).toBe('Identifier');
    expect(tokens[starIdx + 1].image).toBe('trailing');
  });

  it('tokenises static and instance access operators', () => {
    expect(tokenNames('cl_foo=>bar( ).')).toEqual([
      'Identifier',
      'FatArrow',
      'Identifier',
      'LParen',
      'RParen',
      'Dot',
    ]);
    expect(tokenNames('me->baz( ).')).toEqual([
      'Identifier',
      'Arrow',
      'Identifier',
      'LParen',
      'RParen',
      'Dot',
    ]);
  });

  it('tokenises qualified interface members with tilde', () => {
    expect(tokenNames('ALIASES save FOR zif_io~save.')).toEqual([
      'Aliases',
      'Identifier',
      'For',
      'Identifier',
      'Tilde',
      'Identifier',
      'Dot',
    ]);
  });

  it('tokenises method signature keywords', () => {
    const src =
      'METHODS get IMPORTING pet_id TYPE string RETURNING VALUE(r) TYPE i RAISING zcx_err.';
    expect(tokenNames(src)).toEqual([
      'Methods',
      'Identifier',
      'Importing',
      'Identifier',
      'Type',
      'Identifier',
      'Returning',
      'Value',
      'LParen',
      'Identifier',
      'RParen',
      'Type',
      'Identifier',
      'Raising',
      'Identifier',
      'Dot',
    ]);
  });

  it('exposes all tokens through the public `tokens` namespace', () => {
    expect(T.AclassLexer).toBeDefined();
    expect(T.allTokens.length).toBeGreaterThan(40);
    expect(T.Class.name).toBe('Class');
    expect(T.Interface.name).toBe('Interface');
    expect(T.EndClass.name).toBe('EndClass');
  });
});
