import "chevrotain";
/**
 * AST Node Types for ABAP CDS source
 *
 * Phase 1: TABL, Structure, DRTY, SRVD, DDLX
 * Phase 2: DCLS, DDLA, DRAS, DSFD, DTDC, DTEB, DTSC
 * Phase 3: DDLS (view entity — SQL-like)
 */
/** Source location for error reporting */
interface SourceLocation {
  startOffset: number;
  endOffset: number;
  startLine: number;
  startColumn: number;
  endLine?: number;
  endColumn?: number;
}
/** Base AST node */
interface AstNode {
  loc?: SourceLocation;
}
/** Annotation value variants */
type AnnotationValue = StringLiteral | EnumValue | BooleanLiteral | NumberLiteral | AnnotationArray | AnnotationObject;
interface StringLiteral extends AstNode {
  kind: 'string';
  value: string;
}
interface EnumValue extends AstNode {
  kind: 'enum';
  value: string;
}
interface BooleanLiteral extends AstNode {
  kind: 'boolean';
  value: boolean;
}
interface NumberLiteral extends AstNode {
  kind: 'number';
  value: number;
}
interface AnnotationArray extends AstNode {
  kind: 'array';
  items: AnnotationValue[];
}
interface AnnotationObject extends AstNode {
  kind: 'object';
  properties: AnnotationProperty[];
}
interface AnnotationProperty extends AstNode {
  key: string;
  value: AnnotationValue;
}
/** A single annotation: @DottedKey.path: value */
interface Annotation extends AstNode {
  key: string;
  value: AnnotationValue;
}
/** ABAP built-in type: abap.char(10), abap.dec(11,2) */
interface BuiltinTypeRef extends AstNode {
  kind: 'builtin';
  name: string;
  length?: number;
  decimals?: number;
}
/** Data element / named type reference */
interface NamedTypeRef extends AstNode {
  kind: 'named';
  name: string;
}
type TypeRef = BuiltinTypeRef | NamedTypeRef;
/** Field in a table/structure/table-entity/external-entity body */
interface FieldDefinition extends AstNode {
  annotations: Annotation[];
  name: string;
  type: TypeRef;
  isKey: boolean;
  notNull: boolean;
}
/** Include directive: include <typename>; or include <typename> with suffix <suffix>; */
interface IncludeDirective extends AstNode {
  kind: 'include';
  name: string;
  suffix?: string;
}
type TableMember = FieldDefinition | IncludeDirective;
/** define [root] table [entity] <name> { ... } */
interface TableDefinition extends AstNode {
  kind: 'table';
  name: string;
  annotations: Annotation[];
  /** `true` for `define table entity` (CDS table entity, no DDIC table). */
  entity?: boolean;
  /** `true` for `define root table entity`. */
  root?: boolean;
  members: TableMember[];
}
/** define structure <name> { ... } */
interface StructureDefinition extends AstNode {
  kind: 'structure';
  name: string;
  annotations: Annotation[];
  members: TableMember[];
}
/** define type <name> : <type>; */
interface SimpleTypeDefinition extends AstNode {
  kind: 'simpleType';
  name: string;
  annotations: Annotation[];
  type: TypeRef;
}
/** define service <name> { expose ...; } */
interface ServiceDefinition extends AstNode {
  kind: 'service';
  name: string;
  annotations: Annotation[];
  exposes: ExposeStatement[];
}
/** expose <entity> as <alias>; */
interface ExposeStatement extends AstNode {
  entity: string;
  alias?: string;
}
/** annotate entity|view <name> with { ... } */
interface MetadataExtension extends AstNode {
  kind: 'metadataExtension';
  /** `entity` for `annotate entity`, `view` for `annotate view`. */
  targetKind?: 'entity' | 'view';
  entity: string;
  annotations: Annotation[];
  elements: AnnotatedElement[];
}
/** Element inside a metadata extension: @Anno field; */
interface AnnotatedElement extends AstNode {
  annotations: Annotation[];
  name: string;
}
interface ParameterDefinition extends AstNode {
  annotations: Annotation[];
  name: string;
  type: TypeRef;
  /** default literal value, if any (e.g. `default 'X'`) */
  defaultValue?: AnnotationValue;
}
/**
 * A parsed but un-interpreted expression from `on` / `where` clauses.
 * Consumers typically only need the raw source span; `tokens` gives the
 * flat token stream for lightweight introspection.
 */
