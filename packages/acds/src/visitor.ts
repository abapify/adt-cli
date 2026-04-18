/**
 * CST → AST Visitor
 *
 * Transforms Chevrotain's Concrete Syntax Tree into our typed AST.
 */
import type { CstNode, IToken } from 'chevrotain';
import { cdsParser } from './parser';
import type {
  AbstractEntityDefinition,
  Annotation,
  AnnotationValue,
  AnnotationProperty,
  AnnotatedElement,
  AssociationDeclaration,
  AssociationKind,
  BuiltinTypeRef,
  Cardinality,
  CdsDefinition,
  CdsSourceFile,
  CustomEntityDefinition,
  DataSource,
  DataSourceKind,
  Expression,
  ExposeStatement,
  FieldDefinition,
  GrantStatement,
  IncludeDirective,
  MetadataExtension,
  NamedTypeRef,
  ParameterDefinition,
  RoleDefinition,
  ServiceDefinition,
  SimpleTypeDefinition,
  StructureDefinition,
  TableDefinition,
  TableMember,
  TypeRef,
  ViewElement,
  ViewEntityDefinition,
  ViewMember,
} from './ast';

// Generate the base visitor class from the parser's grammar
const BaseCstVisitor = cdsParser.getBaseCstVisitorConstructor<
  unknown,
  unknown
>();

type Ctx = Record<string, CstNode[] | IToken[] | undefined>;

function asNodes(v: CstNode[] | IToken[] | undefined): CstNode[] {
  return (v as CstNode[]) ?? [];
}

function asTokens(v: CstNode[] | IToken[] | undefined): IToken[] {
  return (v as IToken[]) ?? [];
}

function collectTokenImages(node: CstNode | undefined): IToken[] {
  if (!node) return [];
  const out: IToken[] = [];
  const walk = (n: CstNode) => {
    for (const children of Object.values(n.children)) {
      for (const child of children) {
        if ('tokenType' in child) {
          out.push(child as IToken);
        } else {
          walk(child as CstNode);
        }
      }
    }
  };
  walk(node);
  out.sort((a, b) => (a.startOffset ?? 0) - (b.startOffset ?? 0));
  return out;
}

function toExpression(node: CstNode | undefined): Expression {
  const toks = collectTokenImages(node);
  return {
    source: toks.map((t) => t.image).join(' '),
    tokens: toks.map((t) => t.image),
  };
}

export class CdsVisitor extends BaseCstVisitor {
  constructor() {
    super();
    this.validateVisitor();
  }

  sourceFile(ctx: Ctx): CdsSourceFile {
    const annotations: Annotation[] = asNodes(ctx.topLevelAnnotation).map(
      (node) => this.visit(node) as Annotation,
    );
    const def = this.visit(asNodes(ctx.definition)[0]) as CdsDefinition;

    // Attach top-level annotations to the definition
    if ('annotations' in def) {
      (def as { annotations: Annotation[] }).annotations = [
        ...annotations,
        ...(def as { annotations: Annotation[] }).annotations,
      ];
    }

    return { definitions: [def] };
  }

  definition(ctx: Ctx): CdsDefinition {
    if (ctx.defineStatement) {
      return this.visit(asNodes(ctx.defineStatement)[0]) as CdsDefinition;
    }
    return this.visit(asNodes(ctx.annotateStatement)[0]) as CdsDefinition;
  }

  defineStatement(ctx: Ctx): CdsDefinition {
    const dispatch: Array<[string, undefined | CstNode]> = [
      ['tableDefinition', asNodes(ctx.tableDefinition)[0]],
      ['structureDefinition', asNodes(ctx.structureDefinition)[0]],
      ['viewEntityDefinition', asNodes(ctx.viewEntityDefinition)[0]],
      ['abstractEntityDefinition', asNodes(ctx.abstractEntityDefinition)[0]],
      ['customEntityDefinition', asNodes(ctx.customEntityDefinition)[0]],
      ['simpleTypeDefinition', asNodes(ctx.simpleTypeDefinition)[0]],
      ['serviceDefinition', asNodes(ctx.serviceDefinition)[0]],
      ['roleDefinition', asNodes(ctx.roleDefinition)[0]],
    ];
    for (const [, node] of dispatch) {
      if (node) return this.visit(node) as CdsDefinition;
    }
    // should not happen
    return { kind: 'table', name: '', annotations: [], members: [] };
  }

