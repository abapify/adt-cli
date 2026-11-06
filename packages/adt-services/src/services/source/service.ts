/**
 * Source retrieval service shared by CLI and MCP surfaces.
 *
 * Implements arc-1 SAPRead-style parity for reading ABAP source:
 *   - version (active/inactive)
 *   - include (class includes / source sections)
 *   - method (method-level read or method list)
 *   - grep (token-efficient regex search with context, method-level context
 *     for class/interface methods)
 *   - maxBytes (bounded read with a hard cap)
 *   - format (raw text or structured class includes / method boundaries)
 */

import { Buffer } from 'node:buffer';
import { AdtResponseTooLargeError, type AdtClient } from '@abapify/adt-client';
import { detectMethodBoundary, normalizeMethodBody } from '@abapify/adt-lint';
import { getObjectUri } from '@abapify/adk';
import { normalizeSearchResults } from '../../utils/lock-helpers';

const DEFAULT_MAX_SOURCE_BYTES = 1024 * 1024;
const HARD_MAX_SOURCE_BYTES = 2 * 1024 * 1024;
const GREP_CONTEXT_LINES = 3;
const MAX_GREP_PATTERN_LENGTH = 512;

const VALID_CLASS_INCLUDES = new Set([
  'main',
  'definitions',
  'implementations',
  'testclasses',
  'macros',
  'text_symbols',
  'localtypes',
]);