interface Expression extends AstNode {
  /** Flattened source image of the expression (concatenated token images, space-separated). */
  source: string;
  /** Token images in order. */
  tokens: string[];
}
/** Cardinality, e.g. `[0..1]`, `[1..*]`, `[*]`, `[5]` */
interface Cardinality extends AstNode {
  min?: number;
  /** `undefined` means unbounded (`*`) when present. */
  max?: number | '*';
}
/** A cardinality bound written in words: `one`, `exact one` or `many`. */
type CardinalityWord = 'one' | 'exactOne' | 'many';
/**
 * Word-form cardinality: `of {many|one|exact one} [to] <target>`
 * for associations, and `[{one|many|exact one}] to {one|exact one|many}`
 * for joins (`many to one join`, `to one join`).
 */
interface WordCardinality extends AstNode {
  /**
   * Source-side bound — only populated by join cardinalities
   * (`many to one join`); `of`-form associations keep a single `target`.
   */
  source?: CardinalityWord;
  /** Target-side bound. */
  target: CardinalityWord;
}
type AssociationKind = 'association' | 'composition';
interface AssociationDeclaration extends AstNode {
  kind: 'association';
  /** `association` or `composition` */
  associationKind: AssociationKind;
  annotations: Annotation[];
  /** Bracket-form cardinality `[min..max]` / `[*]` / `[n]`. */
  cardinality?: Cardinality;
  /**
   * Word-form cardinality (`of many to one X`, `to exact one X`).
   * Absent when the bracket form is used or no cardinality is given.
   */
  wordCardinality?: WordCardinality;
  /** `of many` / `of one` modifier (optional). */
  targetMultiplicity?: 'many' | 'one';
  /** `association to parent <target>` (CDS to-parent association). */
  toParent?: boolean;
  /** Fully qualified target entity (e.g. `I_SalesOrder`). */
  target: string;
  /** `to redirected to <target>` (projection association). */
  redirected?: boolean;
  alias?: string;
  on?: Expression;
  /** `with default filter <condition>` — projection associations. */
  withDefaultFilter?: Expression;
}
/**
 * `redefine association|composition <name> [<filter>] [as <alias>]
 *  [redirected to …]` — a redefined association of a projection view,
 * declared in the header before the projection list.
 */
interface RedefinedAssociation extends AstNode {
  kind: 'redefinedAssociation';
  associationKind: AssociationKind;
  /** Qualified association name (optionally `source._assoc`). */
  name: string;
  /** Filter clause `[<card>:] <cond>` (raw, opaque). */
  filter?: Expression;
  alias?: string;
  redirectedTo?: AssociationRedirection;
}
/** `redirected to [composition child|parent] <target>` */
interface AssociationRedirection extends AstNode {
  /** `default` = `redirected to`, else `composition child` / `parent`. */
  mode: 'default' | 'compositionChild' | 'parent';
  target: string;
}
/**
 * `bind aspect <aspect> ( <element> => <target>, … ) [as <alias>]`
 * — an aspect binding in the FROM region or projection view header.
 */
interface AspectBinding extends AstNode {
  kind: 'aspectBinding';
  /** Bound aspect entity name. */
  aspect: string;
  mappings: AspectBindingMapping[];
  alias?: string;
}
interface AspectBindingMapping extends AstNode {
  /** Aspect element name. */
  element: string;
  /** Binding target, e.g. `$projection.field` (raw operand text). */
  target: string;
}
type DataSourceKind = 'select' | 'projection';
/**
 * Normalized join type.
 *
 * The different surface spellings are folded into one vocabulary so that
 * downstream consumers (dependency / lineage tooling) do not have to know
 * about surface syntax:
 *
 * | spelling              | normalized   |
 * |-----------------------|--------------|
 * | `JOIN`                | `inner`      |
 * | `INNER JOIN`          | `inner`      |
 * | `LEFT JOIN`           | `leftOuter`  |
 * | `LEFT OUTER JOIN`     | `leftOuter`  |
 * | `RIGHT JOIN`          | `rightOuter` |
 * | `RIGHT OUTER JOIN`    | `rightOuter` |
 * | `FULL JOIN`           | `fullOuter`  |
 * | `FULL OUTER JOIN`     | `fullOuter`  |
 * | `CROSS JOIN`          | `cross`      |
 */
