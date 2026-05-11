import type { MethodBoundary, StripResult } from './types';

type SourceObjectType = 'CLAS' | 'INTF' | 'FUNC' | 'DDLS' | 'PROG' | string;

function stripClassSource(source: string): StripResult {
  const defMatch = source.match(
    /CLASS\s+[A-Z0-9_]+\s+DEFINITION[\s\S]*?ENDCLASS\./i,
  );
  if (!defMatch) {
    return { source, fallback: true };
  }

  let definition = defMatch[0];

  definition = definition.replace(
    /^\s*PROTECTED SECTION\.[\s\S]*?(?=^\s*(PRIVATE SECTION\.|ENDCLASS\.))/gim,
    '',
  );
  definition = definition.replace(
    /^\s*PRIVATE SECTION\.[\s\S]*?(?=^\s*ENDCLASS\.)/gim,
    '',
  );

  return { source: `${definition.trim()}\n`, fallback: false };
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

const DEPENDENCY_PATTERNS: RegExp[] = [
  /\b(?:TYPE\s+REF\s+TO|NEW|CAST\s+)\s*([ZY][A-Z0-9_]+)/gi,
  /\bINHERITING\s+FROM\s+([ZY][A-Z0-9_]+)/gi,
  /\bCALL\s+FUNCTION\s+'?([ZY][A-Z0-9_]+)'?/gi,
  /\b(?:RAISING|CATCH)\s+([ZY][A-Z0-9_]+)/gi,
  /\b([ZY][A-Z0-9_]+)\s*=>/gi,
];

export function extractDependencies(source: string): string[] {
  const dependencies = new Set<string>();

  for (const pattern of DEPENDENCY_PATTERNS) {
    for (const match of source.matchAll(pattern)) {
      const dep = match[1]?.toUpperCase();
      if (dep && /^[ZY]/.test(dep)) {
        dependencies.add(dep);
      }
    }
  }

  for (const match of source.matchAll(/\bINTERFACES\s*:?\s*([^.]+)\./gi)) {
    const interfaces = match[1]
      ?.split(/[\s,]+/)
      .map((item) => item.trim().toUpperCase())
      .filter((item) => item.length > 0 && /^[ZY]/.test(item));

    for (const intf of interfaces ?? []) {
      dependencies.add(intf);
    }
  }

  return Array.from(dependencies).sort();
}

export function detectMethodBoundary(
  source: string,
  methodName: string,
): MethodBoundary | null {
  const lines = source.split(/\r?\n/);
  const escapedMethod = methodName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const startRe = new RegExp(`^\\s*METHOD\\s+${escapedMethod}\\s*\\.`, 'i');
  const endRe = /^\s*ENDMETHOD\./i;

  const starts: number[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (startRe.test(lines[i])) {
      starts.push(i);
    }
  }

  if (starts.length === 0) {
    return null;
  }

  const startIndex = starts[0];
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    if (endRe.test(lines[i])) {
      return {
        startLine: startIndex + 1,
        endLine: i + 1,
      };
    }
  }

  return null;
}
