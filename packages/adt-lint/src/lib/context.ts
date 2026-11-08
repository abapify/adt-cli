import type { MethodBoundary, StripResult } from './types';

/** `true` for a `CLASS … DEFINITION …` header line (already upper-cased). */
function isClassDefinitionLine(upper: string): boolean {
  return (
    upper.startsWith('CLASS ') &&
    upper.includes(' DEFINITION') &&
    upper.endsWith('.')
  );
}

function stripClassSource(source: string): StripResult {
  const lines = source.split(/\r?\n/);
  const output: string[] = [];

  let inDefinition = false;
  let inHiddenSection = false;
  let foundDefinition = false;

  for (const line of lines) {
    const upper = line.trim().toUpperCase();

    if (!inDefinition) {
      if (isClassDefinitionLine(upper)) {
        inDefinition = true;
        foundDefinition = true;
        output.push(line);
      }
      continue;
    }

    if (upper === 'PROTECTED SECTION.' || upper === 'PRIVATE SECTION.') {
      inHiddenSection = true;
      continue;
    }

    if (upper === 'PUBLIC SECTION.') {
      inHiddenSection = false;
      output.push(line);
      continue;
    }

    if (upper === 'ENDCLASS.') {
      output.push(line);
      break;
    }

    if (!inHiddenSection) {
      output.push(line);
    }
  }

  if (!foundDefinition || output.length === 0) {
    return { source, fallback: true };
  }

  return { source: `${output.join('\n').trim()}\n`, fallback: false };
}

function stripFunctionSource(source: string): StripResult {
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex((line) => /^\s*FUNCTION\s+/i.test(line));
  const end = lines.findIndex(
    (line, index) => index >= start && /^\s*ENDFUNCTION\./i.test(line),
  );

  if (start < 0 || end < 0) {
    return { source, fallback: true };
  }

  const kept = lines.slice(start, end + 1).filter((line) => {
    const trimmed = line.trim().toUpperCase();
    return (
      trimmed.startsWith('FUNCTION ') ||
      trimmed.startsWith('IMPORTING') ||
      trimmed.startsWith('EXPORTING') ||
      trimmed.startsWith('CHANGING') ||
      trimmed.startsWith('TABLES') ||
      trimmed.startsWith('EXCEPTIONS') ||
      trimmed.startsWith('ENDFUNCTION.') ||
      trimmed === ''
    );
  });

  return { source: `${kept.join('\n').trim()}\n`, fallback: false };
}

export function stripToPublicApi(
  source: string,
  objectType: string,
): StripResult {
  const normalized = objectType.toUpperCase();

  if (normalized === 'INTF' || normalized === 'DDLS' || normalized === 'PROG') {
    return { source, fallback: false };
  }

  if (normalized === 'CLAS') {
    return stripClassSource(source);
  }

  if (normalized === 'FUNC') {
    return stripFunctionSource(source);
  }

  return { source, fallback: true };
}

function normalizeToken(token: string): string {
  let t = token;
  while (t.startsWith("'")) t = t.slice(1);
  while (t.endsWith("'")) t = t.slice(0, -1);
  return t.toUpperCase();
}

function isCustomName(token: string | undefined): token is string {
  return Boolean(token && /^[ZY][A-Z0-9_]*$/i.test(token));
}

/**
 * Match a dependency name from the multi-token keyword clauses at position
 * `i` (`TYPE REF TO`, `INHERITING FROM`, `CALL FUNCTION`). Returns
 * `undefined` when no clause matches or the name is not a custom object.
 */
