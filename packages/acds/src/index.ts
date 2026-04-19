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

import { CdsLexer } from './tokens';
import { cdsParser } from './parser';
import { cdsVisitor } from './visitor';
import type { CdsSourceFile } from './ast';
import type { CdsParseError } from './errors';
import { fromLexError, fromParseError } from './errors';

/** Result of parsing a CDS source file */
export interface ParseResult {
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
export function parse(source: string): ParseResult {
  // Step 1: Tokenize
  const lexResult = CdsLexer.tokenize(source);
  const errors: CdsParseError[] = lexResult.errors.map(fromLexError);

  // Step 2: Parse tokens → CST
  cdsParser.input = lexResult.tokens;
  const cst = cdsParser.sourceFile();
  errors.push(...cdsParser.errors.map(fromParseError));

  // Step 3: CST → AST
  let ast: CdsSourceFile = { definitions: [] };
  if (cst) {
    try {
      ast = cdsVisitor.visit(cst) as CdsSourceFile;
    } catch {
      // Visitor may fail on severely malformed CST
      // Errors already captured from parser
    }
  }

  return { ast, errors };
}

// Re-export types
export type {
  CdsSourceFile,
  CdsDefinition,
  TableDefinition,
  StructureDefinition,
  SimpleTypeDefinition,
  ServiceDefinition,
  MetadataExtension,
  ViewEntityDefinition,
  AbstractEntityDefinition,
  CustomEntityDefinition,
  RoleDefinition,
  GrantStatement,
  FieldDefinition,
  IncludeDirective,
  TableMember,
  ViewElement,
  ViewMember,
  DataSource,
  DataSourceKind,
  ParameterDefinition,
  AssociationDeclaration,
  AssociationKind,
  Cardinality,
  Expression,
  ExposeStatement,
  AnnotatedElement,
  Annotation,
  AnnotationValue,
  StringLiteral,
  EnumValue,
  BooleanLiteral,
  NumberLiteral,
  AnnotationArray,
  AnnotationObject,
  AnnotationProperty,
  TypeRef,
  BuiltinTypeRef,
  NamedTypeRef,
  SourceLocation,
  AstNode,
} from './ast';

export type { CdsParseError } from './errors';

// AST walker helpers
export {
  walkDefinitions,
  walkAnnotations,
  walkAssociations,
  walkFields,
  walkParameters,
  walkViewElements,
  findAnnotation,
  hasFields,
  hasMembers,
  hasParameters,
  isAssociation,
} from './lib/ast/walker';

// Semantic validators
export {
  validate,
  validateCardinality,
  validateViewElements,
} from './lib/validate';
export type { SemanticDiagnostic } from './lib/validate';

// Grammar coverage metadata (useful for tooling / test reports)
export {
  GRAMMAR_COVERAGE,
  ddlCoverage,
  dclCoverage,
  annotationsCoverage,
  associationsCoverage,
  parametersCoverage,
  projectionsCoverage,
  actionsCoverage,
} from './lib/grammar';
export type { GrammarCoverage } from './lib/grammar';