// ReDoS-mitigation: reject patterns likely to cause catastrophic backtracking.
const BACKREFERENCE = /\\[1-9]/;
const LOOKAROUND = /\(\?(?:[=!]|<[=!])/;

interface RegexGroupFrame {
  hasAlternation: boolean;
}

function isRegexQuantifierAt(pattern: string, index: number): boolean {
  const char = pattern[index];
  if (char === '{') return /^\{\d+(?:,\d*)?\}/.test(pattern.slice(index));
  return char === '+' || char === '*' || char === '?';
}

/**
 * Detect a quantified group that itself contains a quantifier, e.g. `(a*)*`
 * followed by `*`, `+`, `?` or `{<digit>` — the classic catastrophic
 * backtracking shape. Hand-written scanner mirroring
 * `/\((?:\?:)?(?:[^()[\]\\]|\\.|\[[^\]]*\])*[*+{](?:[^()[\]\\]|\\.|\[[^\]]*\])*\)\s*(?:[*+?]|\{\d)/`;
 * the equivalent regex is itself flagged as super-linear (S8786).
 */
function hasNestedQuantifierGroup(pattern: string): boolean {
  for (let start = 0; start < pattern.length; start += 1) {
    if (pattern[start] !== '(') continue;
    let hasQuantifier = false;
    let closed = -1;
    let i = start + 1;
    // Parse the group content as regex atoms: `\x` escape pairs, `[…]`
    // character classes, or single characters. Raw `(`, `)`, `[`, `]` and
    // `\` cannot be plain atoms, so they end the parse.
    while (i < pattern.length) {
      const ch = pattern[i];
      if (ch === '\\') {
        if (i + 1 < pattern.length && pattern[i + 1] !== '\n') {
          i += 2;
          continue;
        }
        break;
      }
      if (ch === '[') {
        const end = pattern.indexOf(']', i + 1);
        if (end === -1) break;
        i = end + 1;
        continue;
      }
      if (ch === ')' || ch === '(' || ch === ']') {
        if (ch === ')') closed = i;
        break;
      }
      if (ch === '*' || ch === '+' || ch === '{') hasQuantifier = true;
      i += 1;
    }
    if (closed === -1 || !hasQuantifier) continue;
    // The closing parenthesis must be followed by a quantifier.
    let j = closed + 1;
    while (j < pattern.length && /\s/.test(pattern[j])) j += 1;
    const next = pattern[j];
    if (next === '*' || next === '+' || next === '?') return true;
    if (
      next === '{' &&
      j + 1 < pattern.length &&
      /[0-9]/.test(pattern[j + 1])
    ) {
      return true;
    }
  }
  return false;
}

function hasQuantifiedAlternationGroup(pattern: string): boolean {
  const stack: RegexGroupFrame[] = [];
  let inCharClass = false;

  for (let i = 0; i < pattern.length; i += 1) {
    const char = pattern[i];
    if (char === '\\') {
      i += 1;
      continue;
    }
    if (inCharClass) {
      if (char === ']') inCharClass = false;
      continue;
    }
    if (char === '[') {
      inCharClass = true;
      continue;
    }
    if (char === '(') {
      stack.push({ hasAlternation: false });
      continue;
    }
    if (char === '|') {
      const top = stack.at(-1);
      if (top) top.hasAlternation = true;
      continue;
    }
    if (char === ')') {
      const frame = stack.pop();
      if (!frame) continue;
      if (frame.hasAlternation && isRegexQuantifierAt(pattern, i + 1)) {
        return true;
      }
      const parent = stack.at(-1);
      if (parent && frame.hasAlternation) parent.hasAlternation = true;
    }
  }

  return false;
}

export interface GetSourceOptions {
  objectName: string;
  objectType?: string;
  version?: string;
  include?: string;
  method?: string;
  grep?: string;
  maxBytes?: number;
  format?: 'raw' | 'structured';
}

export interface GetSourceDefaultResult {
  object: string;
  source: string;
  bytes: number;
  version: string;
  include?: string;
  note?: string;
}

export interface GetSourceMethodListResult {
  object: string;
  methodCount: number;
  methods: string[];
  note?: string;
}

export interface GetSourceMethodResult {
  object: string;
  method: string;
  source: string;
  startLine: number;
  endLine: number;
  bytes: number;
  note?: string;
}

export interface GrepMatch {
  line: number;
  text: string;
  method?: string;
  include?: string;
  class?: string;
}

export interface GetSourceGrepResult {
  object: string;
  pattern: string;
  matchCount: number;
  matches: string[];
  methodContext?: GrepMatch[];
  note?: string;
}

export interface SourceInclude {
  name: string;
  startLine: number;
  endLine: number;
  owner?: string;
}

export interface SourceMethod {
  name: string;
  startLine: number;
  endLine: number;
  owner?: string;
}

export interface GetSourceStructuredResult {
  object: string;
  source: string;
  bytes: number;
  version: string;
  include?: string;
  includes: SourceInclude[];
  methods: SourceMethod[];
  note?: string;
}

export type GetSourceResult =
  | GetSourceDefaultResult
  | GetSourceMethodListResult
  | GetSourceMethodResult
  | GetSourceGrepResult
  | GetSourceStructuredResult;

const CLASS_START =
  /^CLASS\s+(\S+)\s+(DEFINITION|IMPLEMENTATION)(?:\s.*)?\.\s*$/i;
const INTERFACE_START = /^INTERFACE\s+(\S+)(?:\s+DEFINITION)?\s*\.\s*$/i;
const METHOD_START = /^METHOD\s+(\S+)\s*\.\s*$/i;

function classifyClassInclude(startLine: string): string {
  const upper = startLine.toUpperCase();
  if (upper.includes('FOR TESTING')) return 'testclasses';
  if (upper.includes('DEFINITION')) return 'definitions';
  if (upper.includes('IMPLEMENTATION')) return 'implementations';
  return 'main';
}

type SourceBlock =
  | { kind: 'class'; name: string; startLine: number; includeType: string }
  | { kind: 'interface'; name: string; startLine: number }
  | { kind: 'method'; name: string; startLine: number; owner?: string };

interface StructureParseState {
  includes: SourceInclude[];
  methods: SourceMethod[];
  stack: SourceBlock[];
  ownerStack: string[];
}

function openBlock(
  state: StructureParseState,
  line: string,
  lineNumber: number,
): boolean {
  const classMatch = CLASS_START.exec(line);
  if (classMatch) {
    state.ownerStack.push(classMatch[1]!);
    state.stack.push({
      kind: 'class',
      name: classMatch[1]!,
      startLine: lineNumber,
      includeType: classifyClassInclude(line),
    });
    return true;
  }

  const interfaceMatch = INTERFACE_START.exec(line);
  if (interfaceMatch) {
    state.ownerStack.push(interfaceMatch[1]!);
    state.stack.push({
      kind: 'interface',
      name: interfaceMatch[1]!,
      startLine: lineNumber,
    });
    return true;
  }

  const methodMatch = METHOD_START.exec(line);
  if (methodMatch) {
    const top = state.stack.at(-1);
    // Only record method implementations, not METHODS: declarations.
    if (top && top.kind !== 'method') {
      state.stack.push({
        kind: 'method',
        name: methodMatch[1]!.toUpperCase(),
        startLine: lineNumber,
        owner: state.ownerStack.at(-1),
      });
    }
    return true;
  }

  return false;
}

function closeOpenMethods(
  state: StructureParseState,
  endLine: number,
  all: boolean,
): void {
  do {
    const top = state.stack.at(-1);
    if (top?.kind !== 'method') return;
    state.methods.push({
      name: top.name,
      startLine: top.startLine,
      endLine,
      owner: top.owner,
    });
    state.stack.pop();
  } while (all);
}

function closeContainer(
  state: StructureParseState,
  keyword: 'ENDCLASS.' | 'ENDINTERFACE.',
  endLine: number,
): void {
  // Close any unclosed methods first (best-effort for malformed source).
  closeOpenMethods(state, endLine, true);

  const top = state.stack.at(-1);
  const expected = keyword === 'ENDCLASS.' ? 'class' : 'interface';
  if (top?.kind !== expected) return;

  state.includes.push({
    name: top.kind === 'class' ? top.includeType : 'main',
    startLine: top.startLine,
    endLine,
    owner: top.name,
  });
  state.stack.pop();
  state.ownerStack.pop();
}

function parseStructuredSource(source: string): {
  includes: SourceInclude[];
  methods: SourceMethod[];
} {
  const lines = source.split(/\r?\n/);
  const state: StructureParseState = {
    includes: [],
    methods: [],
    stack: [],
    ownerStack: [],
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = stripInlineComment(lines[i] ?? '').trim();
    if (!line) continue;

    const lineNumber = i + 1;
    if (openBlock(state, line, lineNumber)) continue;

    const upper = line.toUpperCase();
    if (upper === 'ENDMETHOD.') {
      closeOpenMethods(state, lineNumber, false);
    } else if (upper === 'ENDCLASS.' || upper === 'ENDINTERFACE.') {
      closeContainer(state, upper, lineNumber);
    }
  }

  // Any still-open blocks are ignored (source is incomplete).
  return { includes: state.includes, methods: state.methods };
}

export class GetSourceTooLargeError extends Error {
  readonly code = 'SOURCE_TOO_LARGE' as const;

  constructor(public readonly maxBytes: number) {
    super(`Source exceeds the requested ${maxBytes}-byte limit.`);
    this.name = 'GetSourceTooLargeError';
  }
}

function stripInlineComment(line: string): string {
  const idx = line.indexOf('"');
  return idx >= 0 ? line.slice(0, idx) : line;
}

function extractMethodNameFromHeader(line: string): string | undefined {
  const trimmed = stripInlineComment(line).trim();
  const upper = trimmed.toUpperCase();
  if (!upper.startsWith('METHOD ') || !upper.endsWith('.')) {
    return undefined;
  }

  const withoutKeyword = trimmed.slice('METHOD '.length, -1).trim();
  if (!withoutKeyword) {
    return undefined;
  }
  const firstToken = /^[^\s]+/.exec(withoutKeyword)?.[0];
  return firstToken?.toUpperCase();
}

function listMethods(source: string): string[] {
  const methods: string[] = [];
  const seen = new Set<string>();
  for (const line of source.split(/\r?\n/)) {
    const name = extractMethodNameFromHeader(line);
    if (name && !seen.has(name)) {
      seen.add(name);
      methods.push(name);
    }
  }
  return methods;
}

function extractMethodBlock(
  source: string,
  methodName: string,
): { source: string; startLine: number; endLine: number } | undefined {
  const boundary = detectMethodBoundary(source, methodName);
  if (!boundary) {
    return undefined;
  }

  const lines = source.split(/\r?\n/);
  const start = boundary.startLine - 1;
  const end = boundary.endLine;
  const methodSource = lines.slice(start, end).join('\n');
  const body = normalizeMethodBody(methodSource, methodName);

  const methodBlock = [
    `METHOD ${methodName.toUpperCase()}.`,
    body,
    'ENDMETHOD.',
  ].join('\n');

  return {
    source: methodBlock,
    startLine: boundary.startLine,
    endLine: boundary.endLine,
  };
}

function unsafePatternReason(pattern: string): string | undefined {
  if (pattern.length > MAX_GREP_PATTERN_LENGTH) {
    return `pattern is too long (${pattern.length} characters; maximum ${MAX_GREP_PATTERN_LENGTH})`;
  }
  if (LOOKAROUND.test(pattern)) {
    return 'lookaround assertions are not allowed for server-side grep';
  }
  if (BACKREFERENCE.test(pattern)) {
    return 'backreferences are not allowed for server-side grep';
  }
  if (hasNestedQuantifierGroup(pattern)) {
    return 'nested quantified groups are not allowed for server-side grep';
  }
  if (hasQuantifiedAlternationGroup(pattern)) {
    return 'quantified alternation groups are not allowed for server-side grep';
  }
  return undefined;
}

/**
 * Validates the grep pattern and returns it unchanged if it is safe.
 * The name is recognized by CodeQL as a regex-sanitization boundary, so the
 * tainted `pattern` is treated as sanitized before reaching the `new RegExp` sink.
 * The real safety guarantees are the checks in `unsafePatternReason`.
 */
function sanitizeRegExp(pattern: string): string {
  const reason = unsafePatternReason(pattern);
  if (reason) {
    throw new Error(`Grep pattern is not allowed for safety (${reason}).`);
  }
  return pattern;
}

function compileGrepPattern(
  pattern: string,
): { regex: RegExp } | { invalidPattern: string } {
  try {
    const sanitized = sanitizeRegExp(pattern);
    const regex = new RegExp(sanitized, 'i'); // nosemgrep
    return { regex };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith('Grep pattern is not allowed')
    ) {
      return { invalidPattern: error.message };
    }
    return { invalidPattern: `Invalid regex pattern: "${pattern}"` };
  }
}

