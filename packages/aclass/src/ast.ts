/**
 * Typed AST for `@abapify/aclass` — ABAP OO structural parser.
 *
 * Covers class / interface declarations, sections, and member
 * declarations. Method-implementation bodies are preserved as opaque
 * source slices; their statements are NOT modelled.
 */

export interface SourceSpan {
  readonly startOffset: number;
  readonly endOffset: number;
  readonly startLine: number;
  readonly startColumn: number;
}

export type Visibility = 'public' | 'protected' | 'private';

// Type references — `source` is the authoritative verbatim slice.

export type TypeRef =
  | BuiltinTypeRef
  | NamedTypeRef
  | RefToTypeRef
  | TableTypeRef;

export interface BuiltinTypeRef {
  readonly kind: 'BuiltinTypeRef';
  readonly name: string;
  readonly source: string;
}

export interface NamedTypeRef {
  readonly kind: 'NamedTypeRef';
  readonly name: string;
  readonly source: string;
}

export interface RefToTypeRef {
  readonly kind: 'RefToTypeRef';
  readonly target: TypeRef;
  readonly source: string;
}

export type TableKind = 'standard' | 'sorted' | 'hashed';

export interface TableTypeRef {
  readonly kind: 'TableTypeRef';
  readonly tableKind: TableKind;
  readonly row: TypeRef;
  readonly keyClause: string;
  readonly source: string;
}

export interface MethodParam {
  readonly kind: 'MethodParam';
  readonly name: string;
  readonly type: TypeRef;
  readonly isValue: boolean;
  readonly isOptional: boolean;
  readonly defaultValue?: string;
  readonly abapDoc?: readonly string[];
  readonly span: SourceSpan;
}

// Top-level shapes

export type AbapDefinition = ClassDef | ClassImpl | InterfaceDef;

export interface AbapSourceFile {
  readonly kind: 'AbapSourceFile';
  readonly source: string;
  readonly definitions: readonly AbapDefinition[];
}

export interface ClassDef {
  readonly kind: 'ClassDef';
  readonly name: string;
  readonly abapDoc?: readonly string[];
  readonly isFinal: boolean;
  readonly isAbstract: boolean;
  readonly isForTesting: boolean;
  readonly createVisibility: Visibility;
  readonly superClass?: string;
  readonly sections: readonly Section[];
  readonly span: SourceSpan;
}

export interface Section {
  readonly kind: 'Section';
  readonly visibility: Visibility;
  readonly members: readonly ClassMember[];
  readonly span: SourceSpan;
}

export type ClassMember =
  | MethodDecl
  | AttributeDecl
  | TypeDecl
  | ConstantDecl
  | InterfaceStmt
  | AliasDecl
  | RawMember;

export interface MethodDecl {
  readonly kind: 'MethodDecl';
  readonly name: string;
  readonly abapDoc?: readonly string[];
  readonly isClassMethod: boolean;
  readonly isAbstract: boolean;
  readonly isFinal: boolean;
  readonly isRedefinition: boolean;
  readonly isForTesting: boolean;
  readonly importing: readonly MethodParam[];
  readonly exporting: readonly MethodParam[];
  readonly changing: readonly MethodParam[];
  readonly returning?: MethodParam;
  readonly raising: readonly string[];
  readonly span: SourceSpan;
}

export interface AttributeDecl {
  readonly kind: 'AttributeDecl';
  readonly name: string;
  readonly abapDoc?: readonly string[];
  readonly isClassData: boolean;
  readonly isReadOnly: boolean;
  readonly type: TypeRef;
  readonly span: SourceSpan;
}

export interface TypeDecl {
  readonly kind: 'TypeDecl';
  readonly name: string;
  readonly abapDoc?: readonly string[];
  readonly shape: TypeDeclShape;
  readonly span: SourceSpan;
}

export type TypeDeclShape =
  | { readonly kind: 'alias'; readonly type: TypeRef }
  | { readonly kind: 'structure'; readonly fields: readonly StructureField[] };

export interface StructureField {
  readonly kind: 'StructureField';
  readonly name: string;
  readonly type: TypeRef;
  readonly abapDoc?: readonly string[];
  readonly span: SourceSpan;
}

export interface ConstantDecl {
  readonly kind: 'ConstantDecl';
  readonly name: string;
  readonly type: TypeRef;
  readonly value: string;
  readonly abapDoc?: readonly string[];
  readonly span: SourceSpan;
}

export interface InterfaceStmt {
  readonly kind: 'InterfaceStmt';
  readonly name: string;
  readonly abapDoc?: readonly string[];
  readonly span: SourceSpan;
}

export interface AliasDecl {
  readonly kind: 'AliasDecl';
  readonly name: string;
  readonly target: string;
  readonly abapDoc?: readonly string[];
  readonly span: SourceSpan;
}

export interface RawMember {
  readonly kind: 'RawMember';
  readonly source: string;
  readonly abapDoc?: readonly string[];
  readonly span: SourceSpan;
}

export interface ClassImpl {
  readonly kind: 'ClassImpl';
  readonly name: string;
  readonly methods: readonly MethodImpl[];
  readonly span: SourceSpan;
}

export interface MethodImpl {
  readonly kind: 'MethodImpl';
  readonly name: string;
  readonly body: string;
  readonly bodySpan: SourceSpan;
  readonly span: SourceSpan;
}

export interface InterfaceDef {
  readonly kind: 'InterfaceDef';
  readonly name: string;
  readonly abapDoc?: readonly string[];
  readonly isPublic: boolean;
  readonly members: readonly ClassMember[];
  readonly span: SourceSpan;
}