type JoinType = 'inner' | 'leftOuter' | 'rightOuter' | 'fullOuter' | 'cross';
/**
 * A single parameter binding of a parameterized data source.
 *
 * `value` keeps the original binding text, e.g. `:P_StartDate` (reference to
 * a parameter of the consuming view), `$session.client` / `$parameters.P_X`
 * (system variable) or a literal such as `'X'` / `42`.
 */
interface DataSourceParameter extends AstNode {
  /** Name of the target parameter, e.g. `P_StartDate`. */
  name: string;
  /** Raw binding text as written in the source. */
  value: string;
}
/** A data source in a FROM clause: a view, table, projection or parameter. */
interface DataSource extends AstNode {
  name: string;
  alias?: string;
  /** Parameter bindings — present for parameterized sources only. */
  parameters?: DataSourceParameter[];
}
/**
 * A parenthesized join group: `join (A join B on …) on …`.
 * The group acts as a single join source; its `joins` chain is evaluated
 * inside the parentheses.
 */
interface JoinGroup extends AstNode {
  kind: 'joinGroup';
  source: JoinSource;
  joins: JoinClause[];
}
/** A join source is either a plain data source or a parenthesized group. */
type JoinSource = DataSource | JoinGroup;
/** A join whose `ON` condition is required (inner/left/right/full). */
interface ConditionedJoinClause extends AstNode {
  kind: 'join';
  joinType: 'inner' | 'leftOuter' | 'rightOuter' | 'fullOuter';
  source: JoinSource;
  /** The `ON` condition, captured opaquely — always present. */
  on: Expression;
  /** Optional word-form join cardinality (`many to one join`). */
  cardinality?: WordCardinality;
}
/** A cross join — never carries an `ON` condition. */
interface CrossJoinClause extends AstNode {
  kind: 'join';
  joinType: 'cross';
  source: JoinSource;
  on?: never;
  cardinality?: never;
}
/**
 * A join in a FROM clause. The discriminated union encodes the grammar
 * invariant: `on` is mandatory for conditioned joins and forbidden for
 * `cross` joins.
 */
type JoinClause = ConditionedJoinClause | CrossJoinClause;
/** Single element in a view's projection list. */
interface ViewElement extends AstNode {
  annotations: Annotation[];
  isKey: boolean;
  isVirtual: boolean;
  isRedirected: boolean;
  /** Either a typed field (abstract/custom entities) or projection expression. */
  expression: string;
  alias?: string;
  /** `<element> : localized` (projection views). */
  localized?: boolean;
  /** `<assoc> : redirected to [composition child|parent] <target>`. */
  redirectedTo?: AssociationRedirection;
  /** Present only when element is a typed field (`name : type`). */
  type?: TypeRef;
  notNull?: boolean;
}
type ViewMember = ViewElement | AssociationDeclaration;
/**
 * The `select` part of a view entity (or a set-operation operand):
 * `select [distinct] from <source> [joins|assocs|bind aspect] { … }
 *  [where …] [group by …] [having …] [union|intersect|except …]*`.
 */
interface SelectStatement extends AstNode {
  kind: 'selectStatement';
  distinct?: boolean;
  source: DataSource;
  joins: JoinClause[];
  fromAssociations?: AssociationDeclaration[];
  aspectBindings?: AspectBinding[];
  members: ViewMember[];
  where?: Expression;
  groupBy?: string[];
  having?: Expression;
  setOperations?: SetOperation[];
}
/**
 * `union [all] | intersect | except select …` — a set operation whose operand
 * is a complete nested select statement.
 */
