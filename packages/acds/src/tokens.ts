/**
 * Chevrotain Token Definitions for ABAP CDS
 *
 * Token order matters: more specific patterns must come before general ones.
 * Keywords use `longer_alt` to avoid matching prefixes of identifiers.
 */
import { createToken, Lexer } from 'chevrotain';

// ============================================
// Whitespace & Comments
// ============================================

export const WhiteSpace = createToken({
  name: 'WhiteSpace',
  pattern: /\s+/,
  group: Lexer.SKIPPED,
});

export const LineComment = createToken({
  name: 'LineComment',
  pattern: /\/\/[^\n]*/,
  group: Lexer.SKIPPED,
});

export const BlockComment = createToken({
  name: 'BlockComment',
  pattern: /\/\*[\s\S]*?\*\//,
  group: Lexer.SKIPPED,
});

// ============================================
// Literals
// ============================================

export const StringLiteral = createToken({
  name: 'StringLiteral',
  pattern: /'(?:[^'\\]|\\.)*'/,
});

export const NumberLiteral = createToken({
  name: 'NumberLiteral',
  pattern: /\d+(?:\.\d+)?/,
});

/** Hash-prefixed enum value: #TRANSPARENT, #NOT_EXTENSIBLE */
export const EnumLiteral = createToken({
  name: 'EnumLiteral',
  pattern: /#[A-Za-z_][A-Za-z0-9_]*/,
});

// ============================================
// Identifier (must come AFTER all keywords)
// ============================================

export const Identifier = createToken({
  name: 'Identifier',
  pattern: /[A-Za-z_][A-Za-z0-9_]*/,
});

// ============================================
// Keywords (use longer_alt: Identifier)
// ============================================

export const Define = createToken({
  name: 'Define',
  pattern: /define/,
  longer_alt: Identifier,
});

export const Table = createToken({
  name: 'Table',
  pattern: /table/,
  longer_alt: Identifier,
});

export const Structure = createToken({
  name: 'Structure',
  pattern: /structure/,
  longer_alt: Identifier,
});

export const Type = createToken({
  name: 'Type',
  pattern: /type/,
  longer_alt: Identifier,
});

export const Service = createToken({
  name: 'Service',
  pattern: /service/,
  longer_alt: Identifier,
});

export const Expose = createToken({
  name: 'Expose',
  pattern: /expose/,
  longer_alt: Identifier,
});

export const Annotate = createToken({
  name: 'Annotate',
  pattern: /annotate/,
  longer_alt: Identifier,
});

export const Entity = createToken({
  name: 'Entity',
  pattern: /entity/,
  longer_alt: Identifier,
});

export const With = createToken({
  name: 'With',
  pattern: /with/,
  longer_alt: Identifier,
});

export const Key = createToken({
  name: 'Key',
  pattern: /key/,
  longer_alt: Identifier,
});

export const Not = createToken({
  name: 'Not',
  pattern: /not/,
  longer_alt: Identifier,
});

export const Null = createToken({
  name: 'Null',
  pattern: /null/,
  longer_alt: Identifier,
});

export const As = createToken({
  name: 'As',
  pattern: /as/,
  longer_alt: Identifier,
});

export const Include = createToken({
  name: 'Include',
  pattern: /include/,
  longer_alt: Identifier,
});

export const True = createToken({
  name: 'True',
  pattern: /true/,
  longer_alt: Identifier,
});

export const False = createToken({
  name: 'False',
  pattern: /false/,
  longer_alt: Identifier,
});

export const Abap = createToken({
  name: 'Abap',
  pattern: /abap/,
  longer_alt: Identifier,
});

// ============================================
// Symbols
// ============================================

export const At = createToken({ name: 'At', pattern: /@/ });
export const Colon = createToken({ name: 'Colon', pattern: /:/ });
export const Semicolon = createToken({ name: 'Semicolon', pattern: /;/ });
export const Dot = createToken({ name: 'Dot', pattern: /\./ });
export const Comma = createToken({ name: 'Comma', pattern: /,/ });
export const LBrace = createToken({ name: 'LBrace', pattern: /\{/ });
export const RBrace = createToken({ name: 'RBrace', pattern: /\}/ });
export const LParen = createToken({ name: 'LParen', pattern: /\(/ });
export const RParen = createToken({ name: 'RParen', pattern: /\)/ });
export const LBracket = createToken({ name: 'LBracket', pattern: /\[/ });
export const RBracket = createToken({ name: 'RBracket', pattern: /\]/ });

// ============================================
// Token list (ORDER MATTERS)
// Keywords must come before Identifier
// ============================================

export const allTokens = [
  // Whitespace & comments (skipped)
  WhiteSpace,
  LineComment,
  BlockComment,

  // Literals
  StringLiteral,
  NumberLiteral,
  EnumLiteral,

  // Keywords (before Identifier!)
  Define,
  Table,
  Structure,
  Type,
  Service,
  Expose,
  Annotate,
  Entity,
  With,
  Key,
  Not,
  Null,
  As,
  Include,
  True,
  False,
  Abap,

  // Identifier (catch-all for names)
  Identifier,

  // Symbols
  At,
  Colon,
  Semicolon,
  Dot,
  Comma,
  LBrace,
  RBrace,
  LParen,
  RParen,
  LBracket,
  RBracket,
];

export const CdsLexer = new Lexer(allTokens);