  tableDefinition(ctx: Ctx): TableDefinition {
    const name = this.visit(asNodes(ctx.cdsName)[0]) as string;
    const members = asNodes(ctx.tableMember).map(
      (node) => this.visit(node) as TableMember,
    );
    return { kind: 'table', name, annotations: [], members };
  }

  structureDefinition(ctx: Ctx): StructureDefinition {
    const name = this.visit(asNodes(ctx.cdsName)[0]) as string;
    const members = asNodes(ctx.tableMember).map(
      (node) => this.visit(node) as TableMember,
    );
    return { kind: 'structure', name, annotations: [], members };
  }

  // ---- View entities ----------------------------------------

  viewEntityDefinition(ctx: Ctx): ViewEntityDefinition {
    const name = this.visit(asNodes(ctx.cdsName)[0]) as string;
    const parameters = ctx.parametersClause
      ? (this.visit(asNodes(ctx.parametersClause)[0]) as ParameterDefinition[])
      : [];

    let sourceKind: DataSourceKind = 'select';
    let source: DataSource = { name: '' };
    if (ctx.selectFromClause) {
      sourceKind = 'select';
      source = this.visit(asNodes(ctx.selectFromClause)[0]) as DataSource;
    } else if (ctx.projectionOnClause) {
      sourceKind = 'projection';
      source = this.visit(asNodes(ctx.projectionOnClause)[0]) as DataSource;
    }

    const members = ctx.elementList
      ? (this.visit(asNodes(ctx.elementList)[0]) as ViewMember[])
      : [];

    const where = ctx.expression
      ? toExpression(asNodes(ctx.expression)[0])
      : undefined;

    return {
      kind: 'viewEntity',
      name,
      annotations: [],
      sourceKind,
      source,
      parameters,
      members,
      ...(where && { where }),
    };
  }

  abstractEntityDefinition(ctx: Ctx): AbstractEntityDefinition {
    const name = this.visit(asNodes(ctx.cdsName)[0]) as string;
    const parameters = ctx.parametersClause
      ? (this.visit(asNodes(ctx.parametersClause)[0]) as ParameterDefinition[])
      : [];
    const members = this.visit(asNodes(ctx.elementList)[0]) as ViewMember[];
    return {
      kind: 'abstractEntity',
      name,
      annotations: [],
      parameters,
      members,
    };
  }

  customEntityDefinition(ctx: Ctx): CustomEntityDefinition {
    const name = this.visit(asNodes(ctx.cdsName)[0]) as string;
    const parameters = ctx.parametersClause
      ? (this.visit(asNodes(ctx.parametersClause)[0]) as ParameterDefinition[])
      : [];
    const members = this.visit(asNodes(ctx.elementList)[0]) as ViewMember[];
    return {
      kind: 'customEntity',
      name,
      annotations: [],
      parameters,
      members,
    };
  }

  selectFromClause(ctx: Ctx): DataSource {
    return this.visit(asNodes(ctx.dataSource)[0]) as DataSource;
  }

  projectionOnClause(ctx: Ctx): DataSource {
    return this.visit(asNodes(ctx.dataSource)[0]) as DataSource;
  }

  dataSource(ctx: Ctx): DataSource {
    const name = this.visit(asNodes(ctx.qualifiedName)[0]) as string;
    const aliasNode = asNodes(ctx.cdsName)[0];
    const alias = aliasNode ? (this.visit(aliasNode) as string) : undefined;
    return { name, ...(alias && { alias }) };
  }

  elementList(ctx: Ctx): ViewMember[] {
    return asNodes(ctx.elementMember).map(
      (node) => this.visit(node) as ViewMember,
    );
  }

  elementMember(ctx: Ctx): ViewMember {
    const annotations = asNodes(ctx.annotation).map(
      (n) => this.visit(n) as Annotation,
    );
    if (ctx.associationTail) {
      const decl = this.visit(
        asNodes(ctx.associationTail)[0],
      ) as AssociationDeclaration;
      decl.annotations = annotations;
      return decl;
    }
    const el = this.visit(asNodes(ctx.viewElementTail)[0]) as ViewElement;
    el.annotations = annotations;
    return el;
  }