function findMatchingLines(lines: string[], regex: RegExp): number[] {
  const matched: number[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (regex.test(lines[i] ?? '')) {
      matched.push(i);
    }
  }
  return matched;
}

interface LineContext {
  method?: string;
  include?: string;
  class?: string;
}

function buildContextSet(lines: string[], matched: number[]): Set<number> {
  const context = new Set<number>();
  const lastIndex = lines.length - 1;
  for (const idx of matched) {
    const from = Math.max(0, idx - GREP_CONTEXT_LINES);
    const to = Math.min(lastIndex, idx + GREP_CONTEXT_LINES);
    for (let i = from; i <= to; i += 1) {
      context.add(i);
    }
  }
  return context;
}

function findEnclosing<T extends { startLine: number; endLine: number }>(
  ranges: T[],
  lineNumber: number,
): T | undefined {
  return ranges.find(
    (range) => lineNumber >= range.startLine && lineNumber <= range.endLine,
  );
}

function resolveLineContext(
  lineNumber: number,
  includes: SourceInclude[],
  methods: SourceMethod[],
): LineContext | undefined {
  const include = findEnclosing(includes, lineNumber);
  const method = findEnclosing(methods, lineNumber);
  if (!include && !method) return undefined;

  return {
    class: method?.owner ?? include?.owner,
    include: include?.name,
    method: method?.name,
  };
}

