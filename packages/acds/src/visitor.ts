/**
 * CST → AST Visitor
 *
 * Transforms Chevrotain's Concrete Syntax Tree into our typed AST.
 */
import type { CstNode, IToken } from 'chevrotain';
import { cdsParser } from './parser';
import type {
  Annotation,
  AnnotationValue,
  AnnotationProperty,
  AnnotatedElement,
  BuiltinTypeRef,
  CdsDefinition,
  CdsSourceFile,
  DataSource,
  ExposeStatement,
  FieldDefinition,
  IncludeDirective,
  JoinClause,
  JoinCondition,
  MetadataExtensionFull,
  NamedTypeRef,
  OrderByItem,
  ProjectionField,
  ServiceDefinition,
  SimpleTypeDefinition,
  StructureDefinition,
  TableDefinition,
  TableMember,
  TypeRef,
  ViewEntityDefinition,
  WhereCondition,
} from './ast';

// Generate the base visitor class from the parser's grammar
const BaseCstVisitor = cdsParser.getBaseCstVisitorConstructor<
  unknown,
  unknown
>();

export class CdsVisitor extends BaseCstVisitor {
  constructor() {
    super();
    this.validateVisitor();
  }

  sourceFile(ctx: Record<string, CstNode[]>): CdsSourceFile {
    const annotations: Annotation[] = (ctx.topLevelAnnotation ?? []).map(
      (node) => this.visit(node) as Annotation,
    );
    const def = this.visit(ctx.definition[0]) as CdsDefinition;

    // Attach top-level annotations to the definition
    if ('annotations' in def) {
      (def as { annotations: Annotation[] }).annotations = [
        ...annotations,
        ...(def as { annotations: Annotation[] }).annotations,
      ];
    }

    return { definitions: [def] };
  }

  definition(ctx: Record<string, CstNode[]>): CdsDefinition {
    if (ctx.defineStatement) {
      return this.visit(ctx.defineStatement[0]) as CdsDefinition;
    }
    return this.visit(ctx.annotateStatement[0]) as CdsDefinition;
  }

  defineStatement(ctx: Record<string, CstNode[]>): CdsDefinition {
    if (ctx.tableDefinition) {
      return this.visit(ctx.tableDefinition[0]) as TableDefinition;
    }
    if (ctx.structureDefinition) {
      return this.visit(ctx.structureDefinition[0]) as StructureDefinition;
    }
    if (ctx.simpleTypeDefinition) {
      return this.visit(ctx.simpleTypeDefinition[0]) as SimpleTypeDefinition;
    }
    if (ctx.serviceDefinition) {
      return this.visit(ctx.serviceDefinition[0]) as ServiceDefinition;
    }
    return this.visit(ctx.viewEntityDefinition[0]) as ViewEntityDefinition;
  }

  tableDefinition(ctx: Record<string, CstNode[] | IToken[]>): TableDefinition {
    const name = this.visit((ctx.cdsName as CstNode[])[0]) as string;
    const members = ((ctx.tableMember as CstNode[]) ?? []).map(
      (node) => this.visit(node) as TableMember,
    );
    return { kind: 'table', name, annotations: [], members };
  }

  structureDefinition(
    ctx: Record<string, CstNode[] | IToken[]>,
  ): StructureDefinition {
    const name = this.visit((ctx.cdsName as CstNode[])[0]) as string;
    const members = ((ctx.tableMember as CstNode[]) ?? []).map(
      (node) => this.visit(node) as TableMember,
    );
    return { kind: 'structure', name, annotations: [], members };
  }

  tableMember(ctx: Record<string, CstNode[]>): TableMember {
    if (ctx.includeDirective) {
      return this.visit(ctx.includeDirective[0]) as IncludeDirective;
    }
    return this.visit(ctx.fieldDefinition[0]) as FieldDefinition;
  }

  includeDirective(ctx: Record<string, CstNode[]>): IncludeDirective {
    const name = this.visit(ctx.cdsName[0]) as string;
    const suffix = ctx.cdsName?.[1]
      ? (this.visit(ctx.cdsName[1]) as string)
      : undefined;
    return { kind: 'include', name, ...(suffix !== undefined && { suffix }) };
  }

  fieldDefinition(ctx: Record<string, CstNode[] | IToken[]>): FieldDefinition {
    const annotations: Annotation[] = ((ctx.annotation as CstNode[]) ?? []).map(
      (node) => this.visit(node) as Annotation,
    );
    const isKey = !!(ctx.Key as IToken[] | undefined)?.length;
    const name = this.visit((ctx.cdsName as CstNode[])[0]) as string;
    const type = this.visit((ctx.typeReference as CstNode[])[0]) as TypeRef;
    const notNull = !!(ctx.Not as IToken[] | undefined)?.length;
    return { annotations, name, type, isKey, notNull };
  }

