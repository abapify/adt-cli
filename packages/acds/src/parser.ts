/**
 * Chevrotain CstParser for ABAP CDS
 *
 * Phase 1: table, structure, simpleType, service, metadataExtension
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
  Identifier,
  StringLiteral,
  NumberLiteral,
  EnumLiteral,
  View,
  From,
  Join,
  On,
  Inner,
  Outer,
  Left,
  // Association,
  // Cardinality,
  Where,
  GroupBy,
  OrderBy,
  // Ascending removed - matches "as" prefix
  Descending,
  // Union,
  Distinct,
} from './tokens';

export class CdsParser extends CstParser {
  constructor() {
    super(allTokens, {
      recoveryEnabled: true,
      maxLookahead: 3,
    });
    this.performSelfAnalysis();
  }

  // ============================================
  // Root rule
  // ============================================

  public sourceFile = this.RULE('sourceFile', () => {
    this.MANY(() => {
      this.SUBRULE(this.topLevelAnnotation);
    });
    this.SUBRULE(this.definition);
  });

  // ============================================
  // Top-level definition dispatch
  // ============================================

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
      { ALT: () => this.SUBRULE(this.simpleTypeDefinition) },
      { ALT: () => this.SUBRULE(this.serviceDefinition) },
      { ALT: () => this.SUBRULE(this.viewEntityDefinition) },
    ]);
  });

  // ============================================
  // Table definition
  // ============================================

  private tableDefinition = this.RULE('tableDefinition', () => {
    this.CONSUME(Table);
    this.SUBRULE(this.cdsName);
    this.CONSUME(LBrace);
    this.MANY(() => {
      this.SUBRULE(this.tableMember);
    });
    this.CONSUME(RBrace);
  });

  // ============================================
  // Structure definition
  // ============================================

  private structureDefinition = this.RULE('structureDefinition', () => {
    this.CONSUME(Structure);
    this.SUBRULE(this.cdsName);
    this.CONSUME(LBrace);
    this.MANY(() => {
      this.SUBRULE(this.tableMember);
    });
    this.CONSUME(RBrace);
  });

  // ============================================
  // Table/structure members
  // ============================================

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

  // ============================================
  // Simple type definition
  // ============================================

  private simpleTypeDefinition = this.RULE('simpleTypeDefinition', () => {
    this.CONSUME(Type);
    this.SUBRULE(this.cdsName);
    this.CONSUME(Colon);
    this.SUBRULE(this.typeReference);
    this.CONSUME(Semicolon);
  });

  // ============================================
  // Service definition
  // ============================================

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

  // ============================================
  // View Entity definition (DDLS - RAP)
  // ============================================

  private viewEntityDefinition = this.RULE('viewEntityDefinition', () => {
    this.CONSUME(View);
    this.CONSUME(Entity);
    this.SUBRULE(this.cdsName);
    this.CONSUME(As);
    this.CONSUME(From);
    this.SUBRULE2(this.dataSource);
    this.MANY(() => {
      this.SUBRULE(this.joinClause);
    });
    this.CONSUME(LBrace);
    this.MANY2(() => {
      this.SUBRULE(this.projectionField);
    });
    this.CONSUME(RBrace);
    this.OPTION(() => {
      this.CONSUME(Where);
      this.SUBRULE(this.whereCondition);
    });
    this.OPTION2(() => {
      this.CONSUME(GroupBy);
      this.MANY_SEP({
        SEP: Comma,
        DEF: () => {
          this.SUBRULE2(this.cdsName);
        },
      });
    });
    this.OPTION3(() => {
      this.CONSUME(OrderBy);
      this.MANY_SEP2({
        SEP: Comma,
        DEF: () => {
          this.SUBRULE(this.orderByItem);
        },
      });
    });
    this.OPTION4(() => {
      this.CONSUME(Distinct);
    });
  });

  private dataSource = this.RULE('dataSource', () => {
    this.SUBRULE(this.cdsName);
    this.OPTION(() => {
      this.CONSUME(As);
      this.SUBRULE2(this.cdsName);
    });
  });

  private joinClause = this.RULE('joinClause', () => {
    this.OR([
      { ALT: () => this.CONSUME(Inner) },
      { ALT: () => this.CONSUME(Left) },
    ]);
    this.OR2([
      { ALT: () => this.CONSUME(Join) },
      { ALT: () => this.CONSUME(Outer) },
    ]);
    this.SUBRULE(this.dataSource);
    this.CONSUME(On);
    this.CONSUME(LBrace);
    this.MANY_SEP({
      SEP: Comma,
      DEF: () => {
        this.SUBRULE(this.joinCondition);
      },
    });
    this.CONSUME(RBrace);
  });

  private joinCondition = this.RULE('joinCondition', () => {
    this.SUBRULE(this.cdsName);
    this.CONSUME(Dot);
    this.SUBRULE2(this.cdsName);
    this.CONSUME(Colon);
    this.SUBRULE3(this.cdsName);
    this.CONSUME2(Dot);
    this.SUBRULE4(this.cdsName);
  });

  private projectionField = this.RULE('projectionField', () => {
    this.MANY(() => {
      this.SUBRULE(this.annotation);
    });
    this.SUBRULE(this.cdsName);
    this.OPTION(() => {
      this.CONSUME(As);
      this.SUBRULE2(this.cdsName);
    });
    this.CONSUME(Semicolon);
  });

  private whereCondition = this.RULE('whereCondition', () => {
    this.MANY(() => {
      this.SUBRULE(this.cdsName);
      this.CONSUME(Dot);
    });
  });

  private orderByItem = this.RULE('orderByItem', () => {
    this.SUBRULE(this.cdsName);
    this.OPTION(() => {
      this.CONSUME(Descending);
    });
  });

  // ============================================
  // Metadata extension (annotate entity ... with { ... })
  // ============================================

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

  // ============================================
  // Annotations
  // ============================================

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

  // ============================================
  // Type references
  // ============================================

  private typeReference = this.RULE('typeReference', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.builtinType) },
      { ALT: () => this.SUBRULE(this.namedType) },
    ]);
  });

  /** abap.char(10) or abap.dec(11,2) */
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

  // ============================================
  // Name helpers
  // ============================================

  /** An identifier that may also be a keyword used as a name */
  private cdsName = this.RULE('cdsName', () => {
    this.OR([
      { ALT: () => this.CONSUME(Identifier) },
      // Keywords that can appear as names in certain contexts
      { ALT: () => this.CONSUME(Table) },
      { ALT: () => this.CONSUME(Structure) },
      { ALT: () => this.CONSUME(Type) },
      { ALT: () => this.CONSUME(Service) },
      { ALT: () => this.CONSUME(Entity) },
      { ALT: () => this.CONSUME(Key) },
      { ALT: () => this.CONSUME(Expose) },
      { ALT: () => this.CONSUME(View) },
      { ALT: () => this.CONSUME(From) },
      { ALT: () => this.CONSUME(Where) },
      { ALT: () => this.CONSUME(GroupBy) },
      { ALT: () => this.CONSUME(OrderBy) },
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