function matchClauseDependency(
  tokens: string[],
  i: number,
): string | undefined {
  const t0 = normalizeToken(tokens[i]);
  const t1 = normalizeToken(tokens[i + 1] ?? '');
  const t2 = normalizeToken(tokens[i + 2] ?? '');
  const t3 = normalizeToken(tokens[i + 3] ?? '');

  if (t0 === 'TYPE' && t1 === 'REF' && t2 === 'TO' && isCustomName(t3)) {
    return t3;
  }
  if (t0 === 'INHERITING' && t1 === 'FROM' && isCustomName(t2)) {
    return t2;
  }
  if (t0 === 'CALL' && t1 === 'FUNCTION') {
    const fn = normalizeToken(tokens[i + 2] ?? '');
    return isCustomName(fn) ? fn : undefined;
  }
  return undefined;
}

/**
 * Match a dependency name from the short keyword patterns at position `i`
 * (`NEW`/`CAST`, `RAISING`/`CATCH`, static-`=>` access).
 */
function matchKeywordDependency(
  tokens: string[],
  i: number,
): string | undefined {
  const t0 = normalizeToken(tokens[i]);
  const t1 = normalizeToken(tokens[i + 1] ?? '');

  if ((t0 === 'NEW' || t0 === 'CAST') && isCustomName(t1)) {
    return t1;
  }
  if ((t0 === 'RAISING' || t0 === 'CATCH') && isCustomName(t1)) {
    return t1;
  }
  if (tokens[i + 1] === '=>' && isCustomName(t0)) {
    return t0;
  }
  return undefined;
}

/** Collect `INTERFACES a, b, c.` names starting at token `start`. */
function collectInterfaceNames(
  tokens: string[],
  start: number,
  out: Set<string>,
): void {
  for (let j = start; j < tokens.length; j += 1) {
    const next = normalizeToken(tokens[j]);
    if (next === '.') {
      break;
    }
    if (next !== ',' && isCustomName(next)) {
      out.add(next);
    }
  }
}

export function extractDependencies(source: string): string[] {
  const dependencies = new Set<string>();
  const sanitized = source
    .split(/\r?\n/)
    .map((line) => {
      const commentIndex = line.indexOf('"');
      return commentIndex >= 0 ? line.slice(0, commentIndex) : line;
    })
    .join('\n');
  const tokens = sanitized.match(/=>|[A-Z_][A-Z0-9_]*|'[^']*'|[.,]/gi) ?? [];

  for (let i = 0; i < tokens.length; i += 1) {
    const name =
      matchClauseDependency(tokens, i) ?? matchKeywordDependency(tokens, i);
    if (name) {
      dependencies.add(name);
      continue;
    }

    if (normalizeToken(tokens[i]) === 'INTERFACES') {
      collectInterfaceNames(tokens, i + 1, dependencies);
    }
  }

  return Array.from(dependencies).sort((a, b) => a.localeCompare(b));
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

  return withoutKeyword.split(/\s+/)[0]?.toUpperCase();
}

export function normalizeMethodBody(
  source: string,
  methodName: string,
): string {
  const lines = source.split(/\r?\n/);
  if (lines.length === 0) return source;

  const target = methodName.trim().toUpperCase();
  const firstName = extractMethodNameFromHeader(lines[0] ?? '');
  const last = (lines.at(-1) ?? '').trim().toUpperCase();

  if (firstName === target && last === 'ENDMETHOD.') {
    return lines.slice(1, -1).join('\n').trimEnd();
  }

  return source.trimEnd();
}

export function detectMethodBoundary(
  source: string,
  methodName: string,
): MethodBoundary | null {
  const lines = source.split(/\r?\n/);
  const target = methodName.trim().toUpperCase();

  const starts: number[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (extractMethodNameFromHeader(lines[i] ?? '') === target) {
      starts.push(i);
    }
  }

  if (starts.length === 0) {
    return null;
  }

  if (starts.length > 1) {
    return null;
  }

  const startIndex = starts[0] ?? 0;
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    if (
      stripInlineComment(lines[i] ?? '')
        .trim()
        .toUpperCase() === 'ENDMETHOD.'
    ) {
      return {
        startLine: startIndex + 1,
        endLine: i + 1,
      };
    }
  }

  return null;
}
