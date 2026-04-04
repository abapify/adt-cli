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
// Future Phase 2+ types (placeholders)
// ============================================

/** define role <name> { grant ... } */
export interface RoleDefinition extends AstNode {
  kind: 'role';
  name: string;
  // Phase 2: grant clauses, conditions
}

// ============================================
// Phase 3: View Entity (DDLS)
// ============================================

/** Data source in a view entity: table, view, or association */
export interface DataSource extends AstNode {
  name: string;
  alias?: string;
}

/** Join type */
export type JoinKind = 'inner' | 'leftOuter' | 'leftOuterJoin' | 'association';

/** Join condition */
export interface JoinCondition extends AstNode {
  leftField: string;
  rightField: string;
}

/** Join clause */
export interface JoinClause extends AstNode {
  kind: JoinKind;
  target: DataSource;
  on: JoinCondition[];
}

/** Field projection in view entity */
export interface ProjectionField extends AstNode {
  annotations: Annotation[];
  name: string;
  alias?: string;
  expression?: string;
}

/** Order by clause */
export interface OrderByItem extends AstNode {
  expression: string;
  direction: 'asc' | 'desc';
}

/** Where condition */
export interface WhereCondition extends AstNode {
  expression: string;
}

/** define view entity <name> as select from ... [join ...] { ... } [where ...] [group by ...] [order by ...] */
export interface ViewEntityDefinition extends AstNode {
  kind: 'viewEntity';
  name: string;
  annotations: Annotation[];
  datasource: DataSource;
  joins: JoinClause[];
  fields: ProjectionField[];
  where?: WhereCondition;
  groupBy?: string[];
  orderBy?: OrderByItem[];
  distinct: boolean;
}

// ============================================
// Phase 2: Metadata Extension enhanced (DDLX)
// ============================================

/** Full metadata extension with element overrides */
export interface MetadataExtensionFull extends AstNode {
  kind: 'metadataExtension';
  entity: string;
  annotations: Annotation[];
  elements: AnnotatedElement[];
}

// ============================================
// Union type for all definitions
// ============================================

export type CdsDefinition =
  | TableDefinition
  | StructureDefinition
  | SimpleTypeDefinition
  | ServiceDefinition
  | MetadataExtensionFull
  | RoleDefinition
  | ViewEntityDefinition;

// ============================================
// Source file (root AST node)
// ============================================

/** Root AST node representing a parsed CDS source file */
export interface CdsSourceFile extends AstNode {
  definitions: CdsDefinition[];
}
