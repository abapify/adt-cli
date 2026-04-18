/**
 * Chevrotain CstParser for ABAP CDS.
 *
 * Grammar coverage (see src/lib/grammar/*.ts for the per-topic index):
 *   - DDL  : table, structure, simple type, view entity, projection view,
 *            abstract/custom entity
 *   - DCL  : role definitions (grant select on ... where ...)
 *   - DDLX : metadata extensions (`annotate entity ... with { ... }`)
 *   - SRVD : service definitions (`define service ... { expose ...; }`)
 *   - Elements / associations / parameters / annotations
 *
 * Rules are kept in this single class (Chevrotain requirement). Logical
 * groupings are delimited with section banners and documented in
 * `src/lib/grammar/`.
 */
import { CstParser } from 'chevrotain';
import {
  allTokens,
  At,
  Colon,
  Semicolon,
  Dot,
  Comma,
  LBrace,
  RBrace,
  LParen,
  RParen,
  LBracket,
  RBracket,
  Define,
  Table,
  Structure,
  Type,
  Service,
  Expose,
  Annotate,
  Entity,
  With,
  Key,
  Not,
  Null,
  As,
  Include,
  Suffix,
  True,
  False,
  Abap,
  View,
  Projection,
  Select,
  From,
  On,
  Association,
  Composition,
  To,
  Many,
  One,
  Of,
  Parameters,
  Role,
  Grant,
  Where,
  Abstract,
  Custom,
  Virtual,
  Redirected,
  Default,
  And,
  Or,
  Identifier,
  StringLiteral,
  NumberLiteral,
  EnumLiteral,
  EqEq,
  Eq,
  NotEq,
  LtEq,
  GtEq,
  Lt,
  Gt,
  Star,
} from './tokens';

export class CdsParser extends CstParser {
  constructor() {
    super(allTokens, {
      recoveryEnabled: true,
      maxLookahead: 4,
    });
    this.performSelfAnalysis();
  }

  // ============================================================
  // Root rule
  // ============================================================

  public sourceFile = this.RULE('sourceFile', () => {
    this.MANY(() => {
      this.SUBRULE(this.topLevelAnnotation);
    });
    this.SUBRULE(this.definition);
  });

  // ============================================================
  // Top-level definition dispatch
  // ============================================================

