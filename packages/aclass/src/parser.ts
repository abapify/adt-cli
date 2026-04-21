/**
 * Statement-based ABAP OO parser.
 *
 * ABAP is a statement-terminated language: every declaration ends with
 * a `.` (`Dot` token). Rather than building a full Chevrotain CstParser
 * (which would require declaring the entire expression grammar just to
 * parse type references), we:
 *
 *   1. Tokenise with `AclassLexer` (Wave 0).
 *   2. Split the token stream into statements on `Dot`.
 *   3. Classify each statement by its leading keyword and build a typed
 *      AST node from the token slice — or produce a `RawMember` /
 *      `ParseError` when the shape is outside MVP scope.
 *
 * The trade-off versus a CstParser: we lose automatic recovery and
 * lookahead machinery, but gain (a) drastically simpler code, (b) direct
 * access to token offsets for building exact source spans, (c) easy
 * `RawMember` fallback for any shape we haven't taught yet.
 */
import type { IToken } from 'chevrotain';
import { tokenize } from './lex';
import type { ParseError } from './errors';
import type {
  AbapDefinition,
  AbapSourceFile,
  AliasDecl,
  AttributeDecl,
  ClassDef,
  ClassImpl,
  ClassMember,
  ConstantDecl,
  InterfaceDef,
  InterfaceStmt,
  MethodDecl,
  MethodImpl,
  MethodParam,
  Section,
  SourceSpan,
  StructureField,
  TableKind,
  TableTypeRef,
  TypeDecl,
  TypeRef,
  Visibility,
} from './ast';

export interface ParseResult {
  readonly ast: AbapSourceFile;
  readonly errors: readonly ParseError[];
}

/**
 * Parse an ABAP OO source file into a typed AST plus any diagnostics.
 * Returns a `{ ast, errors }` shape; never throws for malformed input.
 */
export function parse(source: string): ParseResult {
  const errors: ParseError[] = [];
  const { tokens, errors: lexErrors } = tokenize(source);
  errors.push(...lexErrors);

  const definitions: AbapDefinition[] = [];
  const cursor = new Cursor(tokens, source, errors);

  try {
    while (!cursor.eof()) {
      const def = parseTopLevel(cursor);
      if (def) definitions.push(def);
    }
  } catch (err) {
    // The parser is documented to never throw — any unexpected exception
    // (e.g. a missing `eof()` guard in a future helper) is normalised
    // into a `ParseError` and attached to the result so callers still
    // get a best-effort AST.
    errors.push({
      severity: 'error',
      message: `internal parser error: ${
        err instanceof Error ? err.message : String(err)
      }`,
      line: 1,
      column: 1,
      offset: 0,
      length: 0,
    });
  }

  const ast: AbapSourceFile = {
    kind: 'AbapSourceFile',
    source,
    definitions,
  };
  return { ast, errors };
}

// ============================================
// Cursor — linear token stream with helpers
// ============================================

class Cursor {
  private position = 0;
  constructor(
    private readonly tokens: readonly IToken[],
    private readonly source: string,
    private readonly errors: ParseError[],
  ) {}

  eof(): boolean {
    return this.position >= this.tokens.length;
  }

  peek(offset = 0): IToken | undefined {
    return this.tokens[this.position + offset];
  }

  current(): IToken {
    const t = this.tokens[this.position];
    if (!t) throw new Error('Cursor.current() called past end of stream');
    return t;
  }

  advance(): IToken {
    const t = this.current();
    this.position += 1;
    return t;
  }

  matches(name: string, offset = 0): boolean {
    return this.peek(offset)?.tokenType.name === name;
  }

  /** Collect tokens up to (not including) the next `Dot` at top level. */
  collectStatement(): {
    readonly tokens: IToken[];
    readonly terminator?: IToken;
    readonly startOffset: number;
    readonly endOffset: number;
  } {
    const collected: IToken[] = [];
    const start = this.peek()?.startOffset ?? 0;
    while (!this.eof()) {
      const t = this.current();
      if (t.tokenType.name === 'Dot') {
        this.advance();
        return {
          tokens: collected,
          terminator: t,
          startOffset: start,
          endOffset: t.endOffset ?? t.startOffset,
        };
      }
      collected.push(t);
      this.advance();
    }
    // EOF without terminating dot — pragmatic: return what we have.
    return {
      tokens: collected,
      startOffset: start,
      endOffset: collected[collected.length - 1]?.endOffset ?? start,
    };
  }