interface SetOperation extends AstNode {
  kind: 'setOperation';
  operator: 'union' | 'unionAll' | 'intersect' | 'except';
  statement: SelectStatement;
}
interface ViewEntityDefinition extends AstNode {
  kind: 'viewEntity';
  name: string;
  annotations: Annotation[];
  /**
   * `true` for the legacy `define view <name>` syntax (classic SQL view).
   * Absent for `define view entity <name>`.
   */
  legacy?: boolean;
  /** `define root view entity`. */
  root?: boolean;
  /** `define writable view entity`. */
  writable?: boolean;
  /** `provider contract <name>` (projection views). */
  providerContract?: string;
  sourceKind: DataSourceKind;
  /** `select distinct`. */
  distinct?: boolean;
  source: DataSource;
  /**
   * Ordered join chain applied to {@link source}. Empty when the view has no
   * joins. The first entry is joined against `source`, the second against the
   * result of the first, and so on.
   */
  joins: JoinClause[];
  /**
   * Associations declared in the FROM region (between the data source and
   * the element list). Distinct from the associations declared inside the
   * element list, which are part of {@link members}.
   */
  fromAssociations?: AssociationDeclaration[];
  /**
   * `redefine association|composition …` declarations of a projection view,
   * placed in the header before the projection list.
   */
  redefinedAssociations?: RedefinedAssociation[];
  /** `bind aspect …` declarations in the FROM region / projection header. */
  aspectBindings?: AspectBinding[];
  parameters: ParameterDefinition[];
  members: ViewMember[];
  /** Top-level filter clause (`where ...`). */
  where?: Expression;
  /** `group by field1, …`. */
  groupBy?: string[];
  /** `having <condition>`. */
  having?: Expression;
  /** `union|intersect|except` set operations applied to the select. */
  setOperations?: SetOperation[];
}
interface AbstractEntityDefinition extends AstNode {
  kind: 'abstractEntity';
  name: string;
  annotations: Annotation[];
  parameters: ParameterDefinition[];
  members: ViewMember[];
}
interface CustomEntityDefinition extends AstNode {
  kind: 'customEntity';
  name: string;
  annotations: Annotation[];
  parameters: ParameterDefinition[];
  members: ViewMember[];
}
interface GrantStatement extends AstNode {
  /** The granted privilege, always `select` for now. */
  privilege: 'select';
  /** Target entity (qualified). */
  entity: string;
  /** `with optional elements ( <name> [default true|false], … )`. */
  optionalElements?: DclOptionalElement[];
  /** `combination mode or|and` or `redefinition` after grant. */
  combinationMode?: 'or' | 'and' | 'redefinition';
  /** `inherit <role> …` — the role whose conditions are inherited. */
  inheritRole?: string;
  /** `inherit <role> and|or <cond>` connector. */
  inheritConditionConnector?: 'and' | 'or';
  inheritCondition?: Expression;
  where?: Expression;
}
/** One entry of `with optional elements ( <name> [default true|false] )`. */
interface DclOptionalElement extends AstNode {
  name: string;
  /** `default true|false`; absent when not specified. */
  default?: boolean;
}
/**
 * `inherit <role> [for grant select on <entity>] [where …] ;` —
 * a standalone inherit rule inside a role body.
 */
interface InheritStatement extends AstNode {
  /** The inherited role (qualified). */
  role: string;
  /** `for grant select on <entity>` — restricted scope. */
  entity?: string;
  where?: Expression;
}
/**
 * `inheriting conditions from entity <name>|super [default true|false] … ;`
 */
