import { CstParser, EOF, Lexer, createToken } from "chevrotain";

// src/tokens.ts
/**
* Chevrotain Token Definitions for ABAP CDS
*
* Token order matters: more specific patterns must come before general ones.
* Keywords use `longer_alt` to avoid matching prefixes of identifiers.
*/
const WhiteSpace = createToken({
	name: "WhiteSpace",
	pattern: /\s+/,
	group: Lexer.SKIPPED
});
const LineComment = createToken({
	name: "LineComment",
	pattern: /\/\/[^\n]*/,
	group: Lexer.SKIPPED
});
const BlockComment = createToken({
	name: "BlockComment",
	pattern: /\/\*[\s\S]*?\*\//,
	group: Lexer.SKIPPED
});
/**
* SQL-style line comment: `-- some text`.
*
* ABAP CDS sources (especially the classic `define view` ones) use SQL
* comments. The pattern is tried before the `Minus` token, so `--` always
* wins over two minus signs.
*/
const SqlLineComment = createToken({
	name: "SqlLineComment",
	pattern: /--[^\n]*/,
	group: Lexer.SKIPPED
});
const StringLiteral = createToken({
	name: "StringLiteral",
	pattern: /'(?:[^'\\]|\\.)*'/
});
const NumberLiteral = createToken({
	name: "NumberLiteral",
	pattern: /\d+(?:\.\d+)?/
});
/** Hash-prefixed enum value: #TRANSPARENT, #NOT_EXTENSIBLE */
const EnumLiteral = createToken({
	name: "EnumLiteral",
	pattern: /#[A-Za-z_][A-Za-z0-9_]*/
});
const Identifier = createToken({
	name: "Identifier",
	pattern: /[A-Za-z_][A-Za-z0-9_]*/
});
/**
* ABAP namespace-qualified identifier: `/NS/NAME` (optionally with further
* segments, e.g. `/NS/SUB/NAME`). Used for repository object names that live
* in a namespace. Must be tried before the generic `Slash` token so the
* whole qualified name is captured as one token.
*/
/** Token types that may end an expression atom; a following `/` is division. */
const EXPRESSION_ATOMS = /* @__PURE__ */ new Set([
	"Identifier",
	"NamespacedIdentifier",
	"NumberLiteral",
	"StringLiteral",
	"EnumLiteral",
	"RParen",
	"RBracket",
	"RBrace"
]);
function lastScannedToken(tokens) {
	if (!tokens) return null;
	for (let i = tokens.length - 1; i >= 0; i--) {
		const token = tokens[i];
		if (token?.tokenType?.name !== "WhiteSpace") return token;
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
const NamespacedIdentifier = createToken({
	name: "NamespacedIdentifier",
	pattern: (text, offset, tokens) => {
		if (text.charAt(offset) !== "/") return null;
		const previous = lastScannedToken(tokens);
		if (EXPRESSION_ATOMS.has(previous?.tokenType?.name)) return null;
		const match = /^\/\w+(?:\/\w+)+/.exec(text.slice(offset));
		return match ? [match[0]] : null;
	}
});
const Define = createToken({
	name: "Define",
	pattern: /define/i,
	longer_alt: Identifier
});
const Table = createToken({
	name: "Table",
	pattern: /table/i,
	longer_alt: Identifier
});
const Structure = createToken({
	name: "Structure",
	pattern: /structure/i,
	longer_alt: Identifier
});
const Type = createToken({
	name: "Type",
	pattern: /type/i,
	longer_alt: Identifier
});
const Service = createToken({
	name: "Service",
	pattern: /service/i,
	longer_alt: Identifier
});
const Expose = createToken({
	name: "Expose",
	pattern: /expose/i,
	longer_alt: Identifier
});
const Annotate = createToken({
	name: "Annotate",
	pattern: /annotate/i,
	longer_alt: Identifier
});
const Entity = createToken({
	name: "Entity",
	pattern: /entity/i,
	longer_alt: Identifier
});
const With = createToken({
	name: "With",
	pattern: /with/i,
	longer_alt: Identifier
});
const Key = createToken({
	name: "Key",
	pattern: /key/i,
	longer_alt: Identifier
});
const Not = createToken({
	name: "Not",
	pattern: /not/i,
	longer_alt: Identifier
});
const Null = createToken({
	name: "Null",
	pattern: /null/i,
	longer_alt: Identifier
});
const As = createToken({
	name: "As",
	pattern: /as/i,
	longer_alt: Identifier
});
const Include = createToken({
	name: "Include",
	pattern: /include/i,
	longer_alt: Identifier
});
const Suffix = createToken({
	name: "Suffix",
	pattern: /suffix/i,
	longer_alt: Identifier
});
const True = createToken({
	name: "True",
	pattern: /true/i,
	longer_alt: Identifier
});
const False = createToken({
	name: "False",
	pattern: /false/i,
	longer_alt: Identifier
});
const Abap = createToken({
	name: "Abap",
	pattern: /abap/i,
	longer_alt: Identifier
});
const View = createToken({
	name: "View",
	pattern: /view/i,
	longer_alt: Identifier
});
const Projection = createToken({
	name: "Projection",
	pattern: /projection/i,
	longer_alt: Identifier
});
const Select = createToken({
	name: "Select",
	pattern: /select/i,
	longer_alt: Identifier
});
const From = createToken({
	name: "From",
	pattern: /from/i,
	longer_alt: Identifier
});
const On = createToken({
	name: "On",
	pattern: /on/i,
	longer_alt: Identifier
});
const Association = createToken({
	name: "Association",
	pattern: /association/i,
	longer_alt: Identifier
});
const Composition = createToken({
	name: "Composition",
	pattern: /composition/i,
	longer_alt: Identifier
});
const To = createToken({
	name: "To",
	pattern: /to/i,
	longer_alt: Identifier
});
const Many = createToken({
	name: "Many",
	pattern: /many/i,
	longer_alt: Identifier
});
const One = createToken({
	name: "One",
	pattern: /one/i,
	longer_alt: Identifier
});
const Of = createToken({
	name: "Of",
	pattern: /of/i,
	longer_alt: Identifier
});
const Parameters = createToken({
	name: "Parameters",
	pattern: /parameters/i,
	longer_alt: Identifier
});
const Role = createToken({
	name: "Role",
	pattern: /role/i,
	longer_alt: Identifier
});
const Grant = createToken({
	name: "Grant",
	pattern: /grant/i,
	longer_alt: Identifier
});
const Where = createToken({
	name: "Where",
	pattern: /where/i,
	longer_alt: Identifier
});
const Abstract = createToken({
	name: "Abstract",
	pattern: /abstract/i,
	longer_alt: Identifier
});
const Custom = createToken({
	name: "Custom",
	pattern: /custom/i,
	longer_alt: Identifier
});
const Virtual = createToken({
	name: "Virtual",
	pattern: /virtual/i,
	longer_alt: Identifier
});
const Redirected = createToken({
	name: "Redirected",
	pattern: /redirected/i,
	longer_alt: Identifier
});
const Default = createToken({
	name: "Default",
	pattern: /default/i,
	longer_alt: Identifier
});
const Join = createToken({
	name: "Join",
	pattern: /join/i,
	longer_alt: Identifier
});
const Inner = createToken({
	name: "Inner",
	pattern: /inner/i,
	longer_alt: Identifier
});
const Left = createToken({
	name: "Left",
	pattern: /left/i,
	longer_alt: Identifier
});
const Right = createToken({
	name: "Right",
	pattern: /right/i,
	longer_alt: Identifier
});
const Cross = createToken({
	name: "Cross",
	pattern: /cross/i,
	longer_alt: Identifier
});
const Full = createToken({
	name: "Full",
	pattern: /full/i,
	longer_alt: Identifier
});
/**
* `OUTER` — must be listed BEFORE `Or`, because `or` is a prefix of `outer`
* and the lexer resolves the first matching token in list order.
*/
const Outer = createToken({
	name: "Outer",
	pattern: /outer/i,
	longer_alt: Identifier
});
const Distinct = createToken({
	name: "Distinct",
	pattern: /distinct/i,
	longer_alt: Identifier
});
const Union = createToken({
	name: "Union",
	pattern: /union/i,
	longer_alt: Identifier
});
const Intersect = createToken({
	name: "Intersect",
	pattern: /intersect/i,
	longer_alt: Identifier
});
const Except = createToken({
	name: "Except",
	pattern: /except/i,
	longer_alt: Identifier
});
const Allowed = createToken({
	name: "Allowed",
	pattern: /allowed/i,
	longer_alt: Identifier
});
/** NOTE: `allowed` must precede `all` (`all` is a prefix of `allowed`). */
const All = createToken({
	name: "All",
	pattern: /all/i,
	longer_alt: Identifier
});
const Group = createToken({
	name: "Group",
	pattern: /group/i,
	longer_alt: Identifier
});
const Having = createToken({
	name: "Having",
	pattern: /having/i,
	longer_alt: Identifier
});
const Root = createToken({
	name: "Root",
	pattern: /root/i,
	longer_alt: Identifier
});
const Writable = createToken({
	name: "Writable",
	pattern: /writable/i,
	longer_alt: Identifier
});
const Switchable = createToken({
	name: "Switchable",
	pattern: /switchable/i,
	longer_alt: Identifier
});
const Exact = createToken({
	name: "Exact",
	pattern: /exact/i,
	longer_alt: Identifier
});
const Parents = createToken({
	name: "Parents",
	pattern: /parents/i,
	longer_alt: Identifier
});
const Parent = createToken({
	name: "Parent",
	pattern: /parent/i,
	longer_alt: Identifier
});
const Child = createToken({
	name: "Child",
	pattern: /child/i,
	longer_alt: Identifier
});
const Localized = createToken({
	name: "Localized",
	pattern: /localized/i,
	longer_alt: Identifier
});
const Redefine = createToken({
	name: "Redefine",
	pattern: /redefine/i,
	longer_alt: Identifier
});
const Redefinition = createToken({
	name: "Redefinition",
	pattern: /redefinition/i,
	longer_alt: Identifier
});
const Filter = createToken({
	name: "Filter",
	pattern: /filter/i,
	longer_alt: Identifier
});
const Bind = createToken({
	name: "Bind",
	pattern: /bind/i,
	longer_alt: Identifier
});
const FunctionKeyword = createToken({
	name: "Function",
	pattern: /function/i,
	longer_alt: Identifier
});
const Returns = createToken({
	name: "Returns",
	pattern: /returns/i,
	longer_alt: Identifier
});
const Implemented = createToken({
	name: "Implemented",
	pattern: /implemented/i,
	longer_alt: Identifier
});
const Method = createToken({
	name: "Method",
	pattern: /method/i,
	longer_alt: Identifier
});
const Scalar = createToken({
	name: "Scalar",
	pattern: /scalar/i,
	longer_alt: Identifier
});
const Hierarchy = createToken({
	name: "Hierarchy",
	pattern: /hierarchy/i,
	longer_alt: Identifier
});
const Aspect = createToken({
	name: "Aspect",
	pattern: /aspect/i,
	longer_alt: Identifier
});
const AnnotationKeyword = createToken({
	name: "AnnotationKeyword",
	pattern: /annotation/i,
	longer_alt: Identifier
});
const Extend = createToken({
	name: "Extend",
	pattern: /extend/i,
	longer_alt: Identifier
});
const Accesspolicy = createToken({
	name: "Accesspolicy",
	pattern: /accesspolicy/i,
	longer_alt: Identifier
});
const External = createToken({
	name: "External",
	pattern: /external/i,
	longer_alt: Identifier
});
const Provider = createToken({
	name: "Provider",
	pattern: /provider/i,
	longer_alt: Identifier
});
const Contract = createToken({
	name: "Contract",
	pattern: /contract/i,
	longer_alt: Identifier
});
const Name = createToken({
	name: "Name",
	pattern: /name/i,
	longer_alt: Identifier
});
const Federated = createToken({
	name: "Federated",
	pattern: /federated/i,
	longer_alt: Identifier
});
const Data = createToken({
	name: "Data",
	pattern: /data/i,
	longer_alt: Identifier
});
const Provided = createToken({
	name: "Provided",
	pattern: /provided/i,
	longer_alt: Identifier
});
const AtKeyword = createToken({
	name: "AtKeyword",
	pattern: /at/i,
	longer_alt: Identifier
});
const Runtime = createToken({
	name: "Runtime",
	pattern: /runtime/i,
	longer_alt: Identifier
});
const Case = createToken({
	name: "Case",
	pattern: /case/i,
	longer_alt: Identifier
});
const When = createToken({
	name: "When",
	pattern: /when/i,
	longer_alt: Identifier
});
const Then = createToken({
	name: "Then",
	pattern: /then/i,
	longer_alt: Identifier
});
const Else = createToken({
	name: "Else",
	pattern: /else/i,
	longer_alt: Identifier
});
const End = createToken({
	name: "End",
	pattern: /end/i,
	longer_alt: Identifier
});
const Like = createToken({
	name: "Like",
	pattern: /like/i,
	longer_alt: Identifier
});
const Between = createToken({
	name: "Between",
	pattern: /between/i,
	longer_alt: Identifier
});
const Over = createToken({
	name: "Over",
	pattern: /over/i,
	longer_alt: Identifier
});
const Partition = createToken({
	name: "Partition",
	pattern: /partition/i,
	longer_alt: Identifier
});
const Siblings = createToken({
	name: "Siblings",
	pattern: /siblings/i,
	longer_alt: Identifier
});
const Order = createToken({
	name: "Order",
	pattern: /order/i,
	longer_alt: Identifier
});
const Start = createToken({
	name: "Start",
	pattern: /start/i,
	longer_alt: Identifier
});
const Source = createToken({
	name: "Source",
	pattern: /source/i,
	longer_alt: Identifier
});
const Directory = createToken({
	name: "Directory",
	pattern: /directory/i,
	longer_alt: Identifier
});
const Period = createToken({
	name: "Period",
	pattern: /period/i,
	longer_alt: Identifier
});
const Valid = createToken({
	name: "Valid",
	pattern: /valid/i,
	longer_alt: Identifier
});
const Depth = createToken({
	name: "Depth",
	pattern: /depth/i,
	longer_alt: Identifier
});
const Nodetype = createToken({
	name: "Nodetype",
	pattern: /nodetype/i,
	longer_alt: Identifier
});
const Load = createToken({
	name: "Load",
	pattern: /load/i,
	longer_alt: Identifier
});
const Multiple = createToken({
	name: "Multiple",
	pattern: /multiple/i,
	longer_alt: Identifier
});
const Orphans = createToken({
	name: "Orphans",
	pattern: /orphans/i,
	longer_alt: Identifier
});
const Cycles = createToken({
	name: "Cycles",
	pattern: /cycles/i,
	longer_alt: Identifier
});
const Generate = createToken({
	name: "Generate",
	pattern: /generate/i,
	longer_alt: Identifier
});
const Spantree = createToken({
	name: "Spantree",
	pattern: /spantree/i,
	longer_alt: Identifier
});
const Cache = createToken({
	name: "Cache",
	pattern: /cache/i,
	longer_alt: Identifier
});
const Bulk = createToken({
	name: "Bulk",
	pattern: /bulk/i,
	longer_alt: Identifier
});
const Incremental = createToken({
	name: "Incremental",
	pattern: /incremental/i,
	longer_alt: Identifier
});
const Leaves = createToken({
	name: "Leaves",
	pattern: /leaves/i,
	longer_alt: Identifier
});
const Only = createToken({
	name: "Only",
	pattern: /only/i,
	longer_alt: Identifier
});
const Ascending = createToken({
	name: "Ascending",
	pattern: /ascending/i,
	longer_alt: Identifier
});
const Descending = createToken({
	name: "Descending",
	pattern: /descending/i,
	longer_alt: Identifier
});
const ErrorKeyword = createToken({
	name: "Error",
	pattern: /error/i,
	longer_alt: Identifier
});
const Ignore = createToken({
	name: "Ignore",
	pattern: /ignore/i,
	longer_alt: Identifier
});
const Breakup = createToken({
	name: "Breakup",
	pattern: /breakup/i,
	longer_alt: Identifier
});
const Force = createToken({
	name: "Force",
	pattern: /force/i,
	longer_alt: Identifier
});
/** `FOR` — must be listed AFTER `Force` (`for` is a prefix of `force`). */
const For = createToken({
	name: "For",
	pattern: /for/i,
	longer_alt: Identifier
});
const By = createToken({
	name: "By",
	pattern: /by/i,
	longer_alt: Identifier
});
/** `OFF` — must be listed BEFORE `Of` (`of` is a prefix of `off`). */
const Off = createToken({
	name: "Off",
	pattern: /off/i,
	longer_alt: Identifier
});
const Inheriting = createToken({
	name: "Inheriting",
	pattern: /inheriting/i,
	longer_alt: Identifier
});
const Inherit = createToken({
	name: "Inherit",
	pattern: /inherit/i,
	longer_alt: Identifier
});
const Conditions = createToken({
	name: "Conditions",
	pattern: /conditions/i,
	longer_alt: Identifier
});
const Super = createToken({
	name: "Super",
	pattern: /super/i,
	longer_alt: Identifier
});
const Void = createToken({
	name: "Void",
	pattern: /void/i,
	longer_alt: Identifier
});
const Combination = createToken({
	name: "Combination",
	pattern: /combination/i,
	longer_alt: Identifier
});
const Mode = createToken({
	name: "Mode",
	pattern: /mode/i,
	longer_alt: Identifier
});
const Optional = createToken({
	name: "Optional",
	pattern: /optional/i,
	longer_alt: Identifier
});
const Elements = createToken({
	name: "Elements",
	pattern: /elements/i,
	longer_alt: Identifier
});
/**
* `IN` — must be listed AFTER every `in*` keyword (`inner`, `intersect`,
* `include`, `inherit`, `inheriting`, `incremental`), because `in` is a
* prefix of all of them.
*/
const In = createToken({
	name: "In",
	pattern: /in/i,
	longer_alt: Identifier
});
const EqEq = createToken({
	name: "EqEq",
	pattern: /==/
});
const FatArrow = createToken({
	name: "FatArrow",
	pattern: /=>/
});
const Eq = createToken({
	name: "Eq",
	pattern: /=/
});
const NotEq = createToken({
	name: "NotEq",
	pattern: /!=|<>/
});
const LtEq = createToken({
	name: "LtEq",
	pattern: /<=/
});
const GtEq = createToken({
	name: "GtEq",
	pattern: />=/
});
const Lt = createToken({
	name: "Lt",
	pattern: /</
});
const Gt = createToken({
	name: "Gt",
	pattern: />/
});
const Quest = createToken({
	name: "Quest",
	pattern: /\?/
});
const And = createToken({
	name: "And",
	pattern: /and/i,
	longer_alt: Identifier
});
const Or = createToken({
	name: "Or",
	pattern: /or/i,
	longer_alt: Identifier
});
const At = createToken({
	name: "At",
	pattern: /@/
});
const Colon = createToken({
	name: "Colon",
	pattern: /:/
});
/** `$` — prefix of system variables such as `$session`, `$parameters`, `$projection`. */
const Dollar = createToken({
	name: "Dollar",
	pattern: /\$/
});
const Semicolon = createToken({
	name: "Semicolon",
	pattern: /;/
});
const Dot = createToken({
	name: "Dot",
	pattern: /\./
});
const Comma = createToken({
	name: "Comma",
	pattern: /,/
});
const LBrace = createToken({
	name: "LBrace",
	pattern: /\{/
});
const RBrace = createToken({
	name: "RBrace",
	pattern: /\}/
});
const LParen = createToken({
	name: "LParen",
	pattern: /\(/
});
const RParen = createToken({
	name: "RParen",
	pattern: /\)/
});
const LBracket = createToken({
	name: "LBracket",
	pattern: /\[/
});
const RBracket = createToken({
	name: "RBracket",
	pattern: /\]/
});
const Star = createToken({
	name: "Star",
	pattern: /\*/
});
const Plus = createToken({
	name: "Plus",
	pattern: /\+/
});
const Minus = createToken({
	name: "Minus",
	pattern: /-/
});
const Slash = createToken({
	name: "Slash",
	pattern: /\//
});
/**
* All keyword tokens. Exported so the parser can derive its name-token set
* (every keyword may legally appear as an identifier in CDS).
*/
const keywordTokens = [
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
	Only,
	View,
	Projection,
	Select,
	From,
	On,
	To,
	Many,
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
	Outer,
	And,
	Or,
	In
];
const allTokens = [
	WhiteSpace,
	LineComment,
	BlockComment,
	SqlLineComment,
	StringLiteral,
	NumberLiteral,
	EnumLiteral,
	...keywordTokens,
	Identifier,
	NamespacedIdentifier,
	EqEq,
	NotEq,
	LtEq,
	GtEq,
	FatArrow,
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
	Slash
];
const CdsLexer = new Lexer(allTokens);

// src/parser.ts
/**
* Chevrotain CstParser for ABAP CDS.
*
* Grammar coverage (see src/lib/grammar/*.ts for the per-topic index):
*   - DDL  : table, table entity, structure, simple type, view entity
*            (select / projection, `root` / `writable`, provider contract),
*            abstract/custom/external entity, service, hierarchy, aspect,
*            table function, scalar function, annotation (DDLA), accesspolicy
*   - DCL  : role definitions (grant select on ... where ..., inherit rules)
*   - DDLX : metadata extensions (`annotate entity|view ... with { ... }`)
*   - EXT  : `extend view [entity]`, `extend abstract|custom entity`
*   - SRVD : service definitions (`define service ... { expose ...; }`)
*   - Elements / associations / parameters / annotations / conditions
*
* Conditions (`on` / `where` / `having` / filters) are kept as opaque
* `Expression { source, tokens }` nodes — the parser validates the grammar
* shape but does not build an expression tree.
*
* Rules are kept in this single class (Chevrotain requirement). Logical
* groupings are delimited with section banners and documented in
* `src/lib/grammar/`.
*/
var CdsParser = class CdsParser extends CstParser {
	/**
	* All token types that may be used as a CDS name.
	*
	* Every keyword may legally appear as an identifier in CDS (`A.on`,
	* `type : abap.char(1)`, `as select`, …), so the name set is derived from
	* the keyword list in `tokens.ts`. The list is the single source of truth
	* for the `cdsName` rule and for the bare-alias rule — the latter removes
	* the FROM-region starters.
	*/
	static NAME_TOKENS = [
		Identifier,
		NamespacedIdentifier,
		...keywordTokens
	];
	static NAME_TOKEN_SET = new Set(CdsParser.NAME_TOKENS);
	/** Comparison operators that end a parenthesized *operand*. */
	static COMPARISON_TOKEN_SET = /* @__PURE__ */ new Set([
		Eq,
		EqEq,
		NotEq,
		Lt,
		LtEq,
		Gt,
		GtEq,
		Like,
		Between,
		In
	]);
	/** Paren depth delta for `matchingParen`. */
	static PAREN_DELTA = /* @__PURE__ */ new Map([[LParen, 1], [RParen, -1]]);
	/** Bracket depth delta per token for the case-expression scan. */
	static DEPTH_DELTA = /* @__PURE__ */ new Map([
		[LParen, 1],
		[LBracket, 1],
		[RParen, -1],
		[RBracket, -1]
	]);
	/** Tokens that mark a parenthesized group as a *condition*. */
	static CONDITION_MARKER_SET = /* @__PURE__ */ new Set([
		Eq,
		EqEq,
		NotEq,
		Lt,
		LtEq,
		Gt,
		GtEq,
		Like,
		Between,
		In,
		And,
		Or,
		Not
	]);
	/**
	* Tokens that must not be read as a *bare* (implicit) source alias — they
	* start whatever may follow a data source in the FROM region (joins,
	* associations, aspect bindings, the `where`/`group by`/`having` clauses
	* and the set operators). An explicit `as <alias>` stays unrestricted.
	*
	* `one`/`many`/`exact`/`to` are excluded because they may start a join
	* cardinality (`many to one join`, `to one join`).
	*/
	static FROM_REGION_STARTERS = /* @__PURE__ */ new Set([
		Association,
		Composition,
		Join,
		Inner,
		Left,
		Right,
		Cross,
		Full,
		One,
		Many,
		Exact,
		To,
		Union,
		Intersect,
		Except,
		Group,
		Having,
		Where,
		On,
		As,
		And,
		Or,
		Not,
		By,
		Bind,
		Redefine
	]);
	/**
	* Tokens allowed inside a DCL `where` condition — everything except the
	* terminating semicolon. DCL conditions (literal / pfcg / aspect / user /
	* inherit / `if-then-else` / `void`) are captured opaquely.
	*/
	static DCL_TOKENS = allTokens.filter((t) => ![
		"WhiteSpace",
		"LineComment",
		"BlockComment",
		"SqlLineComment",
		"Semicolon"
	].includes(t.name));
	/** Tokens allowed inside a `{ … }` free-form block (DDLA / accesspolicy). */
	static BLOCK_TOKENS = allTokens.filter((t) => ![
		"WhiteSpace",
		"LineComment",
		"BlockComment",
		"SqlLineComment",
		"LBrace",
		"RBrace"
	].includes(t.name));
	constructor() {
		super(allTokens, {
			recoveryEnabled: true,
			maxLookahead: 2
		});
		this.performSelfAnalysis();
	}
	sourceFile = this.RULE("sourceFile", () => {
		this.MANY(() => {
			this.SUBRULE(this.topLevelAnnotation);
		});
		this.SUBRULE(this.definition);
	});
	definition = this.RULE("definition", () => {
		this.OR([
			{ ALT: () => this.SUBRULE(this.defineStatement) },
			{ ALT: () => this.SUBRULE(this.annotateStatement) },
			{ ALT: () => this.SUBRULE(this.extendStatement) }
		]);
	});
	defineStatement = this.RULE("defineStatement", () => {
		this.CONSUME(Define);
		this.OR([
			{ ALT: () => this.SUBRULE(this.prefixedDefinition) },
			{ ALT: () => this.SUBRULE(this.tableDefinition) },
			{ ALT: () => this.SUBRULE(this.structureDefinition) },
			{ ALT: () => this.SUBRULE(this.viewEntityDefinition) },
			{ ALT: () => this.SUBRULE(this.abstractEntityDefinition) },
			{ ALT: () => this.SUBRULE(this.customEntityDefinition) },
			{ ALT: () => this.SUBRULE(this.simpleTypeDefinition) },
			{ ALT: () => this.SUBRULE(this.serviceDefinition) },
			{ ALT: () => this.SUBRULE(this.roleDefinition) },
			{ ALT: () => this.SUBRULE(this.hierarchyDefinition) },
			{ ALT: () => this.SUBRULE(this.aspectDefinition) },
			{ ALT: () => this.SUBRULE(this.externalEntityDefinition) },
			{ ALT: () => this.SUBRULE(this.scalarFunctionDefinition) },
			{ ALT: () => this.SUBRULE(this.annotationDefinition) },
			{ ALT: () => this.SUBRULE(this.accessPolicyDefinition) }
		]);
	});
	/**
	* `define (writable|root)+ …` — view entities, external entities and root
	* table entities carry leading modifiers between `define` and the entity
	* keyword.
	*/
	prefixedDefinition = this.RULE("prefixedDefinition", () => {
		this.AT_LEAST_ONE(() => {
			this.OR([{ ALT: () => this.CONSUME(Writable) }, { ALT: () => this.CONSUME(Root) }]);
		});
		this.OR2([
			{ ALT: () => this.SUBRULE(this.viewEntityDefinition) },
			{ ALT: () => this.SUBRULE(this.externalEntityDefinition) },
			{ ALT: () => this.SUBRULE(this.rootTableEntityDefinition) }
		]);
	});
	/** `table entity <name> { … }` — reachable via `define [root] table entity`. */
	rootTableEntityDefinition = this.RULE("rootTableEntityDefinition", () => {
		this.CONSUME(Table);
		this.CONSUME(Entity);
		this.SUBRULE(this.cdsName);
		this.CONSUME(LBrace);
		this.MANY(() => {
			this.SUBRULE(this.tableMember);
		});
		this.CONSUME(RBrace);
	});
	tableDefinition = this.RULE("tableDefinition", () => {
		this.CONSUME(Table);
		this.OR([
			{
				GATE: () => this.LA(1).tokenType === FunctionKeyword && this.isNameToken(this.LA(2)),
				ALT: () => this.SUBRULE(this.tableFunctionTail)
			},
			{
				GATE: () => this.LA(1).tokenType === Entity && this.isNameToken(this.LA(2)),
				ALT: () => {
					this.CONSUME(Entity);
					this.SUBRULE(this.cdsName);
					this.CONSUME(LBrace);
					this.MANY(() => {
						this.SUBRULE(this.tableMember);
					});
					this.CONSUME(RBrace);
				}
			},
			{ ALT: () => {
				this.SUBRULE2(this.cdsName);
				this.CONSUME2(LBrace);
				this.MANY2(() => {
					this.SUBRULE2(this.tableMember);
				});
				this.CONSUME2(RBrace);
			} }
		]);
	});
	tableFunctionTail = this.RULE("tableFunctionTail", () => {
		this.CONSUME(FunctionKeyword);
		this.SUBRULE(this.cdsName);
		this.OPTION(() => {
			this.SUBRULE(this.parametersClause);
		});
		this.CONSUME(Returns);
		this.CONSUME(LBrace);
		this.MANY(() => {
			this.SUBRULE(this.fieldDefinition);
		});
		this.CONSUME(RBrace);
		this.CONSUME(Implemented);
		this.CONSUME(By);
		this.CONSUME(Method);
		this.SUBRULE(this.qualifiedName);
		this.CONSUME(FatArrow);
		this.SUBRULE2(this.cdsName);
		this.OPTION2(() => this.CONSUME(Semicolon));
	});
	structureDefinition = this.RULE("structureDefinition", () => {
		this.CONSUME(Structure);
		this.SUBRULE(this.cdsName);
		this.CONSUME(LBrace);
		this.MANY(() => {
			this.SUBRULE(this.tableMember);
		});
		this.CONSUME(RBrace);
	});
	viewEntityDefinition = this.RULE("viewEntityDefinition", () => {
		this.CONSUME(View);
		this.OPTION({
			GATE: () => this.isEntityModifier(),
			DEF: () => this.CONSUME(Entity)
		});
		this.SUBRULE(this.cdsName);
		this.OPTION2(() => {
			this.SUBRULE(this.parametersClause);
		});
		this.OPTION3(() => {
			this.CONSUME(Provider);
			this.CONSUME(Contract);
			this.SUBRULE2(this.cdsName);
		});
		this.CONSUME(As);
		this.OR([{ ALT: () => this.SUBRULE(this.selectStatement) }, { ALT: () => this.SUBRULE(this.projectionTail) }]);
	});
	/**
	* `true` when the `entity` after `view` is the view-entity modifier rather
	* than the view name — it is a modifier iff the following token is a name
	* other than `as`/`with`/`provider` (the tokens that may directly follow a
	* view name).
	*/
	isEntityModifier() {
		if (this.LA(1).tokenType !== Entity) return false;
		const next = this.LA(2);
		if (!this.isNameToken(next)) return false;
		return ![
			As,
			With,
			Provider,
			Select,
			Projection
		].includes(next.tokenType);
	}
	abstractEntityDefinition = this.RULE("abstractEntityDefinition", () => {
		this.CONSUME(Abstract);
		this.CONSUME(Entity);
		this.SUBRULE(this.cdsName);
		this.OPTION(() => {
			this.SUBRULE(this.parametersClause);
		});
		this.memberContext = "entity";
		try {
			this.SUBRULE(this.elementList);
		} finally {
			this.memberContext = "view";
		}
	});
	customEntityDefinition = this.RULE("customEntityDefinition", () => {
		this.CONSUME(Custom);
		this.CONSUME(Entity);
		this.SUBRULE(this.cdsName);
		this.OPTION(() => {
			this.SUBRULE(this.parametersClause);
		});
		this.memberContext = "entity";
		try {
			this.SUBRULE(this.elementList);
		} finally {
			this.memberContext = "view";
		}
	});
	/**
	* `external entity <name> [external name <obj>] [with parameters …] { … }
	*  with federated data provided at runtime [;]`
	*/
	externalEntityDefinition = this.RULE("externalEntityDefinition", () => {
		this.CONSUME(External);
		this.CONSUME(Entity);
		this.SUBRULE(this.cdsName);
		this.OPTION({
			GATE: () => this.LA(1).tokenType === External && this.LA(2).tokenType === Name,
			DEF: () => {
				this.CONSUME2(External);
				this.CONSUME(Name);
				this.SUBRULE2(this.cdsName);
			}
		});
		this.OPTION2(() => {
			this.SUBRULE(this.parametersClause);
		});
		this.CONSUME(LBrace);
		this.MANY(() => {
			this.SUBRULE(this.fieldDefinition);
		});
		this.CONSUME(RBrace);
		this.CONSUME(With);
		this.CONSUME(Federated);
		this.CONSUME(Data);
		this.CONSUME(Provided);
		this.CONSUME(AtKeyword);
		this.CONSUME(Runtime);
		this.OPTION3(() => this.CONSUME(Semicolon));
	});
	selectStatement = this.RULE("selectStatement", () => {
		this.CONSUME(Select);
		this.OPTION(() => this.CONSUME(Distinct));
		this.CONSUME(From);
		this.SUBRULE(this.dataSource);
		this.MANY(() => {
			this.OR([
				{ ALT: () => this.SUBRULE(this.joinClause) },
				{ ALT: () => this.SUBRULE(this.associationTail) },
				{ ALT: () => this.SUBRULE(this.bindAspect) }
			]);
		});
		this.SUBRULE(this.elementList);
		this.SUBRULE(this.selectClauses);
	});
	selectClauses = this.RULE("selectClauses", () => {
		this.OPTION(() => {
			this.CONSUME(Where);
			this.SUBRULE(this.condition);
		});
		this.OPTION2(() => {
			this.CONSUME(Group);
			this.CONSUME(By);
			this.SUBRULE(this.qualifiedName);
			this.MANY(() => {
				this.CONSUME(Comma);
				this.SUBRULE2(this.qualifiedName);
			});
		});
		this.OPTION3(() => {
			this.CONSUME(Having);
			this.SUBRULE2(this.condition);
		});
		this.MANY2(() => {
			this.SUBRULE(this.setOperation);
		});
	});
	/** `union [all]|intersect|except select …` — nested set operation. */
	setOperation = this.RULE("setOperation", () => {
		this.OR([
			{ ALT: () => {
				this.CONSUME(Union);
				this.OPTION(() => this.CONSUME(All));
			} },
			{ ALT: () => this.CONSUME(Intersect) },
			{ ALT: () => this.CONSUME(Except) }
		]);
		this.SUBRULE(this.selectStatement);
	});
	/**
	* `as projection on <source> [bind aspect] [associations]
	*  [redefined associations] { projection list } [where …]`
	*/
	projectionTail = this.RULE("projectionTail", () => {
		this.CONSUME(Projection);
		this.CONSUME(On);
		this.SUBRULE(this.dataSource);
		this.MANY(() => {
			this.OR([
				{ ALT: () => this.SUBRULE(this.associationTail) },
				{ ALT: () => this.SUBRULE(this.redefinedAssociation) },
				{ ALT: () => this.SUBRULE(this.bindAspect) }
			]);
		});
		this.SUBRULE(this.elementList);
		this.OPTION(() => {
			this.CONSUME(Where);
			this.SUBRULE(this.condition);
		});
	});
	/**
	* A data source: `<name> [ ( <parameter bindings> ) ] [ as <alias> ]`.
	*
	* The parameter list precedes the alias, e.g.
	* `ZP_MM_PR_DOC_TF( mandt: $session.client ) as _PRDocList`.
	*/
	dataSource = this.RULE("dataSource", () => {
		this.SUBRULE(this.dataSourcePath);
		this.OPTION(() => {
			this.SUBRULE(this.dataSourceParameters);
		});
		this.OPTION2(() => {
			this.OR([{ ALT: () => {
				this.CONSUME(As);
				this.SUBRULE(this.cdsName);
			} }, { ALT: () => this.SUBRULE(this.bareAliasName) }]);
		});
	});
	/**
	* `<name>[<attr>].<name>…` — a FROM data-source path. Path segments may
	* carry `[ … ]` association filters/attribute bindings (captured opaquely),
	* e.g. `_order._items[1:currency = 'EUR']`.
	*/
	dataSourcePath = this.RULE("dataSourcePath", () => {
		this.SUBRULE(this.pathSegment);
		this.MANY(() => {
			this.CONSUME(Dot);
			this.SUBRULE2(this.pathSegment);
		});
	});
	/**
	* `( <param> : <value> , … )` — parameter bindings of a data source.
	* Empty parameter list `()` is allowed for table functions with no parameters.
	*/
	dataSourceParameters = this.RULE("dataSourceParameters", () => {
		this.CONSUME(LParen);
		this.OPTION(() => {
			this.SUBRULE(this.dataSourceParameter);
			this.MANY(() => {
				this.CONSUME(Comma);
				this.SUBRULE2(this.dataSourceParameter);
			});
		});
		this.CONSUME(RParen);
	});
	/** `<name> : <value>` — a single parameter binding. */
	dataSourceParameter = this.RULE("dataSourceParameter", () => {
		this.SUBRULE(this.qualifiedName);
		this.CONSUME(Colon);
		this.SUBRULE(this.parameterBinding);
	});
	/**
	* The value bound to a source parameter. Kept as written in the source:
	*   - `:P_Param`   — parameter of the consuming view
	*   - `$session.client`, `$parameters.P_X` — system variable
	*   - `'X'`, `42`, `abap.dats'20200101'` — literal
	*/
	parameterBinding = this.RULE("parameterBinding", () => {
		this.OR([
			{ ALT: () => {
				this.CONSUME(Colon);
				this.SUBRULE(this.qualifiedName);
			} },
			{ ALT: () => this.SUBRULE(this.systemVariable) },
			{ ALT: () => this.SUBRULE(this.literal) }
		]);
	});
	joinClause = this.RULE("joinClause", () => {
		this.OR([{ ALT: () => {
			this.CONSUME(Cross);
			this.CONSUME(Join);
			this.SUBRULE(this.joinOperand);
		} }, { ALT: () => {
			this.SUBRULE(this.joinPrefix);
			this.CONSUME2(Join);
			this.SUBRULE2(this.joinOperand);
			this.CONSUME(On);
			this.SUBRULE(this.condition);
		} }]);
	});
	/**
	* Optional join-type words and the optional word-form cardinality, both
	* preceding the `JOIN` keyword:
	*   `left [outer]`, `right [outer]`, `inner`, `full [outer]`, `<empty>`
	*   then `[exact one|one|many] to [exact] one|many` | `to [exact] one|many`.
	*/
	joinPrefix = this.RULE("joinPrefix", () => {
		this.OPTION(() => {
			this.OR([
				{ ALT: () => {
					this.CONSUME(Left);
					this.OPTION2(() => this.CONSUME(Outer));
				} },
				{ ALT: () => {
					this.CONSUME(Right);
					this.OPTION3(() => this.CONSUME2(Outer));
				} },
				{ ALT: () => this.CONSUME(Inner) },
				{ ALT: () => {
					this.CONSUME(Full);
					this.OPTION4(() => this.CONSUME3(Outer));
				} }
			]);
		});
		this.OPTION5({
			GATE: () => this.isJoinCardinality(),
			DEF: () => this.SUBRULE(this.joinCardinality)
		});
	});
	/**
	* `[exact one|one|many] to (exact one|one|many)` or `to (exact one|one|many)`
	* — the word-form join cardinality, e.g. `many to one join`, `to one join`.
	*/
	joinCardinality = this.RULE("joinCardinality", () => {
		this.OPTION(() => this.SUBRULE(this.cardinalWord));
		this.CONSUME(To);
		this.SUBRULE2(this.cardinalWord);
	});
	/** `exact one` | `one` | `many` — a cardinality bound written in words. */
	cardinalWord = this.RULE("cardinalWord", () => {
		this.OR([
			{ ALT: () => {
				this.CONSUME(Exact);
				this.CONSUME(One);
			} },
			{ ALT: () => this.CONSUME2(One) },
			{ ALT: () => this.CONSUME(Many) }
		]);
	});
	/**
	* Cheap lookahead for the word-form join cardinality: it ends with the
	* `JOIN` keyword. Matches `[src] to tgt` where
	* src ∈ {`exact one`,`one`,`many`} (optional) and
	* tgt ∈ {`exact one`,`one`,`many`}.
	*/
	isJoinCardinality() {
		let i = 1;
		const typeAt = (n) => this.LA(n).tokenType;
		if (typeAt(i) === Exact && typeAt(i + 1) === One) i += 2;
		else if (typeAt(i) === One || typeAt(i) === Many) i += 1;
		if (typeAt(i) !== To) return false;
		i += 1;
		if (typeAt(i) === Exact && typeAt(i + 1) === One) i += 2;
		else if (typeAt(i) === One || typeAt(i) === Many) i += 1;
		else return false;
		return typeAt(i) === Join;
	}
	/**
	* A join source: a data source or a parenthesized join group
	* (`join (A join B on …) on …`).
	*/
	joinOperand = this.RULE("joinOperand", () => {
		this.OR([{ ALT: () => {
			this.CONSUME(LParen);
			this.SUBRULE(this.joinGroup);
			this.CONSUME(RParen);
		} }, { ALT: () => this.SUBRULE(this.dataSource) }]);
	});
	/** `<source> [joins…]` — the content of a parenthesized join group. */
	joinGroup = this.RULE("joinGroup", () => {
		this.SUBRULE(this.joinOperand);
		this.MANY(() => {
			this.SUBRULE(this.joinClause);
		});
	});
	elementList = this.RULE("elementList", () => {
		this.CONSUME(LBrace);
		this.MANY(() => {
			this.SUBRULE(this.elementMember);
		});
		this.CONSUME(RBrace);
	});
	elementMember = this.RULE("elementMember", () => {
		this.MANY(() => this.SUBRULE(this.annotation));
		this.OR([{
			GATE: () => this.isAssociationDeclaration(),
			ALT: () => this.SUBRULE(this.associationTail)
		}, { ALT: () => this.SUBRULE(this.viewElementTail) }]);
	});
	viewElementTail = this.RULE("viewElementTail", () => {
		this.OPTION({
			GATE: () => this.isElementStart(this.LA(2)),
			DEF: () => this.CONSUME(Key)
		});
		this.OPTION2({
			GATE: () => this.isElementStart(this.LA(2)),
			DEF: () => this.CONSUME(Virtual)
		});
		this.OPTION3({
			GATE: () => this.isElementStart(this.LA(2)),
			DEF: () => this.CONSUME(Redirected)
		});
		this.OR([{
			GATE: () => this.isTypedField(),
			ALT: () => this.SUBRULE(this.typedFieldTail)
		}, { ALT: () => this.SUBRULE(this.elementExpression) }]);
		this.OPTION4(() => {
			this.OR2([{ ALT: () => this.CONSUME(Semicolon) }, { ALT: () => this.CONSUME(Comma) }]);
		});
	});
	typedFieldTail = this.RULE("typedFieldTail", () => {
		this.SUBRULE(this.cdsName);
		this.CONSUME(Colon);
		this.SUBRULE(this.typeReference);
		this.OPTION(() => {
			this.CONSUME(Not);
			this.CONSUME(Null);
		});
	});
	/**
	* Element expression — everything allowed in a select/projection list:
	* paths (`_assoc.field`, `_a[inner].f`), calls (`sum(x)`, `div(a,b,c)`),
	* window functions (`… over (partition by … order by …)`), casts, case
	* distinctions, arithmetic, literals, parameters (`:P_X`) and system
	* variables (`$session.client`, `$parameters.x`, `$projection.f`).
	*
	* Followed by an optional `as <alias>` and an optional element suffix
	* (`: localized`, `: redirected to [composition child|parent] <target>`).
	*/
	elementExpression = this.RULE("elementExpression", () => {
		this.SUBRULE(this.operand);
		this.OPTION(() => {
			this.CONSUME(As);
			this.SUBRULE(this.cdsName);
		});
		this.OPTION2(() => {
			this.CONSUME(Colon);
			this.OR([{ ALT: () => this.CONSUME(Localized) }, { ALT: () => this.SUBRULE(this.redirection) }]);
		});
	});
	/**
	* `redirected to [composition child|parent] <target>` — association
	* redirection in projection views.
	*/
	redirection = this.RULE("redirection", () => {
		this.CONSUME(Redirected);
		this.CONSUME(To);
		this.OPTION(() => {
			this.OR([{ ALT: () => {
				this.CONSUME(Composition);
				this.CONSUME(Child);
			} }, { ALT: () => this.CONSUME(Parent) }]);
		});
		this.SUBRULE(this.qualifiedName);
	});
	/**
	* `redefine association|composition <name> [[card:] <filter>] [as <alias>]
	*  [redirected to …]` — redefined association of a projection view,
	* declared before the projection list.
	*/
	redefinedAssociation = this.RULE("redefinedAssociation", () => {
		this.CONSUME(Redefine);
		this.OR([{ ALT: () => this.CONSUME(Association) }, { ALT: () => this.CONSUME(Composition) }]);
		this.SUBRULE(this.qualifiedName);
		this.OPTION(() => {
			this.SUBRULE(this.bracketTokens);
		});
		this.OPTION2(() => {
			this.CONSUME(As);
			this.SUBRULE(this.cdsName);
		});
		this.OPTION3(() => {
			this.SUBRULE(this.redirection);
		});
	});
	/**
	* `bind aspect <aspect> ( <element> => <target>, … ) [as <alias>]`
	* — aspect binding in the FROM region or projection view header.
	*/
	bindAspect = this.RULE("bindAspect", () => {
		this.CONSUME(Bind);
		this.CONSUME(Aspect);
		this.SUBRULE(this.qualifiedName);
		this.CONSUME(LParen);
		this.SUBRULE(this.bindMapping);
		this.MANY(() => {
			this.CONSUME(Comma);
			this.SUBRULE2(this.bindMapping);
		});
		this.CONSUME(RParen);
		this.OPTION(() => {
			this.CONSUME(As);
			this.SUBRULE(this.cdsName);
		});
	});
	/** `<aspect element> => <target>` — one aspect binding mapping. */
	bindMapping = this.RULE("bindMapping", () => {
		this.SUBRULE(this.cdsName);
		this.CONSUME(FatArrow);
		this.SUBRULE(this.operand);
	});
	/** Cheap lookahead: `cast (` — the cast form of a projection element. */
	isCastExpression() {
		const first = this.LA(1);
		const second = this.LA(2);
		if (!first || !second) return false;
		return first.tokenType?.name === "Identifier" && first.image.toLowerCase() === "cast" && second.tokenType?.name === "LParen";
	}
	/**
	* `view` — the element list allows projection suffixes (`: localized`,
	* `: redirected to`); `entity` — abstract/custom entity bodies where a
	* token after `:` is always a type name.
	*/
	memberContext = "view";
	/**
	* Cheap lookahead: `name :` → typed field. Any keyword may be a name
	* (`Type : abap.char(1)`), but `name : localized` / `name : redirected …`
	* are projection-element suffixes, not typed fields.
	*/
	isTypedField() {
		const first = this.LA(1);
		const second = this.LA(2);
		const third = this.LA(3);
		if (!this.isNameToken(first) || second.tokenType !== Colon) return false;
		if (this.memberContext === "entity") return true;
		return ![Localized, Redirected].includes(third.tokenType);
	}
	isNameToken(token) {
		return CdsParser.NAME_TOKEN_SET.has(token.tokenType);
	}
	/**
	* `association|composition` in an element list is a declaration only when
	* association syntax follows: `[`, `to`, `of`, or a name (the target).
	* `association :`, `association,`, `association ;` … are elements named
	* `association`.
	*/
	isAssociationDeclaration() {
		const first = this.LA(1).tokenType;
		if (first !== Association && first !== Composition) return false;
		const second = this.LA(2);
		if ([
			To,
			Of,
			LBracket
		].includes(second.tokenType)) return true;
		if (second.tokenType === As) return false;
		return this.isNameToken(second);
	}
	/**
	* `true` when the token may begin an element expression — used to decide
	* whether `key`/`virtual`/`redirected` are element flags or the element
	* name itself.
	*/
	isElementStart(token) {
		if (this.isNameToken(token)) return true;
		return [
			StringLiteral,
			NumberLiteral,
			EnumLiteral,
			Minus,
			Plus,
			LParen,
			Dollar
		].includes(token.tokenType);
	}
	/** `true` when `LA(1)` begins a literal (incl. typed `abap.x'…'`). */
	isLiteralStart() {
		const t = this.LA(1).tokenType;
		if ([
			StringLiteral,
			NumberLiteral,
			EnumLiteral,
			True,
			False,
			Null,
			Minus
		].includes(t)) return true;
		return this.isTypedLiteral();
	}
	/**
	* `( … )` in a condition operand — `true` when the parenthesized group is
	* itself a condition (contains a predicate-ish token at depth ≥ 1 and is
	* not immediately followed by a comparison operator, which would make the
	* group an operand of a comparison like `(a + b) = 1`).
	*/
	isParenCondition() {
		if (this.LA(1).tokenType !== LParen) return false;
		const close = this.matchingParen(1);
		if (close < 0) return false;
		if (this.isComparisonToken(this.LA(close + 1))) return false;
		for (let i = 2; i < close; i += 1) if (this.isConditionMarker(this.LA(i))) return true;
		return false;
	}
	/** Index of the `)` matching the `(` at `from`, or -1 (EOF/unbalanced). */
	matchingParen(from) {
		let depth = 0;
		for (let i = from; i < from + 400; i += 1) {
			const t = this.LA(i).tokenType;
			if (t === EOF) return -1;
			depth += CdsParser.PAREN_DELTA.get(t) ?? 0;
			if (t === RParen && depth === 0) return i;
		}
		return -1;
	}
	isConditionMarker(tok) {
		return CdsParser.CONDITION_MARKER_SET.has(tok.tokenType) || this.isIsKeyword(tok);
	}
	isComparisonToken(tok) {
		return CdsParser.COMPARISON_TOKEN_SET.has(tok.tokenType) || this.isIsKeyword(tok);
	}
	isIsKeyword(tok) {
		return tok.tokenType === Identifier && tok.image.toLowerCase() === "is";
	}
	/**
	* `case` is a legal element name — treat it as a case expression only
	* when a `when` follows before the element ends.
	*/
	isCaseExpression() {
		if (this.LA(1).tokenType !== Case) return false;
		let depth = 0;
		for (let i = 2; i < 500; i += 1) {
			const t = this.LA(i).tokenType;
			if (this.caseScanEnds(t, depth)) return false;
			if (depth === 0 && t === When) return true;
			depth += CdsParser.DEPTH_DELTA.get(t) ?? 0;
		}
		return false;
	}
	caseScanEnds(t, depth) {
		if (t === EOF) return true;
		if (depth !== 0) return false;
		return [
			RBrace,
			Semicolon,
			Comma,
			RParen,
			RBracket
		].includes(t);
	}
	associationTail = this.RULE("associationTail", () => {
		this.OR([{ ALT: () => this.CONSUME(Association) }, { ALT: () => this.CONSUME(Composition) }]);
		this.OPTION(() => this.SUBRULE(this.cardinality));
		this.OR2([
			{ ALT: () => {
				this.CONSUME(Of);
				this.OPTION2(() => this.SUBRULE(this.cardinalWord));
				this.OPTION3(() => this.CONSUME(To));
				this.SUBRULE(this.qualifiedName);
			} },
			{
				GATE: () => this.LA(1).tokenType === To && this.LA(2).tokenType === Parent && this.isNameToken(this.LA(3)),
				ALT: () => {
					this.CONSUME2(To);
					this.CONSUME(Parent);
					this.SUBRULE2(this.qualifiedName);
				}
			},
			{ ALT: () => {
				this.CONSUME3(To);
				this.OPTION4(() => this.SUBRULE3(this.cardinalWord));
				this.OPTION5(() => {
					this.CONSUME(Redirected);
					this.CONSUME4(To);
				});
				this.SUBRULE3(this.qualifiedName);
			} },
			{
				GATE: () => ![To, Of].includes(this.LA(1).tokenType),
				ALT: () => {
					this.SUBRULE4(this.qualifiedName);
				}
			}
		]);
		this.OPTION6(() => {
			this.CONSUME(As);
			this.SUBRULE(this.cdsName);
		});
		this.OPTION7(() => {
			this.CONSUME(On);
			this.SUBRULE(this.condition);
		});
		this.OPTION8(() => {
			this.CONSUME(With);
			this.CONSUME(Default);
			this.CONSUME(Filter);
			this.SUBRULE2(this.condition);
		});
		this.OPTION9(() => {
			this.OR3([{ ALT: () => this.CONSUME(Semicolon) }, { ALT: () => this.CONSUME(Comma) }]);
		});
	});
	/** `[<lower>..<upper>]`, `[<n>]`, `[*]`, `[<lower>..*]` */
	cardinality = this.RULE("cardinality", () => {
		this.CONSUME(LBracket);
		this.OR([{ ALT: () => this.CONSUME(Star) }, { ALT: () => {
			this.CONSUME(NumberLiteral);
			this.OPTION(() => {
				this.CONSUME(Dot);
				this.CONSUME2(Dot);
				this.OR2([{ ALT: () => this.CONSUME2(NumberLiteral) }, { ALT: () => this.CONSUME2(Star) }]);
			});
		} }]);
		this.CONSUME(RBracket);
	});
	parametersClause = this.RULE("parametersClause", () => {
		this.CONSUME(With);
		this.CONSUME(Parameters);
		this.SUBRULE(this.parameterDefinition);
		this.MANY(() => {
			this.CONSUME(Comma);
			this.SUBRULE2(this.parameterDefinition);
		});
	});
	parameterDefinition = this.RULE("parameterDefinition", () => {
		this.MANY(() => this.SUBRULE(this.annotation));
		this.SUBRULE(this.cdsName);
		this.CONSUME(Colon);
		this.SUBRULE(this.typeReference);
		this.OPTION(() => {
			this.CONSUME(Default);
			this.SUBRULE(this.literal);
		});
	});
	simpleTypeDefinition = this.RULE("simpleTypeDefinition", () => {
		this.CONSUME(Type);
		this.SUBRULE(this.cdsName);
		this.CONSUME(Colon);
		this.SUBRULE(this.typeReference);
		this.CONSUME(Semicolon);
	});
	serviceDefinition = this.RULE("serviceDefinition", () => {
		this.CONSUME(Service);
		this.SUBRULE(this.cdsName);
		this.CONSUME(LBrace);
		this.MANY(() => {
			this.SUBRULE(this.exposeStatement);
		});
		this.CONSUME(RBrace);
	});
	exposeStatement = this.RULE("exposeStatement", () => {
		this.CONSUME(Expose);
		this.SUBRULE(this.cdsName);
		this.OPTION(() => {
			this.CONSUME(As);
			this.SUBRULE2(this.cdsName);
		});
		this.CONSUME(Semicolon);
	});
	scalarFunctionDefinition = this.RULE("scalarFunctionDefinition", () => {
		this.CONSUME(Scalar);
		this.CONSUME(FunctionKeyword);
		this.SUBRULE(this.cdsName);
		this.OPTION(() => {
			this.SUBRULE(this.parametersClause);
		});
		this.CONSUME(Returns);
		this.SUBRULE(this.typeReference);
		this.OPTION2(() => this.CONSUME(Semicolon));
	});
	hierarchyDefinition = this.RULE("hierarchyDefinition", () => {
		this.CONSUME(Hierarchy);
		this.SUBRULE(this.cdsName);
		this.OPTION(() => {
			this.SUBRULE(this.parametersClause);
		});
		this.CONSUME(As);
		this.CONSUME(Parent);
		this.CONSUME(Child);
		this.CONSUME2(Hierarchy);
		this.CONSUME(LParen);
		this.CONSUME(Source);
		this.SUBRULE(this.qualifiedName);
		this.CONSUME2(Child);
		this.CONSUME(To);
		this.CONSUME2(Parent);
		this.CONSUME(Association);
		this.SUBRULE2(this.cdsName);
		this.MANY(() => {
			this.OR([
				{ ALT: () => this.SUBRULE(this.hierarchyPeriod) },
				{ ALT: () => this.SUBRULE(this.hierarchyDirectory) },
				{ ALT: () => this.SUBRULE(this.hierarchyStart) }
			]);
		});
		this.CONSUME(Siblings);
		this.CONSUME(Order);
		this.CONSUME(By);
		this.SUBRULE(this.sortItem);
		this.MANY2(() => {
			this.CONSUME(Comma);
			this.SUBRULE2(this.sortItem);
		});
		this.MANY3(() => {
			this.OR2([
				{ ALT: () => this.SUBRULE(this.hierarchyDepth) },
				{ ALT: () => this.SUBRULE(this.hierarchyNodetype) },
				{ ALT: () => this.SUBRULE(this.hierarchyLoad) },
				{ ALT: () => this.SUBRULE(this.hierarchyMultiple) },
				{ ALT: () => this.SUBRULE(this.hierarchyOrphans) },
				{ ALT: () => this.SUBRULE(this.hierarchyCycles) },
				{ ALT: () => this.SUBRULE(this.hierarchyGenerate) },
				{ ALT: () => this.SUBRULE(this.hierarchyCache) }
			]);
		});
		this.CONSUME(RParen);
		this.SUBRULE(this.elementList);
	});
	/** `period from <f> to <f> [valid from <f> to <f>]` */
	hierarchyPeriod = this.RULE("hierarchyPeriod", () => {
		this.CONSUME(Period);
		this.CONSUME(From);
		this.SUBRULE(this.qualifiedName);
		this.CONSUME(To);
		this.SUBRULE2(this.qualifiedName);
		this.OPTION(() => {
			this.CONSUME(Valid);
			this.CONSUME2(From);
			this.SUBRULE3(this.qualifiedName);
			this.CONSUME2(To);
			this.SUBRULE4(this.qualifiedName);
		});
	});
	/** `directory <entity> filter by <cond>` */
	hierarchyDirectory = this.RULE("hierarchyDirectory", () => {
		this.CONSUME(Directory);
		this.SUBRULE(this.qualifiedName);
		this.CONSUME(Filter);
		this.CONSUME(By);
		this.SUBRULE(this.condition);
	});
	/** `start where <cond>` */
	hierarchyStart = this.RULE("hierarchyStart", () => {
		this.CONSUME(Start);
		this.CONSUME(Where);
		this.SUBRULE(this.condition);
	});
	/** `depth <field>|<number>` */
	hierarchyDepth = this.RULE("hierarchyDepth", () => {
		this.CONSUME(Depth);
		this.OR([{ ALT: () => this.SUBRULE(this.qualifiedName) }, { ALT: () => this.CONSUME(NumberLiteral) }]);
	});
	/** `nodetype <field>` */
	hierarchyNodetype = this.RULE("hierarchyNodetype", () => {
		this.CONSUME(Nodetype);
		this.SUBRULE(this.qualifiedName);
	});
	/** `load bulk|incremental|<sysvar>|<field>` */
	hierarchyLoad = this.RULE("hierarchyLoad", () => {
		this.CONSUME(Load);
		this.OR([
			{
				GATE: () => this.LA(1).tokenType === Bulk,
				ALT: () => this.CONSUME(Bulk)
			},
			{
				GATE: () => this.LA(1).tokenType === Incremental,
				ALT: () => this.CONSUME(Incremental)
			},
			{ ALT: () => this.SUBRULE(this.systemVariable) },
			{ ALT: () => this.SUBRULE(this.qualifiedName) }
		]);
	});
	/** `multiple parents not allowed|leaves only|allowed` */
	hierarchyMultiple = this.RULE("hierarchyMultiple", () => {
		this.CONSUME(Multiple);
		this.CONSUME(Parents);
		this.OR([
			{ ALT: () => {
				this.CONSUME(Not);
				this.CONSUME(Allowed);
			} },
			{ ALT: () => {
				this.CONSUME(Leaves);
				this.CONSUME(Only);
			} },
			{ ALT: () => this.CONSUME2(Allowed) }
		]);
	});
	/** `orphans ignore|error|root` */
	hierarchyOrphans = this.RULE("hierarchyOrphans", () => {
		this.CONSUME(Orphans);
		this.OR([
			{ ALT: () => this.CONSUME(Ignore) },
			{ ALT: () => this.CONSUME(ErrorKeyword) },
			{ ALT: () => this.CONSUME(Root) }
		]);
	});
	/** `cycles error|breakup` */
	hierarchyCycles = this.RULE("hierarchyCycles", () => {
		this.CONSUME(Cycles);
		this.OR([{ ALT: () => this.CONSUME(ErrorKeyword) }, { ALT: () => this.CONSUME(Breakup) }]);
	});
	/** `generate spantree` */
	hierarchyGenerate = this.RULE("hierarchyGenerate", () => {
		this.CONSUME(Generate);
		this.CONSUME(Spantree);
	});
	/** `cache on|off|force` */
	hierarchyCache = this.RULE("hierarchyCache", () => {
		this.CONSUME(Cache);
		this.OR([
			{ ALT: () => this.CONSUME(On) },
			{ ALT: () => this.CONSUME(Off) },
			{ ALT: () => this.CONSUME(Force) }
		]);
	});
	/** `<field> [ascending|descending]` — one ORDER BY item. */
	sortItem = this.RULE("sortItem", () => {
		this.SUBRULE(this.qualifiedName);
		this.OPTION(() => {
			this.OR([{ ALT: () => this.CONSUME(Ascending) }, { ALT: () => this.CONSUME(Descending) }]);
		});
	});
	aspectDefinition = this.RULE("aspectDefinition", () => {
		this.CONSUME(Aspect);
		this.SUBRULE(this.cdsName);
		this.OPTION(() => {
			this.CONSUME(LBrace);
			this.MANY(() => {
				this.SUBRULE(this.aspectElement);
			});
			this.CONSUME(RBrace);
		});
	});
	aspectElement = this.RULE("aspectElement", () => {
		this.MANY(() => this.SUBRULE(this.annotation));
		this.OPTION({
			GATE: () => this.isNameToken(this.LA(2)),
			DEF: () => this.CONSUME(Key)
		});
		this.SUBRULE(this.cdsName);
		this.CONSUME(Colon);
		this.OR([{
			GATE: () => this.isAspectTypedValue(),
			ALT: () => this.SUBRULE(this.typeReference)
		}, { ALT: () => this.SUBRULE(this.operand) }]);
		this.CONSUME(Semicolon);
	});
	/**
	* Lookahead for `name : <typing>;` inside an aspect element — true when the
	* token sequence after the colon is a type reference followed by `;`.
	*/
	isAspectTypedValue() {
		const typeAt = (n) => this.LA(n).tokenType;
		if (typeAt(1) === Abap) return this.abapTypeEndsAtSemicolon();
		if (!this.isNameToken(this.LA(1))) return false;
		let i = 2;
		while (typeAt(i) === Dot && this.isNameToken(this.LA(i + 1))) i += 2;
		return typeAt(i) === Semicolon;
	}
	/** `abap.x[(n[,m])]` followed by `;` — a builtin aspect type. */
	abapTypeEndsAtSemicolon() {
		const typeAt = (n) => this.LA(n).tokenType;
		if (typeAt(2) !== Dot || !this.isNameToken(this.LA(3))) return false;
		let i = 4;
		if (typeAt(i) === LParen) {
			while (typeAt(i) !== RParen && typeAt(i) !== EOF) i += 1;
			i += 1;
		}
		return typeAt(i) === Semicolon;
	}
	annotationDefinition = this.RULE("annotationDefinition", () => {
		this.CONSUME(AnnotationKeyword);
		this.SUBRULE(this.cdsName);
		this.OR([{ ALT: () => {
			this.CONSUME(LBrace);
			this.SUBRULE(this.tokenBlock);
			this.CONSUME(RBrace);
		} }, { ALT: () => {
			this.CONSUME(Colon);
			this.SUBRULE(this.simpleTail);
		} }]);
	});
	/** `: <anything>;` — a colon-led definition tail terminated by `;`. */
	simpleTail = this.RULE("simpleTail", () => {
		this.MANY(() => {
			this.OR(CdsParser.DCL_TOKENS.map((tokenType) => ({ ALT: () => this.CONSUME(tokenType) })));
		});
		this.CONSUME(Semicolon);
	});
	accessPolicyDefinition = this.RULE("accessPolicyDefinition", () => {
		this.CONSUME(Accesspolicy);
		this.SUBRULE(this.cdsName);
		this.CONSUME(LBrace);
		this.SUBRULE(this.tokenBlock);
		this.CONSUME(RBrace);
	});
	/**
	* Balanced `{ … }` block content — any tokens, with nested brace groups.
	* Used for DDLA annotation bodies and access policy definitions.
	*/
	tokenBlock = this.RULE("tokenBlock", () => {
		this.MANY(() => {
			this.OR([{ ALT: () => this.SUBRULE(this.tokenGroup) }, { ALT: () => {
				this.OR2(CdsParser.BLOCK_TOKENS.map((tokenType) => ({ ALT: () => this.CONSUME(tokenType) })));
			} }]);
		});
	});
	tokenGroup = this.RULE("tokenGroup", () => {
		this.CONSUME(LBrace);
		this.SUBRULE(this.tokenBlock);
		this.CONSUME(RBrace);
	});
	roleDefinition = this.RULE("roleDefinition", () => {
		this.CONSUME(Role);
		this.SUBRULE(this.cdsName);
		this.OPTION(() => this.CONSUME(Switchable));
		this.CONSUME(LBrace);
		this.MANY(() => {
			this.SUBRULE(this.roleMember);
		});
		this.CONSUME(RBrace);
	});
	roleMember = this.RULE("roleMember", () => {
		this.OR([
			{ ALT: () => this.SUBRULE(this.grantStatement) },
			{ ALT: () => this.SUBRULE(this.inheritStatement) },
			{ ALT: () => this.SUBRULE(this.inheritingStatement) }
		]);
	});
	/**
	* `grant select on <entity> [with optional elements ( … )]
	*  [combination mode or|and | redefinition] [inherit <role> [and|or <cond>]]
	*  [where <dcl_cond>] ;`
	*/
	grantStatement = this.RULE("grantStatement", () => {
		this.CONSUME(Grant);
		this.CONSUME(Select);
		this.CONSUME(On);
		this.SUBRULE(this.qualifiedName);
		this.MANY(() => {
			this.SUBRULE(this.grantClause);
		});
		this.CONSUME(Semicolon);
	});
	/** One trailing clause of `grant select on <entity>`: with-optional-elements | combination-mode/redefinition | inherit | where. */
	grantClause = this.RULE("grantClause", () => {
		this.OR([
			{ ALT: () => this.SUBRULE(this.grantOptionalElements) },
			{ ALT: () => this.SUBRULE(this.grantCombination) },
			{ ALT: () => this.SUBRULE(this.grantInherit) },
			{ ALT: () => this.SUBRULE(this.grantWhere) }
		]);
	});
	/** `with optional elements ( <name> [default true|false], … )` */
	grantOptionalElements = this.RULE("grantOptionalElements", () => {
		this.CONSUME(With);
		this.CONSUME(Optional);
		this.CONSUME(Elements);
		this.CONSUME(LParen);
		this.SUBRULE(this.optionalElement);
		this.MANY(() => {
			this.CONSUME(Comma);
			this.SUBRULE2(this.optionalElement);
		});
		this.CONSUME(RParen);
	});
	/** `combination mode or|and` | `redefinition` */
	grantCombination = this.RULE("grantCombination", () => {
		this.OR([{ ALT: () => {
			this.CONSUME(Combination);
			this.CONSUME(Mode);
			this.OR2([{ ALT: () => this.CONSUME(Or) }, { ALT: () => this.CONSUME(And) }]);
		} }, { ALT: () => this.CONSUME(Redefinition) }]);
	});
	/** `inherit <role> [and|or <dcl_cond>]` */
	grantInherit = this.RULE("grantInherit", () => {
		this.CONSUME(Inherit);
		this.SUBRULE(this.qualifiedName);
		this.OPTION(() => {
			this.OR([{ ALT: () => this.CONSUME(And) }, { ALT: () => this.CONSUME(Or) }]);
			this.SUBRULE(this.dclCondition);
		});
	});
	/** `where <dcl_cond>` */
	grantWhere = this.RULE("grantWhere", () => {
		this.CONSUME(Where);
		this.SUBRULE(this.dclCondition);
	});
	/** One entry of `with optional elements ( … )`: `name [default true|false]`. */
	optionalElement = this.RULE("optionalElement", () => {
		this.SUBRULE(this.qualifiedName);
		this.OPTION(() => {
			this.CONSUME(Default);
			this.OR([{ ALT: () => this.CONSUME(True) }, { ALT: () => this.CONSUME(False) }]);
		});
	});
	/**
	* `inherit <role> for grant select on <entity> [where …] ;`
	* — the standalone inherit rule of a role body.
	*/
	inheritStatement = this.RULE("inheritStatement", () => {
		this.CONSUME(Inherit);
		this.SUBRULE(this.qualifiedName);
		this.OPTION(() => {
			this.CONSUME(For);
			this.CONSUME(Grant);
			this.CONSUME(Select);
			this.CONSUME(On);
			this.SUBRULE2(this.qualifiedName);
		});
		this.OPTION2(() => {
			this.CONSUME(Where);
			this.SUBRULE(this.dclCondition);
		});
		this.CONSUME(Semicolon);
	});
	/**
	* `inheriting conditions from entity <name>|super [default true|false] … ;`
	*/
	inheritingStatement = this.RULE("inheritingStatement", () => {
		this.CONSUME(Inheriting);
		this.CONSUME(Conditions);
		this.CONSUME(From);
		this.OR([{ ALT: () => {
			this.CONSUME(Entity);
			this.SUBRULE(this.qualifiedName);
		} }, { ALT: () => this.CONSUME(Super) }]);
		this.OPTION(() => {
			this.CONSUME(Default);
			this.OR2([{ ALT: () => this.CONSUME(True) }, { ALT: () => this.CONSUME(False) }]);
		});
		this.OPTION2(() => {
			this.SUBRULE(this.dclCondition);
		});
		this.CONSUME(Semicolon);
	});
	/**
	* A DCL access condition — captured opaquely until the terminating `;`.
	* Covers literal, pfcg, aspect, user, inherit and `if-then-else` conditions
	* plus `true`/`false`/`void` and `and`/`or`/`not` combinations.
	*/
	dclCondition = this.RULE("dclCondition", () => {
		this.AT_LEAST_ONE(() => {
			this.OR(CdsParser.DCL_TOKENS.map((tokenType) => ({ ALT: () => this.CONSUME(tokenType) })));
		});
	});
	extendStatement = this.RULE("extendStatement", () => {
		this.CONSUME(Extend);
		this.OR([
			{ ALT: () => {
				this.CONSUME(View);
				this.OPTION({
					GATE: () => this.isEntityModifier(),
					DEF: () => this.CONSUME(Entity)
				});
				this.SUBRULE(this.qualifiedName);
			} },
			{ ALT: () => {
				this.CONSUME(Abstract);
				this.CONSUME2(Entity);
				this.SUBRULE2(this.qualifiedName);
			} },
			{ ALT: () => {
				this.CONSUME(Custom);
				this.CONSUME3(Entity);
				this.SUBRULE3(this.qualifiedName);
			} }
		]);
		this.CONSUME(With);
		this.MANY(() => {
			this.SUBRULE(this.associationTail);
		});
		this.SUBRULE(this.elementList);
		this.OPTION2(() => {
			this.CONSUME(Group);
			this.CONSUME(By);
			this.SUBRULE4(this.qualifiedName);
			this.MANY2(() => {
				this.CONSUME(Comma);
				this.SUBRULE5(this.qualifiedName);
			});
		});
		this.MANY3(() => {
			this.SUBRULE(this.extendSetOperation);
		});
		this.OPTION3(() => this.CONSUME(Semicolon));
	});
	/** `union [all]|intersect|except { … }` — extension-level set operation. */
	extendSetOperation = this.RULE("extendSetOperation", () => {
		this.OR([
			{ ALT: () => {
				this.CONSUME(Union);
				this.OPTION(() => this.CONSUME(All));
			} },
			{ ALT: () => this.CONSUME(Intersect) },
			{ ALT: () => this.CONSUME(Except) }
		]);
		this.SUBRULE(this.elementList);
	});
	tableMember = this.RULE("tableMember", () => {
		this.OR([{
			GATE: () => this.LA(1).tokenType === Include && this.isNameToken(this.LA(2)),
			ALT: () => this.SUBRULE(this.includeDirective)
		}, { ALT: () => this.SUBRULE(this.fieldDefinition) }]);
	});
	includeDirective = this.RULE("includeDirective", () => {
		this.CONSUME(Include);
		this.SUBRULE(this.cdsName);
		this.OPTION(() => {
			this.CONSUME(With);
			this.CONSUME(Suffix);
			this.SUBRULE2(this.cdsName);
		});
		this.CONSUME(Semicolon);
	});
	fieldDefinition = this.RULE("fieldDefinition", () => {
		this.MANY(() => {
			this.SUBRULE(this.annotation);
		});
		this.OPTION({
			GATE: () => this.isNameToken(this.LA(2)),
			DEF: () => this.CONSUME(Key)
		});
		this.SUBRULE(this.cdsName);
		this.CONSUME(Colon);
		this.SUBRULE(this.typeReference);
		this.OPTION2(() => {
			this.CONSUME(Not);
			this.CONSUME(Null);
		});
		this.CONSUME(Semicolon);
	});
	annotateStatement = this.RULE("annotateStatement", () => {
		this.CONSUME(Annotate);
		this.OR([{ ALT: () => this.CONSUME(Entity) }, { ALT: () => this.CONSUME(View) }]);
		this.SUBRULE(this.cdsName);
		this.CONSUME(With);
		this.CONSUME(LBrace);
		this.MANY(() => {
			this.SUBRULE(this.annotatedElement);
		});
		this.CONSUME(RBrace);
	});
	annotatedElement = this.RULE("annotatedElement", () => {
		this.MANY(() => {
			this.SUBRULE(this.annotation);
		});
		this.SUBRULE(this.qualifiedName);
		this.CONSUME(Semicolon);
	});
	topLevelAnnotation = this.RULE("topLevelAnnotation", () => {
		this.SUBRULE(this.annotation);
	});
	annotation = this.RULE("annotation", () => {
		this.CONSUME(At);
		this.SUBRULE(this.dottedName);
		this.OPTION(() => {
			this.CONSUME(Colon);
			this.SUBRULE(this.annotationValue);
		});
	});
	dottedName = this.RULE("dottedName", () => {
		this.SUBRULE(this.cdsName);
		this.MANY(() => {
			this.CONSUME(Dot);
			this.SUBRULE2(this.cdsName);
		});
	});
	annotationValue = this.RULE("annotationValue", () => {
		this.OR([
			{ ALT: () => this.CONSUME(StringLiteral) },
			{ ALT: () => this.CONSUME(EnumLiteral) },
			{ ALT: () => this.CONSUME(True) },
			{ ALT: () => this.CONSUME(False) },
			{ ALT: () => this.CONSUME(NumberLiteral) },
			{ ALT: () => this.SUBRULE(this.annotationArray) },
			{ ALT: () => this.SUBRULE(this.annotationObject) }
		]);
	});
	annotationArray = this.RULE("annotationArray", () => {
		this.CONSUME(LBracket);
		this.MANY_SEP({
			SEP: Comma,
			DEF: () => {
				this.SUBRULE(this.annotationValue);
			}
		});
		this.CONSUME(RBracket);
	});
	annotationObject = this.RULE("annotationObject", () => {
		this.CONSUME(LBrace);
		this.MANY_SEP({
			SEP: Comma,
			DEF: () => {
				this.SUBRULE(this.annotationProperty);
			}
		});
		this.CONSUME(RBrace);
	});
	annotationProperty = this.RULE("annotationProperty", () => {
		this.SUBRULE(this.dottedName);
		this.CONSUME(Colon);
		this.SUBRULE(this.annotationValue);
	});
	literal = this.RULE("literal", () => {
		this.OPTION(() => this.CONSUME(Minus));
		this.OR([
			{ ALT: () => this.CONSUME(StringLiteral) },
			{ ALT: () => this.CONSUME(NumberLiteral) },
			{ ALT: () => this.CONSUME(EnumLiteral) },
			{ ALT: () => this.CONSUME(True) },
			{ ALT: () => this.CONSUME(False) },
			{ ALT: () => this.CONSUME(Null) },
			{
				GATE: () => this.isTypedLiteral(),
				ALT: () => {
					this.CONSUME(Abap);
					this.CONSUME(Dot);
					this.SUBRULE(this.cdsName);
					this.CONSUME2(StringLiteral);
				}
			}
		]);
	});
	/** Cheap lookahead: `abap.<type>'…'` — a typed literal. */
	isTypedLiteral() {
		return this.LA(1).tokenType === Abap && this.LA(2).tokenType === Dot && this.isNameToken(this.LA(3)) && this.LA(4).tokenType === StringLiteral;
	}
	condition = this.RULE("condition", () => {
		this.SUBRULE(this.conditionOperand);
		this.MANY(() => {
			this.OR([{ ALT: () => this.CONSUME(And) }, { ALT: () => this.CONSUME(Or) }]);
			this.SUBRULE2(this.conditionOperand);
		});
	});
	conditionOperand = this.RULE("conditionOperand", () => {
		this.OPTION(() => this.CONSUME(Not));
		this.OR([{
			GATE: () => this.isParenCondition(),
			ALT: () => {
				this.CONSUME(LParen);
				this.SUBRULE(this.condition);
				this.CONSUME(RParen);
			}
		}, { ALT: () => {
			this.SUBRULE(this.operand);
			this.SUBRULE(this.predicate);
		} }]);
	});
	/** The mandatory predicate part of a strict condition operand. */
	predicate = this.RULE("predicate", () => {
		this.OR([
			{ ALT: () => {
				this.OR2([
					{ ALT: () => this.CONSUME(EqEq) },
					{ ALT: () => this.CONSUME(Eq) },
					{ ALT: () => this.CONSUME(NotEq) },
					{ ALT: () => this.CONSUME(LtEq) },
					{ ALT: () => this.CONSUME(GtEq) },
					{ ALT: () => this.CONSUME(Lt) },
					{ ALT: () => this.CONSUME(Gt) }
				]);
				this.SUBRULE(this.operand);
			} },
			{ ALT: () => {
				this.CONSUME(Like);
				this.SUBRULE2(this.operand);
				this.OPTION({
					GATE: () => this.LA(1).tokenType === Identifier && this.LA(1).image.toLowerCase() === "escape",
					DEF: () => {
						this.CONSUME(Identifier);
						this.SUBRULE3(this.operand);
					}
				});
			} },
			{ ALT: () => {
				this.CONSUME(Between);
				this.SUBRULE4(this.operand);
				this.CONSUME(And);
				this.SUBRULE5(this.operand);
			} },
			{ ALT: () => {
				this.CONSUME(In);
				this.OR3([{ ALT: () => {
					this.CONSUME(LParen);
					this.OPTION2(() => {
						this.SUBRULE6(this.operand);
						this.MANY(() => {
							this.CONSUME(Comma);
							this.SUBRULE7(this.operand);
						});
					});
					this.CONSUME(RParen);
				} }, {
					GATE: () => this.LA(1).tokenType !== LParen,
					ALT: () => this.SUBRULE8(this.operand)
				}]);
			} },
			{
				GATE: () => this.isIsPredicate(),
				ALT: () => {
					this.CONSUME2(Identifier);
					this.OPTION3(() => this.CONSUME(Not));
					this.OR4([{ ALT: () => this.CONSUME(Null) }, { ALT: () => this.CONSUME3(Identifier) }]);
				}
			}
		]);
	});
	/** Cheap lookahead: `is` — the `is null` / `is initial` predicate. */
	isIsPredicate() {
		const first = this.LA(1);
		if (!first) return false;
		return first.tokenType?.name === "Identifier" && first.image.toLowerCase() === "is";
	}
	/**
	* Relaxed expression — operands with optional predicates and AND/OR
	* chains. Used for call arguments and `case … when` branches, where a
	* bare operand is legal.
	*/
	expression = this.RULE("expression", () => {
		this.SUBRULE(this.comparison);
		this.MANY(() => {
			this.OR([{ ALT: () => this.CONSUME(And) }, { ALT: () => this.CONSUME(Or) }]);
			this.SUBRULE2(this.comparison);
		});
	});
	comparison = this.RULE("comparison", () => {
		this.SUBRULE(this.operand);
		this.OPTION(() => {
			this.SUBRULE(this.predicate);
		});
	});
	/**
	* An operand — a primary expression optionally chained with arithmetic
	* operators: `a.b`, `f(x)`, `a + b * c`, `case … end`, `cast(…)`.
	*/
	operand = this.RULE("operand", () => {
		this.SUBRULE(this.primary);
		this.MANY(() => {
			this.OR([
				{ ALT: () => this.CONSUME(Plus) },
				{ ALT: () => this.CONSUME(Minus) },
				{ ALT: () => this.CONSUME(Star) },
				{ ALT: () => this.CONSUME(Slash) }
			]);
			this.SUBRULE2(this.primary);
		});
	});
	primary = this.RULE("primary", () => {
		this.OPTION(() => {
			this.OR([{ ALT: () => this.CONSUME(Minus) }, { ALT: () => this.CONSUME(Plus) }]);
		});
		this.OR2([
			{ ALT: () => this.SUBRULE(this.parenthesizedExpression) },
			{
				GATE: () => this.isCaseExpression(),
				ALT: () => this.SUBRULE(this.caseExpression)
			},
			{
				GATE: () => this.isCastExpression(),
				ALT: () => this.SUBRULE(this.castExpression)
			},
			{ ALT: () => this.SUBRULE(this.systemVariable) },
			{ ALT: () => this.SUBRULE(this.parameterRef) },
			{
				GATE: () => this.isLiteralStart(),
				ALT: () => this.SUBRULE(this.literal)
			},
			{ ALT: () => this.SUBRULE(this.pathOperand) }
		]);
	});
	/**
	* A path or call operand: `<name>[<attr>].<name>…` optionally followed by
	* an argument list and a window `over (…)`.
	*   - `a.b`, `_assoc.field`, `_a[to exact one: f = 1].g`
	*   - `coalesce(a, b)`, `sum(x)`, `count(*)`, `count(distinct x)`
	*   - `row_number() over (partition by a order by b descending)`
	*/
	pathOperand = this.RULE("pathOperand", () => {
		this.SUBRULE(this.pathSegment);
		this.MANY(() => {
			this.CONSUME(Dot);
			this.SUBRULE2(this.pathSegment);
		});
		this.OPTION(() => {
			this.CONSUME(LParen);
			this.OPTION2(() => {
				this.SUBRULE(this.callArgument);
				this.MANY2(() => {
					this.CONSUME(Comma);
					this.SUBRULE2(this.callArgument);
				});
			});
			this.CONSUME(RParen);
			this.OPTION3(() => this.SUBRULE(this.overClause));
		});
	});
	/** One path segment: `<name>` plus optional `[…]` attributes. */
	pathSegment = this.RULE("pathSegment", () => {
		this.SUBRULE(this.cdsName);
		this.MANY(() => {
			this.SUBRULE(this.bracketTokens);
		});
	});
	/**
	* `[ … ]` — square-bracketed path attribute or association filter.
	* Contents (`cardinality`, `inner|left outer`, `where <cond>`,
	* `<card>:<cond>`, parameter bindings) are captured opaquely.
	*/
	bracketTokens = this.RULE("bracketTokens", () => {
		this.CONSUME(LBracket);
		this.MANY(() => {
			this.OR(allTokens.filter((t) => ![
				"WhiteSpace",
				"LineComment",
				"BlockComment",
				"SqlLineComment",
				"LBracket",
				"RBracket"
			].includes(t.name)).map((tokenType) => ({ ALT: () => this.CONSUME(tokenType) })));
		});
		this.CONSUME(RBracket);
	});
	/**
	* One call argument: `*`, `distinct <operand>` or a relaxed expression
	* (bare operands are legal inside argument lists).
	*/
	callArgument = this.RULE("callArgument", () => {
		this.OPTION({
			GATE: () => this.isNameToken(this.LA(1)) && this.LA(2).tokenType === FatArrow,
			DEF: () => {
				this.SUBRULE(this.cdsName);
				this.CONSUME(FatArrow);
			}
		});
		this.OR([
			{ ALT: () => this.CONSUME(Star) },
			{
				GATE: () => this.LA(1).tokenType === Distinct && this.isElementStart(this.LA(2)),
				ALT: () => {
					this.CONSUME(Distinct);
					this.SUBRULE(this.operand);
				}
			},
			{ ALT: () => this.SUBRULE(this.expression) }
		]);
	});
	/**
	* `over (partition by <fields> [order by <sort items>])` — window function
	* clause.
	*/
	overClause = this.RULE("overClause", () => {
		this.CONSUME(Over);
		this.CONSUME(LParen);
		this.OPTION(() => {
			this.CONSUME(Partition);
			this.CONSUME(By);
			this.SUBRULE(this.qualifiedName);
			this.MANY(() => {
				this.CONSUME(Comma);
				this.SUBRULE2(this.qualifiedName);
			});
		});
		this.OPTION2(() => {
			this.CONSUME(Order);
			this.CONSUME2(By);
			this.SUBRULE(this.sortItem);
			this.MANY2(() => {
				this.CONSUME2(Comma);
				this.SUBRULE2(this.sortItem);
			});
		});
		this.CONSUME(RParen);
	});
	/** `( <expression> )` — a parenthesized sub-expression. */
	parenthesizedExpression = this.RULE("parenthesizedExpression", () => {
		this.CONSUME(LParen);
		this.SUBRULE(this.expression);
		this.CONSUME(RParen);
	});
	/** `cast( <value> as <type> [preserving type] )` */
	castExpression = this.RULE("castExpression", () => {
		this.CONSUME(Identifier);
		this.CONSUME(LParen);
		this.SUBRULE(this.operand);
		this.CONSUME(As);
		this.SUBRULE(this.typeReference);
		this.OPTION({
			GATE: () => this.LA(1).tokenType === Identifier && this.LA(1).image.toLowerCase() === "preserving",
			DEF: () => {
				this.CONSUME2(Identifier);
				this.CONSUME(Type);
			}
		});
		this.CONSUME(RParen);
	});
	/**
	* `case [operand] when … then … [else …|else null] end`
	*   — simple case: `case f when 'a' then 1 …`
	*   — searched case: `case when f = 1 then 'x' …`
	*/
	caseExpression = this.RULE("caseExpression", () => {
		this.CONSUME(Case);
		this.OPTION({
			GATE: () => this.LA(1).tokenType !== When,
			DEF: () => this.SUBRULE(this.operand)
		});
		this.AT_LEAST_ONE(() => {
			this.CONSUME(When);
			this.SUBRULE(this.expression);
			this.CONSUME(Then);
			this.SUBRULE2(this.operand);
		});
		this.OPTION2(() => {
			this.CONSUME(Else);
			this.SUBRULE3(this.operand);
		});
		this.CONSUME(End);
	});
	/** `$session.client`, `$parameters.P_X`, `$projection.Field`, `$node.x`. */
	systemVariable = this.RULE("systemVariable", () => {
		this.CONSUME(Dollar);
		this.SUBRULE(this.qualifiedName);
	});
	/** `:P_Param` — a parameter reference of the consuming view. */
	parameterRef = this.RULE("parameterRef", () => {
		this.CONSUME(Colon);
		this.SUBRULE(this.qualifiedName);
	});
	typeReference = this.RULE("typeReference", () => {
		this.OR([{
			GATE: () => this.LA(1).tokenType === Abap && this.LA(2).tokenType === Dot,
			ALT: () => this.SUBRULE(this.builtinType)
		}, { ALT: () => this.SUBRULE(this.namedType) }]);
	});
	/** `abap.char(10)` or `abap.dec(11,2)` */
	builtinType = this.RULE("builtinType", () => {
		this.CONSUME(Abap);
		this.CONSUME(Dot);
		this.SUBRULE(this.cdsName);
		this.OPTION(() => {
			this.CONSUME(LParen);
			this.CONSUME(NumberLiteral);
			this.OPTION2(() => {
				this.CONSUME(Comma);
				this.CONSUME2(NumberLiteral);
			});
			this.CONSUME(RParen);
		});
	});
	/** Data element or other named type reference */
	namedType = this.RULE("namedType", () => {
		this.SUBRULE(this.qualifiedName);
	});
	/** An identifier that may also be a keyword used as a name. */
	cdsName = this.RULE("cdsName", () => {
		this.OR(CdsParser.NAME_TOKENS.map((tokenType) => ({ ALT: () => this.CONSUME(tokenType) })));
	});
	/**
	* A name usable as an *implicit* (bare) source alias.
	*
	* It is `cdsName` without the FROM-region starters — those tokens belong
	* to the next item of the FROM region and must not be read as an alias.
	*/
	bareAliasName = this.RULE("bareAliasName", () => {
		this.OR(CdsParser.NAME_TOKENS.filter((tokenType) => !CdsParser.FROM_REGION_STARTERS.has(tokenType)).map((tokenType) => ({ ALT: () => this.CONSUME(tokenType) })));
	});
	/** Dot-separated qualified name: foo.bar.baz */
	qualifiedName = this.RULE("qualifiedName", () => {
		this.SUBRULE(this.cdsName);
		this.MANY(() => {
			this.CONSUME(Dot);
			this.SUBRULE2(this.cdsName);
		});
	});
};
/** Singleton parser instance (Chevrotain parsers are reusable) */
const cdsParser = new CdsParser();

// src/visitor.ts
const BaseCstVisitor = cdsParser.getBaseCstVisitorConstructor();
function asNodes(v) {
	return v ?? [];
}
function asTokens(v) {
	return v ?? [];
}
function collectTokenImages(node) {
	if (!node) return [];
	const out = [];
	const walk = (n) => {
		for (const children of Object.values(n.children)) for (const child of children) if ("tokenType" in child) out.push(child);
		else walk(child);
	};
	walk(node);
	out.sort((a, b) => (a.startOffset ?? 0) - (b.startOffset ?? 0));
	return out;
}
/** All tokens of a rule context, in source order. */
function ctxTokens(ctx) {
	const out = [];
	for (const value of Object.values(ctx)) for (const child of value ?? []) if ("tokenType" in child) out.push(child);
	else out.push(...collectTokenImages(child));
	out.sort((a, b) => (a.startOffset ?? 0) - (b.startOffset ?? 0));
	return out;
}
/**
* Format tokens as source-like text: no space before `(` `,` `)` `]` `.`,
* and none after `(` `[` `.` `$` `:` `@` — e.g. `coalesce(a.b, c)`,
* `$session.client`, `:P_Param`, `@Anno.value`.
*/
function formatTokens(toks) {
	let out = "";
	for (let i = 0; i < toks.length; i += 1) {
		const img = toks[i].image;
		if (!out) {
			out = img;
			continue;
		}
		const tight = img.startsWith("'") && i >= 2 && toks[i - 2].image === "." && /^[A-Za-z_]\w*$/.test(toks[i - 1].image) || [
			"(",
			",",
			")",
			"]",
			".",
			":"
		].includes(img) || out.endsWith("(") || out.endsWith("[") || out.endsWith(".") || out.endsWith("$") || out.endsWith(":") || out.endsWith("@");
		out += tight ? img : ` ${img}`;
	}
	return out;
}
function toExpression(node) {
	const toks = collectTokenImages(node);
	return {
		source: formatTokens(toks),
		tokens: toks.map((t) => t.image)
	};
}
/**
* Raw text of a CST node — the token images concatenated without separators.
* Used for parameter bindings, where the original spelling matters
* (`:P_Param`, `$session.client`, `'X'`).
*/
function toRawText(node) {
	return collectTokenImages(node).map((t) => t.image).join("");
}
var CdsVisitor = class extends BaseCstVisitor {
	constructor() {
		super();
		this.validateVisitor();
	}
	sourceFile(ctx) {
		const annotations = asNodes(ctx.topLevelAnnotation).map((node) => this.visit(node));
		const def = this.visit(asNodes(ctx.definition)[0]);
		if ("annotations" in def) def.annotations = [...annotations, ...def.annotations];
		return { definitions: [def] };
	}
	definition(ctx) {
		if (ctx.defineStatement) return this.visit(asNodes(ctx.defineStatement)[0]);
		if (ctx.extendStatement) return this.visit(asNodes(ctx.extendStatement)[0]);
		return this.visit(asNodes(ctx.annotateStatement)[0]);
	}
	defineStatement(ctx) {
		const dispatch = [
			asNodes(ctx.prefixedDefinition)[0],
			asNodes(ctx.tableDefinition)[0],
			asNodes(ctx.structureDefinition)[0],
			asNodes(ctx.viewEntityDefinition)[0],
			asNodes(ctx.abstractEntityDefinition)[0],
			asNodes(ctx.customEntityDefinition)[0],
			asNodes(ctx.simpleTypeDefinition)[0],
			asNodes(ctx.serviceDefinition)[0],
			asNodes(ctx.roleDefinition)[0],
			asNodes(ctx.hierarchyDefinition)[0],
			asNodes(ctx.aspectDefinition)[0],
			asNodes(ctx.externalEntityDefinition)[0],
			asNodes(ctx.scalarFunctionDefinition)[0],
			asNodes(ctx.annotationDefinition)[0],
			asNodes(ctx.accessPolicyDefinition)[0]
		];
		for (const node of dispatch) if (node) return this.visit(node);
		return {
			kind: "table",
			name: "",
			annotations: [],
			members: []
		};
	}
	/**
	* `define (writable|root)+ <view|external entity|table entity>` — applies
	* the leading modifiers to whichever entity form followed them.
	*/
	prefixedDefinition(ctx) {
		const writable = !!asTokens(ctx.Writable).length;
		const root = !!asTokens(ctx.Root).length;
		const node = asNodes(ctx.viewEntityDefinition)[0] ?? asNodes(ctx.externalEntityDefinition)[0] ?? asNodes(ctx.rootTableEntityDefinition)[0];
		const def = this.visit(node);
		if (root) def.root = true;
		if (writable) def.writable = true;
		return def;
	}
	rootTableEntityDefinition(ctx) {
		return {
			kind: "table",
			name: this.visit(asNodes(ctx.cdsName)[0]),
			annotations: [],
			entity: true,
			members: asNodes(ctx.tableMember).map((node) => this.visit(node))
		};
	}
	tableDefinition(ctx) {
		if (ctx.tableFunctionTail) return this.visit(asNodes(ctx.tableFunctionTail)[0]);
		const name = this.visit(asNodes(ctx.cdsName)[0]);
		const members = asNodes(ctx.tableMember).map((node) => this.visit(node));
		return {
			kind: "table",
			name,
			annotations: [],
			...!!asTokens(ctx.Entity).length && { entity: true },
			members
		};
	}
	tableFunctionTail(ctx) {
		const name = this.visit(asNodes(ctx.cdsName)[0]);
		const parameters = ctx.parametersClause ? this.visit(asNodes(ctx.parametersClause)[0]) : [];
		const members = asNodes(ctx.fieldDefinition).map((node) => this.visit(node));
		const implementingClass = this.visit(asNodes(ctx.qualifiedName)[0]);
		const implementingMethod = asNodes(ctx.cdsName)[1] ? this.visit(asNodes(ctx.cdsName)[1]) : void 0;
		return {
			kind: "tableFunction",
			name,
			annotations: [],
			parameters,
			members,
			implementingClass,
			...implementingMethod && { implementingMethod }
		};
	}
	structureDefinition(ctx) {
		return {
			kind: "structure",
			name: this.visit(asNodes(ctx.cdsName)[0]),
			annotations: [],
			members: asNodes(ctx.tableMember).map((node) => this.visit(node))
		};
	}
	viewEntityDefinition(ctx) {
		const legacy = asTokens(ctx.Entity).length === 0;
		const names = asNodes(ctx.cdsName).map((n) => this.visit(n));
		const name = names[0] ?? "";
		const providerContract = ctx.Contract ? names[1] : void 0;
		const parameters = ctx.parametersClause ? this.visit(asNodes(ctx.parametersClause)[0]) : [];
		const tail = this.viewTail(ctx);
		return {
			kind: "viewEntity",
			name,
			annotations: [],
			sourceKind: tail.sourceKind,
			source: tail.source,
			joins: tail.joins,
			parameters,
			members: tail.members,
			...legacy && { legacy: true },
			...tail.distinct && { distinct: true },
			...providerContract && { providerContract },
			...tail.fromAssociations.length > 0 && { fromAssociations: tail.fromAssociations },
			...tail.redefinedAssociations.length > 0 && { redefinedAssociations: tail.redefinedAssociations },
			...tail.aspectBindings.length > 0 && { aspectBindings: tail.aspectBindings },
			...tail.where && { where: tail.where },
			...tail.groupBy && { groupBy: tail.groupBy },
			...tail.having && { having: tail.having },
			...tail.setOperations && tail.setOperations.length > 0 && { setOperations: tail.setOperations }
		};
	}
	/** Reduce the `as select …` / `as projection …` tail to a shared shape. */
	viewTail(ctx) {
		const empty = {
			sourceKind: "select",
			distinct: false,
			source: { name: "" },
			joins: [],
			fromAssociations: [],
			redefinedAssociations: [],
			aspectBindings: [],
			members: []
		};
		if (ctx.selectStatement) {
			const select = this.visit(asNodes(ctx.selectStatement)[0]);
			return {
				...empty,
				sourceKind: "select",
				distinct: !!select.distinct,
				source: select.source,
				joins: select.joins,
				fromAssociations: select.fromAssociations ?? [],
				aspectBindings: select.aspectBindings ?? [],
				members: select.members,
				where: select.where,
				groupBy: select.groupBy,
				having: select.having,
				setOperations: select.setOperations
			};
		}
		if (ctx.projectionTail) {
			const proj = this.visit(asNodes(ctx.projectionTail)[0]);
			return {
				...empty,
				sourceKind: "projection",
				source: proj.source,
				fromAssociations: proj.associations,
				redefinedAssociations: proj.redefinedAssociations,
				aspectBindings: proj.aspectBindings,
				members: proj.members,
				where: proj.where
			};
		}
		return empty;
	}
	abstractEntityDefinition(ctx) {
		return {
			kind: "abstractEntity",
			name: this.visit(asNodes(ctx.cdsName)[0]),
			annotations: [],
			parameters: ctx.parametersClause ? this.visit(asNodes(ctx.parametersClause)[0]) : [],
			members: this.visit(asNodes(ctx.elementList)[0])
		};
	}
	customEntityDefinition(ctx) {
		return {
			kind: "customEntity",
			name: this.visit(asNodes(ctx.cdsName)[0]),
			annotations: [],
			parameters: ctx.parametersClause ? this.visit(asNodes(ctx.parametersClause)[0]) : [],
			members: this.visit(asNodes(ctx.elementList)[0])
		};
	}
	externalEntityDefinition(ctx) {
		const names = asNodes(ctx.cdsName).map((n) => this.visit(n));
		const name = names[0] ?? "";
		const externalName = ctx.Name ? names[1] : void 0;
		return {
			kind: "externalEntity",
			name,
			annotations: [],
			parameters: ctx.parametersClause ? this.visit(asNodes(ctx.parametersClause)[0]) : [],
			members: asNodes(ctx.fieldDefinition).map((node) => this.visit(node)),
			...externalName && { externalName }
		};
	}
	selectStatement(ctx) {
		const distinct = !!asTokens(ctx.Distinct).length;
		const source = this.visit(asNodes(ctx.dataSource)[0]);
		const joins = asNodes(ctx.joinClause).map((node) => this.visit(node));
		const fromAssociations = asNodes(ctx.associationTail).map((node) => this.visit(node));
		const aspectBindings = asNodes(ctx.bindAspect).map((node) => this.visit(node));
		const members = ctx.elementList ? this.visit(asNodes(ctx.elementList)[0]) : [];
		const clauses = ctx.selectClauses ? this.visit(asNodes(ctx.selectClauses)[0]) : {};
		return {
			kind: "selectStatement",
			...distinct && { distinct: true },
			source,
			joins,
			...fromAssociations.length > 0 && { fromAssociations },
			...aspectBindings.length > 0 && { aspectBindings },
			members,
			...clauses.where && { where: clauses.where },
			...clauses.groupBy && { groupBy: clauses.groupBy },
			...clauses.having && { having: clauses.having },
			...clauses.setOperations && clauses.setOperations.length > 0 && { setOperations: clauses.setOperations }
		};
	}
	selectClauses(ctx) {
		const conditions = asNodes(ctx.condition);
		const groupBy = asNodes(ctx.qualifiedName).map((n) => this.visit(n));
		const where = ctx.Where ? toExpression(conditions[0]) : void 0;
		let having;
		if (ctx.Having) having = toExpression(conditions[ctx.Where ? 1 : 0]);
		const setOperations = asNodes(ctx.setOperation).map((n) => this.visit(n));
		return {
			...where && { where },
			...groupBy.length > 0 && { groupBy },
			...having && { having },
			...setOperations.length > 0 && { setOperations }
		};
	}
	setOperation(ctx) {
		const statement = this.visit(asNodes(ctx.selectStatement)[0]);
		return {
			kind: "setOperation",
			operator: this.setOperator(ctx),
			statement
		};
	}
	/** Shared `union [all]|intersect|except` operator mapping. */
	setOperator(ctx) {
		if (ctx.Intersect) return "intersect";
		if (ctx.Except) return "except";
		return asTokens(ctx.All).length ? "unionAll" : "union";
	}
	/** Visit `ctx[key][0]` when the optional subrule fired, else `undefined`. */
	optional(ctx, key) {
		const nodes = asNodes(ctx[key]);
		return nodes.length ? this.visit(nodes[0]) : void 0;
	}
	projectionTail(ctx) {
		const source = this.visit(asNodes(ctx.dataSource)[0]);
		const associations = asNodes(ctx.associationTail).map((node) => this.visit(node));
		const redefinedAssociations = asNodes(ctx.redefinedAssociation).map((node) => this.visit(node));
		const aspectBindings = asNodes(ctx.bindAspect).map((node) => this.visit(node));
		const members = ctx.elementList ? this.visit(asNodes(ctx.elementList)[0]) : [];
		const where = ctx.condition ? toExpression(asNodes(ctx.condition)[0]) : void 0;
		return {
			source,
			associations,
			redefinedAssociations,
			aspectBindings,
			members,
			...where && { where }
		};
	}
	dataSource(ctx) {
		const name = this.visit(asNodes(ctx.dataSourcePath)[0]);
		const aliasNode = asNodes(ctx.cdsName)[0] ?? asNodes(ctx.bareAliasName)[0];
		const alias = aliasNode ? this.visit(aliasNode) : void 0;
		const parameters = ctx.dataSourceParameters ? this.visit(asNodes(ctx.dataSourceParameters)[0]) : void 0;
		return {
			name,
			...alias && { alias },
			...parameters && { parameters }
		};
	}
	/** `<seg>[<attr>].<seg>…` — data-source path with raw bracket text kept. */
	dataSourcePath(ctx) {
		return asNodes(ctx.pathSegment).map((segment) => {
			const segCtx = segment.children;
			return this.visit(asNodes(segCtx.cdsName)[0]) + asNodes(segCtx.bracketTokens).map((b) => toRawText(b)).join("");
		}).join(".");
	}
	dataSourceParameters(ctx) {
		return asNodes(ctx.dataSourceParameter).map((node) => this.visit(node));
	}
	dataSourceParameter(ctx) {
		return {
			name: this.visit(asNodes(ctx.qualifiedName)[0]),
			value: toRawText(asNodes(ctx.parameterBinding)[0])
		};
	}
	parameterBinding() {
		return null;
	}
	joinClause(ctx) {
		if (ctx.Cross) return {
			kind: "join",
			joinType: "cross",
			source: this.visit(asNodes(ctx.joinOperand)[0])
		};
		const prefix = this.visit(asNodes(ctx.joinPrefix)[0]);
		const source = this.visit(asNodes(ctx.joinOperand)[0]);
		const on = toExpression(asNodes(ctx.condition)[0]);
		return {
			kind: "join",
			joinType: prefix.joinType,
			source,
			on,
			...prefix.cardinality && { cardinality: prefix.cardinality }
		};
	}
	joinPrefix(ctx) {
		let joinType = "inner";
		if (asTokens(ctx.Full).length) joinType = "fullOuter";
		else if (asTokens(ctx.Left).length) joinType = "leftOuter";
		else if (asTokens(ctx.Right).length) joinType = "rightOuter";
		const cardinality = ctx.joinCardinality ? this.visit(asNodes(ctx.joinCardinality)[0]) : void 0;
		return {
			joinType,
			...cardinality && { cardinality }
		};
	}
	joinCardinality(ctx) {
		const words = asNodes(ctx.cardinalWord).map((n) => this.visit(n));
		if (words.length === 2) return {
			source: words[0],
			target: words[1]
		};
		return { target: words[0] };
	}
	cardinalWord(ctx) {
		if (asTokens(ctx.Exact).length) return "exactOne";
		if (asTokens(ctx.Many).length) return "many";
		return "one";
	}
	joinOperand(ctx) {
		if (ctx.joinGroup) return this.visit(asNodes(ctx.joinGroup)[0]);
		return this.visit(asNodes(ctx.dataSource)[0]);
	}
	joinGroup(ctx) {
		return {
			kind: "joinGroup",
			source: this.visit(asNodes(ctx.joinOperand)[0]),
			joins: asNodes(ctx.joinClause).map((node) => this.visit(node))
		};
	}
	elementList(ctx) {
		return asNodes(ctx.elementMember).map((node) => this.visit(node));
	}
	elementMember(ctx) {
		const annotations = asNodes(ctx.annotation).map((n) => this.visit(n));
		if (ctx.associationTail) {
			const decl = this.visit(asNodes(ctx.associationTail)[0]);
			decl.annotations = annotations;
			return decl;
		}
		const el = this.visit(asNodes(ctx.viewElementTail)[0]);
		el.annotations = annotations;
		return el;
	}
	viewElementTail(ctx) {
		const isKey = !!asTokens(ctx.Key).length;
		const isVirtual = !!asTokens(ctx.Virtual).length;
		const isRedirected = !!asTokens(ctx.Redirected).length;
		if (ctx.typedFieldTail) {
			const tail = this.visit(asNodes(ctx.typedFieldTail)[0]);
			return {
				annotations: [],
				isKey,
				isVirtual,
				isRedirected,
				expression: tail.name,
				type: tail.type,
				notNull: tail.notNull
			};
		}
		const proj = this.visit(asNodes(ctx.elementExpression)[0]);
		return {
			annotations: [],
			isKey,
			isVirtual,
			isRedirected,
			expression: proj.expression,
			...proj.alias && { alias: proj.alias },
			...proj.localized && { localized: true },
			...proj.redirectedTo && { redirectedTo: proj.redirectedTo }
		};
	}
	typedFieldTail(ctx) {
		return {
			name: this.visit(asNodes(ctx.cdsName)[0]),
			type: this.visit(asNodes(ctx.typeReference)[0]),
			notNull: !!asTokens(ctx.Not).length
		};
	}
	elementExpression(ctx) {
		const expression = formatTokens(collectTokenImages(asNodes(ctx.operand)[0]));
		const aliasNode = asNodes(ctx.cdsName)[0];
		const alias = aliasNode ? this.visit(aliasNode) : void 0;
		const localized = !!asTokens(ctx.Localized).length;
		const redirectedTo = ctx.redirection ? this.visit(asNodes(ctx.redirection)[0]) : void 0;
		return {
			expression,
			...alias && { alias },
			...localized && { localized: true },
			...redirectedTo && { redirectedTo }
		};
	}
	redirection(ctx) {
		let mode = "default";
		if (ctx.Composition) mode = "compositionChild";
		else if (ctx.Parent) mode = "parent";
		const target = this.visit(asNodes(ctx.qualifiedName)[0]);
		return {
			mode,
			target
		};
	}
	redefinedAssociation(ctx) {
		const associationKind = asTokens(ctx.Association).length ? "association" : "composition";
		const name = this.visit(asNodes(ctx.qualifiedName)[0]);
		const aliasNode = asNodes(ctx.cdsName)[0];
		const alias = aliasNode ? this.visit(aliasNode) : void 0;
		const filter = ctx.bracketTokens ? toExpression(asNodes(ctx.bracketTokens)[0]) : void 0;
		const redirectedTo = ctx.redirection ? this.visit(asNodes(ctx.redirection)[0]) : void 0;
		return {
			kind: "redefinedAssociation",
			associationKind,
			name,
			...filter && { filter },
			...alias && { alias },
			...redirectedTo && { redirectedTo }
		};
	}
	bindAspect(ctx) {
		const aspect = this.visit(asNodes(ctx.qualifiedName)[0]);
		const mappings = asNodes(ctx.bindMapping).map((n) => this.visit(n));
		const aliasNode = asNodes(ctx.cdsName)[0];
		const alias = aliasNode ? this.visit(aliasNode) : void 0;
		return {
			kind: "aspectBinding",
			aspect,
			mappings,
			...alias && { alias }
		};
	}
	bindMapping(ctx) {
		return {
			element: this.visit(asNodes(ctx.cdsName)[0]),
			target: formatTokens(collectTokenImages(asNodes(ctx.operand)[0]))
		};
	}
	associationTail(ctx) {
		const associationKind = asTokens(ctx.Association).length ? "association" : "composition";
		const cardinality = this.optional(ctx, "cardinality");
		const { wordCardinality, targetMultiplicity } = this.associationWords(ctx);
		const { on, withDefaultFilter } = this.associationConditions(ctx);
		const toParent = !!asTokens(ctx.Parent).length;
		const redirected = !!asTokens(ctx.Redirected).length;
		const target = this.visit(asNodes(ctx.qualifiedName)[0]);
		const aliasNode = asNodes(ctx.cdsName)[0];
		const alias = aliasNode ? this.visit(aliasNode) : void 0;
		return {
			kind: "association",
			associationKind,
			annotations: [],
			...cardinality && { cardinality },
			...wordCardinality && { wordCardinality },
			...targetMultiplicity && { targetMultiplicity },
			...toParent && { toParent: true },
			target,
			...redirected && { redirected: true },
			...alias && { alias },
			...on && { on },
			...withDefaultFilter && { withDefaultFilter }
		};
	}
	/**
	* Word-form cardinality — at most one `cardinalWord` per branch:
	* `of <w> X`, `of <w> to X`, `to <w> X` all give a single target word.
	*/
	associationWords(ctx) {
		const words = asNodes(ctx.cardinalWord).map((n) => this.visit(n));
		if (words.length !== 1) return {};
		const word = words[0];
		return {
			wordCardinality: { target: word },
			...(word === "many" || word === "one") && { targetMultiplicity: word }
		};
	}
	/**
	* `on` and `with default filter` are both optional and share
	* `ctx.condition` — select by their keyword token, not by index.
	*/
	associationConditions(ctx) {
		const conditions = asNodes(ctx.condition);
		const hasOn = asTokens(ctx.On).length > 0;
		const on = hasOn ? toExpression(conditions[0]) : void 0;
		let withDefaultFilter;
		if (asTokens(ctx.Filter).length > 0) withDefaultFilter = toExpression(conditions[hasOn ? 1 : 0]);
		return {
			on,
			withDefaultFilter
		};
	}
	cardinality(ctx) {
		const nums = asTokens(ctx.NumberLiteral);
		const stars = asTokens(ctx.Star);
		if (nums.length === 0 && stars.length >= 1) return { max: "*" };
		if (nums.length === 1) {
			if (asTokens(ctx.Dot).length === 0) return { max: Number.parseInt(nums[0].image, 10) };
			if (stars.length >= 1) return {
				min: Number.parseInt(nums[0].image, 10),
				max: "*"
			};
			return {
				min: Number.parseInt(nums[0].image, 10),
				max: "*"
			};
		}
		if (nums.length === 2) return {
			min: Number.parseInt(nums[0].image, 10),
			max: Number.parseInt(nums[1].image, 10)
		};
		return { max: "*" };
	}
	parametersClause(ctx) {
		return asNodes(ctx.parameterDefinition).map((n) => this.visit(n));
	}
	parameterDefinition(ctx) {
		const annotations = asNodes(ctx.annotation).map((n) => this.visit(n));
		const name = this.visit(asNodes(ctx.cdsName)[0]);
		const type = this.visit(asNodes(ctx.typeReference)[0]);
		const defaultValue = ctx.literal ? this.visit(asNodes(ctx.literal)[0]) : void 0;
		return {
			annotations,
			name,
			type,
			...defaultValue && { defaultValue }
		};
	}
	tableMember(ctx) {
		if (ctx.includeDirective) return this.visit(asNodes(ctx.includeDirective)[0]);
		return this.visit(asNodes(ctx.fieldDefinition)[0]);
	}
	includeDirective(ctx) {
		const name = this.visit(asNodes(ctx.cdsName)[0]);
		const suffix = asNodes(ctx.cdsName)[1] ? this.visit(asNodes(ctx.cdsName)[1]) : void 0;
		return {
			kind: "include",
			name,
			...suffix !== void 0 && { suffix }
		};
	}
	fieldDefinition(ctx) {
		const annotations = asNodes(ctx.annotation).map((node) => this.visit(node));
		const isKey = !!asTokens(ctx.Key).length;
		return {
			annotations,
			name: this.visit(asNodes(ctx.cdsName)[0]),
			type: this.visit(asNodes(ctx.typeReference)[0]),
			isKey,
			notNull: !!asTokens(ctx.Not).length
		};
	}
	simpleTypeDefinition(ctx) {
		return {
			kind: "simpleType",
			name: this.visit(asNodes(ctx.cdsName)[0]),
			annotations: [],
			type: this.visit(asNodes(ctx.typeReference)[0])
		};
	}
	serviceDefinition(ctx) {
		return {
			kind: "service",
			name: this.visit(asNodes(ctx.cdsName)[0]),
			annotations: [],
			exposes: asNodes(ctx.exposeStatement).map((node) => this.visit(node))
		};
	}
	exposeStatement(ctx) {
		const names = asNodes(ctx.cdsName).map((n) => this.visit(n));
		const entity = names[0];
		const alias = names.length > 1 ? names[1] : void 0;
		return {
			entity,
			...alias && { alias }
		};
	}
	scalarFunctionDefinition(ctx) {
		return {
			kind: "scalarFunction",
			name: this.visit(asNodes(ctx.cdsName)[0]),
			annotations: [],
			parameters: ctx.parametersClause ? this.visit(asNodes(ctx.parametersClause)[0]) : [],
			returnType: this.visit(asNodes(ctx.typeReference)[0])
		};
	}
	hierarchyDefinition(ctx) {
		const name = this.visit(asNodes(ctx.cdsName)[0]);
		const parameters = ctx.parametersClause ? this.visit(asNodes(ctx.parametersClause)[0]) : [];
		const source = this.visit(asNodes(ctx.qualifiedName)[0]) ?? "";
		const childToParentAssociation = asNodes(ctx.cdsName)[1] ? this.visit(asNodes(ctx.cdsName)[1]) : void 0;
		const period = this.optional(ctx, "hierarchyPeriod");
		const directory = this.optional(ctx, "hierarchyDirectory");
		const startWhere = this.optional(ctx, "hierarchyStart");
		const siblingsOrderBy = asNodes(ctx.sortItem).map((n) => this.visit(n));
		const depth = this.optional(ctx, "hierarchyDepth");
		const nodetype = this.optional(ctx, "hierarchyNodetype");
		const load = this.optional(ctx, "hierarchyLoad");
		const multipleParents = this.optional(ctx, "hierarchyMultiple");
		const orphans = this.optional(ctx, "hierarchyOrphans");
		const cycles = this.optional(ctx, "hierarchyCycles");
		const cache = this.optional(ctx, "hierarchyCache");
		return {
			kind: "hierarchy",
			name,
			annotations: [],
			parameters,
			source,
			siblingsOrderBy,
			members: ctx.elementList ? this.visit(asNodes(ctx.elementList)[0]) : [],
			...childToParentAssociation && { childToParentAssociation },
			...this.hierarchyOptionals(ctx, {
				period,
				directory,
				startWhere,
				depth,
				nodetype,
				load,
				multipleParents,
				orphans,
				cycles,
				cache
			})
		};
	}
	/** The clause-dependent optional fields of a hierarchy definition. */
	hierarchyOptionals(ctx, c) {
		return {
			...c.period && { period: c.period },
			...c.directory && { directory: c.directory },
			...c.startWhere && { startWhere: c.startWhere },
			...c.depth !== void 0 && { depth: c.depth },
			...c.nodetype && { nodetype: c.nodetype },
			...c.load && { load: c.load },
			...c.multipleParents && { multipleParents: c.multipleParents },
			...c.orphans && { orphans: c.orphans },
			...c.cycles && { cycles: c.cycles },
			...ctx.hierarchyGenerate && { generateSpantree: true },
			...c.cache && { cache: c.cache }
		};
	}
	hierarchyPeriod(ctx) {
		const names = asNodes(ctx.qualifiedName).map((n) => this.visit(n));
		const period = {
			from: names[0] ?? "",
			to: names[1] ?? ""
		};
		if (ctx.Valid) {
			period.validFrom = names[2] ?? "";
			period.validTo = names[3] ?? "";
		}
		return period;
	}
	hierarchyDirectory(ctx) {
		return {
			entity: this.visit(asNodes(ctx.qualifiedName)[0]),
			filter: toExpression(asNodes(ctx.condition)[0])
		};
	}
	hierarchyStart(ctx) {
		return toExpression(asNodes(ctx.condition)[0]);
	}
	hierarchyDepth(ctx) {
		const num = asTokens(ctx.NumberLiteral)[0];
		if (num) return num.image;
		return this.visit(asNodes(ctx.qualifiedName)[0]);
	}
	hierarchyNodetype(ctx) {
		return this.visit(asNodes(ctx.qualifiedName)[0]);
	}
	hierarchyLoad(ctx) {
		if (asTokens(ctx.Bulk).length) return "bulk";
		if (asTokens(ctx.Incremental).length) return "incremental";
		if (ctx.systemVariable) return formatTokens(collectTokenImages(asNodes(ctx.systemVariable)[0]));
		return this.visit(asNodes(ctx.qualifiedName)[0]);
	}
	hierarchyMultiple(ctx) {
		if (asTokens(ctx.Not).length) return "notAllowed";
		if (asTokens(ctx.Leaves).length) return "leavesOnly";
		return "allowed";
	}
	hierarchyOrphans(ctx) {
		if (asTokens(ctx.Ignore).length) return "ignore";
		if (asTokens(ctx.Error).length) return "error";
		return "root";
	}
	hierarchyCycles(ctx) {
		return asTokens(ctx.Breakup).length ? "breakup" : "error";
	}
	hierarchyGenerate() {
		return null;
	}
	hierarchyCache(ctx) {
		if (asTokens(ctx.Off).length) return "off";
		if (asTokens(ctx.Force).length) return "force";
		return "on";
	}
	sortItem(ctx) {
		const name = this.visit(asNodes(ctx.qualifiedName)[0]);
		let direction;
		if (asTokens(ctx.Descending).length) direction = "descending";
		else if (asTokens(ctx.Ascending).length) direction = "ascending";
		return {
			name,
			...direction && { direction }
		};
	}
	aspectDefinition(ctx) {
		return {
			kind: "aspect",
			name: this.visit(asNodes(ctx.cdsName)[0]),
			annotations: [],
			members: asNodes(ctx.aspectElement).map((n) => this.visit(n))
		};
	}
	aspectElement(ctx) {
		const annotations = asNodes(ctx.annotation).map((n) => this.visit(n));
		const isKey = !!asTokens(ctx.Key).length;
		const name = this.visit(asNodes(ctx.cdsName)[0]);
		if (ctx.typeReference) return {
			annotations,
			name,
			isKey,
			type: this.visit(asNodes(ctx.typeReference)[0])
		};
		return {
			annotations,
			name,
			isKey,
			expression: formatTokens(collectTokenImages(asNodes(ctx.operand)[0]))
		};
	}
	annotationDefinition(ctx) {
		return {
			kind: "annotationDefinition",
			name: this.visit(asNodes(ctx.cdsName)[0]),
			annotations: [],
			body: formatTokens(collectTokenImages(asNodes(ctx.tokenBlock)[0] ?? asNodes(ctx.simpleTail)[0]))
		};
	}
	accessPolicyDefinition(ctx) {
		return {
			kind: "accessPolicy",
			name: this.visit(asNodes(ctx.cdsName)[0]),
			annotations: [],
			body: formatTokens(collectTokenImages(asNodes(ctx.tokenBlock)[0]))
		};
	}
	tokenBlock() {
		return null;
	}
	tokenGroup() {
		return null;
	}
	simpleTail() {
		return null;
	}
	roleDefinition(ctx) {
		const name = this.visit(asNodes(ctx.cdsName)[0]);
		const switchable = !!asTokens(ctx.Switchable).length;
		const members = asNodes(ctx.roleMember).map((n) => this.visit(n));
		const grants = members.filter((m) => "privilege" in m);
		return {
			kind: "role",
			name,
			annotations: [],
			...switchable && { switchable: true },
			grants,
			members
		};
	}
	roleMember(ctx) {
		if (ctx.inheritStatement) return this.visit(asNodes(ctx.inheritStatement)[0]);
		if (ctx.inheritingStatement) return this.visit(asNodes(ctx.inheritingStatement)[0]);
		return this.visit(asNodes(ctx.grantStatement)[0]);
	}
	grantStatement(ctx) {
		const result = {
			privilege: "select",
			entity: this.visit(asNodes(ctx.qualifiedName)[0])
		};
		for (const clauseNode of asNodes(ctx.grantClause)) {
			const clause = this.visit(clauseNode);
			if (clause.optionalElements) result.optionalElements = clause.optionalElements;
			if (clause.combinationMode) result.combinationMode = clause.combinationMode;
			if (clause.inheritRole) result.inheritRole = clause.inheritRole;
			if (clause.inheritConditionConnector) {
				result.inheritConditionConnector = clause.inheritConditionConnector;
				result.inheritCondition = clause.inheritCondition;
			}
			if (clause.where) result.where = clause.where;
		}
		return result;
	}
	grantClause(ctx) {
		for (const key of Object.keys(ctx)) {
			const node = asNodes(ctx[key])[0];
			if (node) return this.visit(node);
		}
		return {};
	}
	grantOptionalElements(ctx) {
		return { optionalElements: asNodes(ctx.optionalElement).map((n) => this.visit(n)) };
	}
	grantCombination(ctx) {
		let combinationMode = "and";
		if (ctx.Redefinition) combinationMode = "redefinition";
		else if (ctx.Or) combinationMode = "or";
		return { combinationMode };
	}
	grantInherit(ctx) {
		const inheritRole = this.visit(asNodes(ctx.qualifiedName)[0]);
		let inheritConditionConnector;
		if (ctx.dclCondition) inheritConditionConnector = asTokens(ctx.And).length ? "and" : "or";
		return {
			inheritRole,
			...inheritConditionConnector && { inheritConditionConnector },
			...ctx.dclCondition && { inheritCondition: toExpression(asNodes(ctx.dclCondition)[0]) }
		};
	}
	grantWhere(ctx) {
		return { where: toExpression(asNodes(ctx.dclCondition)[0]) };
	}
	optionalElement(ctx) {
		const name = this.visit(asNodes(ctx.qualifiedName)[0]);
		const def = ctx.Default ? asTokens(ctx.True).length > 0 : void 0;
		return {
			name,
			...def !== void 0 && { default: def }
		};
	}
	inheritStatement(ctx) {
		const names = asNodes(ctx.qualifiedName).map((n) => this.visit(n));
		const where = ctx.dclCondition ? toExpression(asNodes(ctx.dclCondition)[0]) : void 0;
		return {
			role: names[0] ?? "",
			...names.length > 1 && { entity: names[1] },
			...where && { where }
		};
	}
	inheritingStatement(ctx) {
		const sourceKind = ctx.Entity ? "entity" : "super";
		const entity = ctx.Entity ? this.visit(asNodes(ctx.qualifiedName)[0]) : void 0;
		const def = ctx.Default ? asTokens(ctx.True).length > 0 : void 0;
		const condition = ctx.dclCondition ? toExpression(asNodes(ctx.dclCondition)[0]) : void 0;
		return {
			sourceKind,
			...entity && { entity },
			...def !== void 0 && { default: def },
			...condition && { condition }
		};
	}
	dclCondition() {
		return null;
	}
	extendStatement(ctx) {
		const names = asNodes(ctx.qualifiedName).map((n) => this.visit(n));
		let targetKind = "custom";
		if (ctx.View) targetKind = "view";
		else if (ctx.Abstract) targetKind = "abstract";
		const isViewEntity = !!asTokens(ctx.Entity).length;
		const name = names[0] ?? "";
		const associations = asNodes(ctx.associationTail).map((node) => this.visit(node));
		const members = ctx.elementList ? this.visit(asNodes(ctx.elementList)[0]) : [];
		const groupBy = ctx.Group ? names.slice(1) : void 0;
		const setOperations = asNodes(ctx.extendSetOperation).map((n) => this.visit(n));
		return {
			kind: "extension",
			name,
			annotations: [],
			targetKind,
			...isViewEntity && { isViewEntity: true },
			associations,
			members,
			...groupBy && groupBy.length > 0 && { groupBy },
			...setOperations.length > 0 && { setOperations }
		};
	}
	extendSetOperation(ctx) {
		const members = ctx.elementList ? this.visit(asNodes(ctx.elementList)[0]) : [];
		return {
			kind: "extendSetOperation",
			operator: this.setOperator(ctx),
			members
		};
	}
	annotateStatement(ctx) {
		return {
			kind: "metadataExtension",
			targetKind: ctx.View ? "view" : "entity",
			entity: this.visit(asNodes(ctx.cdsName)[0]),
			annotations: [],
			elements: asNodes(ctx.annotatedElement).map((node) => this.visit(node))
		};
	}
	annotatedElement(ctx) {
		return {
			annotations: asNodes(ctx.annotation).map((node) => this.visit(node)),
			name: this.visit(asNodes(ctx.qualifiedName)[0])
		};
	}
	topLevelAnnotation(ctx) {
		return this.visit(asNodes(ctx.annotation)[0]);
	}
	annotation(ctx) {
		return {
			key: this.visit(asNodes(ctx.dottedName)[0]),
			value: ctx.annotationValue ? this.visit(asNodes(ctx.annotationValue)[0]) : {
				kind: "boolean",
				value: true
			}
		};
	}
	dottedName(ctx) {
		return asNodes(ctx.cdsName).map((node) => this.visit(node)).join(".");
	}
	annotationValue(ctx) {
		if (ctx.StringLiteral) return {
			kind: "string",
			value: asTokens(ctx.StringLiteral)[0].image.slice(1, -1)
		};
		if (ctx.EnumLiteral) return {
			kind: "enum",
			value: asTokens(ctx.EnumLiteral)[0].image.slice(1)
		};
		if (ctx.True) return {
			kind: "boolean",
			value: true
		};
		if (ctx.False) return {
			kind: "boolean",
			value: false
		};
		if (ctx.NumberLiteral) return {
			kind: "number",
			value: Number.parseFloat(asTokens(ctx.NumberLiteral)[0].image)
		};
		if (ctx.annotationArray) return this.visit(asNodes(ctx.annotationArray)[0]);
		return this.visit(asNodes(ctx.annotationObject)[0]);
	}
	annotationArray(ctx) {
		return {
			kind: "array",
			items: asNodes(ctx.annotationValue).map((node) => this.visit(node))
		};
	}
	annotationObject(ctx) {
		return {
			kind: "object",
			properties: asNodes(ctx.annotationProperty).map((node) => this.visit(node))
		};
	}
	annotationProperty(ctx) {
		return {
			key: this.visit(asNodes(ctx.dottedName)[0]),
			value: this.visit(asNodes(ctx.annotationValue)[0])
		};
	}
	literal(ctx) {
		const negative = !!asTokens(ctx.Minus).length;
		if (ctx.StringLiteral) {
			const raw = asTokens(ctx.StringLiteral)[0].image;
			if (ctx.Abap) return {
				kind: "string",
				value: formatTokens(ctxTokens(ctx))
			};
			return {
				kind: "string",
				value: raw.slice(1, -1)
			};
		}
		if (ctx.EnumLiteral) return {
			kind: "enum",
			value: asTokens(ctx.EnumLiteral)[0].image.slice(1)
		};
		if (ctx.True) return {
			kind: "boolean",
			value: true
		};
		if (ctx.False) return {
			kind: "boolean",
			value: false
		};
		if (ctx.Null) return {
			kind: "string",
			value: "null"
		};
		const num = Number.parseFloat(asTokens(ctx.NumberLiteral)[0].image);
		return {
			kind: "number",
			value: negative ? -num : num
		};
	}
	condition() {
		return null;
	}
	conditionOperand() {
		return null;
	}
	predicate() {
		return null;
	}
	expression() {
		return null;
	}
	comparison() {
		return null;
	}
	operand() {
		return null;
	}
	primary() {
		return null;
	}
	pathOperand() {
		return null;
	}
	pathSegment() {
		return null;
	}
	bracketTokens() {
		return null;
	}
	callArgument() {
		return null;
	}
	overClause() {
		return null;
	}
	parenthesizedExpression() {
		return null;
	}
	castExpression() {
		return null;
	}
	caseExpression() {
		return null;
	}
	systemVariable() {
		return null;
	}
	parameterRef() {
		return null;
	}
	typeReference(ctx) {
		if (ctx.builtinType) return this.visit(asNodes(ctx.builtinType)[0]);
		return this.visit(asNodes(ctx.namedType)[0]);
	}
	builtinType(ctx) {
		const name = this.visit(asNodes(ctx.cdsName)[0]);
		const numberTokens = asTokens(ctx.NumberLiteral);
		return {
			kind: "builtin",
			name,
			length: numberTokens[0] ? Number.parseInt(numberTokens[0].image, 10) : void 0,
			decimals: numberTokens[1] ? Number.parseInt(numberTokens[1].image, 10) : void 0
		};
	}
	namedType(ctx) {
		return {
			kind: "named",
			name: this.visit(asNodes(ctx.qualifiedName)[0])
		};
	}
	cdsName(ctx) {
		const t = ctx;
		for (const key of Object.keys(t)) {
			const tok = t[key]?.[0];
			if (tok && "image" in tok) return tok.image;
		}
		return "";
	}
	bareAliasName(ctx) {
		return this.cdsName(ctx);
	}
	qualifiedName(ctx) {
		return asNodes(ctx.cdsName).map((node) => this.visit(node)).join(".");
	}
};
/** Singleton visitor instance */
const cdsVisitor = new CdsVisitor();

// src/errors.ts
function fromLexError(err) {
	return {
		message: err.message,
		line: err.line ?? 1,
		column: err.column ?? 1,
		offset: err.offset,
		length: err.length
	};
}
function fromParseError(err) {
	const token = err.token;
	return {
		message: err.message,
		line: token.startLine ?? 1,
		column: token.startColumn ?? 1,
		offset: token.startOffset,
		length: (token.endOffset ?? token.startOffset) - token.startOffset + 1
	};
}

// src/lib/ast/walker.ts
/** True when the definition has a `members` array (view-like entities). */
function hasMembers(def) {
	return def.kind === "viewEntity" || def.kind === "abstractEntity" || def.kind === "customEntity" || def.kind === "hierarchy" || def.kind === "extension";
}
/** True when the definition has a `members` array of typed fields (TABL/structure). */
function hasFields(def) {
	return def.kind === "table" || def.kind === "structure" || def.kind === "externalEntity" || def.kind === "tableFunction";
}
function hasParameters(def) {
	return def.kind === "viewEntity" || def.kind === "abstractEntity" || def.kind === "customEntity" || def.kind === "externalEntity" || def.kind === "tableFunction" || def.kind === "scalarFunction" || def.kind === "hierarchy";
}
/** Yield every definition in the file (currently one, future-proofed). */
function* walkDefinitions(file) {
	for (const def of file.definitions) yield def;
}
/**
* Yield every annotation attached anywhere in the AST (definitions,
* elements/fields, parameters, associations).
*/
function* walkAnnotations(file) {
	for (const def of walkDefinitions(file)) {
		for (const a of getAnnotations(def)) yield a;
		const pools = [];
		if (hasFields(def)) pools.push(def.members);
		if (hasMembers(def)) pools.push(def.members);
		if (def.kind === "aspect") pools.push(def.members);
		if (hasParameters(def)) pools.push(def.parameters);
		if (def.kind === "extension") pools.push(def.associations);
		for (const pool of pools) for (const m of pool) if (typeof m === "object" && m !== null && "annotations" in m) for (const a of m.annotations) yield a;
	}
}
/** Safe accessor — returns an empty array if the definition carries none. */
function getAnnotations(def) {
	return "annotations" in def ? def.annotations : [];
}
/** Yield every element (`ViewElement`) across all view-like definitions. */
function* walkViewElements(file) {
	for (const def of walkDefinitions(file)) {
		if (!hasMembers(def)) continue;
		for (const m of def.members) {
			if (isAssociation(m)) continue;
			yield {
				owner: def,
				element: m
			};
		}
	}
}
/** Yield every association declaration across view-like definitions. */
function* walkAssociations(file) {
	for (const def of walkDefinitions(file)) {
		if (!hasMembers(def)) continue;
		const pools = [def.members.filter(isAssociation)];
		if (def.kind === "extension") pools.push(def.associations);
		for (const association of pools.flat()) yield {
			owner: def,
			association
		};
	}
}
/**
* Yield every association declared in the FROM region of a view entity.
*
* FROM associations are declared next to the data source (before the element
* list) and are therefore kept apart from the associations inside
* `members`.
*/
function* walkFromAssociations(file) {
	for (const def of walkDefinitions(file)) {
		if (def.kind !== "viewEntity") continue;
		yield* fromAssocOfSelect(def, def);
		for (const op of def.setOperations ?? []) yield* fromAssocOfSelect(def, op.statement);
	}
}
function* fromAssocOfSelect(owner, select) {
	for (const a of select.fromAssociations ?? []) yield {
		owner,
		association: a
	};
	for (const op of select.setOperations ?? []) yield* fromAssocOfSelect(owner, op.statement);
}
/** Yield every join of every view entity, in source order. */
function* walkJoins(file) {
	for (const def of walkDefinitions(file)) {
		if (def.kind !== "viewEntity") continue;
		yield* walkJoinChain(def, def.joins ?? []);
		for (const op of def.setOperations ?? []) yield* walkSelectJoins(def, op.statement);
	}
}
function* walkSelectJoins(owner, select) {
	yield* walkJoinChain(owner, select.joins ?? []);
	for (const op of select.setOperations ?? []) yield* walkSelectJoins(owner, op.statement);
}
function* walkJoinChain(owner, joins) {
	for (const join of joins) {
		yield {
			owner,
			join
		};
		yield* walkJoinSource(owner, join.source);
	}
}
/** Descend into a grouped join source (`join (A join B on …) on …`). */
function* walkJoinSource(owner, source) {
	if (source.kind !== "joinGroup") return;
	yield* walkJoinSource(owner, source.source);
	yield* walkJoinChain(owner, source.joins);
}
/** Yield every field definition from tables and structures. */
function* walkFields(file) {
	for (const def of walkDefinitions(file)) {
		if (!hasFields(def)) continue;
		for (const m of def.members) {
			if ("kind" in m && m.kind === "include") continue;
			yield {
				owner: def,
				field: m
			};
		}
	}
}
/** Yield every parameter definition across view-like entities. */
function* walkParameters(file) {
	for (const def of walkDefinitions(file)) {
		if (!hasParameters(def)) continue;
		for (const p of def.parameters) yield {
			owner: def,
			parameter: p
		};
	}
}
function isAssociation(m) {
	return "kind" in m && m.kind === "association";
}
/** Look up an annotation by its dotted key. Returns the first match. */
function findAnnotation(annotations, key) {
	return annotations.find((a) => a.key === key);
}

// src/lib/validate/cardinality.ts
function validateCardinality(file) {
	const diagnostics = [];
	const associations = [...walkAssociations(file), ...walkFromAssociations(file)];
	for (const { association } of associations) {
		const card = association.cardinality;
		if (!card) continue;
		const { min, max } = card;
		const name = association.alias ?? association.target;
		if (min !== void 0 && min < 0) diagnostics.push({
			code: "ACDS001",
			severity: "error",
			message: `Association '${name}': lower bound (${min}) must be >= 0.`,
			target: name
		});
		if (typeof max === "number" && max < 1) diagnostics.push({
			code: "ACDS002",
			severity: "error",
			message: `Association '${name}': upper bound (${max}) must be >= 1.`,
			target: name
		});
		if (min !== void 0 && typeof max === "number" && min > max) diagnostics.push({
			code: "ACDS003",
			severity: "error",
			message: `Association '${name}': lower bound (${min}) exceeds upper bound (${max}).`,
			target: name
		});
	}
	return diagnostics;
}

// src/lib/validate/elements.ts
function validateViewElements(file) {
	const diagnostics = [];
	for (const { element } of walkViewElements(file)) {
		const name = element.alias ?? element.expression;
		if (element.isVirtual && element.type) diagnostics.push({
			code: "ACDS010",
			severity: "error",
			message: `View element '${name}' cannot be virtual and typed at the same time.`,
			target: name
		});
		if (element.isKey && element.isVirtual) diagnostics.push({
			code: "ACDS011",
			severity: "error",
			message: `View element '${name}' cannot be both 'key' and 'virtual'.`,
			target: name
		});
	}
	return diagnostics;
}

// src/lib/validate/index.ts
/** Run all validators. */
function validate(file) {
	return [...validateCardinality(file), ...validateViewElements(file)];
}

// src/lib/grammar/ddl.ts
const ddlCoverage = {
	topic: "ddl",
	constructs: [
		"define table",
		"define structure",
		"define type",
		"define view entity",
		"define root view entity",
		"define view (legacy classic SQL view)",
		"define view entity as projection on (projection view)",
		"provider contract transactional_query",
		"define abstract entity",
		"define custom entity",
		"define table entity",
		"define external entity",
		"define writable external entity",
		"define table function",
		"define scalar function",
		"define hierarchy",
		"define aspect",
		"define annotation",
		"define accesspolicy",
		"define service",
		"annotate entity",
		"extend view entity / extend view / extend abstract|custom entity",
		"select distinct",
		"where / group by / having",
		"union [all] / intersect / except",
		"bind aspect <aspect>(<bindings>)",
		"include directive",
		"builtin type (abap.char, abap.dec, ...)",
		"named type reference",
		"typed literal (abap.dats'20200101')"
	]
};

// src/lib/grammar/dcl.ts
const dclCoverage = {
	topic: "dcl",
	constructs: [
		"define role <name> { ... }",
		"define role <name> switchable { ... }",
		"grant select on <entity>",
		"grant select on <entity> where <expression>",
		"grant select on <entity> with optional elements ( ... )",
		"grant ... combination mode and|or|redefinition",
		"inherit <role> [for grant select on <entity>] [where ...]",
		"inheriting conditions from entity <name>|super [default ...]"
	]
};

// src/lib/grammar/annotations.ts
const annotationsCoverage = {
	topic: "annotations",
	constructs: [
		"@Key : value",
		"@Key.path : value",
		"array value",
		"object value",
		"nested objects",
		"bare boolean (@Key)"
	]
};

// src/lib/grammar/associations.ts
const associationsCoverage = {
	topic: "associations",
	constructs: [
		"association to <target>",
		"association <target> (implicit to)",
		"association[cardinality] to <target>",
		"association[L..U] to <target>",
		"association of (many|one|exact one) [to] <target>",
		"composition [of] <target>",
		"association to parent <target>",
		"association to redirected to <target>",
		"association ... as <alias>",
		"association ... on <expression>",
		"association ... with default filter <expression>",
		"FROM-region association / composition",
		"bind aspect <name>(<bindings>)"
	]
};

// src/lib/grammar/joins.ts
const joinsCoverage = {
	topic: "joins",
	constructs: [
		"JOIN <source> ON <condition> (inner)",
		"INNER JOIN <source> ON <condition> (inner)",
		"LEFT JOIN <source> ON <condition> (leftOuter)",
		"LEFT OUTER JOIN <source> ON <condition> (leftOuter)",
		"RIGHT JOIN <source> ON <condition> (rightOuter)",
		"RIGHT OUTER JOIN <source> ON <condition> (rightOuter)",
		"FULL JOIN <source> ON <condition> (fullOuter)",
		"FULL OUTER JOIN <source> ON <condition> (fullOuter)",
		"CROSS JOIN <source> (cross, no ON condition)",
		"chained joins (multiple joins in one FROM clause)",
		"join source alias",
		"parameterized data source (<param> : <value>)",
		"parameter binding to a view parameter (:P_Param)",
		"parameter binding to a system variable ($session.client, $parameters.P_X)",
		"parameter binding to a literal",
		"ON condition with AND / OR / NOT predicates",
		"ON condition with parentheses and nested call arguments",
		"ON condition with `is null` / `is not initial` predicates",
		"ON condition with a system variable ($projection.Field)",
		"ON condition with LIKE / BETWEEN / IN predicates",
		"ON condition with arithmetic operands (B.k + 1 = A.k)",
		"join cardinality ([INNER] TO ONE|MANY JOIN, MANY TO ONE JOIN, ...)",
		"grouped joins ((A join B on ...) left join C on ...)"
	]
};

// src/lib/grammar/parameters.ts
const parametersCoverage = {
	topic: "parameters",
	constructs: [
		"with parameters <p>: <type>",
		"with parameters <p>: <type> default <literal>",
		"annotated parameters"
	]
};

// src/lib/grammar/projections.ts
const projectionsCoverage = {
	topic: "projections",
	constructs: [
		"view element (qualified name)",
		"view element with alias",
		"view element with key modifier",
		"view element with virtual modifier",
		"view element with function call (coalesce(a, b), sum(x))",
		"window function over (partition by ... order by ...)",
		"view element with cast expression (cast(x as type [preserving type]))",
		"typed field (abstract/custom entity)",
		"case expression (operand and searched forms)",
		"arithmetic expression in element list",
		"localized element (: localized)",
		"association redirection (: redirected to <target>)",
		"view where / group by / having clauses",
		"projection view (as projection on <source>)"
	]
};

// src/lib/grammar/actions.ts
const actionsCoverage = {
	topic: "actions",
	constructs: []
};

// src/lib/grammar/index.ts
const GRAMMAR_COVERAGE = [
	ddlCoverage,
	dclCoverage,
	annotationsCoverage,
	associationsCoverage,
	joinsCoverage,
	parametersCoverage,
	projectionsCoverage,
	actionsCoverage
];

// src/index.ts
/**
* @abapify/acds — ABAP CDS Source Parser
*
* Parses ABAP CDS DDL source (.acds) files into a typed AST.
*
* @example
* ```typescript
* import { parse } from '@abapify/acds';
*
* const result = parse(`
*   @AbapCatalog.tableCategory : #TRANSPARENT
*   define table ztable {
*     key field1 : abap.char(10) not null;
*     field2 : some_data_element;
*   }
* `);
*
* if (result.errors.length === 0) {
*   const table = result.ast.definitions[0]; // TableDefinition
* }
* ```
*/
/**
* Parse an ABAP CDS source string into a typed AST.
*
* @param source - The CDS source code to parse
* @returns Parse result with AST and any errors
*/
function parse(source) {
	const lexResult = CdsLexer.tokenize(source);
	const errors = lexResult.errors.map(fromLexError);
	cdsParser.input = lexResult.tokens;
	const cst = cdsParser.sourceFile();
	errors.push(...cdsParser.errors.map(fromParseError));
	let ast = { definitions: [] };
	if (cst) try {
		ast = cdsVisitor.visit(cst);
	} catch {}
	return {
		ast,
		errors
	};
}

export { GRAMMAR_COVERAGE, actionsCoverage, annotationsCoverage, associationsCoverage, dclCoverage, ddlCoverage, findAnnotation, hasFields, hasMembers, hasParameters, isAssociation, joinsCoverage, parametersCoverage, parse, projectionsCoverage, validate, validateCardinality, validateViewElements, walkAnnotations, walkAssociations, walkDefinitions, walkFields, walkFromAssociations, walkJoins, walkParameters, walkViewElements };
//# sourceMappingURL=index.mjs.map