  viewElementTail(ctx: Ctx): ViewElement {
    const isKey = !!asTokens(ctx.Key).length;
    const isVirtual = !!asTokens(ctx.Virtual).length;
    const isRedirected = !!asTokens(ctx.Redirected).length;

    if (ctx.typedFieldTail) {
      const tail = this.visit(asNodes(ctx.typedFieldTail)[0]) as {
        name: string;
        type: TypeRef;
        notNull: boolean;
      };
      return {
        annotations: [],
        isKey,
        isVirtual,
        isRedirected,
        expression: tail.name,
        type: tail.type,
        notNull: tail.notNull,
      };
    }
    const proj = this.visit(asNodes(ctx.projectionExpression)[0]) as {
      expression: string;
      alias?: string;
    };
    return {
      annotations: [],
      isKey,
      isVirtual,
      isRedirected,
      expression: proj.expression,
      ...(proj.alias && { alias: proj.alias }),
    };
  }

  typedFieldTail(ctx: Ctx): {
    name: string;
    type: TypeRef;
    notNull: boolean;
  } {
    const name = this.visit(asNodes(ctx.cdsName)[0]) as string;
    const type = this.visit(asNodes(ctx.typeReference)[0]) as TypeRef;
    const notNull = !!asTokens(ctx.Not).length;
    return { name, type, notNull };
  }

  projectionExpression(ctx: Ctx): { expression: string; alias?: string } {
    const expression = this.visit(asNodes(ctx.qualifiedName)[0]) as string;
    const aliasNode = asNodes(ctx.cdsName)[0];
    const alias = aliasNode ? (this.visit(aliasNode) as string) : undefined;
    return { expression, ...(alias && { alias }) };
  }

  // ---- Associations -----------------------------------------

  associationTail(ctx: Ctx): AssociationDeclaration {
    const associationKind: AssociationKind = asTokens(ctx.Association).length
      ? 'association'
      : 'composition';

    const cardinality = ctx.cardinality
      ? (this.visit(asNodes(ctx.cardinality)[0]) as Cardinality)
      : undefined;

    let targetMultiplicity: 'many' | 'one' | undefined;
    if (asTokens(ctx.Many).length) targetMultiplicity = 'many';
    else if (asTokens(ctx.One).length) targetMultiplicity = 'one';

    const redirected = !!asTokens(ctx.Redirected).length;

    const target = this.visit(asNodes(ctx.qualifiedName)[0]) as string;
    const aliasNode = asNodes(ctx.cdsName)[0];
    const alias = aliasNode ? (this.visit(aliasNode) as string) : undefined;
    const on = ctx.expression
      ? toExpression(asNodes(ctx.expression)[0])
      : undefined;

    return {
      kind: 'association',
      associationKind,
      annotations: [], // populated by elementMember()
      ...(cardinality && { cardinality }),
      ...(targetMultiplicity && { targetMultiplicity }),
      target,
      ...(redirected && { redirected: true }),
      ...(alias && { alias }),
      ...(on && { on }),
    };
  }

  cardinality(ctx: Ctx): Cardinality {
    const nums = asTokens(ctx.NumberLiteral);
    const stars = asTokens(ctx.Star);
    if (nums.length === 0 && stars.length >= 1) {
      // `[*]`
      return { max: '*' };
    }
    if (nums.length === 1) {
      const dotCount = asTokens(ctx.Dot).length;
      if (dotCount === 0) {
        return { max: parseInt(nums[0].image, 10) };
      }
      // `[N..*]`  (Star present as second operand) or `[N..M]` (handled below)
      if (stars.length >= 1) {
        return { min: parseInt(nums[0].image, 10), max: '*' };
      }
      // Fallback — shouldn't happen if grammar is consistent.
      return { min: parseInt(nums[0].image, 10), max: '*' };
    }
    if (nums.length === 2) {
      return {
        min: parseInt(nums[0].image, 10),
        max: parseInt(nums[1].image, 10),
      };
    }
    return { max: '*' };
  }

  // ---- Parameters -------------------------------------------

  parametersClause(ctx: Ctx): ParameterDefinition[] {
    return asNodes(ctx.parameterDefinition).map(
      (n) => this.visit(n) as ParameterDefinition,
    );
  }

  parameterDefinition(ctx: Ctx): ParameterDefinition {
    const annotations = asNodes(ctx.annotation).map(
      (n) => this.visit(n) as Annotation,
    );
    const name = this.visit(asNodes(ctx.cdsName)[0]) as string;
    const type = this.visit(asNodes(ctx.typeReference)[0]) as TypeRef;
    const defaultValue = ctx.literal
      ? (this.visit(asNodes(ctx.literal)[0]) as AnnotationValue)
      : undefined;
    return {
      annotations,
      name,
      type,
      ...(defaultValue && { defaultValue }),
    };
  }