  private definition = this.RULE('definition', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.defineStatement) },
      { ALT: () => this.SUBRULE(this.annotateStatement) },
    ]);
  });

  private defineStatement = this.RULE('defineStatement', () => {
    this.CONSUME(Define);
    this.OR([
      { ALT: () => this.SUBRULE(this.tableDefinition) },
      { ALT: () => this.SUBRULE(this.structureDefinition) },
      { ALT: () => this.SUBRULE(this.viewEntityDefinition) },
      { ALT: () => this.SUBRULE(this.abstractEntityDefinition) },
      { ALT: () => this.SUBRULE(this.customEntityDefinition) },
      { ALT: () => this.SUBRULE(this.simpleTypeDefinition) },
      { ALT: () => this.SUBRULE(this.serviceDefinition) },
      { ALT: () => this.SUBRULE(this.roleDefinition) },
    ]);
  });

  // ============================================================
  // Table definition
  // ============================================================

  private tableDefinition = this.RULE('tableDefinition', () => {
    this.CONSUME(Table);
    this.SUBRULE(this.cdsName);
    this.CONSUME(LBrace);
    this.MANY(() => {
      this.SUBRULE(this.tableMember);
    });
    this.CONSUME(RBrace);
  });

  // ============================================================
  // Structure definition
  // ============================================================

  private structureDefinition = this.RULE('structureDefinition', () => {
    this.CONSUME(Structure);
    this.SUBRULE(this.cdsName);
    this.CONSUME(LBrace);
    this.MANY(() => {
      this.SUBRULE(this.tableMember);
    });
    this.CONSUME(RBrace);
  });

  // ============================================================
  // View entity: `view entity <name> [with parameters ...] as select from ...`
  //                                                 or `as projection on ...`
  // ============================================================

  private viewEntityDefinition = this.RULE('viewEntityDefinition', () => {
    this.CONSUME(View);
    this.CONSUME(Entity);
    this.SUBRULE(this.cdsName);
    this.OPTION(() => {
      this.SUBRULE(this.parametersClause);
    });
    this.CONSUME(As);
    this.OR([
      { ALT: () => this.SUBRULE(this.selectFromClause) },
      { ALT: () => this.SUBRULE(this.projectionOnClause) },
    ]);
    this.OPTION2(() => {
      this.SUBRULE(this.elementList);
    });
    // optional where at top-level of view (consume expression if present)
    this.OPTION3(() => {
      this.CONSUME(Where);
      this.SUBRULE(this.expression);
    });
  });

  private abstractEntityDefinition = this.RULE(
    'abstractEntityDefinition',
    () => {
      this.CONSUME(Abstract);
      this.CONSUME(Entity);
      this.SUBRULE(this.cdsName);
      this.OPTION(() => {
        this.SUBRULE(this.parametersClause);
      });
      this.SUBRULE(this.elementList);
    },
  );

  private customEntityDefinition = this.RULE('customEntityDefinition', () => {
    this.CONSUME(Custom);
    this.CONSUME(Entity);
    this.SUBRULE(this.cdsName);
    this.OPTION(() => {
      this.SUBRULE(this.parametersClause);
    });
    this.SUBRULE(this.elementList);
  });

  private selectFromClause = this.RULE('selectFromClause', () => {
    this.CONSUME(Select);
    this.OPTION(() => {
      this.CONSUME(From);
    });
    // CDS allows either "select from X" (view entity syntax) or "select from X".
    // To stay permissive the `from` is optional above.
    this.SUBRULE(this.dataSource);
  });

  private projectionOnClause = this.RULE('projectionOnClause', () => {
    this.CONSUME(Projection);
    this.CONSUME(On);
    this.SUBRULE(this.dataSource);
  });

  private dataSource = this.RULE('dataSource', () => {
    this.SUBRULE(this.qualifiedName);
    this.OPTION(() => {
      this.OPTION2(() => this.CONSUME(As));
      this.SUBRULE(this.cdsName);
    });
  });

  // ============================================================
  // Element list: `{ [key] [virtual] <expr> [as <alias>] ; ... }`
  // ============================================================

  private elementList = this.RULE('elementList', () => {
    this.CONSUME(LBrace);
    this.MANY(() => {
      this.SUBRULE(this.elementMember);
    });
    this.CONSUME(RBrace);
  });

  private elementMember = this.RULE('elementMember', () => {
    // Annotations are shared between projection elements and associations to
    // keep the LL(k) grammar unambiguous. The branch decision is made on the
    // `association` / `composition` keyword (or the absence thereof).
    this.MANY(() => this.SUBRULE(this.annotation));
    this.OR([
      { ALT: () => this.SUBRULE(this.associationTail) },
      { ALT: () => this.SUBRULE(this.viewElementTail) },
    ]);
  });

  private viewElementTail = this.RULE('viewElementTail', () => {
    this.OPTION(() => this.CONSUME(Key));
    this.OPTION2(() => this.CONSUME(Virtual));
    this.OPTION3(() => this.CONSUME(Redirected));
    // Either a typed field `name : type` (valid for abstract/custom entities)
    // or a projection expression `expr [as alias]`.
    this.OR([
      {
        GATE: () => this.isTypedField(),
        ALT: () => this.SUBRULE(this.typedFieldTail),
      },
      { ALT: () => this.SUBRULE(this.projectionExpression) },
    ]);
    // Element terminator is optional for the trailing element.
    this.OPTION4(() => {
      this.OR2([
        { ALT: () => this.CONSUME(Semicolon) },
        { ALT: () => this.CONSUME(Comma) },
      ]);
    });
  });

  private typedFieldTail = this.RULE('typedFieldTail', () => {
    this.SUBRULE(this.cdsName);
    this.CONSUME(Colon);
    this.SUBRULE(this.typeReference);
    this.OPTION(() => {
      this.CONSUME(Not);
      this.CONSUME(Null);
    });
  });

  /**
   * projection expression:
   *    <qualified-name> [as <alias>]
   * Kept intentionally narrow — full SQL expression support is out of scope.
   */
  private projectionExpression = this.RULE('projectionExpression', () => {
    this.SUBRULE(this.qualifiedName);
    this.OPTION(() => {
      this.CONSUME(As);
      this.SUBRULE(this.cdsName);
    });
  });

  /** Cheap lookahead: `ident :` (optionally following `key`/`virtual`) → typed field. */
  private isTypedField(): boolean {
    // Look ahead: skip name token, expect Colon.
    // Both tokens should already be past the optional markers (handled by parser).
    const first = this.LA(1);
    const second = this.LA(2);
    if (!first || !second) return false;
    const isName = first.tokenType?.name === 'Identifier' || false;
    return isName && second.tokenType?.name === 'Colon';
  }

  // ============================================================
  // Associations
  //   association[<card>] [of many|one]? to <target> [as _<alias>]
  //     [on <expr>]
  // ============================================================

  private associationTail = this.RULE('associationTail', () => {
    this.OR([
      { ALT: () => this.CONSUME(Association) },
      { ALT: () => this.CONSUME(Composition) },
    ]);
    this.OPTION(() => this.SUBRULE(this.cardinality));
    // connector:  "to [redirected to]? <target>"  (associations)
    //          |  "of [many|one]? [to]? <target>" (compositions / explicit)
    this.OR2([
      {
        ALT: () => {
          this.CONSUME(To);
          this.OPTION2(() => {
            this.CONSUME(Redirected);
            this.CONSUME2(To);
          });
        },
      },
      {
        ALT: () => {
          this.CONSUME(Of);
          this.OPTION3(() => {
            this.OR3([
              { ALT: () => this.CONSUME(Many) },
              { ALT: () => this.CONSUME(One) },
            ]);
          });
          this.OPTION4(() => this.CONSUME3(To));
        },
      },
    ]);
    this.SUBRULE(this.qualifiedName);
    this.OPTION5(() => {
      this.CONSUME(As);
      this.SUBRULE(this.cdsName);
    });
    this.OPTION6(() => {
      this.CONSUME(On);
      this.SUBRULE(this.expression);
    });
    this.OPTION7(() => {
      this.OR4([
        { ALT: () => this.CONSUME(Semicolon) },
        { ALT: () => this.CONSUME(Comma) },
      ]);
    });
  });

  /** `[<lower>..<upper>]`, `[<n>]`, `[*]`, `[<lower>..*]` */
  private cardinality = this.RULE('cardinality', () => {
    this.CONSUME(LBracket);
    this.OR([
      { ALT: () => this.CONSUME(Star) },
      {
        ALT: () => {
          this.CONSUME(NumberLiteral);
          this.OPTION(() => {
            this.CONSUME(Dot);
            this.CONSUME2(Dot);
            this.OR2([
              { ALT: () => this.CONSUME2(NumberLiteral) },
              { ALT: () => this.CONSUME2(Star) },
            ]);
          });
        },
      },
    ]);
    this.CONSUME(RBracket);
  });

  // ============================================================
  // Parameters clause: `with parameters p1 : type, p2 : type`
  // ============================================================

  private parametersClause = this.RULE('parametersClause', () => {
    this.CONSUME(With);
    this.CONSUME(Parameters);
    this.SUBRULE(this.parameterDefinition);
    this.MANY(() => {
      this.CONSUME(Comma);
      this.SUBRULE2(this.parameterDefinition);
    });
  });

  private parameterDefinition = this.RULE('parameterDefinition', () => {
    this.MANY(() => this.SUBRULE(this.annotation));
    this.SUBRULE(this.cdsName);
    this.CONSUME(Colon);
    this.SUBRULE(this.typeReference);
    this.OPTION(() => {
      this.CONSUME(Default);
      this.SUBRULE(this.literal);
    });
  });

  // ============================================================
  // Simple type definition
  // ============================================================

  private simpleTypeDefinition = this.RULE('simpleTypeDefinition', () => {
    this.CONSUME(Type);
    this.SUBRULE(this.cdsName);
    this.CONSUME(Colon);
    this.SUBRULE(this.typeReference);
    this.CONSUME(Semicolon);
  });

  // ============================================================
  // Service definition
  // ============================================================

  private serviceDefinition = this.RULE('serviceDefinition', () => {
    this.CONSUME(Service);
    this.SUBRULE(this.cdsName);
    this.CONSUME(LBrace);
    this.MANY(() => {
      this.SUBRULE(this.exposeStatement);
    });
    this.CONSUME(RBrace);
  });

  private exposeStatement = this.RULE('exposeStatement', () => {
    this.CONSUME(Expose);
    this.SUBRULE(this.cdsName);
    this.OPTION(() => {
      this.CONSUME(As);
      this.SUBRULE2(this.cdsName);
    });
    this.CONSUME(Semicolon);
  });

  // ============================================================
  // DCL — `define role X { grant select on Y where cond; }`
  // ============================================================

  private roleDefinition = this.RULE('roleDefinition', () => {
    this.CONSUME(Role);
    this.SUBRULE(this.cdsName);
    this.CONSUME(LBrace);
    this.MANY(() => {
      this.SUBRULE(this.grantStatement);
    });
    this.CONSUME(RBrace);
  });

  private grantStatement = this.RULE('grantStatement', () => {
    this.CONSUME(Grant);
    this.CONSUME(Select);
    this.CONSUME(On);
    this.SUBRULE(this.qualifiedName);
    this.OPTION(() => {
      this.CONSUME(Where);
      this.SUBRULE(this.expression);
    });
    this.CONSUME(Semicolon);
  });

  // ============================================================
  // Table/structure members
  // ============================================================

  private tableMember = this.RULE('tableMember', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.includeDirective) },
      { ALT: () => this.SUBRULE(this.fieldDefinition) },
    ]);
  });

  private includeDirective = this.RULE('includeDirective', () => {
    this.CONSUME(Include);
    this.SUBRULE(this.cdsName);
    this.OPTION(() => {
      this.CONSUME(With);
      this.CONSUME(Suffix);
      this.SUBRULE2(this.cdsName);
    });
    this.CONSUME(Semicolon);
  });

  private fieldDefinition = this.RULE('fieldDefinition', () => {
    this.MANY(() => {
      this.SUBRULE(this.annotation);
    });
    this.OPTION(() => {
      this.CONSUME(Key);
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

  // ============================================================
  // Metadata extension (annotate entity ... with { ... })
  // ============================================================

  private annotateStatement = this.RULE('annotateStatement', () => {
    this.CONSUME(Annotate);
    this.CONSUME(Entity);
    this.SUBRULE(this.cdsName);
    this.CONSUME(With);
    this.CONSUME(LBrace);
    this.MANY(() => {
      this.SUBRULE(this.annotatedElement);
    });
    this.CONSUME(RBrace);
  });

  private annotatedElement = this.RULE('annotatedElement', () => {
    this.MANY(() => {
      this.SUBRULE(this.annotation);
    });
    this.SUBRULE(this.cdsName);
    this.CONSUME(Semicolon);
  });

  // ============================================================
  // Annotations
  // ============================================================

  private topLevelAnnotation = this.RULE('topLevelAnnotation', () => {
    this.SUBRULE(this.annotation);
  });

  private annotation = this.RULE('annotation', () => {
    this.CONSUME(At);
    this.SUBRULE(this.dottedName);
    this.OPTION(() => {
      this.CONSUME(Colon);
      this.SUBRULE(this.annotationValue);
    });
  });

  private dottedName = this.RULE('dottedName', () => {
    this.SUBRULE(this.cdsName);
    this.MANY(() => {
      this.CONSUME(Dot);
      this.SUBRULE2(this.cdsName);
    });
  });

  private annotationValue = this.RULE('annotationValue', () => {
    this.OR([
      { ALT: () => this.CONSUME(StringLiteral) },
      { ALT: () => this.CONSUME(EnumLiteral) },
      { ALT: () => this.CONSUME(True) },
      { ALT: () => this.CONSUME(False) },
      { ALT: () => this.CONSUME(NumberLiteral) },
      { ALT: () => this.SUBRULE(this.annotationArray) },
      { ALT: () => this.SUBRULE(this.annotationObject) },
    ]);
  });

  private annotationArray = this.RULE('annotationArray', () => {
    this.CONSUME(LBracket);
    this.MANY_SEP({
      SEP: Comma,
      DEF: () => {
        this.SUBRULE(this.annotationValue);
      },
    });
    this.CONSUME(RBracket);
  });

  private annotationObject = this.RULE('annotationObject', () => {
    this.CONSUME(LBrace);
    this.MANY_SEP({
      SEP: Comma,
      DEF: () => {
        this.SUBRULE(this.annotationProperty);
      },
    });
    this.CONSUME(RBrace);
  });

  private annotationProperty = this.RULE('annotationProperty', () => {
    this.SUBRULE(this.dottedName);
    this.CONSUME(Colon);
    this.SUBRULE(this.annotationValue);
  });

  // ============================================================
  // Literals
  // ============================================================

  private literal = this.RULE('literal', () => {
    this.OR([
      { ALT: () => this.CONSUME(StringLiteral) },
      { ALT: () => this.CONSUME(NumberLiteral) },
      { ALT: () => this.CONSUME(EnumLiteral) },
      { ALT: () => this.CONSUME(True) },
      { ALT: () => this.CONSUME(False) },
    ]);
  });

  // ============================================================
  // Expressions (narrow subset: operands + binary comparisons + AND/OR)
  // Used by `on` / `where` clauses. Expression trees are intentionally
  // kept opaque — consumers see a flat token list through the visitor.
  // ============================================================

  private expression = this.RULE('expression', () => {
    this.SUBRULE(this.comparison);
    this.MANY(() => {
      this.OR([
        { ALT: () => this.CONSUME(And) },
        { ALT: () => this.CONSUME(Or) },
      ]);
      this.SUBRULE2(this.comparison);
    });
  });

  private comparison = this.RULE('comparison', () => {
    this.SUBRULE(this.operand);
    this.OPTION(() => {
      this.OR([
        { ALT: () => this.CONSUME(EqEq) },
        { ALT: () => this.CONSUME(Eq) },
        { ALT: () => this.CONSUME(NotEq) },
        { ALT: () => this.CONSUME(LtEq) },
        { ALT: () => this.CONSUME(GtEq) },
        { ALT: () => this.CONSUME(Lt) },
        { ALT: () => this.CONSUME(Gt) },
      ]);
      this.SUBRULE2(this.operand);
    });
  });

  private operand = this.RULE('operand', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.literal) },
      { ALT: () => this.SUBRULE(this.qualifiedName) },
    ]);
  });

  // ============================================================
  // Type references
  // ============================================================

  private typeReference = this.RULE('typeReference', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.builtinType) },
      { ALT: () => this.SUBRULE(this.namedType) },
    ]);
  });

  /** `abap.char(10)` or `abap.dec(11,2)` */
  private builtinType = this.RULE('builtinType', () => {
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
  private namedType = this.RULE('namedType', () => {
    this.SUBRULE(this.qualifiedName);
  });

  // ============================================================
  // Name helpers
  // ============================================================

  /** An identifier that may also be a keyword used as a name. */
  private cdsName = this.RULE('cdsName', () => {
    this.OR([
      { ALT: () => this.CONSUME(Identifier) },
      // Keywords permitted as names (common CDS identifier collisions).
      { ALT: () => this.CONSUME(Table) },
      { ALT: () => this.CONSUME(Structure) },
      { ALT: () => this.CONSUME(Type) },
      { ALT: () => this.CONSUME(Service) },
      { ALT: () => this.CONSUME(Entity) },
      { ALT: () => this.CONSUME(Key) },
      { ALT: () => this.CONSUME(Expose) },
      { ALT: () => this.CONSUME(View) },
      { ALT: () => this.CONSUME(Role) },
      { ALT: () => this.CONSUME(Association) },
      { ALT: () => this.CONSUME(Composition) },
      { ALT: () => this.CONSUME(Abstract) },
      { ALT: () => this.CONSUME(Custom) },
      { ALT: () => this.CONSUME(Virtual) },
      { ALT: () => this.CONSUME(Redirected) },
      { ALT: () => this.CONSUME(Default) },
      { ALT: () => this.CONSUME(Parameters) },
      { ALT: () => this.CONSUME(Grant) },
      { ALT: () => this.CONSUME(Many) },
      { ALT: () => this.CONSUME(One) },
      { ALT: () => this.CONSUME(Of) },
      { ALT: () => this.CONSUME(Projection) },
      { ALT: () => this.CONSUME(Select) },
      { ALT: () => this.CONSUME(From) },
      { ALT: () => this.CONSUME(To) },
      { ALT: () => this.CONSUME(Where) },
    ]);
  });

  /** Dot-separated qualified name: foo.bar.baz */
  private qualifiedName = this.RULE('qualifiedName', () => {
    this.SUBRULE(this.cdsName);
    this.MANY(() => {
      this.CONSUME(Dot);
      this.SUBRULE2(this.cdsName);
    });
  });
}

/** Singleton parser instance (Chevrotain parsers are reusable) */
export const cdsParser = new CdsParser();