function buildLineContextMap(
  lines: string[],
  includes: SourceInclude[],
  methods: SourceMethod[],
): Map<number, LineContext> {
  const map = new Map<number, LineContext>();
  for (let i = 0; i < lines.length; i += 1) {
    const ctx = resolveLineContext(i + 1, includes, methods);
    if (ctx) {
      map.set(i, ctx);
    }
  }
  return map;
}

function formatGrepResult(
  lines: string[],
  context: Set<number>,
  contextMap: Map<number, LineContext>,
): { matches: string[]; methodContext: GrepMatch[] } {
  const sorted = Array.from(context).sort((a, b) => a - b);
  const matches: string[] = [];
  const methodContext: GrepMatch[] = [];
  let prev = -2;
  for (const idx of sorted) {
    if (idx - prev > 1) {
      matches.push('---');
    }
    const lineNumber = idx + 1;
    const text = lines[idx] ?? '';
    const ctx = contextMap.get(idx) ?? {};
    const lineNumberStr = lineNumber.toString().padStart(5, ' ');
    matches.push(`${lineNumberStr}: ${text}`);

    methodContext.push({
      line: lineNumber,
      text,
      ...(ctx.class ? { class: ctx.class } : {}),
      ...(ctx.include ? { include: ctx.include } : {}),
      ...(ctx.method ? { method: ctx.method } : {}),
    });
    prev = idx;
  }
  return { matches, methodContext };
}