  simpleTypeDefinition(
    ctx: Record<string, CstNode[] | IToken[]>,
  ): SimpleTypeDefinition {
    const name = this.visit((ctx.cdsName as CstNode[])[0]) as string;
    const type = this.visit((ctx.typeReference as CstNode[])[0]) as TypeRef;
    return { kind: 'simpleType', name, annotations: [], type };
  }

  serviceDefinition(
    ctx: Record<string, CstNode[] | IToken[]>,
  ): ServiceDefinition {
    const name = this.visit((ctx.cdsName as CstNode[])[0]) as string;
    const exposes: ExposeStatement[] = (
      (ctx.exposeStatement as CstNode[]) ?? []
    ).map((node) => this.visit(node) as ExposeStatement);
    return { kind: 'service', name, annotations: [], exposes };
  }

  exposeStatement(ctx: Record<string, CstNode[]>): ExposeStatement {
    const names = (ctx.cdsName ?? []).map((node) => this.visit(node) as string);
    const entity = names[0];
    const alias = names.length > 1 ? names[1] : undefined;
    return { entity, alias };
  }

  viewEntityDefinition(
    ctx: Record<string, CstNode[] | IToken[]>,
  ): ViewEntityDefinition {
    const name = this.visit((ctx.cdsName as CstNode[])[0]) as string;
    const datasource = this.visit(ctx.dataSource?.[0] as CstNode) as DataSource;
    const joins: JoinClause[] = (ctx.joinClause ?? []).map((node) =>
      this.visit(node as CstNode),
    ) as JoinClause[];
    const fields: ProjectionField[] = (ctx.projectionField ?? []).map((node) =>
      this.visit(node as CstNode),
    ) as ProjectionField[];
    const where = ctx.whereCondition
      ? (this.visit(ctx.whereCondition[0] as CstNode) as WhereCondition)
      : undefined;
    const groupBy = ctx.cdsName
      ? ctx.cdsName
          .slice(2)
          .map((node) => this.visit(node as CstNode) as string)
      : undefined;
    const orderBy = ctx.orderByItem
      ? ctx.orderByItem.map(
          (node) => this.visit(node as CstNode) as OrderByItem,
        )
      : undefined;
    const distinct = !!(ctx.Distinct as IToken[] | undefined)?.length;
    return {
      kind: 'viewEntity',
      name,
      annotations: [],
      datasource,
      joins,
      fields,
      where,
      groupBy,
      orderBy,
      distinct,
    };
  }

  dataSource(ctx: Record<string, CstNode[]>): DataSource {
    const names = (ctx.cdsName ?? []).map((node) => this.visit(node) as string);
    return {
      name: names[0],
      alias: names[1],
    };
  }

  joinClause(ctx: Record<string, CstNode[]>): JoinClause {
    const kind: JoinClause['kind'] = ctx.Inner
      ? 'inner'
      : ctx.Left
        ? 'leftOuter'
        : 'association';
    const target = this.visit(ctx.dataSource?.[0] as CstNode) as DataSource;
    const on: JoinCondition[] =
      (ctx.joinCondition?.map((node) =>
        this.visit(node as CstNode),
      ) as JoinCondition[]) ?? [];
    return { kind, target, on };
  }

  joinCondition(ctx: Record<string, CstNode[]>): JoinCondition {
    const cdsNameArray = ctx.cdsName as CstNode[] | undefined;
    const names = (cdsNameArray ?? []).map(
      (node) => this.visit(node) as string,
    );
    return {
      leftField: `${names[0]}.${names[1]}`,
      rightField: `${names[2]}.${names[3]}`,
    };
  }

  projectionField(ctx: Record<string, CstNode[]>): ProjectionField {
    const annotations: Annotation[] = (ctx.annotation ?? []).map(
      (node) => this.visit(node as CstNode) as Annotation,
    );
    const cdsNameArray = ctx.cdsName as CstNode[] | undefined;
    const names = (cdsNameArray ?? []).map(
      (node) => this.visit(node) as string,
    );
    return {
      annotations,
      name: names[0],
      alias: names[1],
    };
  }

  whereCondition(ctx: Record<string, CstNode[]>): WhereCondition {
    const cdsNameArray = ctx.cdsName as CstNode[] | undefined;
    const expression = (cdsNameArray ?? [])
      .map((node) => this.visit(node) as string)
      .join('.');
    return { expression };
  }

  orderByItem(ctx: Record<string, IToken[]>): OrderByItem {
    const cdsNameArray = ctx.cdsName as unknown as CstNode[] | undefined;
    const expr = this.visit(cdsNameArray?.[0] as CstNode) as string;
    const direction: OrderByItem['direction'] = ctx.Descending ? 'desc' : 'asc';
    return { expression: expr, direction };
  }

  annotateStatement(
    ctx: Record<string, CstNode[] | IToken[]>,
  ): MetadataExtensionFull {
    const entity = this.visit((ctx.cdsName as CstNode[])[0]) as string;
    const elements: AnnotatedElement[] = (
      (ctx.annotatedElement as CstNode[]) ?? []
    ).map((node) => this.visit(node) as AnnotatedElement);
    return { kind: 'metadataExtension', entity, annotations: [], elements };
  }

