/**
 * Chevrotain Token Definitions for the ABAP OO surface grammar.
 *
 * Scope: everything `@abapify/aclass` needs to tokenise a `.clas.abap` or
 * `.intf.abap` source file up to the point where method bodies become
 * opaque text. Method-body statements are NOT tokenised here — they are
 * captured verbatim by a dedicated body-capture token.
 *
 * ABAP is case-insensitive. All keywords use `/i` patterns so `CLASS`,
 * `Class`, and `class` all tokenise the same way.
 *
 * Keyword order inside `allTokens` matters:
 *   1. Multi-char operators before their single-char prefixes.
 *   2. Longer keywords before their prefixes (e.g. `CLASS-DATA` before
 *      `CLASS`, `INTERFACES` before `INTERFACE`, `NON-UNIQUE` before
 *      `UNIQUE`).
 *   3. `ABAPDocLine` BEFORE `LineComment` so `"! foo` is captured as
 *      documentation instead of as a regular line comment.
 *   4. `Identifier` must come last among the word-shaped tokens so that
 *      keywords win their matches via `longer_alt`.
 */
import { createToken, Lexer } from 'chevrotain';

// ============================================
// Whitespace
// ============================================

export const WhiteSpace = createToken({
  name: 'WhiteSpace',
  pattern: /[ \t]+/,
  group: Lexer.SKIPPED,
});

export const Newline = createToken({
  name: 'Newline',
  pattern: /\r?\n/,
  group: Lexer.SKIPPED,
});

// ============================================
// Comments
// ============================================

/**
 * ABAPDoc line: `"! …` up to end of line. MUST come before LineComment
 * because `"!` is a prefix of `"`.
 */
export const ABAPDocLine = createToken({
  name: 'ABAPDocLine',
  pattern: /"![^\r\n]*/,
});

/** Regular line comment: `" …` up to end of line. */
export const LineComment = createToken({
  name: 'LineComment',
  pattern: /"[^\r\n]*/,
  group: Lexer.SKIPPED,
});

/** Full-line comment starting at column 1 with `*`. Only recognised at SOL. */
type CustomPattern = {
  exec: (text: string, offset: number) => RegExpExecArray | null;
  line_breaks?: boolean;
};
const starCommentPattern: CustomPattern = {
  line_breaks: false,
  exec: (text, offset) => {
    // Only match when at start of line (offset 0 or previous char is \n).
    if (offset !== 0 && text.charCodeAt(offset - 1) !== 0x0a /* \n */) {
      return null;
    }
    if (text.charCodeAt(offset) !== 0x2a /* * */) return null;
    let end = offset;
    while (end < text.length) {
      const c = text.charCodeAt(end);
      if (c === 0x0a || c === 0x0d) break;
      end++;
    }
    const match = text.slice(offset, end);
    return [match] as unknown as RegExpExecArray;
  },
};
export const StarComment = createToken({
  name: 'StarComment',
  pattern: starCommentPattern as unknown as RegExp,
  line_breaks: false,
  group: Lexer.SKIPPED,
});

// ============================================
// Literals
// ============================================

/** Single-quoted ABAP text literal: `'...'` with doubled `''` for escaping. */
export const StringLiteral = createToken({
  name: 'StringLiteral',
  pattern: /'(?:[^']|'')*'/,
});

