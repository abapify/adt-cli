/**
 * Chevrotain CstParser for ABAP CDS.
 *
 * Grammar coverage (see src/lib/grammar/*.ts for the per-topic index):
 *   - DDL  : table, table entity, structure, simple type, view entity
 *            (select / projection, `root` / `writable`, provider contract),
 *            abstract/custom/external entity, service, hierarchy, aspect,
 *            table function, scalar function, annotation (DDLA), accesspolicy
 *   - DCL  : role definitions (grant select on ... where ..., inherit rules)
 *   - DDLX : metadata extensions (`annotate entity|view ... with { ... }`)
 *   - EXT  : `extend view [entity]`, `extend abstract|custom entity`
 *   - SRVD : service definitions (`define service ... { expose ...; }`)
 *   - Elements / associations / parameters / annotations / conditions
 *
 * Conditions (`on` / `where` / `having` / filters) are kept as opaque
 * `Expression { source, tokens }` nodes — the parser validates the grammar
 * shape but does not build an expression tree.
 *
 * Rules are kept in this single class (Chevrotain requirement). Logical
 * groupings are delimited with section banners and documented in
 * `src/lib/grammar/`.
 */
import { CstParser, EOF } from 'chevrotain';
import type { IToken, TokenType } from 'chevrotain';
import {
  allTokens,
  keywordTokens,
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
  Join,
  Inner,
  Left,
  Right,
  Cross,
  Full,
  Outer,
  And,
  Or,
  Distinct,
  Union,
  Intersect,
  Except,
  All,
  Group,
  By,
  Having,
  Root,
  Writable,
  Switchable,
  Exact,
  Parent,
  Parents,
  Child,
  Localized,
  Redefine,
  Redefinition,
  Filter,
  Bind,
  FunctionKeyword,
  Returns,
  Implemented,
  Method,
  Scalar,
  Hierarchy,
  Aspect,
  AnnotationKeyword,
  Extend,
  Accesspolicy,
  External,
  Provider,
  Contract,
  Name,
  Federated,
  Data,
  Provided,
  AtKeyword,
  Runtime,
  Case,
  When,
  Then,
  Else,
  End,
  Like,
  Between,
  In,
  Over,
  Partition,
  Siblings,
  Order,
  Start,
  Source,
  Directory,
  Period,
  Valid,
  Depth,
  Nodetype,
  Load,
  Multiple,
  Orphans,
  Cycles,
  Generate,
  Spantree,
  Cache,
  Bulk,
  Incremental,
  Leaves,
  Only,
  Allowed,
  Ascending,
  Descending,
  ErrorKeyword,
  Ignore,
  Breakup,
  Force,
  Off,
  For,
  Inherit,
  Inheriting,
  Conditions,
  Super,
  Combination,
  Mode,
  Optional,
  Elements,
  Identifier,
  NamespacedIdentifier,
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
  Plus,
  Minus,
  Slash,
  Dollar,
  FatArrow,
} from './tokens';

export class CdsParser extends CstParser {
  /**
   * All token types that may be used as a CDS name.
   *
   * Every keyword may legally appear as an identifier in CDS (`A.on`,
   * `type : abap.char(1)`, `as select`, …), so the name set is derived from
   * the keyword list in `tokens.ts`. The list is the single source of truth
   * for the `cdsName` rule and for the bare-alias rule — the latter removes
   * the FROM-region starters.
   */
  private static readonly NAME_TOKENS: readonly TokenType[] = [
    Identifier,
    NamespacedIdentifier,
    ...keywordTokens,
  ];

  private static readonly NAME_TOKEN_SET: ReadonlySet<TokenType> = new Set(
    CdsParser.NAME_TOKENS,
  );

  /** Comparison operators that end a parenthesized *operand*. */
  private static readonly COMPARISON_TOKEN_SET: ReadonlySet<TokenType> =
    new Set<TokenType>([
      Eq,
      EqEq,
      NotEq,
      Lt,
      LtEq,
      Gt,
      GtEq,
      Like,
      Between,
      In,
    ]);

  /** Paren depth delta for `matchingParen`. */
  private static readonly PAREN_DELTA: ReadonlyMap<TokenType, number> = new Map<
    TokenType,
    number
  >([
    [LParen, 1],
    [RParen, -1],
  ]);

  /** Bracket depth delta per token for the case-expression scan. */
  private static readonly DEPTH_DELTA: ReadonlyMap<TokenType, number> = new Map<
    TokenType,
    number
  >([
    [LParen, 1],
    [LBracket, 1],
    [RParen, -1],
    [RBracket, -1],
  ]);

  /** Tokens that mark a parenthesized group as a *condition*. */
  private static readonly CONDITION_MARKER_SET: ReadonlySet<TokenType> =
    new Set<TokenType>([
      Eq,
      EqEq,
      NotEq,
      Lt,
      LtEq,
      Gt,
      GtEq,
      Like,
      Between,
      In,
      And,
      Or,
      Not,
    ]);

  /**
   * Tokens that must not be read as a *bare* (implicit) source alias — they
   * start whatever may follow a data source in the FROM region (joins,
   * associations, aspect bindings, the `where`/`group by`/`having` clauses
   * and the set operators). An explicit `as <alias>` stays unrestricted.
   *
   * `one`/`many`/`exact`/`to` are excluded because they may start a join
   * cardinality (`many to one join`, `to one join`).
   */
  private static readonly FROM_REGION_STARTERS: ReadonlySet<TokenType> =
    new Set<TokenType>([
      Association,
      Composition,
      Join,
      Inner,
      Left,
      Right,
      Cross,
      Full,
      One,
      Many,
      Exact,
      To,
      Union,
      Intersect,
      Except,
      Group,
      Having,
      Where,
      On,
      As,
      And,
      Or,
      Not,
      By,
      Bind,
      Redefine,
    ]);

  /**
   * Tokens allowed inside a DCL `where` condition — everything except the
   * terminating semicolon. DCL conditions (literal / pfcg / aspect / user /
   * inherit / `if-then-else` / `void`) are captured opaquely.
   */
  private static readonly DCL_TOKENS: readonly TokenType[] = allTokens.filter(
    (t) =>
      ![
        'WhiteSpace',
        'LineComment',
        'BlockComment',
        'SqlLineComment',
        'Semicolon',
      ].includes(t.name),
  );

  /** Tokens allowed inside a `{ … }` free-form block (DDLA / accesspolicy). */
  private static readonly BLOCK_TOKENS: readonly TokenType[] = allTokens.filter(
    (t) =>
      ![
        'WhiteSpace',
        'LineComment',
        'BlockComment',
        'SqlLineComment',
        'LBrace',
        'RBrace',
      ].includes(t.name),
  );