  annotatedElement(ctx: Record<string, CstNode[]>): AnnotatedElement {
    const annotations: Annotation[] = (ctx.annotation ?? []).map(
      (node) => this.visit(node) as Annotation,
    );
    const name = this.visit(ctx.cdsName[0]) as string;
    return { annotations, name };
  }

  topLevelAnnotation(ctx: Record<string, CstNode[]>): Annotation {
    return this.visit(ctx.annotation[0]) as Annotation;
  }

  annotation(ctx: Record<string, CstNode[] | IToken[]>): Annotation {
    const key = this.visit((ctx.dottedName as CstNode[])[0]) as string;
    const value: AnnotationValue = ctx.annotationValue
      ? (this.visit((ctx.annotationValue as CstNode[])[0]) as AnnotationValue)
      : { kind: 'boolean', value: true };
    return { key, value };
  }

  dottedName(ctx: Record<string, CstNode[]>): string {
    return (ctx.cdsName ?? [])
      .map((node) => this.visit(node) as string)
      .join('.');
  }

  annotationValue(ctx: Record<string, CstNode[] | IToken[]>): AnnotationValue {
    if (ctx.StringLiteral) {
      const raw = (ctx.StringLiteral as IToken[])[0].image;
      return { kind: 'string', value: raw.slice(1, -1) };
    }
    if (ctx.EnumLiteral) {
      const raw = (ctx.EnumLiteral as IToken[])[0].image;
      return { kind: 'enum', value: raw.slice(1) }; // strip #
    }
    if (ctx.True) {
      return { kind: 'boolean', value: true };
    }
    if (ctx.False) {
      return { kind: 'boolean', value: false };
    }
    if (ctx.NumberLiteral) {
      return {
        kind: 'number',
        value: parseFloat((ctx.NumberLiteral as IToken[])[0].image),
      };
    }
    if (ctx.annotationArray) {
      return this.visit(
        (ctx.annotationArray as CstNode[])[0],
      ) as AnnotationValue;
    }
    return this.visit(
      (ctx.annotationObject as CstNode[])[0],
    ) as AnnotationValue;
  }

  annotationArray(ctx: Record<string, CstNode[]>): AnnotationValue {
    const items = (ctx.annotationValue ?? []).map(
      (node) => this.visit(node) as AnnotationValue,
    );
    return { kind: 'array', items };
  }

  annotationObject(ctx: Record<string, CstNode[]>): AnnotationValue {
    const properties = (ctx.annotationProperty ?? []).map(
      (node) => this.visit(node) as AnnotationProperty,
    );
    return { kind: 'object', properties };
  }

  annotationProperty(ctx: Record<string, CstNode[]>): AnnotationProperty {
    const key = this.visit(ctx.dottedName[0]) as string;
    const value = this.visit(ctx.annotationValue[0]) as AnnotationValue;
    return { key, value };
  }

  typeReference(ctx: Record<string, CstNode[]>): TypeRef {
    if (ctx.builtinType) {
      return this.visit(ctx.builtinType[0]) as BuiltinTypeRef;
    }
    return this.visit(ctx.namedType[0]) as NamedTypeRef;
  }

  builtinType(ctx: Record<string, CstNode[] | IToken[]>): BuiltinTypeRef {
    const name = this.visit((ctx.cdsName as CstNode[])[0]) as string;
    const numberTokens = ctx.NumberLiteral as IToken[] | undefined;
    const length = numberTokens?.[0]
      ? parseInt(numberTokens[0].image, 10)
      : undefined;
    const decimals = numberTokens?.[1]
      ? parseInt(numberTokens[1].image, 10)
      : undefined;
    return { kind: 'builtin', name, length, decimals };
  }

  namedType(ctx: Record<string, CstNode[]>): NamedTypeRef {
    const name = this.visit(ctx.qualifiedName[0]) as string;
    return { kind: 'named', name };
  }

  cdsName(ctx: Record<string, IToken[]>): string {
    // Return the image of whichever token matched
    const token =
      ctx.Identifier?.[0] ??
      ctx.Table?.[0] ??
      ctx.Structure?.[0] ??
      ctx.Type?.[0] ??
      ctx.Service?.[0] ??
      ctx.Entity?.[0] ??
      ctx.Key?.[0] ??
      ctx.Expose?.[0] ??
      ctx.View?.[0] ??
      ctx.From?.[0] ??
      ctx.Where?.[0];
    return token?.image ?? '';
  }

  qualifiedName(ctx: Record<string, CstNode[]>): string {
    return (ctx.cdsName ?? [])
      .map((node) => this.visit(node) as string)
      .join('.');
  }
}

/** Singleton visitor instance */
export const cdsVisitor = new CdsVisitor();