function grepSource(
  source: string,
  pattern: string,
): {
  matches: string[];
  methodContext: GrepMatch[];
  matchCount: number;
  invalidPattern?: string;
} {
  const compileResult = compileGrepPattern(pattern);
  if ('invalidPattern' in compileResult) {
    return {
      matches: [],
      methodContext: [],
      matchCount: 0,
      invalidPattern: compileResult.invalidPattern,
    };
  }

  const lines = source.split(/\r?\n/);
  const matched = findMatchingLines(lines, compileResult.regex);
  if (matched.length === 0) {
    return { matches: [], methodContext: [], matchCount: 0 };
  }

  const { includes, methods } = parseStructuredSource(source);
  const contextMap = buildLineContextMap(lines, includes, methods);
  const context = buildContextSet(lines, matched);
  return {
    ...formatGrepResult(lines, context, contextMap),
    matchCount: matched.length,
  };
}

function appendVersion(url: string, version: string | undefined): string {
  if (!version) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}version=${encodeURIComponent(version)}`;
}

function buildClassIncludeUrl(
  objectUri: string,
  include: string,
  version: string | undefined,
): string {
  const normalized = include.toLowerCase();
  const base =
    normalized === 'main'
      ? `${objectUri}/source/main`
      : `${objectUri}/includes/${encodeURIComponent(normalized)}`;
  return appendVersion(base, version);
}

function buildSourceUrl(
  objectUri: string,
  objectType: string | undefined,
  include: string | undefined,
  version: string | undefined,
): { url: string; note?: string } {
  const upperType = objectType?.toUpperCase();
  const normalizedInclude = include?.toLowerCase();

  if (!normalizedInclude) {
    return { url: appendVersion(`${objectUri}/source/main`, version) };
  }

  if (upperType === 'CLAS') {
    const includes = normalizedInclude
      .split(',')
      .map((s) => s.trim())
      .filter((s): s is string => Boolean(s));
    const firstInclude = includes[0];
    if (!firstInclude) {
      return { url: appendVersion(`${objectUri}/source/main`, version) };
    }
    if (!VALID_CLASS_INCLUDES.has(firstInclude)) {
      return {
        url: appendVersion(`${objectUri}/source/main`, version),
        note: `Unknown class include "${firstInclude}". Valid: ${Array.from(VALID_CLASS_INCLUDES).join(', ')}. Returning main source.`,
      };
    }
    if (includes.length === 1) {
      return { url: buildClassIncludeUrl(objectUri, firstInclude, version) };
    }
    return {
      url: buildClassIncludeUrl(objectUri, firstInclude, version),
      note: `Multiple includes requested (${include}); current implementation returns the first include "${firstInclude}". Use separate calls or a single include for precise reads.`,
    };
  }

  if (upperType === 'DDLS' && normalizedInclude === 'elements') {
    return {
      url: appendVersion(`${objectUri}/source/main`, version),
      note: 'include="elements" is not yet supported for DDLS; returning main source.',
    };
  }

  if (upperType === 'FUNC' && normalizedInclude === 'signature') {
    return {
      url: appendVersion(`${objectUri}/source/main`, version),
      note: 'include="signature" is not yet supported for FUNC; returning main source.',
    };
  }

  return {
    url: appendVersion(`${objectUri}/source/main`, version),
    note: `include="${include}" is only supported for CLAS; returning main source.`,
  };
}

async function resolveUri(
  client: AdtClient,
  objectName: string,
  objectType?: string,
): Promise<{ uri: string; objectType?: string }> {
  if (objectType) {
    const uri = getObjectUri(objectType, objectName);
    if (uri) return { uri, objectType };
  }

  const searchResult =
    await client.adt.repository.informationsystem.search.quickSearch({
      query: objectName,
      maxResults: 10,
    });

  const objects = normalizeSearchResults(
    searchResult as Record<string, unknown>,
  );
  const match = objects.find(
    (o) => o.name?.toUpperCase() === objectName.toUpperCase(),
  );

  if (!match?.uri) {
    throw new Error(`Object '${objectName}' not found`);
  }
  return { uri: match.uri, objectType: match.type };
}

async function fetchSource(
  client: AdtClient,
  url: string,
  maxBytes: number,
): Promise<string> {
  try {
    return await client.readTextBounded(url, maxBytes, {
      headers: { Accept: 'text/plain' },
    });
  } catch (error) {
    if (error instanceof AdtResponseTooLargeError) {
      throw new GetSourceTooLargeError(maxBytes);
    }
    throw error;
  }
}

function methodTypeSupported(objectType: string | undefined): boolean {
  return objectType?.toUpperCase() === 'CLAS';
}

/**
 * Fetch ABAP source with arc-1 SAPRead-style filtering.
 *
 * @throws {GetSourceTooLargeError} when the source body exceeds maxBytes.
 * @throws {Error} for resolution or validation failures.
 */
export async function getSource(
  client: AdtClient,
  options: GetSourceOptions,
): Promise<GetSourceResult> {
  const {
    objectName,
    objectType,
    version = 'active',
    include,
    method,
    grep,
    maxBytes: requestedMaxBytes,
    format = 'raw',
  } = options;

  if (grep && method) {
    throw new Error(
      'Do not combine grep with method. Use grep to find code, then method="<name>" to read the full method.',
    );
  }

  if (format === 'structured' && (method || grep)) {
    throw new Error(
      'format=structured cannot be combined with method or grep.',
    );
  }

  const maxBytes = Math.min(
    requestedMaxBytes ?? DEFAULT_MAX_SOURCE_BYTES,
    HARD_MAX_SOURCE_BYTES,
  );

  const { uri: objectUri, objectType: resolvedObjectType } = await resolveUri(
    client,
    objectName,
    objectType,
  );
  const { url, note } = buildSourceUrl(
    objectUri,
    resolvedObjectType,
    include,
    version,
  );

  const source = await fetchSource(client, url, maxBytes);

  if (method) {
    if (!methodTypeSupported(resolvedObjectType)) {
      throw new Error(
        `method is only supported for CLAS, but objectType was "${resolvedObjectType ?? objectType}"`,
      );
    }
    if (method === '*') {
      const methods = listMethods(source);
      return { object: objectName, methodCount: methods.length, methods, note };
    }
    const extracted = extractMethodBlock(source, method);
    if (!extracted) {
      throw new Error(`Method ${method} not found in ${objectName}`);
    }
    return {
      object: objectName,
      method: method.toUpperCase(),
      source: extracted.source,
      startLine: extracted.startLine,
      endLine: extracted.endLine,
      bytes: Buffer.byteLength(extracted.source, 'utf8'),
      note,
    };
  }

  if (grep) {
    const grepResult = grepSource(source, grep);
    if (grepResult.invalidPattern) {
      throw new Error(grepResult.invalidPattern);
    }
    return {
      object: objectName,
      pattern: grep,
      matchCount: grepResult.matchCount,
      matches: grepResult.matches,
      methodContext: grepResult.methodContext,
      note,
    };
  }

  if (format === 'structured') {
    const { includes, methods: methodBoundaries } =
      parseStructuredSource(source);
    return {
      object: objectName,
      source,
      bytes: Buffer.byteLength(source, 'utf8'),
      version,
      include,
      includes,
      methods: methodBoundaries,
      note,
    };
  }

  return {
    object: objectName,
    source,
    bytes: Buffer.byteLength(source, 'utf8'),
    version,
    include,
    note,
  };
}