  // ---- Tables / structures ----------------------------------

  tableMember(ctx: Ctx): TableMember {
    if (ctx.includeDirective) {
      return this.visit(asNodes(ctx.includeDirective)[0]) as IncludeDirective;
    }
    return this.visit(asNodes(ctx.fieldDefinition)[0]) as FieldDefinition;
  }

  includeDirective(ctx: Ctx): IncludeDirective {
    const name = this.visit(asNodes(ctx.cdsName)[0]) as string;
    const suffix = asNodes(ctx.cdsName)[1]
      ? (this.visit(asNodes(ctx.cdsName)[1]) as string)
      : undefined;
    return { kind: 'include', name, ...(suffix !== undefined && { suffix }) };
  }

  fieldDefinition(ctx: Ctx): FieldDefinition {
    const annotations: Annotation[] = asNodes(ctx.annotation).map(
      (node) => this.visit(node) as Annotation,
    );
    const isKey = !!asTokens(ctx.Key).length;
    const name = this.visit(asNodes(ctx.cdsName)[0]) as string;
    const type = this.visit(asNodes(ctx.typeReference)[0]) as TypeRef;
    const notNull = !!asTokens(ctx.Not).length;
    return { annotations, name, type, isKey, notNull };
  }

  simpleTypeDefinition(ctx: Ctx): SimpleTypeDefinition {
    const name = this.visit(asNodes(ctx.cdsName)[0]) as string;
    const type = this.visit(asNodes(ctx.typeReference)[0]) as TypeRef;
    return { kind: 'simpleType', name, annotations: [], type };
  }

  serviceDefinition(ctx: Ctx): ServiceDefinition {
    const name = this.visit(asNodes(ctx.cdsName)[0]) as string;
    const exposes = asNodes(ctx.exposeStatement).map(
      (node) => this.visit(node) as ExposeStatement,
    );
    return { kind: 'service', name, annotations: [], exposes };
  }

  exposeStatement(ctx: Ctx): ExposeStatement {
    const names = asNodes(ctx.cdsName).map((n) => this.visit(n) as string);
    const entity = names[0];
    const alias = names.length > 1 ? names[1] : undefined;
    return { entity, ...(alias && { alias }) };
  }

  // ---- DCL / roles ------------------------------------------

  roleDefinition(ctx: Ctx): RoleDefinition {
    const name = this.visit(asNodes(ctx.cdsName)[0]) as string;
    const grants = asNodes(ctx.grantStatement).map(
      (n) => this.visit(n) as GrantStatement,
    );
    return { kind: 'role', name, annotations: [], grants };
  }

  grantStatement(ctx: Ctx): GrantStatement {
    const entity = this.visit(asNodes(ctx.qualifiedName)[0]) as string;
    const where = ctx.expression
      ? toExpression(asNodes(ctx.expression)[0])
      : undefined;
    return { privilege: 'select', entity, ...(where && { where }) };
  }

  // ---- Metadata extensions ----------------------------------

  annotateStatement(ctx: Ctx): MetadataExtension {
    const entity = this.visit(asNodes(ctx.cdsName)[0]) as string;
    const elements = asNodes(ctx.annotatedElement).map(
      (node) => this.visit(node) as AnnotatedElement,
    );
    return { kind: 'metadataExtension', entity, annotations: [], elements };
  }

  annotatedElement(ctx: Ctx): AnnotatedElement {
    const annotations = asNodes(ctx.annotation).map(
      (node) => this.visit(node) as Annotation,
    );
    const name = this.visit(asNodes(ctx.cdsName)[0]) as string;
    return { annotations, name };
  }

  // ---- Annotations ------------------------------------------

  topLevelAnnotation(ctx: Ctx): Annotation {
    return this.visit(asNodes(ctx.annotation)[0]) as Annotation;
  }

  annotation(ctx: Ctx): Annotation {
    const key = this.visit(asNodes(ctx.dottedName)[0]) as string;
    const value: AnnotationValue = ctx.annotationValue
      ? (this.visit(asNodes(ctx.annotationValue)[0]) as AnnotationValue)
      : { kind: 'boolean', value: true };
    return { key, value };
  }

  dottedName(ctx: Ctx): string {
    return asNodes(ctx.cdsName)
      .map((node) => this.visit(node) as string)
      .join('.');
  }

