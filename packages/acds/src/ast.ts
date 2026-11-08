/**
 * AST Node Types for ABAP CDS source
 *
 * Phase 1: TABL, Structure, DRTY, SRVD, DDLX
 * Phase 2: DCLS, DDLA, DRAS, DSFD, DTDC, DTEB, DTSC
 * Phase 3: DDLS (view entity — SQL-like)
 */

// ============================================
// Base types
// ============================================

/** Source location for error reporting */
export interface SourceLocation {
  startOffset: number;
  endOffset: number;
  startLine: number;
  startColumn: number;
  endLine?: number;
  endColumn?: number;
}

/** Base AST node */
export interface AstNode {
  loc?: SourceLocation;
}

// ============================================
// Annotations
// ============================================

/** Annotation value variants */
export type AnnotationValue =
  | StringLiteral
  | EnumValue
  | BooleanLiteral
  | NumberLiteral
  | AnnotationArray
  | AnnotationObject;

export interface StringLiteral extends AstNode {
  kind: 'string';
  value: string;
}

export interface EnumValue extends AstNode {
  kind: 'enum';
  value: string;
}

export interface BooleanLiteral extends AstNode {
  kind: 'boolean';
  value: boolean;
}

export interface NumberLiteral extends AstNode {
  kind: 'number';
  value: number;
}

export interface AnnotationArray extends AstNode {
  kind: 'array';
  items: AnnotationValue[];
}

export interface AnnotationObject extends AstNode {
  kind: 'object';
  properties: AnnotationProperty[];
}

export interface AnnotationProperty extends AstNode {
  key: string;
  value: AnnotationValue;
}

/** A single annotation: @DottedKey.path: value */
export interface Annotation extends AstNode {
  key: string;
  value: AnnotationValue;
}

// ============================================
// Type references
// ============================================

/** ABAP built-in type: abap.char(10), abap.dec(11,2) */
export interface BuiltinTypeRef extends AstNode {
  kind: 'builtin';
  name: string;
  length?: number;
  decimals?: number;
}

/** Data element / named type reference */
export interface NamedTypeRef extends AstNode {
  kind: 'named';
  name: string;
}

export type TypeRef = BuiltinTypeRef | NamedTypeRef;

// ============================================
// Field definitions
// ============================================

/** Field in a table/structure/table-entity/external-entity body */
export interface FieldDefinition extends AstNode {
  annotations: Annotation[];
  name: string;
  type: TypeRef;
  isKey: boolean;
  notNull: boolean;
}

/** Include directive: include <typename>; or include <typename> with suffix <suffix>; */
export interface IncludeDirective extends AstNode {
  kind: 'include';
  name: string;
  suffix?: string;
}

export type TableMember = FieldDefinition | IncludeDirective;

// ============================================
// Top-level definitions (Phase 1)
// ============================================