  constructor() {
    super(allTokens, {
      recoveryEnabled: true,
      // LL(2) suffices: every deeper disambiguation (`entity` modifier,
      // `to parent` vs `to <card>`, typed fields, `cast`/`case`/`is`
      // forms, …) is resolved by an explicit GATE instead.
      maxLookahead: 2,
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

  private readonly definition = this.RULE('definition', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.defineStatement) },
      { ALT: () => this.SUBRULE(this.annotateStatement) },
      { ALT: () => this.SUBRULE(this.extendStatement) },
    ]);
  });

  private readonly defineStatement = this.RULE('defineStatement', () => {
    this.CONSUME(Define);
    this.OR([
      // `[root]` / `[writable]` prefixes — `root view entity`,
      // `root table entity`, `writable view entity`, `writable external entity`
      { ALT: () => this.SUBRULE(this.prefixedDefinition) },
      { ALT: () => this.SUBRULE(this.tableDefinition) },
      { ALT: () => this.SUBRULE(this.structureDefinition) },
      { ALT: () => this.SUBRULE(this.viewEntityDefinition) },
      { ALT: () => this.SUBRULE(this.abstractEntityDefinition) },
      { ALT: () => this.SUBRULE(this.customEntityDefinition) },
      { ALT: () => this.SUBRULE(this.simpleTypeDefinition) },
      { ALT: () => this.SUBRULE(this.serviceDefinition) },
      { ALT: () => this.SUBRULE(this.roleDefinition) },
      { ALT: () => this.SUBRULE(this.hierarchyDefinition) },
      { ALT: () => this.SUBRULE(this.aspectDefinition) },
      { ALT: () => this.SUBRULE(this.externalEntityDefinition) },
      { ALT: () => this.SUBRULE(this.scalarFunctionDefinition) },
      { ALT: () => this.SUBRULE(this.annotationDefinition) },
      { ALT: () => this.SUBRULE(this.accessPolicyDefinition) },
    ]);
  });

  /**
   * `define (writable|root)+ …` — view entities, external entities and root
   * table entities carry leading modifiers between `define` and the entity
   * keyword.
   */
  private readonly prefixedDefinition = this.RULE('prefixedDefinition', () => {
    this.AT_LEAST_ONE(() => {
      this.OR([
        { ALT: () => this.CONSUME(Writable) },
        { ALT: () => this.CONSUME(Root) },
      ]);
    });
    this.OR2([
      { ALT: () => this.SUBRULE(this.viewEntityDefinition) },
      { ALT: () => this.SUBRULE(this.externalEntityDefinition) },
      { ALT: () => this.SUBRULE(this.rootTableEntityDefinition) },
    ]);
  });

  /** `table entity <name> { … }` — reachable via `define [root] table entity`. */
  private readonly rootTableEntityDefinition = this.RULE(
    'rootTableEntityDefinition',
    () => {
      this.CONSUME(Table);
      this.CONSUME(Entity);
      this.SUBRULE(this.cdsName);
      this.CONSUME(LBrace);
      this.MANY(() => {
        this.SUBRULE(this.tableMember);
      });
      this.CONSUME(RBrace);
    },
  );

  // ============================================================
  // Table definition / table entity / table function
  //   define table <name> { … }
  //   define table entity <name> { … }
  //   define table function <name> … returns { … } implemented by method cls=>m
  // ============================================================

  private readonly tableDefinition = this.RULE('tableDefinition', () => {
    this.CONSUME(Table);
    this.OR([
      {
        // `table function` vs a table named `function`: only the function
        // form when a name follows (`table function f …`).
        GATE: () =>
          this.LA(1).tokenType === FunctionKeyword &&
          this.isNameToken(this.LA(2)),
        ALT: () => this.SUBRULE(this.tableFunctionTail),
      },
      {
        GATE: () =>
          this.LA(1).tokenType === Entity && this.isNameToken(this.LA(2)),
        ALT: () => {
          this.CONSUME(Entity);
          this.SUBRULE(this.cdsName);
          this.CONSUME(LBrace);
          this.MANY(() => {
            this.SUBRULE(this.tableMember);
          });
          this.CONSUME(RBrace);
        },
      },
      {
        ALT: () => {
          this.SUBRULE2(this.cdsName);
          this.CONSUME2(LBrace);
          this.MANY2(() => {
            this.SUBRULE2(this.tableMember);
          });
          this.CONSUME2(RBrace);
        },
      },
    ]);
  });

  private readonly tableFunctionTail = this.RULE('tableFunctionTail', () => {
    this.CONSUME(FunctionKeyword);
    this.SUBRULE(this.cdsName);
    this.OPTION(() => {
      this.SUBRULE(this.parametersClause);
    });
    this.CONSUME(Returns);
    this.CONSUME(LBrace);
    this.MANY(() => {
      this.SUBRULE(this.fieldDefinition);
    });
    this.CONSUME(RBrace);
    this.CONSUME(Implemented);
    this.CONSUME(By);
    this.CONSUME(Method);
    this.SUBRULE(this.qualifiedName);
    this.CONSUME(FatArrow);
    this.SUBRULE2(this.cdsName);
    this.OPTION2(() => this.CONSUME(Semicolon));
  });

  // ============================================================
  // Structure definition
  // ============================================================

  private readonly structureDefinition = this.RULE(
    'structureDefinition',
    () => {
      this.CONSUME(Structure);
      this.SUBRULE(this.cdsName);
      this.CONSUME(LBrace);
      this.MANY(() => {
        this.SUBRULE(this.tableMember);
      });
      this.CONSUME(RBrace);
    },
  );

  // ============================================================
  // View entity: `view [entity] <name> [with parameters …] [provider contract …]
  //              as select … | as projection on …`
  // ============================================================

  private readonly viewEntityDefinition = this.RULE(
    'viewEntityDefinition',
    () => {
      this.CONSUME(View);
      // `define view entity <name>` (CDS view entity) vs legacy
      // `define view <name>` (classic SQL view). `entity` is the modifier only
      // when followed by another name — a legacy view may itself be called
      // `entity` (`define view entity as select …`).
      this.OPTION({
        GATE: () => this.isEntityModifier(),
        DEF: () => this.CONSUME(Entity),
      });
      this.SUBRULE(this.cdsName);
      this.OPTION2(() => {
        this.SUBRULE(this.parametersClause);
      });
      this.OPTION3(() => {
        this.CONSUME(Provider);
        this.CONSUME(Contract);
        this.SUBRULE2(this.cdsName);
      });
      this.CONSUME(As);
      this.OR([
        { ALT: () => this.SUBRULE(this.selectStatement) },
        { ALT: () => this.SUBRULE(this.projectionTail) },
      ]);
    },
  );

  /**
   * `true` when the `entity` after `view` is the view-entity modifier rather
   * than the view name — it is a modifier iff the following token is a name
   * other than `as`/`with`/`provider` (the tokens that may directly follow a
   * view name).
   */
  private isEntityModifier(): boolean {
    if (this.LA(1).tokenType !== Entity) return false;
    const next = this.LA(2);
    if (!this.isNameToken(next)) return false;
    return ![As, With, Provider, Select, Projection].includes(next.tokenType);
  }

  private readonly abstractEntityDefinition = this.RULE(
    'abstractEntityDefinition',
    () => {
      this.CONSUME(Abstract);
      this.CONSUME(Entity);
      this.SUBRULE(this.cdsName);
      this.OPTION(() => {
        this.SUBRULE(this.parametersClause);
      });
      this.memberContext = 'entity';
      try {
        this.SUBRULE(this.elementList);
      } finally {
        this.memberContext = 'view';
      }
    },
  );

  private readonly customEntityDefinition = this.RULE(
    'customEntityDefinition',
    () => {
      this.CONSUME(Custom);
      this.CONSUME(Entity);
      this.SUBRULE(this.cdsName);
      this.OPTION(() => {
        this.SUBRULE(this.parametersClause);
      });
      this.memberContext = 'entity';
      try {
        this.SUBRULE(this.elementList);
      } finally {
        this.memberContext = 'view';
      }
    },
  );

  /**
   * `external entity <name> [external name <obj>] [with parameters …] { … }
   *  with federated data provided at runtime [;]`
   */
  private readonly externalEntityDefinition = this.RULE(
    'externalEntityDefinition',
    () => {
      this.CONSUME(External);
      this.CONSUME(Entity);
      this.SUBRULE(this.cdsName);
      this.OPTION({
        // `external name <obj>` — `external` is also a legal name, so gate
        // on the following `name` keyword.
        GATE: () =>
          this.LA(1).tokenType === External && this.LA(2).tokenType === Name,
        DEF: () => {
          this.CONSUME2(External);
          this.CONSUME(Name);
          this.SUBRULE2(this.cdsName);
        },
      });
      this.OPTION2(() => {
        this.SUBRULE(this.parametersClause);
      });
      this.CONSUME(LBrace);
      this.MANY(() => {
        this.SUBRULE(this.fieldDefinition);
      });
      this.CONSUME(RBrace);
      this.CONSUME(With);
      this.CONSUME(Federated);
      this.CONSUME(Data);
      this.CONSUME(Provided);
      this.CONSUME(AtKeyword);
      this.CONSUME(Runtime);
      this.OPTION3(() => this.CONSUME(Semicolon));
    },
  );

  // ============================================================
  // SELECT statement
  //   select [distinct] from <source>
  //     [joins | associations | bind aspect …]*
  //     { element list }
  //     [where …] [group by …] [having …]
  //     [union|intersect|except [all] select …]*
  // ============================================================

  private readonly selectStatement = this.RULE('selectStatement', () => {
    this.CONSUME(Select);
    this.OPTION(() => this.CONSUME(Distinct));
    this.CONSUME(From);
    this.SUBRULE(this.dataSource);
    // FROM region: an ordered chain of joins, association declarations and
    // aspect bindings. Associations are usually written after the join chain.
    this.MANY(() => {
      this.OR([
        { ALT: () => this.SUBRULE(this.joinClause) },
        { ALT: () => this.SUBRULE(this.associationTail) },
        { ALT: () => this.SUBRULE(this.bindAspect) },
      ]);
    });
    this.SUBRULE(this.elementList);
    this.SUBRULE(this.selectClauses);
  });

  private readonly selectClauses = this.RULE('selectClauses', () => {
    this.OPTION(() => {
      this.CONSUME(Where);
      this.SUBRULE(this.condition);
    });
    this.OPTION2(() => {
      this.CONSUME(Group);
      this.CONSUME(By);
      this.SUBRULE(this.qualifiedName);
      this.MANY(() => {
        this.CONSUME(Comma);
        this.SUBRULE2(this.qualifiedName);
      });
    });
    this.OPTION3(() => {
      this.CONSUME(Having);
      this.SUBRULE2(this.condition);
    });
    this.MANY2(() => {
      this.SUBRULE(this.setOperation);
    });
  });

  /** `union [all]|intersect|except select …` — nested set operation. */
  private readonly setOperation = this.RULE('setOperation', () => {
    this.OR([
      {
        ALT: () => {
          this.CONSUME(Union);
          this.OPTION(() => this.CONSUME(All));
        },
      },
      { ALT: () => this.CONSUME(Intersect) },
      { ALT: () => this.CONSUME(Except) },
    ]);
    this.SUBRULE(this.selectStatement);
  });

  /**
   * `as projection on <source> [bind aspect] [associations]
   *  [redefined associations] { projection list } [where …]`
   */
  private readonly projectionTail = this.RULE('projectionTail', () => {
    this.CONSUME(Projection);
    this.CONSUME(On);
    this.SUBRULE(this.dataSource);
    this.MANY(() => {
      this.OR([
        { ALT: () => this.SUBRULE(this.associationTail) },
        { ALT: () => this.SUBRULE(this.redefinedAssociation) },
        { ALT: () => this.SUBRULE(this.bindAspect) },
      ]);
    });
    this.SUBRULE(this.elementList);
    this.OPTION(() => {
      this.CONSUME(Where);
      this.SUBRULE(this.condition);
    });
  });

  /**
   * A data source: `<name> [ ( <parameter bindings> ) ] [ as <alias> ]`.
   *
   * The parameter list precedes the alias, e.g.
   * `ZP_MM_PR_DOC_TF( mandt: $session.client ) as _PRDocList`.
   */
  private readonly dataSource = this.RULE('dataSource', () => {
    this.SUBRULE(this.dataSourcePath);
    this.OPTION(() => {
      this.SUBRULE(this.dataSourceParameters);
    });
    this.OPTION2(() => {
      this.OR([
        {
          // An explicit alias is never ambiguous.
          ALT: () => {
            this.CONSUME(As);
            this.SUBRULE(this.cdsName);
          },
        },
        {
          // A bare (implicit) alias — the FROM-region starters are excluded,
          // see FROM_REGION_STARTERS.
          ALT: () => this.SUBRULE(this.bareAliasName),
        },
      ]);
    });
  });

  /**
   * `<name>[<attr>].<name>…` — a FROM data-source path. Path segments may
   * carry `[ … ]` association filters/attribute bindings (captured opaquely),
   * e.g. `_order._items[1:currency = 'EUR']`.
   */
  private readonly dataSourcePath = this.RULE('dataSourcePath', () => {
    this.SUBRULE(this.pathSegment);
    this.MANY(() => {
      this.CONSUME(Dot);
      this.SUBRULE2(this.pathSegment);
    });
  });

  /**
   * `( <param> : <value> , … )` — parameter bindings of a data source.
   * At least one binding is required; `source()` is rejected.
   */
  private readonly dataSourceParameters = this.RULE(
    'dataSourceParameters',
    () => {
      this.CONSUME(LParen);
      this.SUBRULE(this.dataSourceParameter);
      this.MANY(() => {
        this.CONSUME(Comma);
        this.SUBRULE2(this.dataSourceParameter);
      });
      this.CONSUME(RParen);
    },
  );

  /** `<name> : <value>` — a single parameter binding. */
  private readonly dataSourceParameter = this.RULE(
    'dataSourceParameter',
    () => {
      this.SUBRULE(this.qualifiedName);
      this.CONSUME(Colon);
      this.SUBRULE(this.parameterBinding);
    },
  );

  /**
   * The value bound to a source parameter. Kept as written in the source:
   *   - `:P_Param`   — parameter of the consuming view
   *   - `$session.client`, `$parameters.P_X` — system variable
   *   - `'X'`, `42`, `abap.dats'20200101'` — literal
   */
  private readonly parameterBinding = this.RULE('parameterBinding', () => {
    this.OR([
      {
        ALT: () => {
          this.CONSUME(Colon);
          this.SUBRULE(this.qualifiedName);
        },
      },
      { ALT: () => this.SUBRULE(this.systemVariable) },
      { ALT: () => this.SUBRULE(this.literal) },
    ]);
  });

  // ============================================================
  // Joins
  //
  //   [INNER] [[card]] JOIN      <source> ON <cond>   -- ON is mandatory
  //   LEFT [OUTER] [[card]] JOIN <source> ON <cond>   -- ON is mandatory
  //   RIGHT [OUTER] [[card]] JOIN <source> ON <cond>  -- ON is mandatory
  //   FULL [OUTER] JOIN          <source> ON <cond>   -- ON is mandatory
  //   CROSS JOIN                 <source>             -- ON is not allowed
  //
  // `card` is the word-form join cardinality:
  //   `to one|exact one|many` or `one|exact one|many to one|exact one|many`
  //
  // The `OUTER` keyword is optional for the outer join types, and the syntax
  // does not depend on the view flavour — a view entity and a legacy
  // `define view` accept the same join spellings.
  // ============================================================

  private readonly joinClause = this.RULE('joinClause', () => {
    this.OR([
      {
        // A cross join must not carry an ON condition — it consumes the
        // data source itself.
        ALT: () => {
          this.CONSUME(Cross);
          this.CONSUME(Join);
          this.SUBRULE(this.joinOperand);
        },
      },
      {
        // Every other join type requires an ON condition.
        ALT: () => {
          this.SUBRULE(this.joinPrefix);
          this.CONSUME2(Join);
          this.SUBRULE2(this.joinOperand);
          this.CONSUME(On);
          this.SUBRULE(this.condition);
        },
      },
    ]);
  });

  /**
   * Optional join-type words and the optional word-form cardinality, both
   * preceding the `JOIN` keyword:
   *   `left [outer]`, `right [outer]`, `inner`, `full [outer]`, `<empty>`
   *   then `[exact one|one|many] to [exact] one|many` | `to [exact] one|many`.
   */
  private readonly joinPrefix = this.RULE('joinPrefix', () => {
    this.OPTION(() => {
      this.OR([
        {
          ALT: () => {
            this.CONSUME(Left);
            this.OPTION2(() => this.CONSUME(Outer));
          },
        },
        {
          ALT: () => {
            this.CONSUME(Right);
            this.OPTION3(() => this.CONSUME2(Outer));
          },
        },
        { ALT: () => this.CONSUME(Inner) },
        {
          ALT: () => {
            this.CONSUME(Full);
            this.OPTION4(() => this.CONSUME3(Outer));
          },
        },
      ]);
    });
    this.OPTION5({
      GATE: () => this.isJoinCardinality(),
      DEF: () => this.SUBRULE(this.joinCardinality),
    });
  });

  /**
   * `[exact one|one|many] to (exact one|one|many)` or `to (exact one|one|many)`
   * — the word-form join cardinality, e.g. `many to one join`, `to one join`.
   */
  private readonly joinCardinality = this.RULE('joinCardinality', () => {
    this.OPTION(() => this.SUBRULE(this.cardinalWord));
    this.CONSUME(To);
    this.SUBRULE2(this.cardinalWord);
  });

  /** `exact one` | `one` | `many` — a cardinality bound written in words. */
  private readonly cardinalWord = this.RULE('cardinalWord', () => {
    this.OR([
      {
        ALT: () => {
          this.CONSUME(Exact);
          this.CONSUME(One);
        },
      },
      { ALT: () => this.CONSUME2(One) },
      { ALT: () => this.CONSUME(Many) },
    ]);
  });

  /**
   * Cheap lookahead for the word-form join cardinality: it ends with the
   * `JOIN` keyword. Matches `[src] to tgt` where
   * src ∈ {`exact one`,`one`,`many`} (optional) and
   * tgt ∈ {`exact one`,`one`,`many`}.
   */
  private isJoinCardinality(): boolean {
    let i = 1;
    const typeAt = (n: number) => this.LA(n).tokenType;
    if (typeAt(i) === Exact && typeAt(i + 1) === One) i += 2;
    else if (typeAt(i) === One || typeAt(i) === Many) i += 1;
    if (typeAt(i) !== To) return false;
    i += 1;
    if (typeAt(i) === Exact && typeAt(i + 1) === One) i += 2;
    else if (typeAt(i) === One || typeAt(i) === Many) i += 1;
    else return false;
    return typeAt(i) === Join;
  }

  /**
   * A join source: a data source or a parenthesized join group
   * (`join (A join B on …) on …`).
   */
  private readonly joinOperand = this.RULE('joinOperand', () => {
    this.OR([
      {
        ALT: () => {
          this.CONSUME(LParen);
          this.SUBRULE(this.joinGroup);
          this.CONSUME(RParen);
        },
      },
      { ALT: () => this.SUBRULE(this.dataSource) },
    ]);
  });

  /** `<source> [joins…]` — the content of a parenthesized join group. */
  private readonly joinGroup = this.RULE('joinGroup', () => {
    this.SUBRULE(this.joinOperand);
    this.MANY(() => {
      this.SUBRULE(this.joinClause);
    });
  });

  // ============================================================
  // Element list: `{ [key] [virtual] <expr> [as <alias>] … ; … }`
  // ============================================================

  private readonly elementList = this.RULE('elementList', () => {
    this.CONSUME(LBrace);
    this.MANY(() => {
      this.SUBRULE(this.elementMember);
    });
    this.CONSUME(RBrace);
  });

  private readonly elementMember = this.RULE('elementMember', () => {
    // Annotations are shared between projection elements and associations to
    // keep the LL(k) grammar unambiguous. The branch decision is made on the
    // `association` / `composition` keyword (or the absence thereof).
    this.MANY(() => this.SUBRULE(this.annotation));
    this.OR([
      {
        // `association`/`composition` are also legal element names — the
        // declaration form applies only when association syntax follows.
        GATE: () => this.isAssociationDeclaration(),
        ALT: () => this.SUBRULE(this.associationTail),
      },
      { ALT: () => this.SUBRULE(this.viewElementTail) },
    ]);
  });

  private readonly viewElementTail = this.RULE('viewElementTail', () => {
    // `key`/`virtual`/`redirected` are element flags only when an element
    // follows — they are legal element names themselves (`{ key }`,
    // `key : abap.char(1)`).
    this.OPTION({
      GATE: () => this.isElementStart(this.LA(2)),
      DEF: () => this.CONSUME(Key),
    });
    this.OPTION2({
      GATE: () => this.isElementStart(this.LA(2)),
      DEF: () => this.CONSUME(Virtual),
    });
    this.OPTION3({
      GATE: () => this.isElementStart(this.LA(2)),
      DEF: () => this.CONSUME(Redirected),
    });
    // Either a typed field `name : type` (abstract/custom entities, virtual
    // elements) or an element expression `expr [as alias] [: suffix]`.
    this.OR([
      {
        GATE: () => this.isTypedField(),
        ALT: () => this.SUBRULE(this.typedFieldTail),
      },
      { ALT: () => this.SUBRULE(this.elementExpression) },
    ]);
    // Element terminator is optional for the trailing element.
    this.OPTION4(() => {
      this.OR2([
        { ALT: () => this.CONSUME(Semicolon) },
        { ALT: () => this.CONSUME(Comma) },
      ]);
    });
  });

  private readonly typedFieldTail = this.RULE('typedFieldTail', () => {
    this.SUBRULE(this.cdsName);
    this.CONSUME(Colon);
    this.SUBRULE(this.typeReference);
    this.OPTION(() => {
      this.CONSUME(Not);
      this.CONSUME(Null);
    });
  });

  /**
   * Element expression — everything allowed in a select/projection list:
   * paths (`_assoc.field`, `_a[inner].f`), calls (`sum(x)`, `div(a,b,c)`),
   * window functions (`… over (partition by … order by …)`), casts, case
   * distinctions, arithmetic, literals, parameters (`:P_X`) and system
   * variables (`$session.client`, `$parameters.x`, `$projection.f`).
   *
   * Followed by an optional `as <alias>` and an optional element suffix
   * (`: localized`, `: redirected to [composition child|parent] <target>`).
   */
  private readonly elementExpression = this.RULE('elementExpression', () => {
    this.SUBRULE(this.operand);
    this.OPTION(() => {
      this.CONSUME(As);
      this.SUBRULE(this.cdsName);
    });
    this.OPTION2(() => {
      this.CONSUME(Colon);
      this.OR([
        { ALT: () => this.CONSUME(Localized) },
        { ALT: () => this.SUBRULE(this.redirection) },
      ]);
    });
  });

  /**
   * `redirected to [composition child|parent] <target>` — association
   * redirection in projection views.
   */
  private readonly redirection = this.RULE('redirection', () => {
    this.CONSUME(Redirected);
    this.CONSUME(To);
    this.OPTION(() => {
      this.OR([
        {
          ALT: () => {
            this.CONSUME(Composition);
            this.CONSUME(Child);
          },
        },
        { ALT: () => this.CONSUME(Parent) },
      ]);
    });
    this.SUBRULE(this.qualifiedName);
  });

  /**
   * `redefine association|composition <name> [[card:] <filter>] [as <alias>]
   *  [redirected to …]` — redefined association of a projection view,
   * declared before the projection list.
   */
  private readonly redefinedAssociation = this.RULE(
    'redefinedAssociation',
    () => {
      this.CONSUME(Redefine);
      this.OR([
        { ALT: () => this.CONSUME(Association) },
        { ALT: () => this.CONSUME(Composition) },
      ]);
      this.SUBRULE(this.qualifiedName);
      this.OPTION(() => {
        this.SUBRULE(this.bracketTokens);
      });
      this.OPTION2(() => {
        this.CONSUME(As);
        this.SUBRULE(this.cdsName);
      });
      this.OPTION3(() => {
        this.SUBRULE(this.redirection);
      });
    },
  );

  /**
   * `bind aspect <aspect> ( <element> => <target>, … ) [as <alias>]`
   * — aspect binding in the FROM region or projection view header.
   */
  private readonly bindAspect = this.RULE('bindAspect', () => {
    this.CONSUME(Bind);
    this.CONSUME(Aspect);
    this.SUBRULE(this.qualifiedName);
    this.CONSUME(LParen);
    this.SUBRULE(this.bindMapping);
    this.MANY(() => {
      this.CONSUME(Comma);
      this.SUBRULE2(this.bindMapping);
    });
    this.CONSUME(RParen);
    this.OPTION(() => {
      this.CONSUME(As);
      this.SUBRULE(this.cdsName);
    });
  });

  /** `<aspect element> => <target>` — one aspect binding mapping. */
  private readonly bindMapping = this.RULE('bindMapping', () => {
    this.SUBRULE(this.cdsName);
    this.CONSUME(FatArrow);
    this.SUBRULE(this.operand);
  });

  /** Cheap lookahead: `cast (` — the cast form of a projection element. */
  private isCastExpression(): boolean {
    const first = this.LA(1);
    const second = this.LA(2);
    if (!first || !second) return false;
    return (
      first.tokenType?.name === 'Identifier' &&
      first.image.toLowerCase() === 'cast' &&
      second.tokenType?.name === 'LParen'
    );
  }

  /**
   * `view` — the element list allows projection suffixes (`: localized`,
   * `: redirected to`); `entity` — abstract/custom entity bodies where a
   * token after `:` is always a type name.
   */
  private memberContext: 'view' | 'entity' = 'view';

  /**
   * Cheap lookahead: `name :` → typed field. Any keyword may be a name
   * (`Type : abap.char(1)`), but `name : localized` / `name : redirected …`
   * are projection-element suffixes, not typed fields.
   */
  private isTypedField(): boolean {
    const first = this.LA(1);
    const second = this.LA(2);
    const third = this.LA(3);
    if (!this.isNameToken(first) || second.tokenType !== Colon) return false;
    // In entity bodies there are no projection suffixes — `localized` and
    // `redirected` are ordinary keyword-spelled type names.
    if (this.memberContext === 'entity') return true;
    return ![Localized, Redirected].includes(third.tokenType);
  }

  // `LA()` returns the EOF token past the end of input — never `undefined`.
  private isNameToken(token: IToken): boolean {
    return CdsParser.NAME_TOKEN_SET.has(token.tokenType);
  }

  /**
   * `association|composition` in an element list is a declaration only when
   * association syntax follows: `[`, `to`, `of`, or a name (the target).
   * `association :`, `association,`, `association ;` … are elements named
   * `association`.
   */
  private isAssociationDeclaration(): boolean {
    const first = this.LA(1).tokenType;
    if (first !== Association && first !== Composition) return false;
    const second = this.LA(2);
    if ([To, Of, LBracket].includes(second.tokenType)) return true;
    // `association as <alias>` is an element *named* `association` — `as`
    // only starts a declaration's alias after a target was parsed.
    if (second.tokenType === As) return false;
    return this.isNameToken(second);
  }

  /**
   * `true` when the token may begin an element expression — used to decide
   * whether `key`/`virtual`/`redirected` are element flags or the element
   * name itself.
   */
  private isElementStart(token: IToken): boolean {
    if (this.isNameToken(token)) return true;
    return [
      StringLiteral,
      NumberLiteral,
      EnumLiteral,
      Minus,
      Plus,
      LParen,
      Dollar,
    ].includes(token.tokenType);
  }

  /** `true` when `LA(1)` begins a literal (incl. typed `abap.x'…'`). */
  private isLiteralStart(): boolean {
    const t = this.LA(1).tokenType;
    if (
      [
        StringLiteral,
        NumberLiteral,
        EnumLiteral,
        True,
        False,
        Null,
        Minus,
      ].includes(t)
    ) {
      return true;
    }
    return this.isTypedLiteral();
  }

  /**
   * `( … )` in a condition operand — `true` when the parenthesized group is
   * itself a condition (contains a predicate-ish token at depth ≥ 1 and is
   * not immediately followed by a comparison operator, which would make the
   * group an operand of a comparison like `(a + b) = 1`).
   */
  private isParenCondition(): boolean {
    if (this.LA(1).tokenType !== LParen) return false;
    const close = this.matchingParen(1);
    if (close < 0) return false;
    // A comparison operator directly after `)` → the group is an operand.
    if (this.isComparisonToken(this.LA(close + 1))) return false;
    // Predicate-ish token inside the parens (any depth) → condition.
    for (let i = 2; i < close; i += 1) {
      if (this.isConditionMarker(this.LA(i))) return true;
    }
    return false;
  }

  /** Index of the `)` matching the `(` at `from`, or -1 (EOF/unbalanced). */
  private matchingParen(from: number): number {
    let depth = 0;
    for (let i = from; i < from + 400; i += 1) {
      const t = this.LA(i).tokenType;
      if (t === EOF) return -1;
      depth += CdsParser.PAREN_DELTA.get(t) ?? 0;
      if (t === RParen && depth === 0) return i;
    }
    return -1;
  }

  private isConditionMarker(tok: IToken): boolean {
    return (
      CdsParser.CONDITION_MARKER_SET.has(tok.tokenType) || this.isIsKeyword(tok)
    );
  }

  private isComparisonToken(tok: IToken): boolean {
    return (
      CdsParser.COMPARISON_TOKEN_SET.has(tok.tokenType) || this.isIsKeyword(tok)
    );
  }

  private isIsKeyword(tok: IToken): boolean {
    return tok.tokenType === Identifier && tok.image.toLowerCase() === 'is';
  }

  /**
   * `case` is a legal element name — treat it as a case expression only
   * when a `when` follows before the element ends.
   */
  private isCaseExpression(): boolean {
    if (this.LA(1).tokenType !== Case) return false;
    let depth = 0;
    // Scans until `when`, an element terminator or EOF — the cap only guards
    // against pathological inputs; a `case` element far before its first
    // `when` is still a case expression.
    for (let i = 2; i < 500; i += 1) {
      const t = this.LA(i).tokenType;
      if (this.caseScanEnds(t, depth)) return false;
      if (depth === 0 && t === When) return true;
      depth += CdsParser.DEPTH_DELTA.get(t) ?? 0;
    }
    return false;
  }

  private caseScanEnds(t: TokenType, depth: number): boolean {
    if (t === EOF) return true;
    if (depth !== 0) return false;
    return [RBrace, Semicolon, Comma, RParen, RBracket].includes(t);
  }

  // ============================================================
  // Associations
  //   association [<card>] [of <src> to <tgt>]?
  //     [to [parent|<tgt-card>] [redirected to]]? <target>
  //     [as _<alias>] [on <cond>] [with default filter <cond>]
  // ============================================================

  private readonly associationTail = this.RULE('associationTail', () => {
    this.OR([
      { ALT: () => this.CONSUME(Association) },
      { ALT: () => this.CONSUME(Composition) },
    ]);
    this.OPTION(() => this.SUBRULE(this.cardinality));
    this.OR2([
      {
        // `of X`, `of many X`, `of many to X`, `of to X` —
        // `to` is a connector before the target, not a second cardinality.
        ALT: () => {
          this.CONSUME(Of);
          this.OPTION2(() => this.SUBRULE(this.cardinalWord));
          this.OPTION3(() => this.CONSUME(To));
          this.SUBRULE(this.qualifiedName);
        },
      },
      {
        // `to parent X` — `parent` is also a legal target name, so this is
        // the to-parent form only when a name follows `parent`.
        GATE: () =>
          this.LA(1).tokenType === To &&
          this.LA(2).tokenType === Parent &&
          this.isNameToken(this.LA(3)),
        ALT: () => {
          this.CONSUME2(To);
          this.CONSUME(Parent);
          this.SUBRULE2(this.qualifiedName);
        },
      },
      {
        // `to X`, `to many X`, `to exact one X`, `to redirected to X`,
        // `to many redirected to X`
        ALT: () => {
          this.CONSUME3(To);
          this.OPTION4(() => this.SUBRULE3(this.cardinalWord));
          this.OPTION5(() => {
            this.CONSUME(Redirected);
            this.CONSUME4(To);
          });
          this.SUBRULE3(this.qualifiedName);
        },
      },
      {
        // `association <target>` — `to` is optional in view entities. The
        // gate excludes `to`/`of`, which are connector keywords here.
        GATE: () => ![To, Of].includes(this.LA(1).tokenType),
        ALT: () => {
          this.SUBRULE4(this.qualifiedName);
        },
      },
    ]);
    this.OPTION6(() => {
      this.CONSUME(As);
      this.SUBRULE(this.cdsName);
    });
    this.OPTION7(() => {
      this.CONSUME(On);
      this.SUBRULE(this.condition);
    });
    this.OPTION8(() => {
      this.CONSUME(With);
      this.CONSUME(Default);
      this.CONSUME(Filter);
      this.SUBRULE2(this.condition);
    });
    this.OPTION9(() => {
      this.OR3([
        { ALT: () => this.CONSUME(Semicolon) },
        { ALT: () => this.CONSUME(Comma) },
      ]);
    });
  });

  /** `[<lower>..<upper>]`, `[<n>]`, `[*]`, `[<lower>..*]` */
  private readonly cardinality = this.RULE('cardinality', () => {
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

  private readonly parametersClause = this.RULE('parametersClause', () => {
    this.CONSUME(With);
    this.CONSUME(Parameters);
    this.SUBRULE(this.parameterDefinition);
    this.MANY(() => {
      this.CONSUME(Comma);
      this.SUBRULE2(this.parameterDefinition);
    });
  });

  private readonly parameterDefinition = this.RULE(
    'parameterDefinition',
    () => {
      this.MANY(() => this.SUBRULE(this.annotation));
      this.SUBRULE(this.cdsName);
      this.CONSUME(Colon);
      this.SUBRULE(this.typeReference);
      this.OPTION(() => {
        this.CONSUME(Default);
        this.SUBRULE(this.literal);
      });
    },
  );

  // ============================================================
  // Simple type definition
  // ============================================================

  private readonly simpleTypeDefinition = this.RULE(
    'simpleTypeDefinition',
    () => {
      this.CONSUME(Type);
      this.SUBRULE(this.cdsName);
      this.CONSUME(Colon);
      this.SUBRULE(this.typeReference);
      this.CONSUME(Semicolon);
    },
  );

  // ============================================================
  // Service definition
  // ============================================================

  private readonly serviceDefinition = this.RULE('serviceDefinition', () => {
    this.CONSUME(Service);
    this.SUBRULE(this.cdsName);
    this.CONSUME(LBrace);
    this.MANY(() => {
      this.SUBRULE(this.exposeStatement);
    });
    this.CONSUME(RBrace);
  });

  private readonly exposeStatement = this.RULE('exposeStatement', () => {
    this.CONSUME(Expose);
    this.SUBRULE(this.cdsName);
    this.OPTION(() => {
      this.CONSUME(As);
      this.SUBRULE2(this.cdsName);
    });
    this.CONSUME(Semicolon);
  });

  // ============================================================
  // Scalar function: `define scalar function <name> [with parameters …]
  //                   returns <type> [;]`
  // ============================================================

  private readonly scalarFunctionDefinition = this.RULE(
    'scalarFunctionDefinition',
    () => {
      this.CONSUME(Scalar);
      this.CONSUME(FunctionKeyword);
      this.SUBRULE(this.cdsName);
      this.OPTION(() => {
        this.SUBRULE(this.parametersClause);
      });
      this.CONSUME(Returns);
      this.SUBRULE(this.typeReference);
      this.OPTION2(() => this.CONSUME(Semicolon));
    },
  );

  // ============================================================
  // Hierarchy: `define hierarchy <name> [with parameters …]
  //             as parent child hierarchy( … ) { … }`
  // ============================================================

  private readonly hierarchyDefinition = this.RULE(
    'hierarchyDefinition',
    () => {
      this.CONSUME(Hierarchy);
      this.SUBRULE(this.cdsName);
      this.OPTION(() => {
        this.SUBRULE(this.parametersClause);
      });
      this.CONSUME(As);
      this.CONSUME(Parent);
      this.CONSUME(Child);
      this.CONSUME2(Hierarchy);
      this.CONSUME(LParen);
      // Mandatory: `source <entity>` and `child to parent association <name>`
      this.CONSUME(Source);
      this.SUBRULE(this.qualifiedName);
      this.CONSUME2(Child);
      this.CONSUME(To);
      this.CONSUME2(Parent);
      this.CONSUME(Association);
      this.SUBRULE2(this.cdsName);
      // Optional pre-clauses: `period …`, `directory … filter by …`,
      // `start where …` (order-tolerant).
      this.MANY(() => {
        this.OR([
          { ALT: () => this.SUBRULE(this.hierarchyPeriod) },
          { ALT: () => this.SUBRULE(this.hierarchyDirectory) },
          { ALT: () => this.SUBRULE(this.hierarchyStart) },
        ]);
      });
      // Mandatory: `siblings order by <items>`
      this.CONSUME(Siblings);
      this.CONSUME(Order);
      this.CONSUME(By);
      this.SUBRULE(this.sortItem);
      this.MANY2(() => {
        this.CONSUME(Comma);
        this.SUBRULE2(this.sortItem);
      });
      // Optional trailing clauses (order-tolerant).
      this.MANY3(() => {
        this.OR2([
          { ALT: () => this.SUBRULE(this.hierarchyDepth) },
          { ALT: () => this.SUBRULE(this.hierarchyNodetype) },
          { ALT: () => this.SUBRULE(this.hierarchyLoad) },
          { ALT: () => this.SUBRULE(this.hierarchyMultiple) },
          { ALT: () => this.SUBRULE(this.hierarchyOrphans) },
          { ALT: () => this.SUBRULE(this.hierarchyCycles) },
          { ALT: () => this.SUBRULE(this.hierarchyGenerate) },
          { ALT: () => this.SUBRULE(this.hierarchyCache) },
        ]);
      });
      this.CONSUME(RParen);
      this.SUBRULE(this.elementList);
    },
  );

  /** `period from <f> to <f> [valid from <f> to <f>]` */
  private readonly hierarchyPeriod = this.RULE('hierarchyPeriod', () => {
    this.CONSUME(Period);
    this.CONSUME(From);
    this.SUBRULE(this.qualifiedName);
    this.CONSUME(To);
    this.SUBRULE2(this.qualifiedName);
    this.OPTION(() => {
      this.CONSUME(Valid);
      this.CONSUME2(From);
      this.SUBRULE3(this.qualifiedName);
      this.CONSUME2(To);
      this.SUBRULE4(this.qualifiedName);
    });
  });

  /** `directory <entity> filter by <cond>` */
  private readonly hierarchyDirectory = this.RULE('hierarchyDirectory', () => {
    this.CONSUME(Directory);
    this.SUBRULE(this.qualifiedName);
    this.CONSUME(Filter);
    this.CONSUME(By);
    this.SUBRULE(this.condition);
  });

  /** `start where <cond>` */
  private readonly hierarchyStart = this.RULE('hierarchyStart', () => {
    this.CONSUME(Start);
    this.CONSUME(Where);
    this.SUBRULE(this.condition);
  });

  /** `depth <field>|<number>` */
  private readonly hierarchyDepth = this.RULE('hierarchyDepth', () => {
    this.CONSUME(Depth);
    this.OR([
      { ALT: () => this.SUBRULE(this.qualifiedName) },
      { ALT: () => this.CONSUME(NumberLiteral) },
    ]);
  });

  /** `nodetype <field>` */
  private readonly hierarchyNodetype = this.RULE('hierarchyNodetype', () => {
    this.CONSUME(Nodetype);
    this.SUBRULE(this.qualifiedName);
  });

  /** `load bulk|incremental|<sysvar>|<field>` */
  private readonly hierarchyLoad = this.RULE('hierarchyLoad', () => {
    this.CONSUME(Load);
    this.OR([
      {
        GATE: () => this.LA(1).tokenType === Bulk,
        ALT: () => this.CONSUME(Bulk),
      },
      {
        GATE: () => this.LA(1).tokenType === Incremental,
        ALT: () => this.CONSUME(Incremental),
      },
      { ALT: () => this.SUBRULE(this.systemVariable) },
      { ALT: () => this.SUBRULE(this.qualifiedName) },
    ]);
  });

  /** `multiple parents not allowed|leaves only|allowed` */
  private readonly hierarchyMultiple = this.RULE('hierarchyMultiple', () => {
    this.CONSUME(Multiple);
    this.CONSUME(Parents);
    this.OR([
      {
        ALT: () => {
          this.CONSUME(Not);
          this.CONSUME(Allowed);
        },
      },
      {
        ALT: () => {
          this.CONSUME(Leaves);
          this.CONSUME(Only);
        },
      },
      { ALT: () => this.CONSUME2(Allowed) },
    ]);
  });

  /** `orphans ignore|error|root` */
  private readonly hierarchyOrphans = this.RULE('hierarchyOrphans', () => {
    this.CONSUME(Orphans);
    this.OR([
      { ALT: () => this.CONSUME(Ignore) },
      { ALT: () => this.CONSUME(ErrorKeyword) },
      { ALT: () => this.CONSUME(Root) },
    ]);
  });

  /** `cycles error|breakup` */
  private readonly hierarchyCycles = this.RULE('hierarchyCycles', () => {
    this.CONSUME(Cycles);
    this.OR([
      { ALT: () => this.CONSUME(ErrorKeyword) },
      { ALT: () => this.CONSUME(Breakup) },
    ]);
  });

  /** `generate spantree` */
  private readonly hierarchyGenerate = this.RULE('hierarchyGenerate', () => {
    this.CONSUME(Generate);
    this.CONSUME(Spantree);
  });

  /** `cache on|off|force` */
  private readonly hierarchyCache = this.RULE('hierarchyCache', () => {
    this.CONSUME(Cache);
    this.OR([
      { ALT: () => this.CONSUME(On) },
      { ALT: () => this.CONSUME(Off) },
      { ALT: () => this.CONSUME(Force) },
    ]);
  });

  /** `<field> [ascending|descending]` — one ORDER BY item. */
  private readonly sortItem = this.RULE('sortItem', () => {
    this.SUBRULE(this.qualifiedName);
    this.OPTION(() => {
      this.OR([
        { ALT: () => this.CONSUME(Ascending) },
        { ALT: () => this.CONSUME(Descending) },
      ]);
    });
  });

  // ============================================================
  // Aspect: `define aspect <name> { [key] <elem> : <type|expr>; … }`
  // ============================================================

  private readonly aspectDefinition = this.RULE('aspectDefinition', () => {
    this.CONSUME(Aspect);
    this.SUBRULE(this.cdsName);
    this.OPTION(() => {
      this.CONSUME(LBrace);
      this.MANY(() => {
        this.SUBRULE(this.aspectElement);
      });
      this.CONSUME(RBrace);
    });
  });

  private readonly aspectElement = this.RULE('aspectElement', () => {
    this.MANY(() => this.SUBRULE(this.annotation));
    this.OPTION({
      // `key` is also a legal element name (`key : type`).
      GATE: () => this.isNameToken(this.LA(2)),
      DEF: () => this.CONSUME(Key),
    });
    this.SUBRULE(this.cdsName);
    this.CONSUME(Colon);
    // `name : typing;` or `name : arith_expr|case_expr|builtin_func;`
    this.OR([
      {
        GATE: () => this.isAspectTypedValue(),
        ALT: () => this.SUBRULE(this.typeReference),
      },
      { ALT: () => this.SUBRULE(this.operand) },
    ]);
    this.CONSUME(Semicolon);
  });

  /**
   * Lookahead for `name : <typing>;` inside an aspect element — true when the
   * token sequence after the colon is a type reference followed by `;`.
   */
  private isAspectTypedValue(): boolean {
    const typeAt = (n: number) => this.LA(n).tokenType;
    if (typeAt(1) === Abap) return this.abapTypeEndsAtSemicolon();
    if (!this.isNameToken(this.LA(1))) return false;
    let i = 2;
    while (typeAt(i) === Dot && this.isNameToken(this.LA(i + 1))) i += 2;
    // A `(` after a non-`abap` name is a function call, not a type.
    return typeAt(i) === Semicolon;
  }

  /** `abap.x[(n[,m])]` followed by `;` — a builtin aspect type. */
  private abapTypeEndsAtSemicolon(): boolean {
    const typeAt = (n: number) => this.LA(n).tokenType;
    if (typeAt(2) !== Dot || !this.isNameToken(this.LA(3))) return false;
    let i = 4;
    if (typeAt(i) === LParen) {
      // `LA()` returns the EOF token past the end of input — the loop
      // must stop on it or a truncated `abap.char(` scans forever.
      while (typeAt(i) !== RParen && typeAt(i) !== EOF) i += 1;
      i += 1;
    }
    return typeAt(i) === Semicolon;
  }

  // ============================================================
  // Annotation definition (DDLA) / access policy
  //   define annotation <name> { … }
  //   define accesspolicy <name> { … }
  //
  // Their bodies nest `{ … }` blocks freely (subannotations, pfcg mappings),
  // so the content is captured as a balanced-brace token block.
  // ============================================================

  private readonly annotationDefinition = this.RULE(
    'annotationDefinition',
    () => {
      this.CONSUME(AnnotationKeyword);
      this.SUBRULE(this.cdsName);
      this.OR([
        {
          ALT: () => {
            this.CONSUME(LBrace);
            this.SUBRULE(this.tokenBlock);
            this.CONSUME(RBrace);
          },
        },
        {
          ALT: () => {
            this.CONSUME(Colon);
            this.SUBRULE(this.simpleTail);
          },
        },
      ]);
    },
  );

  /** `: <anything>;` — a colon-led definition tail terminated by `;`. */
  private readonly simpleTail = this.RULE('simpleTail', () => {
    this.MANY(() => {
      this.OR(
        CdsParser.DCL_TOKENS.map((tokenType) => ({
          ALT: () => this.CONSUME(tokenType),
        })),
      );
    });
    this.CONSUME(Semicolon);
  });

  private readonly accessPolicyDefinition = this.RULE(
    'accessPolicyDefinition',
    () => {
      this.CONSUME(Accesspolicy);
      this.SUBRULE(this.cdsName);
      this.CONSUME(LBrace);
      this.SUBRULE(this.tokenBlock);
      this.CONSUME(RBrace);
    },
  );

  /**
   * Balanced `{ … }` block content — any tokens, with nested brace groups.
   * Used for DDLA annotation bodies and access policy definitions.
   */
  private readonly tokenBlock = this.RULE('tokenBlock', () => {
    this.MANY(() => {
      this.OR([
        { ALT: () => this.SUBRULE(this.tokenGroup) },
        {
          ALT: () => {
            this.OR2(
              CdsParser.BLOCK_TOKENS.map((tokenType) => ({
                ALT: () => this.CONSUME(tokenType),
              })),
            );
          },
        },
      ]);
    });
  });

  private readonly tokenGroup = this.RULE('tokenGroup', () => {
    this.CONSUME(LBrace);
    this.SUBRULE(this.tokenBlock);
    this.CONSUME(RBrace);
  });

  // ============================================================
  // DCL — `define role X [switchable] { grant …; inherit …; }`
  // ============================================================

  private readonly roleDefinition = this.RULE('roleDefinition', () => {
    this.CONSUME(Role);
    this.SUBRULE(this.cdsName);
    this.OPTION(() => this.CONSUME(Switchable));
    this.CONSUME(LBrace);
    this.MANY(() => {
      this.SUBRULE(this.roleMember);
    });
    this.CONSUME(RBrace);
  });

  private readonly roleMember = this.RULE('roleMember', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.grantStatement) },
      { ALT: () => this.SUBRULE(this.inheritStatement) },
      { ALT: () => this.SUBRULE(this.inheritingStatement) },
    ]);
  });

  /**
   * `grant select on <entity> [with optional elements ( … )]
   *  [combination mode or|and | redefinition] [inherit <role> [and|or <cond>]]
   *  [where <dcl_cond>] ;`
   */
  private readonly grantStatement = this.RULE('grantStatement', () => {
    this.CONSUME(Grant);
    this.CONSUME(Select);
    this.CONSUME(On);
    this.SUBRULE(this.qualifiedName);
    // Order-tolerant clause chain — the official grammar lists the clauses
    // as alternatives; a source may carry `inherit`, `where`, both or none.
    this.MANY(() => {
      this.SUBRULE(this.grantClause);
    });
    this.CONSUME(Semicolon);
  });

  /** One trailing clause of `grant select on <entity>`: with-optional-elements | combination-mode/redefinition | inherit | where. */
  private readonly grantClause = this.RULE('grantClause', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.grantOptionalElements) },
      { ALT: () => this.SUBRULE(this.grantCombination) },
      { ALT: () => this.SUBRULE(this.grantInherit) },
      { ALT: () => this.SUBRULE(this.grantWhere) },
    ]);
  });

  /** `with optional elements ( <name> [default true|false], … )` */
  private readonly grantOptionalElements = this.RULE(
    'grantOptionalElements',
    () => {
      this.CONSUME(With);
      this.CONSUME(Optional);
      this.CONSUME(Elements);
      this.CONSUME(LParen);
      this.SUBRULE(this.optionalElement);
      this.MANY(() => {
        this.CONSUME(Comma);
        this.SUBRULE2(this.optionalElement);
      });
      this.CONSUME(RParen);
    },
  );

  /** `combination mode or|and` | `redefinition` */
  private readonly grantCombination = this.RULE('grantCombination', () => {
    this.OR([
      {
        ALT: () => {
          this.CONSUME(Combination);
          this.CONSUME(Mode);
          this.OR2([
            { ALT: () => this.CONSUME(Or) },
            { ALT: () => this.CONSUME(And) },
          ]);
        },
      },
      { ALT: () => this.CONSUME(Redefinition) },
    ]);
  });

  /** `inherit <role> [and|or <dcl_cond>]` */
  private readonly grantInherit = this.RULE('grantInherit', () => {
    this.CONSUME(Inherit);
    this.SUBRULE(this.qualifiedName);
    this.OPTION(() => {
      this.OR([
        { ALT: () => this.CONSUME(And) },
        { ALT: () => this.CONSUME(Or) },
      ]);
      this.SUBRULE(this.dclCondition);
    });
  });

  /** `where <dcl_cond>` */
  private readonly grantWhere = this.RULE('grantWhere', () => {
    this.CONSUME(Where);
    this.SUBRULE(this.dclCondition);
  });

  /** One entry of `with optional elements ( … )`: `name [default true|false]`. */
  private readonly optionalElement = this.RULE('optionalElement', () => {
    this.SUBRULE(this.qualifiedName);
    this.OPTION(() => {
      this.CONSUME(Default);
      this.OR([
        { ALT: () => this.CONSUME(True) },
        { ALT: () => this.CONSUME(False) },
      ]);
    });
  });

  /**
   * `inherit <role> for grant select on <entity> [where …] ;`
   * — the standalone inherit rule of a role body.
   */
  private readonly inheritStatement = this.RULE('inheritStatement', () => {
    this.CONSUME(Inherit);
    this.SUBRULE(this.qualifiedName);
    this.OPTION(() => {
      this.CONSUME(For);
      this.CONSUME(Grant);
      this.CONSUME(Select);
      this.CONSUME(On);
      this.SUBRULE2(this.qualifiedName);
    });
    this.OPTION2(() => {
      this.CONSUME(Where);
      this.SUBRULE(this.dclCondition);
    });
    this.CONSUME(Semicolon);
  });

  /**
   * `inheriting conditions from entity <name>|super [default true|false] … ;`
   */
  private readonly inheritingStatement = this.RULE(
    'inheritingStatement',
    () => {
      this.CONSUME(Inheriting);
      this.CONSUME(Conditions);
      this.CONSUME(From);
      this.OR([
        {
          ALT: () => {
            this.CONSUME(Entity);
            this.SUBRULE(this.qualifiedName);
          },
        },
        { ALT: () => this.CONSUME(Super) },
      ]);
      this.OPTION(() => {
        this.CONSUME(Default);
        this.OR2([
          { ALT: () => this.CONSUME(True) },
          { ALT: () => this.CONSUME(False) },
        ]);
      });
      this.OPTION2(() => {
        this.SUBRULE(this.dclCondition);
      });
      this.CONSUME(Semicolon);
    },
  );

  /**
   * A DCL access condition — captured opaquely until the terminating `;`.
   * Covers literal, pfcg, aspect, user, inherit and `if-then-else` conditions
   * plus `true`/`false`/`void` and `and`/`or`/`not` combinations.
   */
  private readonly dclCondition = this.RULE('dclCondition', () => {
    // At least one token — `where ;` is malformed DCL, not an empty filter.
    this.AT_LEAST_ONE(() => {
      this.OR(
        CdsParser.DCL_TOKENS.map((tokenType) => ({
          ALT: () => this.CONSUME(tokenType),
        })),
      );
    });
  });

  // ============================================================
  // Extension: `extend view [entity] <name> with [assocs] { elems }
  //            [group by …] [union|intersect|except [all] { … }]* [;]`
  //   also: `extend abstract entity <name> …`, `extend custom entity <name> …`
  // ============================================================

  private readonly extendStatement = this.RULE('extendStatement', () => {
    this.CONSUME(Extend);
    this.OR([
      {
        ALT: () => {
          this.CONSUME(View);
          this.OPTION({
            GATE: () => this.isEntityModifier(),
            DEF: () => this.CONSUME(Entity),
          });
          this.SUBRULE(this.qualifiedName);
        },
      },
      {
        ALT: () => {
          this.CONSUME(Abstract);
          this.CONSUME2(Entity);
          this.SUBRULE2(this.qualifiedName);
        },
      },
      {
        ALT: () => {
          this.CONSUME(Custom);
          this.CONSUME3(Entity);
          this.SUBRULE3(this.qualifiedName);
        },
      },
    ]);
    this.CONSUME(With);
    this.MANY(() => {
      this.SUBRULE(this.associationTail);
    });
    this.SUBRULE(this.elementList);
    this.OPTION2(() => {
      this.CONSUME(Group);
      this.CONSUME(By);
      this.SUBRULE4(this.qualifiedName);
      this.MANY2(() => {
        this.CONSUME(Comma);
        this.SUBRULE5(this.qualifiedName);
      });
    });
    this.MANY3(() => {
      this.SUBRULE(this.extendSetOperation);
    });
    this.OPTION3(() => this.CONSUME(Semicolon));
  });

  /** `union [all]|intersect|except { … }` — extension-level set operation. */
  private readonly extendSetOperation = this.RULE('extendSetOperation', () => {
    this.OR([
      {
        ALT: () => {
          this.CONSUME(Union);
          this.OPTION(() => this.CONSUME(All));
        },
      },
      { ALT: () => this.CONSUME(Intersect) },
      { ALT: () => this.CONSUME(Except) },
    ]);
    this.SUBRULE(this.elementList);
  });

  // ============================================================
  // Table/structure members
  // ============================================================

  private readonly tableMember = this.RULE('tableMember', () => {
    this.OR([
      {
        // `include <name>` vs a field named `include` — the directive form
        // applies only when a name follows (`include x;` vs `include : t;`).
        GATE: () =>
          this.LA(1).tokenType === Include && this.isNameToken(this.LA(2)),
        ALT: () => this.SUBRULE(this.includeDirective),
      },
      { ALT: () => this.SUBRULE(this.fieldDefinition) },
    ]);
  });

  private readonly includeDirective = this.RULE('includeDirective', () => {
    this.CONSUME(Include);
    this.SUBRULE(this.cdsName);
    this.OPTION(() => {
      this.CONSUME(With);
      this.CONSUME(Suffix);
      this.SUBRULE2(this.cdsName);
    });
    this.CONSUME(Semicolon);
  });

  private readonly fieldDefinition = this.RULE('fieldDefinition', () => {
    this.MANY(() => {
      this.SUBRULE(this.annotation);
    });
    this.OPTION({
      // `key` is also a legal field name (`key : type`).
      GATE: () => this.isNameToken(this.LA(2)),
      DEF: () => this.CONSUME(Key),
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
  // Metadata extension (annotate entity|view ... with { ... })
  // ============================================================

  private readonly annotateStatement = this.RULE('annotateStatement', () => {
    this.CONSUME(Annotate);
    this.OR([
      { ALT: () => this.CONSUME(Entity) },
      { ALT: () => this.CONSUME(View) },
    ]);
    this.SUBRULE(this.cdsName);
    this.CONSUME(With);
    this.CONSUME(LBrace);
    this.MANY(() => {
      this.SUBRULE(this.annotatedElement);
    });
    this.CONSUME(RBrace);
  });

  private readonly annotatedElement = this.RULE('annotatedElement', () => {
    this.MANY(() => {
      this.SUBRULE(this.annotation);
    });
    this.SUBRULE(this.qualifiedName);
    this.CONSUME(Semicolon);
  });

  // ============================================================
  // Annotations
  // ============================================================

  private readonly topLevelAnnotation = this.RULE('topLevelAnnotation', () => {
    this.SUBRULE(this.annotation);
  });

  private readonly annotation = this.RULE('annotation', () => {
    this.CONSUME(At);
    this.SUBRULE(this.dottedName);
    this.OPTION(() => {
      this.CONSUME(Colon);
      this.SUBRULE(this.annotationValue);
    });
  });

  private readonly dottedName = this.RULE('dottedName', () => {
    this.SUBRULE(this.cdsName);
    this.MANY(() => {
      this.CONSUME(Dot);
      this.SUBRULE2(this.cdsName);
    });
  });

  private readonly annotationValue = this.RULE('annotationValue', () => {
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

  private readonly annotationArray = this.RULE('annotationArray', () => {
    this.CONSUME(LBracket);
    this.MANY_SEP({
      SEP: Comma,
      DEF: () => {
        this.SUBRULE(this.annotationValue);
      },
    });
    this.CONSUME(RBracket);
  });

  private readonly annotationObject = this.RULE('annotationObject', () => {
    this.CONSUME(LBrace);
    this.MANY_SEP({
      SEP: Comma,
      DEF: () => {
        this.SUBRULE(this.annotationProperty);
      },
    });
    this.CONSUME(RBrace);
  });

  private readonly annotationProperty = this.RULE('annotationProperty', () => {
    this.SUBRULE(this.dottedName);
    this.CONSUME(Colon);
    this.SUBRULE(this.annotationValue);
  });

  // ============================================================
  // Literals
  //   'str' | 42 | #ENUM | true | false | null | -7 | abap.dats'20200101'
  // ============================================================

  private readonly literal = this.RULE('literal', () => {
    this.OPTION(() => this.CONSUME(Minus));
    this.OR([
      { ALT: () => this.CONSUME(StringLiteral) },
      { ALT: () => this.CONSUME(NumberLiteral) },
      { ALT: () => this.CONSUME(EnumLiteral) },
      { ALT: () => this.CONSUME(True) },
      { ALT: () => this.CONSUME(False) },
      { ALT: () => this.CONSUME(Null) },
      {
        // typed literal: `abap.dats'20200101'`, `abap.char'Meier'`
        GATE: () => this.isTypedLiteral(),
        ALT: () => {
          this.CONSUME(Abap);
          this.CONSUME(Dot);
          this.SUBRULE(this.cdsName);
          this.CONSUME2(StringLiteral);
        },
      },
    ]);
  });

  /** Cheap lookahead: `abap.<type>'…'` — a typed literal. */
  private isTypedLiteral(): boolean {
    return (
      this.LA(1).tokenType === Abap &&
      this.LA(2).tokenType === Dot &&
      this.isNameToken(this.LA(3)) &&
      this.LA(4).tokenType === StringLiteral
    );
  }

  // ============================================================
  // Conditions & expressions
  //
  // `condition` is the strict form used in `on` / `where` / `having` /
  // `with default filter` / `start where` — it requires a predicate
  // (comparison, `like`, `between`, `in`, `is [not] null|initial`) in every
  // operand position, so `on A.k` alone is rejected.
  //
  // `expression` is the relaxed form used inside call arguments and
  // `case … when` operands, where a bare operand is legal.
  //
  // Both are captured opaquely as `Expression { source, tokens }`.
  // ============================================================

  private readonly condition = this.RULE('condition', () => {
    this.SUBRULE(this.conditionOperand);
    this.MANY(() => {
      this.OR([
        { ALT: () => this.CONSUME(And) },
        { ALT: () => this.CONSUME(Or) },
      ]);
      this.SUBRULE2(this.conditionOperand);
    });
  });

  private readonly conditionOperand = this.RULE('conditionOperand', () => {
    this.OPTION(() => this.CONSUME(Not));
    this.OR([
      {
        // `(a = b)` vs `(a + b) = 1` — both start with `(`; the gate looks
        // inside the group for predicate-ish tokens.
        GATE: () => this.isParenCondition(),
        ALT: () => {
          this.CONSUME(LParen);
          this.SUBRULE(this.condition);
          this.CONSUME(RParen);
        },
      },
      {
        ALT: () => {
          this.SUBRULE(this.operand);
          this.SUBRULE(this.predicate);
        },
      },
    ]);
  });

  /** The mandatory predicate part of a strict condition operand. */
  private readonly predicate = this.RULE('predicate', () => {
    this.OR([
      {
        ALT: () => {
          this.OR2([
            { ALT: () => this.CONSUME(EqEq) },
            { ALT: () => this.CONSUME(Eq) },
            { ALT: () => this.CONSUME(NotEq) },
            { ALT: () => this.CONSUME(LtEq) },
            { ALT: () => this.CONSUME(GtEq) },
            { ALT: () => this.CONSUME(Lt) },
            { ALT: () => this.CONSUME(Gt) },
          ]);
          this.SUBRULE(this.operand);
        },
      },
      {
        ALT: () => {
          this.CONSUME(Like);
          this.SUBRULE2(this.operand);
          this.OPTION({
            // `<operand> like 'p%' escape 'e'`
            GATE: () =>
              this.LA(1).tokenType === Identifier &&
              this.LA(1).image.toLowerCase() === 'escape',
            DEF: () => {
              this.CONSUME(Identifier); // `escape`
              this.SUBRULE3(this.operand);
            },
          });
        },
      },
      {
        ALT: () => {
          this.CONSUME(Between);
          this.SUBRULE4(this.operand);
          this.CONSUME(And);
          this.SUBRULE5(this.operand);
        },
      },
      {
        ALT: () => {
          this.CONSUME(In);
          this.OR3([
            {
              ALT: () => {
                this.CONSUME(LParen);
                this.OPTION2(() => {
                  this.SUBRULE6(this.operand);
                  this.MANY(() => {
                    this.CONSUME(Comma);
                    this.SUBRULE7(this.operand);
                  });
                });
                this.CONSUME(RParen);
              },
            },
            // `<operand> in :P_SET` — parameter reference (CAP-style).
            // Gate: `( … )` is always the list form; an operand starting
            // with `(` would be ambiguous.
            {
              GATE: () => this.LA(1).tokenType !== LParen,
              ALT: () => this.SUBRULE8(this.operand),
            },
          ]);
        },
      },
      {
        // `is null` / `is not null` / `is initial` / `is not initial`
        GATE: () => this.isIsPredicate(),
        ALT: () => {
          this.CONSUME2(Identifier); // `is`
          this.OPTION3(() => this.CONSUME(Not));
          this.OR4([
            { ALT: () => this.CONSUME(Null) },
            { ALT: () => this.CONSUME3(Identifier) }, // `initial`
          ]);
        },
      },
    ]);
  });

  /** Cheap lookahead: `is` — the `is null` / `is initial` predicate. */
  private isIsPredicate(): boolean {
    const first = this.LA(1);
    if (!first) return false;
    return (
      first.tokenType?.name === 'Identifier' &&
      first.image.toLowerCase() === 'is'
    );
  }

  /**
   * Relaxed expression — operands with optional predicates and AND/OR
   * chains. Used for call arguments and `case … when` branches, where a
   * bare operand is legal.
   */
  private readonly expression = this.RULE('expression', () => {
    this.SUBRULE(this.comparison);
    this.MANY(() => {
      this.OR([
        { ALT: () => this.CONSUME(And) },
        { ALT: () => this.CONSUME(Or) },
      ]);
      this.SUBRULE2(this.comparison);
    });
  });

  private readonly comparison = this.RULE('comparison', () => {
    this.SUBRULE(this.operand);
    this.OPTION(() => {
      this.SUBRULE(this.predicate);
    });
  });

  /**
   * An operand — a primary expression optionally chained with arithmetic
   * operators: `a.b`, `f(x)`, `a + b * c`, `case … end`, `cast(…)`.
   */
  private readonly operand = this.RULE('operand', () => {
    this.SUBRULE(this.primary);
    this.MANY(() => {
      this.OR([
        { ALT: () => this.CONSUME(Plus) },
        { ALT: () => this.CONSUME(Minus) },
        { ALT: () => this.CONSUME(Star) },
        { ALT: () => this.CONSUME(Slash) },
      ]);
      this.SUBRULE2(this.primary);
    });
  });

  private readonly primary = this.RULE('primary', () => {
    this.OPTION(() => {
      this.OR([
        { ALT: () => this.CONSUME(Minus) },
        { ALT: () => this.CONSUME(Plus) },
      ]);
    });
    this.OR2([
      { ALT: () => this.SUBRULE(this.parenthesizedExpression) },
      {
        GATE: () => this.isCaseExpression(),
        ALT: () => this.SUBRULE(this.caseExpression),
      },
      {
        GATE: () => this.isCastExpression(),
        ALT: () => this.SUBRULE(this.castExpression),
      },
      { ALT: () => this.SUBRULE(this.systemVariable) },
      { ALT: () => this.SUBRULE(this.parameterRef) },
      {
        // `true`/`false`/`null`/… are legal names — literal wins only when a
        // literal token actually appears.
        GATE: () => this.isLiteralStart(),
        ALT: () => this.SUBRULE(this.literal),
      },
      { ALT: () => this.SUBRULE(this.pathOperand) },
    ]);
  });

  /**
   * A path or call operand: `<name>[<attr>].<name>…` optionally followed by
   * an argument list and a window `over (…)`.
   *   - `a.b`, `_assoc.field`, `_a[to exact one: f = 1].g`
   *   - `coalesce(a, b)`, `sum(x)`, `count(*)`, `count(distinct x)`
   *   - `row_number() over (partition by a order by b descending)`
   */
  private readonly pathOperand = this.RULE('pathOperand', () => {
    this.SUBRULE(this.pathSegment);
    this.MANY(() => {
      this.CONSUME(Dot);
      this.SUBRULE2(this.pathSegment);
    });
    this.OPTION(() => {
      this.CONSUME(LParen);
      this.OPTION2(() => {
        this.SUBRULE(this.callArgument);
        this.MANY2(() => {
          this.CONSUME(Comma);
          this.SUBRULE2(this.callArgument);
        });
      });
      this.CONSUME(RParen);
      this.OPTION3(() => this.SUBRULE(this.overClause));
    });
  });

  /** One path segment: `<name>` plus optional `[…]` attributes. */
  private readonly pathSegment = this.RULE('pathSegment', () => {
    this.SUBRULE(this.cdsName);
    this.MANY(() => {
      this.SUBRULE(this.bracketTokens);
    });
  });

  /**
   * `[ … ]` — square-bracketed path attribute or association filter.
   * Contents (`cardinality`, `inner|left outer`, `where <cond>`,
   * `<card>:<cond>`, parameter bindings) are captured opaquely.
   */
  private readonly bracketTokens = this.RULE('bracketTokens', () => {
    this.CONSUME(LBracket);
    this.MANY(() => {
      this.OR(
        allTokens
          .filter(
            (t) =>
              ![
                'WhiteSpace',
                'LineComment',
                'BlockComment',
                'SqlLineComment',
                'LBracket',
                'RBracket',
              ].includes(t.name),
          )
          .map((tokenType) => ({ ALT: () => this.CONSUME(tokenType) })),
      );
    });
    this.CONSUME(RBracket);
  });

  /**
   * One call argument: `*`, `distinct <operand>` or a relaxed expression
   * (bare operands are legal inside argument lists).
   */
  private readonly callArgument = this.RULE('callArgument', () => {
    // Named argument syntax: `name => <expr>` (built-in function calls
    // such as `currency_conversion(amount => …, source_currency => …)`).
    this.OPTION({
      GATE: () =>
        this.isNameToken(this.LA(1)) && this.LA(2).tokenType === FatArrow,
      DEF: () => {
        this.SUBRULE(this.cdsName);
        this.CONSUME(FatArrow);
      },
    });
    this.OR([
      { ALT: () => this.CONSUME(Star) },
      {
        // `distinct <operand>` — `distinct` alone is a legal argument name.
        GATE: () =>
          this.LA(1).tokenType === Distinct && this.isElementStart(this.LA(2)),
        ALT: () => {
          this.CONSUME(Distinct);
          this.SUBRULE(this.operand);
        },
      },
      { ALT: () => this.SUBRULE(this.expression) },
    ]);
  });

  /**
   * `over (partition by <fields> [order by <sort items>])` — window function
   * clause.
   */
  private readonly overClause = this.RULE('overClause', () => {
    this.CONSUME(Over);
    this.CONSUME(LParen);
    this.OPTION(() => {
      this.CONSUME(Partition);
      this.CONSUME(By);
      this.SUBRULE(this.qualifiedName);
      this.MANY(() => {
        this.CONSUME(Comma);
        this.SUBRULE2(this.qualifiedName);
      });
    });
    this.OPTION2(() => {
      this.CONSUME(Order);
      this.CONSUME2(By);
      this.SUBRULE(this.sortItem);
      this.MANY2(() => {
        this.CONSUME2(Comma);
        this.SUBRULE2(this.sortItem);
      });
    });
    this.CONSUME(RParen);
  });

  /** `( <expression> )` — a parenthesized sub-expression. */
  private readonly parenthesizedExpression = this.RULE(
    'parenthesizedExpression',
    () => {
      this.CONSUME(LParen);
      this.SUBRULE(this.expression);
      this.CONSUME(RParen);
    },
  );

  /** `cast( <value> as <type> [preserving type] )` */
  private readonly castExpression = this.RULE('castExpression', () => {
    this.CONSUME(Identifier); // `cast`
    this.CONSUME(LParen);
    this.SUBRULE(this.operand);
    this.CONSUME(As);
    this.SUBRULE(this.typeReference);
    this.OPTION({
      GATE: () =>
        this.LA(1).tokenType === Identifier &&
        this.LA(1).image.toLowerCase() === 'preserving',
      DEF: () => {
        this.CONSUME2(Identifier); // `preserving`
        this.CONSUME(Type); // `type`
      },
    });
    this.CONSUME(RParen);
  });

  /**
   * `case [operand] when … then … [else …|else null] end`
   *   — simple case: `case f when 'a' then 1 …`
   *   — searched case: `case when f = 1 then 'x' …`
   */
  private readonly caseExpression = this.RULE('caseExpression', () => {
    this.CONSUME(Case);
    // `case <operand> when …` (simple case) vs `case when …` (searched) —
    // `when` is a legal operand name, so gate on it.
    this.OPTION({
      GATE: () => this.LA(1).tokenType !== When,
      DEF: () => this.SUBRULE(this.operand),
    });
    this.AT_LEAST_ONE(() => {
      this.CONSUME(When);
      this.SUBRULE(this.expression);
      this.CONSUME(Then);
      this.SUBRULE2(this.operand);
    });
    this.OPTION2(() => {
      this.CONSUME(Else);
      this.SUBRULE3(this.operand);
    });
    this.CONSUME(End);
  });

  /** `$session.client`, `$parameters.P_X`, `$projection.Field`, `$node.x`. */
  private readonly systemVariable = this.RULE('systemVariable', () => {
    this.CONSUME(Dollar);
    this.SUBRULE(this.qualifiedName);
  });

  /** `:P_Param` — a parameter reference of the consuming view. */
  private readonly parameterRef = this.RULE('parameterRef', () => {
    this.CONSUME(Colon);
    this.SUBRULE(this.qualifiedName);
  });

  // ============================================================
  // Type references
  // ============================================================

  private readonly typeReference = this.RULE('typeReference', () => {
    this.OR([
      {
        // `abap.<type>` is the builtin namespace — `x : abap` (named type
        // `abap`) stays a named type.
        GATE: () =>
          this.LA(1).tokenType === Abap && this.LA(2).tokenType === Dot,
        ALT: () => this.SUBRULE(this.builtinType),
      },
      { ALT: () => this.SUBRULE(this.namedType) },
    ]);
  });

  /** `abap.char(10)` or `abap.dec(11,2)` */
  private readonly builtinType = this.RULE('builtinType', () => {
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
  private readonly namedType = this.RULE('namedType', () => {
    this.SUBRULE(this.qualifiedName);
  });

  // ============================================================
  // Name helpers
  // ============================================================

  /** An identifier that may also be a keyword used as a name. */
  private readonly cdsName = this.RULE('cdsName', () => {
    this.OR(
      CdsParser.NAME_TOKENS.map((tokenType) => ({
        ALT: () => this.CONSUME(tokenType),
      })),
    );
  });

  /**
   * A name usable as an *implicit* (bare) source alias.
   *
   * It is `cdsName` without the FROM-region starters — those tokens belong
   * to the next item of the FROM region and must not be read as an alias.
   */
  private readonly bareAliasName = this.RULE('bareAliasName', () => {
    this.OR(
      CdsParser.NAME_TOKENS.filter(
        (tokenType) => !CdsParser.FROM_REGION_STARTERS.has(tokenType),
      ).map((tokenType) => ({
        ALT: () => this.CONSUME(tokenType),
      })),
    );
  });

  /** Dot-separated qualified name: foo.bar.baz */
  private readonly qualifiedName = this.RULE('qualifiedName', () => {
    this.SUBRULE(this.cdsName);
    this.MANY(() => {
      this.CONSUME(Dot);
      this.SUBRULE2(this.cdsName);
    });
  });
}

/** Singleton parser instance (Chevrotain parsers are reusable) */
export const cdsParser = new CdsParser();