  annotationValue(ctx: Ctx): AnnotationValue {
    if (ctx.StringLiteral) {
      const raw = asTokens(ctx.StringLiteral)[0].image;
      return { kind: 'string', value: raw.slice(1, -1) };
    }
    if (ctx.EnumLiteral) {
      const raw = asTokens(ctx.EnumLiteral)[0].image;
      return { kind: 'enum', value: raw.slice(1) };
    }
    if (ctx.True) return { kind: 'boolean', value: true };
    if (ctx.False) return { kind: 'boolean', value: false };
    if (ctx.NumberLiteral) {
      return {
        kind: 'number',
        value: parseFloat(asTokens(ctx.NumberLiteral)[0].image),
      };
    }
    if (ctx.annotationArray) {
      return this.visit(asNodes(ctx.annotationArray)[0]) as AnnotationValue;
    }
    return this.visit(asNodes(ctx.annotationObject)[0]) as AnnotationValue;
  }

  annotationArray(ctx: Ctx): AnnotationValue {
    const items = asNodes(ctx.annotationValue).map(
      (node) => this.visit(node) as AnnotationValue,
    );
    return { kind: 'array', items };
  }

  annotationObject(ctx: Ctx): AnnotationValue {
    const properties = asNodes(ctx.annotationProperty).map(
      (node) => this.visit(node) as AnnotationProperty,
    );
    return { kind: 'object', properties };
  }

  annotationProperty(ctx: Ctx): AnnotationProperty {
    const key = this.visit(asNodes(ctx.dottedName)[0]) as string;
    const value = this.visit(
      asNodes(ctx.annotationValue)[0],
    ) as AnnotationValue;
    return { key, value };
  }

  // ---- Literals ---------------------------------------------

  literal(ctx: Ctx): AnnotationValue {
    if (ctx.StringLiteral) {
      const raw = asTokens(ctx.StringLiteral)[0].image;
      return { kind: 'string', value: raw.slice(1, -1) };
    }
    if (ctx.EnumLiteral) {
      const raw = asTokens(ctx.EnumLiteral)[0].image;
      return { kind: 'enum', value: raw.slice(1) };
    }
    if (ctx.True) return { kind: 'boolean', value: true };
    if (ctx.False) return { kind: 'boolean', value: false };
    return {
      kind: 'number',
      value: parseFloat(asTokens(ctx.NumberLiteral)[0].image),
    };
  }

  // ---- Expressions (opaque) ---------------------------------

  expression(): unknown {
    // Visitor never called directly — expressions are captured via
    // `toExpression()` on the raw CstNode to keep them opaque.
    return null;
  }

  comparison(): unknown {
    return null;
  }

  operand(): unknown {
    return null;
  }

  // ---- Type references --------------------------------------

  typeReference(ctx: Ctx): TypeRef {
    if (ctx.builtinType) {
      return this.visit(asNodes(ctx.builtinType)[0]) as BuiltinTypeRef;
    }
    return this.visit(asNodes(ctx.namedType)[0]) as NamedTypeRef;
  }

  builtinType(ctx: Ctx): BuiltinTypeRef {
    const name = this.visit(asNodes(ctx.cdsName)[0]) as string;
    const numberTokens = asTokens(ctx.NumberLiteral);
    const length = numberTokens[0]
      ? parseInt(numberTokens[0].image, 10)
      : undefined;
    const decimals = numberTokens[1]
      ? parseInt(numberTokens[1].image, 10)
      : undefined;
    return { kind: 'builtin', name, length, decimals };
  }

  namedType(ctx: Ctx): NamedTypeRef {
    const name = this.visit(asNodes(ctx.qualifiedName)[0]) as string;
    return { kind: 'named', name };
  }

  cdsName(ctx: Ctx): string {
    const t = ctx as Record<string, IToken[] | undefined>;
    // cdsName accepts many keyword tokens as names — return the image of
    // whichever token matched (only one key in `ctx` will be populated).
    for (const key of Object.keys(t)) {
      const tok = t[key]?.[0];
      if (tok && 'image' in tok) return tok.image;
    }
    return '';
  }

  qualifiedName(ctx: Ctx): string {
    return asNodes(ctx.cdsName)
      .map((node) => this.visit(node) as string)
      .join('.');
  }
}

/** Singleton visitor instance */
export const cdsVisitor = new CdsVisitor();
