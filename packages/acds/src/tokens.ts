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

/**
 * SQL-style line comment: `-- some text`.
 *
 * ABAP CDS sources (especially the classic `define view` ones) use SQL
 * comments. The pattern is tried before the `Minus` token, so `--` always
 * wins over two minus signs.
 */
export const SqlLineComment = createToken({
  name: 'SqlLineComment',
  pattern: /--[^\n]*/,
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

/**
 * ABAP namespace-qualified identifier: `/NS/NAME` (optionally with further
 * segments, e.g. `/NS/SUB/NAME`). Used for repository object names that live
 * in a namespace. Must be tried before the generic `Slash` token so the
 * whole qualified name is captured as one token.
 */
/** Token types that may end an expression atom; a following `/` is division. */
const EXPRESSION_ATOMS = new Set([
  'Identifier',
  'NamespacedIdentifier',
  'NumberLiteral',
  'StringLiteral',
  'EnumLiteral',
  'RParen',
  'RBracket',
  'RBrace',
]);

function lastScannedToken(tokens: any[]): any {
  if (!tokens) return null;
  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = tokens[i];
    if (token?.tokenType?.name !== 'WhiteSpace') return token;
  }
  return null;
}

/**
 * ABAP namespace-qualified identifier: `/NS/NAME` (optionally with further
 * segments, e.g. `/NS/SUB/NAME`). Used for repository object names that live
 * in a namespace.
 *
 * The lexer cannot tell a namespace name apart from a division chain on
 * syntax alone (`a/b/c` vs `/b/c`), so the match is context-sensitive: it
 * only fires when the preceding token is NOT an expression atom, keeping
 * compact division (`a/b/c`) tokenized as `Slash` operators. Numeric-leading
 * namespace segments (e.g. `/1BCDWB/NAME`) are allowed.
 */
export const NamespacedIdentifier = createToken({
  name: 'NamespacedIdentifier',
  pattern: (text: string, offset: number, tokens: any[]) => {
    if (text.charAt(offset) !== '/') return null;

    const previous = lastScannedToken(tokens);
    if (EXPRESSION_ATOMS.has(previous?.tokenType?.name)) return null;

    const match = /^\/\w+(?:\/\w+)+/.exec(text.slice(offset));
    return match ? [match[0]] : null;
  },
});

// ============================================
// Keywords (use longer_alt: Identifier)
// ============================================

// Keyword patterns are case-insensitive `/…/i` literals — CDS sources are
// written in upper, lower or mixed case, and the token image keeps the
// original spelling so identifiers keep their case in the AST.

export const Define = createToken({
  name: 'Define',
  pattern: /define/i,
  longer_alt: Identifier,
});

export const Table = createToken({
  name: 'Table',
  pattern: /table/i,
  longer_alt: Identifier,
});

export const Structure = createToken({
  name: 'Structure',
  pattern: /structure/i,
  longer_alt: Identifier,
});

export const Type = createToken({
  name: 'Type',
  pattern: /type/i,
  longer_alt: Identifier,
});

export const Service = createToken({
  name: 'Service',
  pattern: /service/i,
  longer_alt: Identifier,
});

export const Expose = createToken({
  name: 'Expose',
  pattern: /expose/i,
  longer_alt: Identifier,
});

export const Annotate = createToken({
  name: 'Annotate',
  pattern: /annotate/i,
  longer_alt: Identifier,
});

export const Entity = createToken({
  name: 'Entity',
  pattern: /entity/i,
  longer_alt: Identifier,
});

export const With = createToken({
  name: 'With',
  pattern: /with/i,
  longer_alt: Identifier,
});

export const Key = createToken({
  name: 'Key',
  pattern: /key/i,
  longer_alt: Identifier,
});

export const Not = createToken({
  name: 'Not',
  pattern: /not/i,
  longer_alt: Identifier,
});

export const Null = createToken({
  name: 'Null',
  pattern: /null/i,
  longer_alt: Identifier,
});

export const As = createToken({
  name: 'As',
  pattern: /as/i,
  longer_alt: Identifier,
});

export const Include = createToken({
  name: 'Include',
  pattern: /include/i,
  longer_alt: Identifier,
});

export const Suffix = createToken({
  name: 'Suffix',
  pattern: /suffix/i,
  longer_alt: Identifier,
});

export const True = createToken({
  name: 'True',
  pattern: /true/i,
  longer_alt: Identifier,
});

export const False = createToken({
  name: 'False',
  pattern: /false/i,
  longer_alt: Identifier,
});

export const Abap = createToken({
  name: 'Abap',
  pattern: /abap/i,
  longer_alt: Identifier,
});

// ---- Phase 2/3 additions ----

export const View = createToken({
  name: 'View',
  pattern: /view/i,
  longer_alt: Identifier,
});

export const Projection = createToken({
  name: 'Projection',
  pattern: /projection/i,
  longer_alt: Identifier,
});

export const Select = createToken({
  name: 'Select',
  pattern: /select/i,
  longer_alt: Identifier,
});

export const From = createToken({
  name: 'From',
  pattern: /from/i,
  longer_alt: Identifier,
});

export const On = createToken({
  name: 'On',
  pattern: /on/i,
  longer_alt: Identifier,
});

export const Association = createToken({
  name: 'Association',
  pattern: /association/i,
  longer_alt: Identifier,
});

export const Composition = createToken({
  name: 'Composition',
  pattern: /composition/i,
  longer_alt: Identifier,
});

export const To = createToken({
  name: 'To',
  pattern: /to/i,
  longer_alt: Identifier,
});

export const Many = createToken({
  name: 'Many',
  pattern: /many/i,
  longer_alt: Identifier,
});

export const One = createToken({
  name: 'One',
  pattern: /one/i,
  longer_alt: Identifier,
});

export const Of = createToken({
  name: 'Of',
  pattern: /of/i,
  longer_alt: Identifier,
});

export const Parameters = createToken({
  name: 'Parameters',
  pattern: /parameters/i,
  longer_alt: Identifier,
});

export const Role = createToken({
  name: 'Role',
  pattern: /role/i,
  longer_alt: Identifier,
});

export const Grant = createToken({
  name: 'Grant',
  pattern: /grant/i,
  longer_alt: Identifier,
});

export const Where = createToken({
  name: 'Where',
  pattern: /where/i,
  longer_alt: Identifier,
});

export const Abstract = createToken({
  name: 'Abstract',
  pattern: /abstract/i,
  longer_alt: Identifier,
});

export const Custom = createToken({
  name: 'Custom',
  pattern: /custom/i,
  longer_alt: Identifier,
});

export const Virtual = createToken({
  name: 'Virtual',
  pattern: /virtual/i,
  longer_alt: Identifier,
});

export const Redirected = createToken({
  name: 'Redirected',
  pattern: /redirected/i,
  longer_alt: Identifier,
});

export const Default = createToken({
  name: 'Default',
  pattern: /default/i,
  longer_alt: Identifier,
});

// ---- JOIN keywords ----------------------------------------------------
//
// ABAP CDS supports `JOIN` (= INNER JOIN), `INNER JOIN`, `LEFT [OUTER] JOIN`,
// `RIGHT [OUTER] JOIN` and `CROSS JOIN`. The SQL-standard `FULL [OUTER] JOIN`
// is supported as well, so that HANA CDS / CAP CDS sources (which use the
// standard SQL join syntax) can be read with the same grammar.
//
// The keywords are tokenized separately so the parser can normalize the
// different spellings.

export const Join = createToken({
  name: 'Join',
  pattern: /join/i,
  longer_alt: Identifier,
});

export const Inner = createToken({
  name: 'Inner',
  pattern: /inner/i,
  longer_alt: Identifier,
});

export const Left = createToken({
  name: 'Left',
  pattern: /left/i,
  longer_alt: Identifier,
});

export const Right = createToken({
  name: 'Right',
  pattern: /right/i,
  longer_alt: Identifier,
});

export const Cross = createToken({
  name: 'Cross',
  pattern: /cross/i,
  longer_alt: Identifier,
});

export const Full = createToken({
  name: 'Full',
  pattern: /full/i,
  longer_alt: Identifier,
});

/**
 * `OUTER` — must be listed BEFORE `Or`, because `or` is a prefix of `outer`
 * and the lexer resolves the first matching token in list order.
 */
export const Outer = createToken({
  name: 'Outer',
  pattern: /outer/i,
  longer_alt: Identifier,
});

// ---- SELECT clauses & set operators -------------------------------------

export const Distinct = createToken({
  name: 'Distinct',
  pattern: /distinct/i,
  longer_alt: Identifier,
});

export const Union = createToken({
  name: 'Union',
  pattern: /union/i,
  longer_alt: Identifier,
});

export const Intersect = createToken({
  name: 'Intersect',
  pattern: /intersect/i,
  longer_alt: Identifier,
});

export const Except = createToken({
  name: 'Except',
  pattern: /except/i,
  longer_alt: Identifier,
});

export const Allowed = createToken({
  name: 'Allowed',
  pattern: /allowed/i,
  longer_alt: Identifier,
});

/** NOTE: `allowed` must precede `all` (`all` is a prefix of `allowed`). */
export const All = createToken({
  name: 'All',
  pattern: /all/i,
  longer_alt: Identifier,
});

export const Group = createToken({
  name: 'Group',
  pattern: /group/i,
  longer_alt: Identifier,
});

export const Having = createToken({
  name: 'Having',
  pattern: /having/i,
  longer_alt: Identifier,
});

// ---- Entity modifiers ----------------------------------------------------

export const Root = createToken({
  name: 'Root',
  pattern: /root/i,
  longer_alt: Identifier,
});

export const Writable = createToken({
  name: 'Writable',
  pattern: /writable/i,
  longer_alt: Identifier,
});

export const Switchable = createToken({
  name: 'Switchable',
  pattern: /switchable/i,
  longer_alt: Identifier,
});

// ---- Cardinality words & association flavours ----------------------------

export const Exact = createToken({
  name: 'Exact',
  pattern: /exact/i,
  longer_alt: Identifier,
});

export const Parents = createToken({
  name: 'Parents',
  pattern: /parents/i,
  longer_alt: Identifier,
});

export const Parent = createToken({
  name: 'Parent',
  pattern: /parent/i,
  longer_alt: Identifier,
});

export const Child = createToken({
  name: 'Child',
  pattern: /child/i,
  longer_alt: Identifier,
});

export const Localized = createToken({
  name: 'Localized',
  pattern: /localized/i,
  longer_alt: Identifier,
});

export const Redefine = createToken({
  name: 'Redefine',
  pattern: /redefine/i,
  longer_alt: Identifier,
});

export const Redefinition = createToken({
  name: 'Redefinition',
  pattern: /redefinition/i,
  longer_alt: Identifier,
});

export const Filter = createToken({
  name: 'Filter',
  pattern: /filter/i,
  longer_alt: Identifier,
});

export const Bind = createToken({
  name: 'Bind',
  pattern: /bind/i,
  longer_alt: Identifier,
});

// ---- Functions -----------------------------------------------------------

export const FunctionKeyword = createToken({
  name: 'Function',
  pattern: /function/i,
  longer_alt: Identifier,
});

export const Returns = createToken({
  name: 'Returns',
  pattern: /returns/i,
  longer_alt: Identifier,
});

export const Implemented = createToken({
  name: 'Implemented',
  pattern: /implemented/i,
  longer_alt: Identifier,
});

export const Method = createToken({
  name: 'Method',
  pattern: /method/i,
  longer_alt: Identifier,
});

export const Scalar = createToken({
  name: 'Scalar',
  pattern: /scalar/i,
  longer_alt: Identifier,
});

// ---- Further entity kinds ------------------------------------------------

export const Hierarchy = createToken({
  name: 'Hierarchy',
  pattern: /hierarchy/i,
  longer_alt: Identifier,
});

export const Aspect = createToken({
  name: 'Aspect',
  pattern: /aspect/i,
  longer_alt: Identifier,
});

export const AnnotationKeyword = createToken({
  name: 'AnnotationKeyword',
  pattern: /annotation/i,
  longer_alt: Identifier,
});

export const Extend = createToken({
  name: 'Extend',
  pattern: /extend/i,
  longer_alt: Identifier,
});

export const Accesspolicy = createToken({
  name: 'Accesspolicy',
  pattern: /accesspolicy/i,
  longer_alt: Identifier,
});

export const External = createToken({
  name: 'External',
  pattern: /external/i,
  longer_alt: Identifier,
});

export const Provider = createToken({
  name: 'Provider',
  pattern: /provider/i,
  longer_alt: Identifier,
});

export const Contract = createToken({
  name: 'Contract',
  pattern: /contract/i,
  longer_alt: Identifier,
});

export const Name = createToken({
  name: 'Name',
  pattern: /name/i,
  longer_alt: Identifier,
});

export const Federated = createToken({
  name: 'Federated',
  pattern: /federated/i,
  longer_alt: Identifier,
});

export const Data = createToken({
  name: 'Data',
  pattern: /data/i,
  longer_alt: Identifier,
});

export const Provided = createToken({
  name: 'Provided',
  pattern: /provided/i,
  longer_alt: Identifier,
});

export const AtKeyword = createToken({
  name: 'AtKeyword',
  pattern: /at/i,
  longer_alt: Identifier,
});

export const Runtime = createToken({
  name: 'Runtime',
  pattern: /runtime/i,
  longer_alt: Identifier,
});

// ---- CASE expressions ----------------------------------------------------

export const Case = createToken({
  name: 'Case',
  pattern: /case/i,
  longer_alt: Identifier,
});

export const When = createToken({
  name: 'When',
  pattern: /when/i,
  longer_alt: Identifier,
});

export const Then = createToken({
  name: 'Then',
  pattern: /then/i,
  longer_alt: Identifier,
});

export const Else = createToken({
  name: 'Else',
  pattern: /else/i,
  longer_alt: Identifier,
});

export const End = createToken({
  name: 'End',
  pattern: /end/i,
  longer_alt: Identifier,
});

// ---- Condition operators -------------------------------------------------

export const Like = createToken({
  name: 'Like',
  pattern: /like/i,
  longer_alt: Identifier,
});

export const Between = createToken({
  name: 'Between',
  pattern: /between/i,
  longer_alt: Identifier,
});

export const Over = createToken({
  name: 'Over',
  pattern: /over/i,
  longer_alt: Identifier,
});

export const Partition = createToken({
  name: 'Partition',
  pattern: /partition/i,
  longer_alt: Identifier,
});

// ---- Hierarchy clauses ----------------------------------------------------

export const Siblings = createToken({
  name: 'Siblings',
  pattern: /siblings/i,
  longer_alt: Identifier,
});

export const Order = createToken({
  name: 'Order',
  pattern: /order/i,
  longer_alt: Identifier,
});

export const Start = createToken({
  name: 'Start',
  pattern: /start/i,
  longer_alt: Identifier,
});

export const Source = createToken({
  name: 'Source',
  pattern: /source/i,
  longer_alt: Identifier,
});

export const Directory = createToken({
  name: 'Directory',
  pattern: /directory/i,
  longer_alt: Identifier,
});

export const Period = createToken({
  name: 'Period',
  pattern: /period/i,
  longer_alt: Identifier,
});

export const Valid = createToken({
  name: 'Valid',
  pattern: /valid/i,
  longer_alt: Identifier,
});

export const Depth = createToken({
  name: 'Depth',
  pattern: /depth/i,
  longer_alt: Identifier,
});

export const Nodetype = createToken({
  name: 'Nodetype',
  pattern: /nodetype/i,
  longer_alt: Identifier,
});

export const Load = createToken({
  name: 'Load',
  pattern: /load/i,
  longer_alt: Identifier,
});

export const Multiple = createToken({
  name: 'Multiple',
  pattern: /multiple/i,
  longer_alt: Identifier,
});

export const Orphans = createToken({
  name: 'Orphans',
  pattern: /orphans/i,
  longer_alt: Identifier,
});

export const Cycles = createToken({
  name: 'Cycles',
  pattern: /cycles/i,
  longer_alt: Identifier,
});

export const Generate = createToken({
  name: 'Generate',
  pattern: /generate/i,
  longer_alt: Identifier,
});

export const Spantree = createToken({
  name: 'Spantree',
  pattern: /spantree/i,
  longer_alt: Identifier,
});

export const Cache = createToken({
  name: 'Cache',
  pattern: /cache/i,
  longer_alt: Identifier,
});

export const Bulk = createToken({
  name: 'Bulk',
  pattern: /bulk/i,
  longer_alt: Identifier,
});

export const Incremental = createToken({
  name: 'Incremental',
  pattern: /incremental/i,
  longer_alt: Identifier,
});

export const Leaves = createToken({
  name: 'Leaves',
  pattern: /leaves/i,
  longer_alt: Identifier,
});

export const Only = createToken({
  name: 'Only',
  pattern: /only/i,
  longer_alt: Identifier,
});

export const Ascending = createToken({
  name: 'Ascending',
  pattern: /ascending/i,
  longer_alt: Identifier,
});

export const Descending = createToken({
  name: 'Descending',
  pattern: /descending/i,
  longer_alt: Identifier,
});

export const ErrorKeyword = createToken({
  name: 'Error',
  pattern: /error/i,
  longer_alt: Identifier,
});

export const Ignore = createToken({
  name: 'Ignore',
  pattern: /ignore/i,
  longer_alt: Identifier,
});

export const Breakup = createToken({
  name: 'Breakup',
  pattern: /breakup/i,
  longer_alt: Identifier,
});

export const Force = createToken({
  name: 'Force',
  pattern: /force/i,
  longer_alt: Identifier,
});

/** `FOR` — must be listed AFTER `Force` (`for` is a prefix of `force`). */
export const For = createToken({
  name: 'For',
  pattern: /for/i,
  longer_alt: Identifier,
});

export const By = createToken({
  name: 'By',
  pattern: /by/i,
  longer_alt: Identifier,
});

/** `OFF` — must be listed BEFORE `Of` (`of` is a prefix of `off`). */
export const Off = createToken({
  name: 'Off',
  pattern: /off/i,
  longer_alt: Identifier,
});

// ---- DCL additions ---------------------------------------------------------

export const Inheriting = createToken({
  name: 'Inheriting',
  pattern: /inheriting/i,
  longer_alt: Identifier,
});

export const Inherit = createToken({
  name: 'Inherit',
  pattern: /inherit/i,
  longer_alt: Identifier,
});

export const Conditions = createToken({
  name: 'Conditions',
  pattern: /conditions/i,
  longer_alt: Identifier,
});

export const Super = createToken({
  name: 'Super',
  pattern: /super/i,
  longer_alt: Identifier,
});

export const Void = createToken({
  name: 'Void',
  pattern: /void/i,
  longer_alt: Identifier,
});

export const Combination = createToken({
  name: 'Combination',
  pattern: /combination/i,
  longer_alt: Identifier,
});

export const Mode = createToken({
  name: 'Mode',
  pattern: /mode/i,
  longer_alt: Identifier,
});

export const Optional = createToken({
  name: 'Optional',
  pattern: /optional/i,
  longer_alt: Identifier,
});

export const Elements = createToken({
  name: 'Elements',
  pattern: /elements/i,
  longer_alt: Identifier,
});

/**
 * `IN` — must be listed AFTER every `in*` keyword (`inner`, `intersect`,
 * `include`, `inherit`, `inheriting`, `incremental`), because `in` is a
 * prefix of all of them.
 */
export const In = createToken({
  name: 'In',
  pattern: /in/i,
  longer_alt: Identifier,
});

// Operators for simple expressions inside where-clauses / associations
export const EqEq = createToken({ name: 'EqEq', pattern: /==/ });
export const FatArrow = createToken({ name: 'FatArrow', pattern: /=>/ });
export const Eq = createToken({ name: 'Eq', pattern: /=/ });
export const NotEq = createToken({ name: 'NotEq', pattern: /!=|<>/ });
export const LtEq = createToken({ name: 'LtEq', pattern: /<=/ });
export const GtEq = createToken({ name: 'GtEq', pattern: />=/ });
export const Lt = createToken({ name: 'Lt', pattern: /</ });
export const Gt = createToken({ name: 'Gt', pattern: />/ });
export const Quest = createToken({ name: 'Quest', pattern: /\?/ });

export const And = createToken({
  name: 'And',
  pattern: /and/i,
  longer_alt: Identifier,
});

export const Or = createToken({
  name: 'Or',
  pattern: /or/i,
  longer_alt: Identifier,
});

// ============================================
// Symbols
// ============================================

export const At = createToken({ name: 'At', pattern: /@/ });
export const Colon = createToken({ name: 'Colon', pattern: /:/ });
/** `$` — prefix of system variables such as `$session`, `$parameters`, `$projection`. */
export const Dollar = createToken({ name: 'Dollar', pattern: /\$/ });
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

/**
 * All keyword tokens. Exported so the parser can derive its name-token set
 * (every keyword may legally appear as an identifier in CDS).
 */
export const keywordTokens = [
  // NOTE: longer keywords that share a prefix with shorter ones (e.g.
  // `association` starts with `as`, `one` starts with `on`, `in` is a
  // prefix of `inner`) MUST be listed before the shorter keyword otherwise
  // Chevrotain's lexer will complain that they are unreachable.
  Association,
  Composition,
  Abstract,
  Annotate,
  AnnotationKeyword,
  Accesspolicy,
  Ascending,
  Aspect,
  Allowed,
  As,
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
  Include,
  Suffix,
  True,
  False,
  Abap,
  One,
  // NOTE: `Only` must precede `On` (`on` is a prefix of `only`).
  Only,
  View,
  Projection,
  Select,
  From,
  On,
  To,
  Many,
  // NOTE: `Off` must precede `Of` (`of` is a prefix of `off`).
  Off,
  Of,
  Parameters,
  Role,
  Grant,
  Where,
  Custom,
  Virtual,
  Redirected,
  Redefinition,
  Redefine,
  Default,
  Distinct,
  Union,
  Intersect,
  Except,
  All,
  Group,
  Having,
  Root,
  Writable,
  Switchable,
  Exact,
  Parents,
  Parent,
  Child,
  Localized,
  Filter,
  Bind,
  FunctionKeyword,
  Returns,
  Implemented,
  Method,
  Scalar,
  Hierarchy,
  Extend,
  External,
  Provider,
  Provided,
  Contract,
  Name,
  Federated,
  Data,
  AtKeyword,
  Runtime,
  Case,
  When,
  Then,
  Else,
  End,
  Like,
  Between,
  Over,
  Partition,
  Siblings,
  Order,
  Orphans,
  Optional,
  Start,
  Source,
  Directory,
  Period,
  Valid,
  Depth,
  Nodetype,
  Load,
  Multiple,
  Cycles,
  Generate,
  Spantree,
  Cache,
  Bulk,
  Incremental,
  Leaves,
  Descending,
  ErrorKeyword,
  Ignore,
  Breakup,
  Force,
  For,
  By,
  Conditions,
  Inheriting,
  Inherit,
  Super,
  Void,
  Combination,
  Mode,
  Elements,
  Join,
  Inner,
  Left,
  Right,
  Cross,
  Full,
  // NOTE: `Outer`/`Order`/`Orphans`/`Optional` must precede `Or`.
  Outer,
  And,
  Or,
  // NOTE: `In` must come after every `in*` keyword.
  In,
];

export const allTokens = [
  // Whitespace & comments (skipped)
  WhiteSpace,
  LineComment,
  BlockComment,
  SqlLineComment,

  // Literals
  StringLiteral,
  NumberLiteral,
  EnumLiteral,

  // Keywords (before Identifier!)
  ...keywordTokens,

  // Identifier (catch-all for names)
  Identifier,

  // Namespace-qualified identifiers (/NS/NAME) — before Slash
  NamespacedIdentifier,

  // Multi-char symbols (before single-char equivalents)
  EqEq,
  NotEq,
  LtEq,
  GtEq,
  FatArrow,

  // Symbols
  At,
  Colon,
  Dollar,
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
  Quest,
  Star,
  Plus,
  Minus,
  Slash,
];

export const CdsLexer = new Lexer(allTokens);