  /** Accumulate consecutive ABAPDoc lines at the current position. */
  consumeAbapDoc(): string[] | undefined {
    const doc: string[] = [];
    while (this.matches('ABAPDocLine')) {
      const t = this.advance();
      // Strip the leading `"!` and one optional leading space.
      doc.push(t.image.replace(/^"!\s?/, ''));
    }
    return doc.length > 0 ? doc : undefined;
  }

  report(
    message: string,
    at: IToken,
    severity: ParseError['severity'] = 'error',
  ): void {
    this.errors.push({
      severity,
      message,
      line: at.startLine ?? 1,
      column: at.startColumn ?? 1,
      offset: at.startOffset,
      length: (at.endOffset ?? at.startOffset) - at.startOffset + 1,
    });
  }

  sliceSource(startOffset: number, endOffset: number): string {
    return this.source.slice(startOffset, endOffset + 1);
  }

  /**
   * Return the first token whose start offset is greater than or equal
   * to the given offset. Useful for recovering line/column metadata for
   * a source-slice boundary that doesn't land on a token (e.g. the
   * start of a method body, which is usually whitespace).
   */
  firstTokenAtOrAfter(offset: number): IToken | undefined {
    for (const t of this.tokens) {
      if (t.startOffset >= offset) return t;
    }
    return undefined;
  }
}

// ============================================
// Top-level dispatcher
// ============================================

function parseTopLevel(c: Cursor): AbapDefinition | null {
  const abapDoc = c.consumeAbapDoc();
  if (c.eof()) return null;
  const t = c.current();
  const name = t.tokenType.name;

  if (name === 'Class') {
    return parseClassOrImpl(c, abapDoc);
  }
  if (name === 'Interface') {
    return parseInterface(c, abapDoc);
  }
  // Unknown top-level token — skip ahead to next `Dot` to recover.
  c.report(`unexpected top-level token "${t.image}"`, t);
  c.collectStatement();
  return null;
}

// ============================================
// CLASS … DEFINITION  OR  CLASS … IMPLEMENTATION
// ============================================

function parseClassOrImpl(
  c: Cursor,
  abapDoc: string[] | undefined,
): ClassDef | ClassImpl | null {
  // Lookahead: find the DEFINITION / IMPLEMENTATION keyword after the name.
  // Pattern: CLASS <name> {DEFINITION|IMPLEMENTATION} [ … ] .
  const classTok = c.current();
  const startOffset = classTok.startOffset;
  const startLine = classTok.startLine ?? 1;
  const startColumn = classTok.startColumn ?? 1;

  const header = c.collectStatement();
  // header.tokens[0] = Class (already advanced past)
  // Rebuild: [Class, name, DEFINITION|IMPLEMENTATION, …rest]

  const tokens = header.tokens;
  if (tokens[0]?.tokenType.name !== 'Class') {
    c.report('expected CLASS keyword', classTok);
    return null;
  }
  const nameTok = tokens[1];
  if (!nameTok || nameTok.tokenType.name !== 'Identifier') {
    c.report('expected class name after CLASS', nameTok ?? classTok);
    return null;
  }
  const kindTok = tokens[2];
  if (!kindTok) {
    c.report('expected DEFINITION or IMPLEMENTATION after class name', nameTok);
    return null;
  }

  if (kindTok.tokenType.name === 'Implementation') {
    return parseClassImpl(c, nameTok.image, {
      startOffset,
      endOffset: header.endOffset,
      startLine,
      startColumn,
    });
  }
  if (kindTok.tokenType.name !== 'Definition') {
    c.report(
      `expected DEFINITION or IMPLEMENTATION, got "${kindTok.image}"`,
      kindTok,
    );
    return null;
  }

  return parseClassDef(c, tokens, abapDoc, {
    startOffset,
    endOffset: header.endOffset,
    startLine,
    startColumn,
  });
}

function parseClassDef(
  c: Cursor,
  headerTokens: IToken[],
  abapDoc: string[] | undefined,
  headerSpan: SourceSpan,
): ClassDef {
  // headerTokens: [Class, Ident, Definition, …modifiers…]
  const name = headerTokens[1].image;
  const mods = headerTokens.slice(3);

  let isFinal = false;
  let isAbstract = false;
  let isForTesting = false;
  let createVisibility: Visibility = 'public';
  let superClass: string | undefined;

  for (let i = 0; i < mods.length; i++) {
    const t = mods[i];
    switch (t.tokenType.name) {
      case 'Public':
        break;
      case 'Final':
        isFinal = true;
        break;
      case 'Abstract':
        isAbstract = true;
        break;
      case 'Inheriting': {
        // INHERITING FROM <super>
        const from = mods[i + 1];
        const sup = mods[i + 2];
        if (from?.tokenType.name === 'From' && sup) {
          superClass = sup.image;
          i += 2;
        }
        break;
      }
      case 'Create': {
        const v = mods[i + 1];
        if (v?.tokenType.name === 'Private') createVisibility = 'private';
        else if (v?.tokenType.name === 'Protected')
          createVisibility = 'protected';
        else createVisibility = 'public';
        i += 1;
        break;
      }
      case 'For': {
        // FOR TESTING [ RISK LEVEL <x> ] [ DURATION <y> ]
        if (mods[i + 1]?.tokenType.name === 'Testing') {
          isForTesting = true;
        }
        break;
      }
      default:
        break;
    }
  }

  const sections: Section[] = [];
  while (!c.eof() && !c.matches('EndClass')) {
    const sec = parseSection(c);
    if (sec) sections.push(sec);
    else break;
  }
  // consume ENDCLASS.
  if (c.matches('EndClass')) {
    c.collectStatement();
  }

  return {
    kind: 'ClassDef',
    name,
    abapDoc,
    isFinal,
    isAbstract,
    isForTesting,
    createVisibility,
    superClass,
    sections,
    span: headerSpan,
  };
}

function parseClassImpl(
  c: Cursor,
  name: string,
  headerSpan: SourceSpan,
): ClassImpl {
  const methods: MethodImpl[] = [];
  while (!c.eof() && !c.matches('EndClass')) {
    // Skip ABAPDoc before method impl (rarely seen, but be safe)
    c.consumeAbapDoc();
    if (c.eof() || c.matches('EndClass')) break;
    if (!c.matches('Method')) {
      // Skip stray statements inside IMPLEMENTATION block
      const stray = c.collectStatement();
      if (stray.tokens.length === 0) break;
      continue;
    }
    const mi = parseMethodImpl(c);
    if (mi) methods.push(mi);
  }
  if (c.matches('EndClass')) {
    c.collectStatement();
  }
  return { kind: 'ClassImpl', name, methods, span: headerSpan };
}

function parseMethodImpl(c: Cursor): MethodImpl | null {
  const methodTok = c.current();
  const header = c.collectStatement();
  // header.tokens: [Method, Ident, …]
  const nameTok = header.tokens[1];
  if (!nameTok || nameTok.tokenType.name !== 'Identifier') {
    c.report('expected method name after METHOD', nameTok ?? methodTok);
    return null;
  }
  // Body: everything up to the next ENDMETHOD. We operate on source
  // offsets because we preserve the body verbatim.
  const bodyStart = header.endOffset + 1;
  // Walk tokens until ENDMETHOD Dot at top level. Methods don't nest, so a
  // flat scan is enough for well-formed input.
  while (!c.eof()) {
    if (c.matches('EndMethod')) {
      const endMethodStart = c.current().startOffset;
      const stmt = c.collectStatement();
      const bodyEnd = endMethodStart - 1;
      const totalEnd = stmt.endOffset;
      const body = c['sliceSource'](bodyStart, bodyEnd);
      // Locate the first non-whitespace line/column inside the body so
      // bodySpan points at the actual content, not at the `METHOD`
      // keyword that terminated with the `.` before bodyStart.
      const firstBodyTok = c.firstTokenAtOrAfter(bodyStart);
      const bodyLine = firstBodyTok?.startLine ?? methodTok.startLine ?? 1;
      const bodyCol = firstBodyTok?.startColumn ?? 1;
      return {
        kind: 'MethodImpl',
        name: nameTok.image,
        body,
        bodySpan: {
          startOffset: bodyStart,
          endOffset: bodyEnd,
          startLine: bodyLine,
          startColumn: bodyCol,
        },
        span: {
          startOffset: methodTok.startOffset,
          endOffset: totalEnd,
          startLine: methodTok.startLine ?? 1,
          startColumn: methodTok.startColumn ?? 1,
        },
      };
    }
    c.advance();
  }
  c.report('ENDMETHOD not found for METHOD block', methodTok);
  return null;
}

// ============================================
// INTERFACE … ENDINTERFACE
// ============================================

function parseInterface(
  c: Cursor,
  abapDoc: string[] | undefined,
): InterfaceDef | null {
  const ifaceTok = c.current();
  const header = c.collectStatement();
  const tokens = header.tokens;
  // [Interface, Ident, [Public], …]
  if (tokens[0]?.tokenType.name !== 'Interface') {
    c.report('expected INTERFACE keyword', ifaceTok);
    return null;
  }
  const nameTok = tokens[1];
  if (!nameTok || nameTok.tokenType.name !== 'Identifier') {
    c.report('expected interface name after INTERFACE', nameTok ?? ifaceTok);
    return null;
  }
  const isPublic = tokens.slice(2).some((t) => t.tokenType.name === 'Public');

  const members: ClassMember[] = [];
  while (!c.eof() && !c.matches('EndInterface')) {
    const m = parseMember(c);
    if (m) members.push(m);
    else break;
  }
  if (c.matches('EndInterface')) c.collectStatement();

  return {
    kind: 'InterfaceDef',
    name: nameTok.image,
    abapDoc,
    isPublic,
    members,
    span: {
      startOffset: ifaceTok.startOffset,
      endOffset: header.endOffset,
      startLine: ifaceTok.startLine ?? 1,
      startColumn: ifaceTok.startColumn ?? 1,
    },
  };
}

// ============================================
// Sections (PUBLIC / PROTECTED / PRIVATE SECTION.)
// ============================================

function parseSection(c: Cursor): Section | null {
  c.consumeAbapDoc(); // ABAPDoc on a section header is rare; drop
  if (c.eof()) return null;
  const first = c.current();
  let visibility: Visibility;
  if (first.tokenType.name === 'Public') visibility = 'public';
  else if (first.tokenType.name === 'Protected') visibility = 'protected';
  else if (first.tokenType.name === 'Private') visibility = 'private';
  else return null;
  // consume "<vis> SECTION ."
  const header = c.collectStatement();
  const sectionStart = header.startOffset;
  const members: ClassMember[] = [];
  while (!c.eof() && !isSectionBoundary(c)) {
    const m = parseMember(c);
    if (m) members.push(m);
    else break;
  }
  const end =
    members.length > 0
      ? members[members.length - 1].span.endOffset
      : header.endOffset;
  return {
    kind: 'Section',
    visibility,
    members,
    span: {
      startOffset: sectionStart,
      endOffset: end,
      startLine: first.startLine ?? 1,
      startColumn: first.startColumn ?? 1,
    },
  };
}

function isSectionBoundary(c: Cursor): boolean {
  if (c.matches('EndClass')) return true;
  if (c.matches('EndInterface')) return true;
  // `<vis> SECTION .` — we only accept these as section-starters, not
  // as member starts.
  const t = c.peek();
  if (!t) return true;
  if (
    t.tokenType.name === 'Public' ||
    t.tokenType.name === 'Protected' ||
    t.tokenType.name === 'Private'
  ) {
    return c.peek(1)?.tokenType.name === 'Section';
  }
  return false;
}

// ============================================
// Members
// ============================================

function parseMember(c: Cursor): ClassMember | null {
  const abapDoc = c.consumeAbapDoc();
  if (c.eof()) return null;
  const head = c.current();
  const name = head.tokenType.name;

  switch (name) {
    case 'Methods':
    case 'ClassMethods':
      return parseMethodDecl(c, abapDoc);
    case 'Data':
    case 'ClassData':
      return parseAttributeDecl(c, abapDoc);
    case 'Types':
      return parseTypeDecl(c, abapDoc);
    case 'Constants':
      return parseConstantDecl(c, abapDoc);
    case 'Interfaces':
      return parseInterfaceStmt(c, abapDoc);
    case 'Aliases':
      return parseAliasDecl(c, abapDoc);
    default: {
      // Unrecognised member → capture as RawMember for round-trip fidelity.
      const stmt = c.collectStatement();
      const source = c['sliceSource'](stmt.startOffset, stmt.endOffset);
      return {
        kind: 'RawMember',
        source,
        abapDoc,
        span: {
          startOffset: stmt.startOffset,
          endOffset: stmt.endOffset,
          startLine: head.startLine ?? 1,
          startColumn: head.startColumn ?? 1,
        },
      };
    }
  }
}

// --- METHODS / CLASS-METHODS ---

function parseMethodDecl(
  c: Cursor,
  abapDoc: string[] | undefined,
): MethodDecl | null {
  const head = c.current();
  const isClassMethod = head.tokenType.name === 'ClassMethods';
  const stmt = c.collectStatement();
  const toks = stmt.tokens;
  // toks: [Methods|ClassMethods, Ident, …]
  const nameTok = toks[1];
  if (!nameTok || nameTok.tokenType.name !== 'Identifier') {
    c.report('expected method name', nameTok ?? head);
    return null;
  }

  const importing: MethodParam[] = [];
  const exporting: MethodParam[] = [];
  const changing: MethodParam[] = [];
  let returning: MethodParam | undefined;
  const raising: string[] = [];

  let isAbstract = false;
  let isFinal = false;
  let isRedefinition = false;
  let isForTesting = false;

  let section:
    | 'none'
    | 'importing'
    | 'exporting'
    | 'changing'
    | 'returning'
    | 'raising' = 'none';

  let i = 2;
  while (i < toks.length) {
    const t = toks[i];
    const tn = t.tokenType.name;
    if (tn === 'Abstract') {
      isAbstract = true;
      i += 1;
      continue;
    }
    if (tn === 'Final') {
      isFinal = true;
      i += 1;
      continue;
    }
    if (tn === 'Redefinition') {
      isRedefinition = true;
      i += 1;
      continue;
    }
    if (tn === 'For' && toks[i + 1]?.tokenType.name === 'Testing') {
      isForTesting = true;
      i += 2;
      continue;
    }
    if (tn === 'Importing') {
      section = 'importing';
      i += 1;
      continue;
    }
    if (tn === 'Exporting') {
      section = 'exporting';
      i += 1;
      continue;
    }
    if (tn === 'Changing') {
      section = 'changing';
      i += 1;
      continue;
    }
    if (tn === 'Returning') {
      section = 'returning';
      i += 1;
      continue;
    }
    if (tn === 'Raising') {
      section = 'raising';
      i += 1;
      continue;
    }

    if (section === 'raising') {
      if (tn === 'Identifier') {
        raising.push(t.image);
        i += 1;
        continue;
      }
      i += 1;
      continue;
    }

    if (section === 'none') {
      i += 1;
      continue;
    }

    // Consume one parameter starting at i
    const consumed = consumeMethodParam(toks, i, c);
    if (!consumed) break;
    const { param, nextIndex } = consumed;
    if (section === 'importing') importing.push(param);
    else if (section === 'exporting') exporting.push(param);
    else if (section === 'changing') changing.push(param);
    else if (section === 'returning') returning = param;
    i = nextIndex;
  }

  return {
    kind: 'MethodDecl',
    name: nameTok.image,
    abapDoc,
    isClassMethod,
    isAbstract,
    isFinal,
    isRedefinition,
    isForTesting,
    importing,
    exporting,
    changing,
    returning,
    raising,
    span: spanFromStmt(stmt, head),
  };
}

function consumeMethodParam(
  toks: IToken[],
  start: number,
  c: Cursor,
): { param: MethodParam; nextIndex: number } | null {
  let i = start;
  let isValue = false;
  // Optional VALUE(name)
  if (
    toks[i]?.tokenType.name === 'Value' &&
    toks[i + 1]?.tokenType.name === 'LParen'
  ) {
    isValue = true;
    const nameTok = toks[i + 2];
    if (!isNameLike(nameTok)) return null;
    if (toks[i + 3]?.tokenType.name !== 'RParen') return null;
    i += 4;
    // Followed by TYPE <typeref> etc. Fall through to common path but
    // we already captured the name.
    const paramName = nameTok.image;
    return parseParamTail(toks, i, c, paramName, isValue);
  }
  // Plain name — may be a keyword-as-name (`data`, `type`, `ref`, ...).
  const nameTok = toks[i];
  if (!isNameLike(nameTok)) return null;
  i += 1;
  return parseParamTail(toks, i, c, nameTok.image, isValue);
}

function parseParamTail(
  toks: IToken[],
  start: number,
  c: Cursor,
  name: string,
  isValue: boolean,
): { param: MethodParam; nextIndex: number } | null {
  let i = start;
  // TYPE <typeref>
  if (toks[i]?.tokenType.name !== 'Type') {
    c.report(
      'expected TYPE in parameter declaration',
      toks[i] ?? toks[start - 1],
    );
    return null;
  }
  i += 1;
  const typeRes = consumeTypeRef(toks, i, c);
  if (!typeRes) return null;
  const type = typeRes.type;
  i = typeRes.nextIndex;

  let isOptional = false;
  let defaultValue: string | undefined;

  while (i < toks.length) {
    const t = toks[i];
    const tn = t.tokenType.name;
    if (tn === 'Optional') {
      isOptional = true;
      i += 1;
      continue;
    }
    if (tn === 'Default') {
      // Greedy: take everything until the next keyword that would start a
      // new section or the next parameter.
      i += 1;
      const startTok = toks[i];
      if (!startTok) break;
      const valStart = startTok.startOffset;
      let valEnd = startTok.endOffset ?? startTok.startOffset;
      while (i < toks.length) {
        const nt = toks[i]?.tokenType.name;
        if (
          nt === 'Optional' ||
          nt === 'Importing' ||
          nt === 'Exporting' ||
          nt === 'Changing' ||
          nt === 'Returning' ||
          nt === 'Raising'
        ) {
          break;
        }
        valEnd = toks[i].endOffset ?? valEnd;
        i += 1;
        if (i < toks.length && toks[i]?.tokenType.name === 'Identifier') {
          // Likely start of next parameter — stop.
          // Heuristic: two consecutive idents without a connective is a new param.
          break;
        }
      }
      defaultValue = c['sliceSource'](valStart, valEnd);
      continue;
    }
    // Unknown keyword → param ends here
    break;
  }

  const startTok = toks[start - (isValue ? 4 : 1)];
  const endTok = toks[i - 1] ?? startTok;
  const param: MethodParam = {
    kind: 'MethodParam',
    name,
    type,
    isValue,
    isOptional,
    defaultValue,
    span: {
      startOffset: startTok.startOffset,
      endOffset: endTok.endOffset ?? endTok.startOffset,
      startLine: startTok.startLine ?? 1,
      startColumn: startTok.startColumn ?? 1,
    },
  };
  return { param, nextIndex: i };
}

/**
 * Shared body for member declarations shaped like `<head> <name> TYPE
 * <typeref> [rest…]`. Returns `{ nameTok, typeRes, toks, stmt, tailIdx }`
 * where `tailIdx` is the index of the first token AFTER the type-ref so
 * callers can inspect modifiers such as `READ-ONLY` / `VALUE <lit>`.
 */
function parseNameTypeStatement(
  c: Cursor,
  expectation: { name: string; type: string },
): {
  nameTok: IToken;
  typeRes: { type: TypeRef; nextIndex: number };
  toks: IToken[];
  stmt: ReturnType<Cursor['collectStatement']>;
  tailIdx: number;
} | null {
  const head = c.current();
  const stmt = c.collectStatement();
  const toks = stmt.tokens;
  // toks[0] = head keyword (already validated by the caller dispatching on it)
  const nameTok = toks[1];
  if (!nameTok || nameTok.tokenType.name !== 'Identifier') {
    c.report(`expected ${expectation.name}`, nameTok ?? head);
    return null;
  }
  if (toks[2]?.tokenType.name !== 'Type') {
    c.report(`expected TYPE in ${expectation.type}`, toks[2] ?? head);
    return null;
  }
  const typeRes = consumeTypeRef(toks, 3, c);
  if (!typeRes) return null;
  return { nameTok, typeRes, toks, stmt, tailIdx: typeRes.nextIndex };
}

// --- DATA / CLASS-DATA ---

function parseAttributeDecl(
  c: Cursor,
  abapDoc: string[] | undefined,
): AttributeDecl | null {
  const head = c.current();
  const isClassData = head.tokenType.name === 'ClassData';
  const parsed = parseNameTypeStatement(c, {
    name: 'attribute name',
    type: 'attribute declaration',
  });
  if (!parsed) return null;
  const { nameTok, typeRes, toks, stmt, tailIdx } = parsed;
  const isReadOnly = toks[tailIdx]?.tokenType.name === 'ReadOnly';
  return {
    kind: 'AttributeDecl',
    name: nameTok.image,
    abapDoc,
    isClassData,
    isReadOnly,
    type: typeRes.type,
    span: spanFromStmt(stmt, head),
  };
}

// --- TYPES ---

function parseTypeDecl(
  c: Cursor,
  abapDoc: string[] | undefined,
): TypeDecl | null {
  const head = c.current();
  // Two shapes: `TYPES <name> TYPE …` or `TYPES: BEGIN OF <name>. … END OF <name>.`
  // The latter spans multiple statements.

  const first = c.peek(1);
  const second = c.peek(2);
  const third = c.peek(3);

  // Detect `TYPES: BEGIN OF name,` form
  if (
    first?.tokenType.name === 'Colon' &&
    second?.tokenType.name === 'Begin' &&
    third?.tokenType.name === 'Of'
  ) {
    return parseStructureTypes(c, abapDoc);
  }

  // Simple form — single statement ending with Dot.
  const parsed = parseNameTypeStatement(c, {
    name: 'type name after TYPES',
    type: 'TYPES declaration',
  });
  if (!parsed) return null;
  const { nameTok, typeRes, stmt } = parsed;
  return {
    kind: 'TypeDecl',
    name: nameTok.image,
    abapDoc,
    shape: { kind: 'alias', type: typeRes.type },
    span: spanFromStmt(stmt, head),
  };
}

function parseStructureTypes(
  c: Cursor,
  abapDoc: string[] | undefined,
): TypeDecl | null {
  const head = c.current(); // Types
  // `TYPES: BEGIN OF <name>, <field> TYPE <typeref>, … END OF <name>.`
  // is a SINGLE chained statement terminated by one Dot. Collect the
  // whole thing; commas inside split the chain items.
  const stmt = c.collectStatement();
  const toks = stmt.tokens;
  // [Types, Colon, Begin, Of, Ident, Comma, <field>, Comma, <field>, Comma, End, Of, Ident]
  const nameTok = toks[4];
  if (!nameTok || nameTok.tokenType.name !== 'Identifier') {
    c.report('expected struct name in BEGIN OF', nameTok ?? head);
    return null;
  }
  const structName = nameTok.image;

  // Locate the terminating `END OF <name>` tail and harvest fields between.
  let endIdx = -1;
  for (let k = 5; k < toks.length - 1; k++) {
    if (
      toks[k].tokenType.name === 'End' &&
      toks[k + 1]?.tokenType.name === 'Of'
    ) {
      endIdx = k;
      break;
    }
  }
  const fieldsEnd = endIdx >= 0 ? endIdx : toks.length;
  const fields: StructureField[] = [];
  parseFieldRun(toks.slice(5, fieldsEnd), fields, c);

  return {
    kind: 'TypeDecl',
    name: structName,
    abapDoc,
    shape: { kind: 'structure', fields },
    span: {
      startOffset: head.startOffset,
      endOffset: stmt.endOffset,
      startLine: head.startLine ?? 1,
      startColumn: head.startColumn ?? 1,
    },
  };
}

function parseFieldRun(toks: IToken[], out: StructureField[], c: Cursor): void {
  let i = 0;
  while (i < toks.length) {
    // Skip a leading Comma (from end-of-previous-field in the raw source)
    if (toks[i]?.tokenType.name === 'Comma') {
      i += 1;
      continue;
    }
    const nameTok = toks[i];
    if (!isNameLike(nameTok)) {
      // Unexpected — skip to next comma to recover
      while (i < toks.length && toks[i].tokenType.name !== 'Comma') i += 1;
      continue;
    }
    if (toks[i + 1]?.tokenType.name !== 'Type') {
      i += 1;
      continue;
    }
    // Slurp type-ref tokens up to the next Comma (or end)
    let j = i + 2;
    const typeStart = j;
    while (j < toks.length && toks[j].tokenType.name !== 'Comma') {
      j += 1;
    }
    const typeRes = consumeTypeRef(toks, typeStart, c, j);
    if (typeRes) {
      const last = toks[j - 1] ?? nameTok;
      out.push({
        kind: 'StructureField',
        name: nameTok.image,
        type: typeRes.type,
        span: {
          startOffset: nameTok.startOffset,
          endOffset: last.endOffset ?? last.startOffset,
          startLine: nameTok.startLine ?? 1,
          startColumn: nameTok.startColumn ?? 1,
        },
      });
    }
    i = j;
  }
}

// --- CONSTANTS ---

function parseConstantDecl(
  c: Cursor,
  abapDoc: string[] | undefined,
): ConstantDecl | null {
  const head = c.current();
  const stmt = c.collectStatement();
  const toks = stmt.tokens;
  // [Constants, Ident, Type, <type>, Value, <value tokens>]
  const nameTok = toks[1];
  if (!nameTok || nameTok.tokenType.name !== 'Identifier') {
    c.report('expected constant name', nameTok ?? head);
    return null;
  }
  if (toks[2]?.tokenType.name !== 'Type') {
    c.report('expected TYPE in CONSTANTS', toks[2] ?? head);
    return null;
  }
  // Find VALUE keyword
  let vIdx = -1;
  for (let k = 3; k < toks.length; k++) {
    if (toks[k].tokenType.name === 'Value') {
      vIdx = k;
      break;
    }
  }
  if (vIdx < 0) {
    c.report('expected VALUE in CONSTANTS', head);
    return null;
  }
  const typeRes = consumeTypeRef(toks, 3, c, vIdx);
  if (!typeRes) return null;
  const valueStart = toks[vIdx + 1]?.startOffset ?? 0;
  const valueEnd = toks[toks.length - 1]?.endOffset ?? valueStart;
  const value = c['sliceSource'](valueStart, valueEnd);
  return {
    kind: 'ConstantDecl',
    name: nameTok.image,
    abapDoc,
    type: typeRes.type,
    value,
    span: spanFromStmt(stmt, head),
  };
}

// --- INTERFACES <name> . ---

function parseInterfaceStmt(
  c: Cursor,
  abapDoc: string[] | undefined,
): InterfaceStmt | null {
  const head = c.current();
  const stmt = c.collectStatement();
  const nameTok = stmt.tokens[1];
  if (!nameTok || nameTok.tokenType.name !== 'Identifier') {
    c.report('expected interface name after INTERFACES', nameTok ?? head);
    return null;
  }
  return {
    kind: 'InterfaceStmt',
    name: nameTok.image,
    abapDoc,
    span: spanFromStmt(stmt, head),
  };
}

// --- ALIASES <local> FOR <target> . ---

function parseAliasDecl(
  c: Cursor,
  abapDoc: string[] | undefined,
): AliasDecl | null {
  const head = c.current();
  const stmt = c.collectStatement();
  const toks = stmt.tokens;
  const nameTok = toks[1];
  if (!nameTok || nameTok.tokenType.name !== 'Identifier') {
    c.report('expected alias name', nameTok ?? head);
    return null;
  }
  if (toks[2]?.tokenType.name !== 'For') {
    c.report('expected FOR in ALIASES', toks[2] ?? head);
    return null;
  }
  const targetStart = toks[3]?.startOffset ?? 0;
  const targetEnd = toks[toks.length - 1]?.endOffset ?? targetStart;
  const target = c['sliceSource'](targetStart, targetEnd);
  return {
    kind: 'AliasDecl',
    name: nameTok.image,
    target,
    abapDoc,
    span: spanFromStmt(stmt, head),
  };
}

// ============================================
// Type-ref consumption
// ============================================

function consumeTypeRef(
  toks: IToken[],
  start: number,
  c: Cursor,
  endBound?: number,
): { type: TypeRef; nextIndex: number } | null {
  const limit = endBound ?? toks.length;
  const i = start;
  if (i >= limit) {
    c.report('expected type reference', toks[i - 1] ?? toks[0]);
    return null;
  }

  // REF TO <target>
  if (
    toks[i]?.tokenType.name === 'Ref' &&
    toks[i + 1]?.tokenType.name === 'To'
  ) {
    const inner = consumeTypeRef(toks, i + 2, c, limit);
    if (!inner) return null;
    const startTok = toks[i];
    const lastTok = toks[inner.nextIndex - 1] ?? startTok;
    return {
      type: {
        kind: 'RefToTypeRef',
        target: inner.type,
        source: c['sliceSource'](
          startTok.startOffset,
          lastTok.endOffset ?? lastTok.startOffset,
        ),
      },
      nextIndex: inner.nextIndex,
    };
  }

  // STANDARD|SORTED|HASHED TABLE OF <row> [WITH …]
  const tableKind = peekTableKind(toks, i);
  if (tableKind) {
    return consumeTableTypeRef(toks, i, c, limit, tableKind);
  }

  // Simple name / qualified form: <name> (=>|~) <name> [(=>|~) <name> …]
  // `<name>` accepts any identifier-shaped token, including keywords
  // that the grammar re-purposes as names in declaration positions
  // (`DATA data TYPE i.`, `REF TO data`, `TYPE type`, etc.).
  const startTok: IToken | undefined = toks[i];
  if (!isNameLike(startTok)) {
    // `startTok` is narrowed to `undefined` here (isNameLike rejected a
    // present token would also land here; in that case the image is
    // already captured in `toks[i]` so read from there).
    const at = toks[i] ?? toks[i - 1] ?? toks[0];
    const label = at ? at.image : '<eof>';
    c.report(`expected type name, got "${label}"`, at);
    return null;
  }
  let lastIdx = i;
  const nameParts: string[] = [startTok.image];
  let j = i + 1;
  while (j < limit) {
    const t = toks[j]?.tokenType.name;
    if (t === 'FatArrow' || t === 'Tilde') {
      const next = toks[j + 1];
      if (!isNameLike(next)) break;
      nameParts.push(t === 'FatArrow' ? '=>' : '~', next.image);
      lastIdx = j + 1;
      j += 2;
      continue;
    }
    break;
  }
  const lastTok = toks[lastIdx];
  const source = c['sliceSource'](
    startTok.startOffset,
    lastTok.endOffset ?? lastTok.startOffset,
  );
  const fullName = nameParts.join('');
  const type: TypeRef = isBuiltinName(fullName)
    ? { kind: 'BuiltinTypeRef', name: fullName, source }
    : { kind: 'NamedTypeRef', name: fullName, source };
  return { type, nextIndex: lastIdx + 1 };
}

function peekTableKind(toks: IToken[], i: number): TableKind | null {
  const t = toks[i]?.tokenType.name;
  if (t === 'Standard' && toks[i + 1]?.tokenType.name === 'Table')
    return 'standard';
  if (t === 'Sorted' && toks[i + 1]?.tokenType.name === 'Table')
    return 'sorted';
  if (t === 'Hashed' && toks[i + 1]?.tokenType.name === 'Table')
    return 'hashed';
  return null;
}

function consumeTableTypeRef(
  toks: IToken[],
  start: number,
  c: Cursor,
  limit: number,
  tableKind: TableKind,
): { type: TableTypeRef; nextIndex: number } {
  // STANDARD TABLE OF <row> WITH …
  let i = start + 2; // skip STANDARD TABLE
  if (toks[i]?.tokenType.name !== 'Of') {
    c.report('expected OF in TABLE OF', toks[i] ?? toks[start]);
    return fallbackTable(toks, start, i, tableKind, c);
  }
  i += 1;
  const rowRes = consumeTypeRef(toks, i, c, limit);
  if (!rowRes) {
    return fallbackTable(toks, start, i, tableKind, c);
  }
  i = rowRes.nextIndex;
  // WITH … key clause runs to end of statement / bound
  const keyStart = i;
  while (i < limit) i += 1;
  const keyTokens = toks.slice(keyStart, limit);
  const keyClause =
    keyTokens.length > 0
      ? c['sliceSource'](
          keyTokens[0].startOffset,
          (keyTokens[keyTokens.length - 1].endOffset ??
            keyTokens[keyTokens.length - 1].startOffset) as number,
        )
      : '';
  const startTok = toks[start];
  const lastTok = toks[limit - 1] ?? startTok;
  return {
    type: {
      kind: 'TableTypeRef',
      tableKind,
      row: rowRes.type,
      keyClause,
      source: c['sliceSource'](
        startTok.startOffset,
        lastTok.endOffset ?? lastTok.startOffset,
      ),
    },
    nextIndex: i,
  };
}

function fallbackTable(
  toks: IToken[],
  start: number,
  i: number,
  tableKind: TableKind,
  c: Cursor,
): { type: TableTypeRef; nextIndex: number } {
  const startTok = toks[start];
  const lastTok = toks[i - 1] ?? startTok;
  return {
    type: {
      kind: 'TableTypeRef',
      tableKind,
      row: { kind: 'NamedTypeRef', name: '?', source: '?' },
      keyClause: '',
      source: c['sliceSource'](
        startTok.startOffset,
        lastTok.endOffset ?? lastTok.startOffset,
      ),
    },
    nextIndex: i,
  };
}

// ============================================
// Helpers
// ============================================

function spanFromStmt(
  stmt: { startOffset: number; endOffset: number },
  anchor: IToken,
): SourceSpan {
  return {
    startOffset: stmt.startOffset,
    endOffset: stmt.endOffset,
    startLine: anchor.startLine ?? 1,
    startColumn: anchor.startColumn ?? 1,
  };
}

/**
 * True when the token can legally appear in a position that expects an
 * ABAP identifier (type name, field name, parameter name, qualified part).
 *
 * The ABAP grammar allows many reserved words to be reused as names in
 * declaration positions — e.g. `DATA data TYPE i.`, `METHODS foo IMPORTING
 * type TYPE string.`, `TYPES: BEGIN OF x, data TYPE i, END OF x.`.
 * At the lexer level those tokens are classified as keywords; the parser
 * has to reinterpret them contextually.
 *
 * We accept: `Identifier`, plus any token whose `image` is a plain ABAP
 * identifier (starts with letter/underscore, only contains the chars a
 * real identifier would). This keeps the rule cheap (no huge keyword
 * allowlist) and catches every keyword that can legally be a name.
 */
function isNameLike(t: IToken | undefined): t is IToken {
  if (!t) return false;
  if (t.tokenType.name === 'Identifier') return true;
  // Symbols (`Dot`, `Comma`, `FatArrow`, ...) have non-alphabetic images.
  return /^[A-Za-z_][A-Za-z0-9_/]*$/.test(t.image);
}

const BUILTIN_ABAP_TYPES = new Set([
  'string',
  'xstring',
  'i',
  'int8',
  'int4',
  'int2',
  'int1',
  'f',
  'p',
  'c',
  'n',
  'd',
  't',
  'decfloat16',
  'decfloat34',
  'timestampl',
  'timestamp',
  'abap_bool',
  'abap_boolean',
  'abap_true',
  'abap_false',
  'sy-subrc',
  'sy-tabix',
]);
function isBuiltinName(name: string): boolean {
  return BUILTIN_ABAP_TYPES.has(name.toLowerCase());
}