/** define [root] table [entity] <name> { ... } */
export interface TableDefinition extends AstNode {
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
export interface StructureDefinition extends AstNode {
  kind: 'structure';
  name: string;
  annotations: Annotation[];
  members: TableMember[];
}

/** define type <name> : <type>; */
export interface SimpleTypeDefinition extends AstNode {
  kind: 'simpleType';
  name: string;
  annotations: Annotation[];
  type: TypeRef;
}

/** define service <name> { expose ...; } */
export interface ServiceDefinition extends AstNode {
  kind: 'service';
  name: string;
  annotations: Annotation[];
  exposes: ExposeStatement[];
}

/** expose <entity> as <alias>; */
export interface ExposeStatement extends AstNode {
  entity: string;
  alias?: string;
}

/** annotate entity|view <name> with { ... } */
export interface MetadataExtension extends AstNode {
  kind: 'metadataExtension';
  /** `entity` for `annotate entity`, `view` for `annotate view`. */
  targetKind?: 'entity' | 'view';
  entity: string;
  annotations: Annotation[];
  elements: AnnotatedElement[];
}

/** Element inside a metadata extension: @Anno field; */
export interface AnnotatedElement extends AstNode {
  annotations: Annotation[];
  name: string;
}

// ============================================
// Parameters
// ============================================

export interface ParameterDefinition extends AstNode {
  annotations: Annotation[];
  name: string;
  type: TypeRef;
  /** default literal value, if any (e.g. `default 'X'`) */
  defaultValue?: AnnotationValue;
}

// ============================================
// Expressions (narrow subset)
// ============================================

/**
 * A parsed but un-interpreted expression from `on` / `where` clauses.
 * Consumers typically only need the raw source span; `tokens` gives the
 * flat token stream for lightweight introspection.
 */
export interface Expression extends AstNode {
  /** Flattened source image of the expression (concatenated token images, space-separated). */
  source: string;
  /** Token images in order. */
  tokens: string[];
}

// ============================================
// Associations
// ============================================

/** Cardinality, e.g. `[0..1]`, `[1..*]`, `[*]`, `[5]` */
export interface Cardinality extends AstNode {
  min?: number;
  /** `undefined` means unbounded (`*`) when present. */
  max?: number | '*';
}

/** A cardinality bound written in words: `one`, `exact one` or `many`. */
export type CardinalityWord = 'one' | 'exactOne' | 'many';

/**
 * Word-form cardinality: `of {many|one|exact one} [to] <target>`
 * for associations, and `[{one|many|exact one}] to {one|exact one|many}`
 * for joins (`many to one join`, `to one join`).
 */
export interface WordCardinality extends AstNode {
  /**
   * Source-side bound — only populated by join cardinalities
   * (`many to one join`); `of`-form associations keep a single `target`.
   */
  source?: CardinalityWord;
  /** Target-side bound. */
  target: CardinalityWord;
}

export type AssociationKind = 'association' | 'composition';

export interface AssociationDeclaration extends AstNode {
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
export interface RedefinedAssociation extends AstNode {
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
export interface AssociationRedirection extends AstNode {
  /** `default` = `redirected to`, else `composition child` / `parent`. */
  mode: 'default' | 'compositionChild' | 'parent';
  target: string;
}

/**
 * `bind aspect <aspect> ( <element> => <target>, … ) [as <alias>]`
 * — an aspect binding in the FROM region or projection view header.
 */
export interface AspectBinding extends AstNode {
  kind: 'aspectBinding';
  /** Bound aspect entity name. */
  aspect: string;
  mappings: AspectBindingMapping[];
  alias?: string;
}

export interface AspectBindingMapping extends AstNode {
  /** Aspect element name. */
  element: string;
  /** Binding target, e.g. `$projection.field` (raw operand text). */
  target: string;
}

// ============================================
// View entities / projection views
// ============================================

export type DataSourceKind = 'select' | 'projection';

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
export type JoinType =
  'inner' | 'leftOuter' | 'rightOuter' | 'fullOuter' | 'cross';

/**
 * A single parameter binding of a parameterized data source.
 *
 * `value` keeps the original binding text, e.g. `:P_StartDate` (reference to
 * a parameter of the consuming view), `$session.client` / `$parameters.P_X`
 * (system variable) or a literal such as `'X'` / `42`.
 */
export interface DataSourceParameter extends AstNode {
  /** Name of the target parameter, e.g. `P_StartDate`. */
  name: string;
  /** Raw binding text as written in the source. */
  value: string;
}

/** A data source in a FROM clause: a view, table, projection or parameter. */
export interface DataSource extends AstNode {
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
export interface JoinGroup extends AstNode {
  kind: 'joinGroup';
  source: JoinSource;
  joins: JoinClause[];
}

/** A join source is either a plain data source or a parenthesized group. */
export type JoinSource = DataSource | JoinGroup;

/** A join whose `ON` condition is required (inner/left/right/full). */
export interface ConditionedJoinClause extends AstNode {
  kind: 'join';
  joinType: 'inner' | 'leftOuter' | 'rightOuter' | 'fullOuter';
  source: JoinSource;
  /** The `ON` condition, captured opaquely — always present. */
  on: Expression;
  /** Optional word-form join cardinality (`many to one join`). */
  cardinality?: WordCardinality;
}

/** A cross join — never carries an `ON` condition. */
export interface CrossJoinClause extends AstNode {
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
export type JoinClause = ConditionedJoinClause | CrossJoinClause;

/** Single element in a view's projection list. */
export interface ViewElement extends AstNode {
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

export type ViewMember = ViewElement | AssociationDeclaration;

/**
 * The `select` part of a view entity (or a set-operation operand):
 * `select [distinct] from <source> [joins|assocs|bind aspect] { … }
 *  [where …] [group by …] [having …] [union|intersect|except …]*`.
 */
export interface SelectStatement extends AstNode {
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
export interface SetOperation extends AstNode {
  kind: 'setOperation';
  operator: 'union' | 'unionAll' | 'intersect' | 'except';
  statement: SelectStatement;
}

export interface ViewEntityDefinition extends AstNode {
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

export interface AbstractEntityDefinition extends AstNode {
  kind: 'abstractEntity';
  name: string;
  annotations: Annotation[];
  parameters: ParameterDefinition[];
  members: ViewMember[];
}

export interface CustomEntityDefinition extends AstNode {
  kind: 'customEntity';
  name: string;
  annotations: Annotation[];
  parameters: ParameterDefinition[];
  members: ViewMember[];
}

// ============================================
// DCL — access control (role)
// ============================================

/** Combination mode of a grant clause. */
export type GrantCombinationMode = 'or' | 'and' | 'redefinition';

export interface GrantStatement extends AstNode {
  /** The granted privilege, always `select` for now. */
  privilege: 'select';
  /** Target entity (qualified). */
  entity: string;
  /** `with optional elements ( <name> [default true|false], … )`. */
  optionalElements?: DclOptionalElement[];
  /** `combination mode or|and` or `redefinition` after grant. */
  combinationMode?: GrantCombinationMode;
  /** `inherit <role> …` — the role whose conditions are inherited. */
  inheritRole?: string;
  /** `inherit <role> and|or <cond>` connector. */
  inheritConditionConnector?: 'and' | 'or';
  inheritCondition?: Expression;
  where?: Expression;
}

/** One entry of `with optional elements ( <name> [default true|false] )`. */
export interface DclOptionalElement extends AstNode {
  name: string;
  /** `default true|false`; absent when not specified. */
  default?: boolean;
}

/**
 * `inherit <role> [for grant select on <entity>] [where …] ;` —
 * a standalone inherit rule inside a role body.
 */
export interface InheritStatement extends AstNode {
  /** The inherited role (qualified). */
  role: string;
  /** `for grant select on <entity>` — restricted scope. */
  entity?: string;
  where?: Expression;
}

/**
 * `inheriting conditions from entity <name>|super [default true|false] … ;`
 */
export interface InheritingConditionsStatement extends AstNode {
  /** `entity` or `super`. */
  sourceKind: 'entity' | 'super';
  /** Present for `from entity <name>`. */
  entity?: string;
  /** `default true|false`; absent when not specified. */
  default?: boolean;
  condition?: Expression;
}

/** One statement inside a role body. */
export type RoleMember =
  GrantStatement | InheritStatement | InheritingConditionsStatement;

export interface RoleDefinition extends AstNode {
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

// ============================================
// Additional DDL definitions
// ============================================

/** define [writable] external entity <name> … with federated data provided at runtime [;] */
export interface ExternalEntityDefinition extends AstNode {
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
export interface TableFunctionDefinition extends AstNode {
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
export interface ScalarFunctionDefinition extends AstNode {
  kind: 'scalarFunction';
  name: string;
  annotations: Annotation[];
  parameters: ParameterDefinition[];
  returnType: TypeRef;
}

/** `[key] <elem> : <typing|expr>;` — one element of a `define aspect` body. */
export interface AspectElement extends AstNode {
  annotations: Annotation[];
  name: string;
  isKey: boolean;
  /** `elem : typing` — present when the element is typed. */
  type?: TypeRef;
  /** `elem : <expr>` — raw operand text for expressions/calls/case. */
  expression?: string;
}

/** define aspect <name> [{ <elements> }] */
export interface AspectDefinition extends AstNode {
  kind: 'aspect';
  name: string;
  annotations: Annotation[];
  members: AspectElement[];
}

/** One `ORDER BY` item: `<field> [ascending|descending]`. */
export interface SortItem extends AstNode {
  name: string;
  direction?: 'ascending' | 'descending';
}

/** Period clause of a hierarchy: `period from <f> to <f> [valid from <f> to <f>]`. */
export interface HierarchyPeriod extends AstNode {
  from: string;
  to: string;
  validFrom?: string;
  validTo?: string;
}

/**
 * define hierarchy <name> [with parameters …]
 *   as parent child hierarchy( <clauses> ) { <elements> }
 */
export interface HierarchyDefinition extends AstNode {
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
  directory?: { entity: string; filter: Expression };
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
export interface ExtendSetOperation extends AstNode {
  kind: 'extendSetOperation';
  operator: 'union' | 'unionAll' | 'intersect' | 'except';
  members: ViewMember[];
}

/**
 * `extend view [entity] <name> with [<assocs>] { <elements> }
 *  [group by …] [union|intersect|except { … }]* [;]`
 * and `extend abstract|custom entity <name> with { … }`.
 */
export interface ExtensionDefinition extends AstNode {
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
export interface AnnotationDefinition extends AstNode {
  kind: 'annotationDefinition';
  name: string;
  annotations: Annotation[];
  /** Raw token text inside the `{ … }` body (or after `:`). */
  body: string;
}

/** `define accesspolicy <name> { … }` — body captured as raw tokens. */
export interface AccessPolicyDefinition extends AstNode {
  kind: 'accessPolicy';
  name: string;
  annotations: Annotation[];
  /** Raw token text inside the `{ … }` body. */
  body: string;
}

// ============================================
// Union type for all definitions
// ============================================

export type CdsDefinition =
  | TableDefinition
  | StructureDefinition
  | SimpleTypeDefinition
  | ServiceDefinition
  | MetadataExtension
  | RoleDefinition
  | ViewEntityDefinition
  | AbstractEntityDefinition
  | CustomEntityDefinition
  | ExternalEntityDefinition
  | TableFunctionDefinition
  | ScalarFunctionDefinition
  | AspectDefinition
  | HierarchyDefinition
  | ExtensionDefinition
  | AnnotationDefinition
  | AccessPolicyDefinition;

// ============================================
// Source file (root AST node)
// ============================================

/** Root AST node representing a parsed CDS source file */
export interface CdsSourceFile extends AstNode {
  definitions: CdsDefinition[];
}