interface InheritingConditionsStatement extends AstNode {
  /** `entity` or `super`. */
  sourceKind: 'entity' | 'super';
  /** Present for `from entity <name>`. */
  entity?: string;
  /** `default true|false`; absent when not specified. */
  default?: boolean;
  condition?: Expression;
}
/** One statement inside a role body. */
type RoleMember = GrantStatement | InheritStatement | InheritingConditionsStatement;
interface RoleDefinition extends AstNode {
  kind: 'role';
  name: string;
  annotations: Annotation[];
  /** `define role <name> switchable { … }`. */
  switchable?: boolean;
  /** `grant select on …` statements. */
  grants: GrantStatement[];
  /** All members in source order, including inherit rules. */
  members: RoleMember[];
}
/** define [writable] external entity <name> … with federated data provided at runtime [;] */
interface ExternalEntityDefinition extends AstNode {
  kind: 'externalEntity';
  name: string;
  annotations: Annotation[];
  /** `writable` modifier (writable external entity). */
  writable?: boolean;
  /** `external name <db_object>` mapping. */
  externalName?: string;
  parameters: ParameterDefinition[];
  members: TableMember[];
}
/** define table function <name> [with parameters …] returns { … } implemented by method cls=>m [;] */
interface TableFunctionDefinition extends AstNode {
  kind: 'tableFunction';
  name: string;
  annotations: Annotation[];
  parameters: ParameterDefinition[];
  /** Return structure fields (`name : typing;`). */
  members: TableMember[];
  /** `implemented by method <class>` (part before `=>`). */
  implementingClass?: string;
  /** `implemented by method <class>=><method>` (part after `=>`). */
  implementingMethod?: string;
}
/** define scalar function <name> [with parameters …] returns <type> [;] */
interface ScalarFunctionDefinition extends AstNode {
  kind: 'scalarFunction';
  name: string;
  annotations: Annotation[];
  parameters: ParameterDefinition[];
  returnType: TypeRef;
}
/** `[key] <elem> : <typing|expr>;` — one element of a `define aspect` body. */
interface AspectElement extends AstNode {
  annotations: Annotation[];
  name: string;
  isKey: boolean;
  /** `elem : typing` — present when the element is typed. */
  type?: TypeRef;
  /** `elem : <expr>` — raw operand text for expressions/calls/case. */
  expression?: string;
}
/** define aspect <name> [{ <elements> }] */
interface AspectDefinition extends AstNode {
  kind: 'aspect';
  name: string;
  annotations: Annotation[];
  members: AspectElement[];
}
/** One `ORDER BY` item: `<field> [ascending|descending]`. */
interface SortItem extends AstNode {
  name: string;
  direction?: 'ascending' | 'descending';
}
/** Period clause of a hierarchy: `period from <f> to <f> [valid from <f> to <f>]`. */
interface HierarchyPeriod extends AstNode {
  from: string;
  to: string;
  validFrom?: string;
  validTo?: string;
}
/**
 * define hierarchy <name> [with parameters …]
 *   as parent child hierarchy( <clauses> ) { <elements> }
 */
interface HierarchyDefinition extends AstNode {
  kind: 'hierarchy';
  name: string;
  annotations: Annotation[];
  parameters: ParameterDefinition[];
  /** `source <entity>` — the hierarchy's data source. */
  source: string;
  /** `child to parent association <name>` — the self-association. */
  childToParentAssociation?: string;
  period?: HierarchyPeriod;
  /** `directory <entity> filter by <cond>`. */
  directory?: {
    entity: string;
    filter: Expression;
  };
  /** `start where <cond>`. */
  startWhere?: Expression;
  /** `siblings order by <items>` — always present. */
  siblingsOrderBy: SortItem[];
  /** `depth <field>|<num>`. */
  depth?: string;
  /** `nodetype <field>`. */
  nodetype?: string;
  /** `load bulk|incremental|<field>|<sysvar>`. */
  load?: string;
  /** `multiple parents not allowed|leaves only|allowed`. */
  multipleParents?: 'notAllowed' | 'leavesOnly' | 'allowed';
  /** `orphans ignore|error|root`. */
  orphans?: 'ignore' | 'error' | 'root';
  /** `cycles error|breakup`. */
  cycles?: 'error' | 'breakup';
  /** `generate spantree`. */
  generateSpantree?: boolean;
  /** `cache on|off|force`. */
  cache?: 'on' | 'off' | 'force';
  members: ViewMember[];
}
/** `union|intersect|except [all] { <elements> }` — extension-level set op. */
interface ExtendSetOperation extends AstNode {
  kind: 'extendSetOperation';
  operator: 'union' | 'unionAll' | 'intersect' | 'except';
  members: ViewMember[];
}
/**
 * `extend view [entity] <name> with [<assocs>] { <elements> }
 *  [group by …] [union|intersect|except { … }]* [;]`
 * and `extend abstract|custom entity <name> with { … }`.
 */
