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

export const Suffix = createToken({
  name: 'Suffix',
  pattern: /suffix/,
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

// ---- Phase 2/3 additions ----

export const View = createToken({
  name: 'View',
  pattern: /view/,
  longer_alt: Identifier,
});

export const Projection = createToken({
  name: 'Projection',
  pattern: /projection/,
  longer_alt: Identifier,
});

export const Select = createToken({
  name: 'Select',
  pattern: /select/,
  longer_alt: Identifier,
});

export const From = createToken({
  name: 'From',
  pattern: /from/,
  longer_alt: Identifier,
});

export const On = createToken({
  name: 'On',
  pattern: /on/,
  longer_alt: Identifier,
});

export const Association = createToken({
  name: 'Association',
  pattern: /association/,
  longer_alt: Identifier,
});

export const Composition = createToken({
  name: 'Composition',
  pattern: /composition/,
  longer_alt: Identifier,
});

export const To = createToken({
  name: 'To',
  pattern: /to/,
  longer_alt: Identifier,
});

export const Many = createToken({
  name: 'Many',
  pattern: /many/,
  longer_alt: Identifier,
});

export const One = createToken({
  name: 'One',
  pattern: /one/,
  longer_alt: Identifier,
});

export const Of = createToken({
  name: 'Of',
  pattern: /of/,
  longer_alt: Identifier,
});

export const Parameters = createToken({
  name: 'Parameters',
  pattern: /parameters/,
  longer_alt: Identifier,
});

export const Role = createToken({
  name: 'Role',
  pattern: /role/,
  longer_alt: Identifier,
});

export const Grant = createToken({
  name: 'Grant',
  pattern: /grant/,
  longer_alt: Identifier,
});

export const Where = createToken({
  name: 'Where',
  pattern: /where/,
  longer_alt: Identifier,
});

export const Abstract = createToken({
  name: 'Abstract',
  pattern: /abstract/,
  longer_alt: Identifier,
});

export const Custom = createToken({
  name: 'Custom',
  pattern: /custom/,
  longer_alt: Identifier,
});

export const Virtual = createToken({
  name: 'Virtual',
  pattern: /virtual/,
  longer_alt: Identifier,
});

export const Redirected = createToken({
  name: 'Redirected',
  pattern: /redirected/,
  longer_alt: Identifier,
});

export const Default = createToken({
  name: 'Default',
  pattern: /default/,
  longer_alt: Identifier,
});

// Operators for simple expressions inside where-clauses / associations
export const EqEq = createToken({ name: 'EqEq', pattern: /==/ });
export const Eq = createToken({ name: 'Eq', pattern: /=/ });
export const NotEq = createToken({ name: 'NotEq', pattern: /!=|<>/ });
export const LtEq = createToken({ name: 'LtEq', pattern: /<=/ });
export const GtEq = createToken({ name: 'GtEq', pattern: />=/ });
export const Lt = createToken({ name: 'Lt', pattern: /</ });
export const Gt = createToken({ name: 'Gt', pattern: />/ });

export const And = createToken({
  name: 'And',
  pattern: /and/,
  longer_alt: Identifier,
});

export const Or = createToken({
  name: 'Or',
  pattern: /or/,
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
export const Star = createToken({ name: 'Star', pattern: /\*/ });
export const Plus = createToken({ name: 'Plus', pattern: /\+/ });
export const Minus = createToken({ name: 'Minus', pattern: /-/ });
export const Slash = createToken({ name: 'Slash', pattern: /\// });

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
  // NOTE: longer keywords that share a prefix with shorter ones (e.g.
  // `association` starts with `as`, `one` starts with `on`) MUST be listed
  // before the shorter keyword otherwise Chevrotain's lexer will complain
  // that they are unreachable.
  Association,
  Composition,
  Abstract,
  Annotate,
  Define,
  Table,
  Structure,
  Type,
  Service,
  Expose,
  Entity,
  With,
  Key,
  Not,
  Null,
  As,
  Include,
  Suffix,
  True,
  False,
  Abap,
  One,
  View,
  Projection,
  Select,
  From,
  On,
  To,
  Many,
  Of,
  Parameters,
  Role,
  Grant,
  Where,
  Custom,
  Virtual,
  Redirected,
  Default,
  And,
  Or,

  // Identifier (catch-all for names)
  Identifier,

  // Multi-char symbols (before single-char equivalents)
  EqEq,
  NotEq,
  LtEq,
  GtEq,

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
  Eq,
  Lt,
  Gt,
  Star,
  Plus,
  Minus,
  Slash,
];

export const CdsLexer = new Lexer(allTokens);
