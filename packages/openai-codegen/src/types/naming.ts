import { createHash } from 'node:crypto';

export type IdentKind = 'type' | 'method' | 'param' | 'class';

export interface SanitizeOpts {
  prefix?: string;
  maxLen?: number;
}

const DEFAULT_MAX_LEN = 30;

/** Split an identifier on camelCase boundaries, non-alnum runs, and digits-prev-letter. */
function splitWords(raw: string): string[] {
  if (!raw) return [];
  const cleaned = raw.replace(/[^A-Za-z0-9]+/g, ' ').trim();
  if (!cleaned) return [];
  // Split on spaces, then further split on camelCase within each token.
  const tokens = cleaned.split(/\s+/);
  const out: string[] = [];
  for (const tok of tokens) {
    // Insert spaces before uppercase runs: "HTTPServer" -> "HTTP Server", "camelCase" -> "camel Case".
    // Using lookahead-only patterns (no overlapping quantifiers) keeps regex
    // evaluation linear-time (CodeQL `js/polynomial-redos`).
    const spaced = tok
      .replace(/([A-Z])(?=[A-Z][a-z])/g, '$1 ')
      .replace(/([a-z0-9])(?=[A-Z])/g, '$1 ');
    for (const part of spaced.split(/\s+/)) {
      if (part) out.push(part);
    }
  }
  return out;
}

function shortHash(raw: string, len = 4): string {
  return createHash('sha256').update(raw).digest('hex').slice(0, len);
}

/** Sanitize a raw identifier into an ABAP-safe name. */
export function sanitizeIdent(
  raw: string,
  kind: IdentKind,
  opts: SanitizeOpts = {},
): string {
  const maxLen = opts.maxLen ?? DEFAULT_MAX_LEN;
  const prefix = opts.prefix ?? '';
  const words = splitWords(raw);
  const joiner = '_';
  let base: string;
  if (kind === 'class') {
    base = words.map((w) => w.toUpperCase()).join(joiner);
  } else {
    base = words.map((w) => w.toLowerCase()).join(joiner);
  }
  if (!base) {
    base = kind === 'class' ? 'X' : 'x';
  }
  // Identifiers cannot start with a digit.
  if (/^[0-9]/.test(base)) {
    base = (kind === 'class' ? 'N_' : 'n_') + base;
  }
  let full = prefix + base;
  if (full.length > maxLen) {
    const hash = shortHash(raw, 4);
    const suffix = '_' + hash;
    full = full.slice(0, Math.max(0, maxLen - suffix.length)) + suffix;
  }
  return full;
}

export type NameAllocator = (
  raw: string,
  kind: IdentKind,
  opts?: SanitizeOpts,
) => string;

/** Create a collision-resolving allocator bound to a mutable name set. */
export function makeNameAllocator(usedNames: Set<string>): NameAllocator {
  return (raw, kind, opts = {}) => {
    const maxLen = opts.maxLen ?? DEFAULT_MAX_LEN;
    const base = sanitizeIdent(raw, kind, opts);
    if (!usedNames.has(base)) {
      usedNames.add(base);
      return base;
    }
    for (let i = 2; i < 10_000; i++) {
      const suffix = '_' + i;
      const head = base.slice(0, Math.max(0, maxLen - suffix.length));
      const candidate = head + suffix;
      if (!usedNames.has(candidate)) {
        usedNames.add(candidate);
        return candidate;
      }
    }
    throw new Error(
      `makeNameAllocator: unable to resolve collision for "${raw}"`,
    );
  };
}