interface ExtensionDefinition extends AstNode {
  kind: 'extension';
  name: string;
  annotations: Annotation[];
  /** The extended entity flavour: `view` | `abstract` | `custom`. */
  targetKind: 'view' | 'abstract' | 'custom';
  /** `true` when the extended target is `view entity` (not legacy `view`). */
  isViewEntity?: boolean;
  /** Associations appended by the extension. */
  associations: AssociationDeclaration[];
  members: ViewMember[];
  groupBy?: string[];
  setOperations?: ExtendSetOperation[];
}
/** `define annotation <name> { … }` (DDLA) — body captured as raw tokens. */
interface AnnotationDefinition extends AstNode {
  kind: 'annotationDefinition';
  name: string;
  annotations: Annotation[];
  /** Raw token text inside the `{ … }` body (or after `:`). */
  body: string;
}
/** `define accesspolicy <name> { … }` — body captured as raw tokens. */
interface AccessPolicyDefinition extends AstNode {
  kind: 'accessPolicy';
  name: string;
  annotations: Annotation[];
  /** Raw token text inside the `{ … }` body. */
  body: string;
}
type CdsDefinition = TableDefinition | StructureDefinition | SimpleTypeDefinition | ServiceDefinition | MetadataExtension | RoleDefinition | ViewEntityDefinition | AbstractEntityDefinition | CustomEntityDefinition | ExternalEntityDefinition | TableFunctionDefinition | ScalarFunctionDefinition | AspectDefinition | HierarchyDefinition | ExtensionDefinition | AnnotationDefinition | AccessPolicyDefinition;
/** Root AST node representing a parsed CDS source file */
interface CdsSourceFile extends AstNode {
  definitions: CdsDefinition[];
}
interface CdsParseError {
  message: string;
  line: number;
  column: number;
  offset: number;
  length: number;
}
type WithMembers = ViewEntityDefinition | AbstractEntityDefinition | CustomEntityDefinition | HierarchyDefinition | ExtensionDefinition;
type WithFields = TableDefinition | StructureDefinition | ExternalEntityDefinition | TableFunctionDefinition;
type WithParameters = ViewEntityDefinition | AbstractEntityDefinition | CustomEntityDefinition | ExternalEntityDefinition | TableFunctionDefinition | ScalarFunctionDefinition | HierarchyDefinition;
/** True when the definition has a `members` array (view-like entities). */
declare function hasMembers(def: CdsDefinition): def is WithMembers;
/** True when the definition has a `members` array of typed fields (TABL/structure). */
declare function hasFields(def: CdsDefinition): def is WithFields;
declare function hasParameters(def: CdsDefinition): def is WithParameters;
/** Yield every definition in the file (currently one, future-proofed). */
declare function walkDefinitions(file: CdsSourceFile): Iterable<CdsDefinition>;
/**
 * Yield every annotation attached anywhere in the AST (definitions,
 * elements/fields, parameters, associations).
 */
declare function walkAnnotations(file: CdsSourceFile): Iterable<Annotation>;
/** Yield every element (`ViewElement`) across all view-like definitions. */
declare function walkViewElements(file: CdsSourceFile): Iterable<{
  owner: WithMembers;
  element: ViewElement;
}>;
/** Yield every association declaration across view-like definitions. */
declare function walkAssociations(file: CdsSourceFile): Iterable<{
  owner: WithMembers;
  association: AssociationDeclaration;
}>;
/**
 * Yield every association declared in the FROM region of a view entity.
 *
 * FROM associations are declared next to the data source (before the element
 * list) and are therefore kept apart from the associations inside
 * `members`.
 */
