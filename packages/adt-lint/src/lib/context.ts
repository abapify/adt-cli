import type { MethodBoundary, StripResult } from './types';

type SourceObjectType = 'CLAS' | 'INTF' | 'FUNC' | 'DDLS' | 'PROG' | string;

function stripClassSource(source: string): StripResult {
  const lines = source.split(/\r?\n/);
  const output: string[] = [];

  let inDefinition = false;
  let inHiddenSection = false;
  let foundDefinition = false;

  for (const line of lines) {
    const upper = line.trim().toUpperCase();

    if (!inDefinition) {
      if (
        upper.startsWith('CLASS ') &&
        upper.includes(' DEFINITION') &&
        upper.endsWith('.')
      ) {
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
  objectType: SourceObjectType,
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
  return token.replace(/^'+|'+$/, '').toUpperCase();
}

function isCustomName(token: string | undefined): token is string {
  return Boolean(token && /^[ZY][A-Z0-9_]*$/i.test(token));
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
    const t0 = normalizeToken(tokens[i]);
    const t1 = normalizeToken(tokens[i + 1] ?? '');
    const t2 = normalizeToken(tokens[i + 2] ?? '');
    const t3 = normalizeToken(tokens[i + 3] ?? '');

    if (t0 === 'TYPE' && t1 === 'REF' && t2 === 'TO' && isCustomName(t3)) {
      dependencies.add(t3);
      continue;
    }

    if ((t0 === 'NEW' || t0 === 'CAST') && isCustomName(t1)) {
      dependencies.add(t1);
      continue;
    }

    if (t0 === 'INHERITING' && t1 === 'FROM' && isCustomName(t2)) {
      dependencies.add(t2);
      continue;
    }

    if (t0 === 'CALL' && t1 === 'FUNCTION') {
      const fn = normalizeToken(tokens[i + 2] ?? '');
      if (isCustomName(fn)) {
        dependencies.add(fn);
      }
      continue;
    }

    if ((t0 === 'RAISING' || t0 === 'CATCH') && isCustomName(t1)) {
      dependencies.add(t1);
      continue;
    }

    if (tokens[i + 1] === '=>' && isCustomName(t0)) {
      dependencies.add(t0);
      continue;
    }

    if (t0 === 'INTERFACES') {
      for (let j = i + 1; j < tokens.length; j += 1) {
        const next = normalizeToken(tokens[j]);
        if (next === '.') {
          break;
        }
        if (next !== ',' && isCustomName(next)) {
          dependencies.add(next);
        }
      }
    }
  }

  return Array.from(dependencies).sort();
}

function extractMethodNameFromHeader(line: string): string | undefined {
  const trimmed = line.trim();
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
  const last = (lines[lines.length - 1] ?? '').trim().toUpperCase();

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

  const startIndex = starts[0];
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    if ((lines[i] ?? '').trim().toUpperCase() === 'ENDMETHOD.') {
      return {
        startLine: startIndex + 1,
        endLine: i + 1,
      };
    }
  }

  return null;
}
