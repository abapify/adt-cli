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

/** Field in a table/structure/aspect body */
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

/** define table <name> { ... } */
export interface TableDefinition extends AstNode {
  kind: 'table';
  name: string;
  annotations: Annotation[];
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

/** annotate entity <name> with { ... } */
export interface MetadataExtension extends AstNode {
  kind: 'metadataExtension';
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

export type AssociationKind = 'association' | 'composition';

export interface AssociationDeclaration extends AstNode {
  kind: 'association';
  /** `association` or `composition` */
  associationKind: AssociationKind;
  annotations: Annotation[];
  cardinality?: Cardinality;
  /** `of many` / `of one` modifier (optional). */
  targetMultiplicity?: 'many' | 'one';
  /** Fully qualified target entity (e.g. `I_SalesOrder`). */
  target: string;
  /** `to redirected to <target>` (projection association). */
  redirected?: boolean;
  alias?: string;
  on?: Expression;
}

// ============================================
// View entities / projection views
// ============================================

export type DataSourceKind = 'select' | 'projection';

export interface DataSource extends AstNode {
  name: string;
  alias?: string;
}

/** Single element in a view's projection list. */
export interface ViewElement extends AstNode {
  annotations: Annotation[];
  isKey: boolean;
  isVirtual: boolean;
  isRedirected: boolean;
  /** Either a typed field (abstract/custom entities) or projection expression. */
  expression: string;
  alias?: string;
  /** Present only when element is a typed field (`name : type`). */
  type?: TypeRef;
  notNull?: boolean;
}

export type ViewMember = ViewElement | AssociationDeclaration;

export interface ViewEntityDefinition extends AstNode {
  kind: 'viewEntity';
  name: string;
  annotations: Annotation[];
  sourceKind: DataSourceKind;
  source: DataSource;
  parameters: ParameterDefinition[];
  members: ViewMember[];
  /** Top-level filter clause (`where ...`). */
  where?: Expression;
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

export interface GrantStatement extends AstNode {
  /** The granted privilege, always `select` for now. */
  privilege: 'select';
  /** Target entity (qualified). */
  entity: string;
  where?: Expression;
}

export interface RoleDefinition extends AstNode {
  kind: 'role';
  name: string;
  annotations: Annotation[];
  grants: GrantStatement[];
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
  | CustomEntityDefinition;

// ============================================
// Source file (root AST node)
// ============================================

/** Root AST node representing a parsed CDS source file */
export interface CdsSourceFile extends AstNode {
  definitions: CdsDefinition[];
}