declare function walkFromAssociations(file: CdsSourceFile): Iterable<{
  owner: ViewEntityDefinition;
  association: AssociationDeclaration;
}>;
/** Yield every join of every view entity, in source order. */
declare function walkJoins(file: CdsSourceFile): Iterable<{
  owner: ViewEntityDefinition;
  join: JoinClause;
}>;
/** Yield every field definition from tables and structures. */
declare function walkFields(file: CdsSourceFile): Iterable<{
  owner: WithFields;
  field: FieldDefinition;
}>;
/** Yield every parameter definition across view-like entities. */
declare function walkParameters(file: CdsSourceFile): Iterable<{
  owner: WithParameters;
  parameter: ParameterDefinition;
}>;
declare function isAssociation(m: ViewMember): m is AssociationDeclaration;
/** Look up an annotation by its dotted key. Returns the first match. */
declare function findAnnotation(annotations: readonly Annotation[], key: string): Annotation | undefined;
declare function validateCardinality(file: CdsSourceFile): SemanticDiagnostic[];
declare function validateViewElements(file: CdsSourceFile): SemanticDiagnostic[];
interface SemanticDiagnostic {
  /** Stable machine-readable code. */
  code: string;
  severity: 'error' | 'warning';
  message: string;
  /** Optional location hint (e.g. element name, association alias). */
  target?: string;
}
/** Run all validators. */
declare function validate(file: CdsSourceFile): SemanticDiagnostic[];
declare const ddlCoverage: GrammarCoverage;
declare const dclCoverage: GrammarCoverage;
declare const annotationsCoverage: GrammarCoverage;
declare const associationsCoverage: GrammarCoverage;
declare const joinsCoverage: GrammarCoverage;
declare const parametersCoverage: GrammarCoverage;
declare const projectionsCoverage: GrammarCoverage;
declare const actionsCoverage: GrammarCoverage;
/**
 * Grammar coverage index.
 *
 * Each topic module in this directory documents a slice of the CDS grammar
 * implemented by the single Chevrotain parser in `../../parser.ts`. They are
 * intentionally documentation-first: Chevrotain's `CstParser` requires all
 * rules to live on one class, so we keep them together and split the docs
 * into focused files. Each module re-exports a `COVERED` array listing the
 * grammar constructs currently implemented — useful for downstream tools
 * (E10/E11/E12) to know what they can rely on.
 */
type GrammarCoverage = {
  readonly topic: string;
  readonly constructs: readonly string[];
};
declare const GRAMMAR_COVERAGE: readonly GrammarCoverage[];
/** Result of parsing a CDS source file */
interface ParseResult {
  /** The parsed AST (may be partial if there are errors) */
  ast: CdsSourceFile;
  /** Lexing and parsing errors */
  errors: CdsParseError[];
}
/**
 * Parse an ABAP CDS source string into a typed AST.
 *
 * @param source - The CDS source code to parse
 * @returns Parse result with AST and any errors
 */
declare function parse(source: string): ParseResult;
export { type AbstractEntityDefinition, type AccessPolicyDefinition, type AnnotatedElement, type Annotation, type AnnotationArray, type AnnotationDefinition, type AnnotationObject, type AnnotationProperty, type AnnotationValue, type AspectBinding, type AspectBindingMapping, type AspectDefinition, type AspectElement, type AssociationDeclaration, type AssociationKind, type AssociationRedirection, type AstNode, type BooleanLiteral, type BuiltinTypeRef, type Cardinality, type CardinalityWord, type CdsDefinition, type CdsParseError, type CdsSourceFile, type ConditionedJoinClause, type CrossJoinClause, type CustomEntityDefinition, type DataSource, type DataSourceKind, type DataSourceParameter, type DclOptionalElement, type EnumValue, type ExposeStatement, type Expression, type ExtendSetOperation, type ExtensionDefinition, type ExternalEntityDefinition, type FieldDefinition, GRAMMAR_COVERAGE, type GrammarCoverage, type GrantStatement, type HierarchyDefinition, type HierarchyPeriod, type IncludeDirective, type InheritStatement, type InheritingConditionsStatement, type JoinClause, type JoinGroup, type JoinSource, type JoinType, type MetadataExtension, type NamedTypeRef, type NumberLiteral, type ParameterDefinition, ParseResult, type RedefinedAssociation, type RoleDefinition, type RoleMember, type ScalarFunctionDefinition, type SelectStatement, type SemanticDiagnostic, type ServiceDefinition, type SetOperation, type SimpleTypeDefinition, type SortItem, type SourceLocation, type StringLiteral, type StructureDefinition, type TableDefinition, type TableFunctionDefinition, type TableMember, type TypeRef, type ViewElement, type ViewEntityDefinition, type ViewMember, type WordCardinality, actionsCoverage, annotationsCoverage, associationsCoverage, dclCoverage, ddlCoverage, findAnnotation, hasFields, hasMembers, hasParameters, isAssociation, joinsCoverage, parametersCoverage, parse, projectionsCoverage, validate, validateCardinality, validateViewElements, walkAnnotations, walkAssociations, walkDefinitions, walkFields, walkFromAssociations, walkJoins, walkParameters, walkViewElements };
//# sourceMappingURL=index.d.mts.map