/** Backtick string literal: \`...\`. */
export const BacktickLiteral = createToken({
  name: 'BacktickLiteral',
  pattern: /`(?:[^`]|``)*`/,
});

export const IntegerLiteral = createToken({
  name: 'IntegerLiteral',
  pattern: /-?\d+/,
});

// ============================================
// Identifier (must come AFTER all keywords in allTokens)
// ============================================

/**
 * ABAP identifier: starts with letter or underscore; may contain letters,
 * digits, underscores, slash (for namespaces like `/ui2/cl_json`), and
 * tilde (for qualified names like `zif_foo~method`) — but tilde is
 * reserved for qualified references, so at the lexer level we only allow
 * the "simple" form here. Qualified `~` and `=>` are handled in the
 * parser via separate tokens.
 *
 * Note: the `=>` operator (static scope) is tokenised as a distinct
 * symbol, not as part of the identifier.
 */
export const Identifier = createToken({
  name: 'Identifier',
  pattern: /[A-Za-z_][A-Za-z0-9_/]*/,
});

// ============================================
// Keyword factory
// ============================================

// All characters that have a special meaning inside a RegExp literal.
// We escape every one of them when embedding `word` into a dynamic
// pattern so CodeQL's `js/incomplete-sanitization` stops complaining
// and callers cannot inject pattern metacharacters by accident.
const REGEX_META = /[.*+?^${}()|[\]\\/\-]/g;
function kw(name: string, word: string) {
  // Case-insensitive, whole-word match. `longer_alt: Identifier` makes
  // the keyword lose to `Identifier` when followed by an identifier
  // character, avoiding false positives like `CLASSIFIER` being split
  // into `CLASS IFIER`.
  const pattern = new RegExp(word.replace(REGEX_META, '\\$&'), 'i');
  return createToken({ name, pattern, longer_alt: Identifier });
}

// ============================================
// Keywords (compound ones first)
// ============================================

// `CLASS-METHODS`, `CLASS-DATA`, `CLASS-EVENTS` — must be declared BEFORE
// `CLASS` itself so the longer keyword wins.
export const ClassMethods = kw('ClassMethods', 'class-methods');
export const ClassData = kw('ClassData', 'class-data');
export const ClassEvents = kw('ClassEvents', 'class-events');

// `NON-UNIQUE` before `UNIQUE`
export const NonUnique = kw('NonUnique', 'non-unique');

// Core OO keywords
export const Class = kw('Class', 'class');
export const Interfaces = kw('Interfaces', 'interfaces'); // MUST come before Interface
export const Interface = kw('Interface', 'interface');
export const EndClass = kw('EndClass', 'endclass');
export const EndInterface = kw('EndInterface', 'endinterface');
export const EndMethod = kw('EndMethod', 'endmethod');
export const Definition = kw('Definition', 'definition');
export const Implementation = kw('Implementation', 'implementation');
export const Deferred = kw('Deferred', 'deferred');
export const Load = kw('Load', 'load');

// Section visibility
export const Public = kw('Public', 'public');
export const Protected = kw('Protected', 'protected');
export const Private = kw('Private', 'private');
export const Section = kw('Section', 'section');

// Member declaration keywords
export const Methods = kw('Methods', 'methods');
export const Method = kw('Method', 'method');
export const Data = kw('Data', 'data');
export const Types = kw('Types', 'types');
export const Constants = kw('Constants', 'constants');
export const Events = kw('Events', 'events');
export const Aliases = kw('Aliases', 'aliases');

// Class-header modifiers
export const Inheriting = kw('Inheriting', 'inheriting');
export const From = kw('From', 'from');
export const For = kw('For', 'for');
export const Testing = kw('Testing', 'testing');
export const Risk = kw('Risk', 'risk');
export const Level = kw('Level', 'level');
export const Duration = kw('Duration', 'duration');
export const Final = kw('Final', 'final');
export const Abstract = kw('Abstract', 'abstract');
export const Create = kw('Create', 'create');

// Method signature keywords
export const Importing = kw('Importing', 'importing');
export const Exporting = kw('Exporting', 'exporting');
export const Changing = kw('Changing', 'changing');
export const Returning = kw('Returning', 'returning');
export const Raising = kw('Raising', 'raising');
export const Value = kw('Value', 'value');
export const Optional = kw('Optional', 'optional');
export const Default = kw('Default', 'default');
export const Redefinition = kw('Redefinition', 'redefinition');

// Type-ref keywords
export const Type = kw('Type', 'type');
export const Ref = kw('Ref', 'ref');
export const To = kw('To', 'to');
export const Like = kw('Like', 'like');

// Table / structure type keywords
export const Begin = kw('Begin', 'begin');
export const End = kw('End', 'end');
export const Of = kw('Of', 'of');
export const Standard = kw('Standard', 'standard');
export const Sorted = kw('Sorted', 'sorted');
export const Hashed = kw('Hashed', 'hashed');
export const Table = kw('Table', 'table');
export const With = kw('With', 'with');
export const Key = kw('Key', 'key');
export const Empty = kw('Empty', 'empty');
export const Unique = kw('Unique', 'unique');

// Constants / aliases linking
export const As = kw('As', 'as');
export const ReadOnly = kw('ReadOnly', 'read-only');

// Visibility risk-level / duration literals (these are IDENTIFIERS in
// the real grammar, but we keep them as plain Identifier and interpret
// them in the visitor; no dedicated tokens).

// ============================================
// Symbols — multi-char first
// ============================================

/** Static scope operator: `=>` */
export const FatArrow = createToken({
  name: 'FatArrow',
  pattern: /=>/,
});

/** Instance member operator: `->` */
export const Arrow = createToken({
  name: 'Arrow',
  pattern: /->/,
});

/** Component selector inside generic reference: `::` (rare, reserved). */
export const ColonColon = createToken({
  name: 'ColonColon',
  pattern: /::/,
});

// Single-char symbols
export const Dot = createToken({ name: 'Dot', pattern: /\./ });
export const Comma = createToken({ name: 'Comma', pattern: /,/ });
export const Colon = createToken({ name: 'Colon', pattern: /:/ });
export const Tilde = createToken({ name: 'Tilde', pattern: /~/ });
export const LParen = createToken({ name: 'LParen', pattern: /\(/ });
export const RParen = createToken({ name: 'RParen', pattern: /\)/ });
export const LBracket = createToken({ name: 'LBracket', pattern: /\[/ });
export const RBracket = createToken({ name: 'RBracket', pattern: /\]/ });
export const Eq = createToken({ name: 'Eq', pattern: /=/ });

// `#` — inferred-type placeholder in `VALUE #(…)`, `NEW #(…)`, `COND #(…)`, etc.
export const Hash = createToken({ name: 'Hash', pattern: /#/ });

// String templates `|…|` with interpolation braces `{` / `}`.
// We tokenise them at the single-character level — good enough for
// opaque-body preservation, since the parser never inspects expression
// interior for MethodImpl.body.
export const Pipe = createToken({ name: 'Pipe', pattern: /\|/ });
export const LBrace = createToken({ name: 'LBrace', pattern: /\{/ });
export const RBrace = createToken({ name: 'RBrace', pattern: /\}/ });

// Arithmetic / comparison operators that appear inside method bodies.
// Treated as plain symbols — the body parser doesn't need their semantics.
export const Plus = createToken({ name: 'Plus', pattern: /\+/ });
export const Minus = createToken({ name: 'Minus', pattern: /-/ });
export const Star = createToken({ name: 'Star', pattern: /\*/ });
export const Slash = createToken({ name: 'Slash', pattern: /\// });
export const Lt = createToken({ name: 'Lt', pattern: /</ });
export const Gt = createToken({ name: 'Gt', pattern: />/ });
export const Question = createToken({ name: 'Question', pattern: /\?/ });
export const At = createToken({ name: 'At', pattern: /@/ });
export const Ampersand = createToken({ name: 'Ampersand', pattern: /&/ });

// ============================================
// Full token array — lexer dispatch order
// ============================================

export const allTokens = [
  // whitespace / comments
  WhiteSpace,
  Newline,
  StarComment,
  ABAPDocLine,
  LineComment,

  // multi-char symbols before single-char variants
  FatArrow,
  Arrow,
  ColonColon,

  // literals
  StringLiteral,
  BacktickLiteral,
  IntegerLiteral,

  // compound keywords MUST come before their prefixes
  ClassMethods,
  ClassData,
  ClassEvents,
  NonUnique,
  ReadOnly,

  // core OO
  Class,
  Interfaces,
  Interface,
  EndClass,
  EndInterface,
  EndMethod,
  Definition,
  Implementation,
  Deferred,
  Load,

  // visibility
  Public,
  Protected,
  Private,
  Section,

  // members
  Methods,
  Method,
  Data,
  Types,
  Constants,
  Events,
  Aliases,

  // header modifiers
  Inheriting,
  From,
  For,
  Testing,
  Risk,
  Level,
  Duration,
  Final,
  Abstract,
  Create,

  // signature
  Importing,
  Exporting,
  Changing,
  Returning,
  Raising,
  Value,
  Optional,
  Default,
  Redefinition,

  // type refs
  Type,
  Ref,
  To,
  Like,
  As,

  // table / structure
  Begin,
  End,
  Of,
  Standard,
  Sorted,
  Hashed,
  Table,
  With,
  Key,
  Empty,
  Unique,

  // Identifier — must come after all keywords
  Identifier,

  // single-char symbols
  Dot,
  Comma,
  Colon,
  Tilde,
  LParen,
  RParen,
  LBracket,
  RBracket,
  Eq,
  Hash,
  Pipe,
  LBrace,
  RBrace,
  Plus,
  Minus,
  Star,
  Slash,
  Lt,
  Gt,
  Question,
  At,
  Ampersand,
];

export const AclassLexer = new Lexer(allTokens, {
  // Track newline positions so error locations have line/column.
  positionTracking: 'full',
});
