#!/usr/bin/env bun
/**
 * docs-sync: generate-stubs
 *
 * For every `missing in docs` item reported by check-structure, create a
 * stub page from code facts and add it to `website/sidebars.ts`. Honest by
 * design: when extraction is ambiguous, the stub links to source instead of
 * guessing.
 *
 * Usage:
 *   bun .devin/skills/docs-sync/scripts/generate-stubs.ts           # dry-run
 *   bun .devin/skills/docs-sync/scripts/generate-stubs.ts --write   # apply
 */
import {
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
  existsSync,
} from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('../../../../', import.meta.url).pathname.replace(
  /\/$/,
  '',
);
const WEBSITE = join(ROOT, 'website');
const DOCS = join(WEBSITE, 'docs');
const SIDEBAR = join(WEBSITE, 'sidebars.ts');
const PACKAGES = join(ROOT, 'packages');
const GITHUB_BLOB = 'https://github.com/abapify/adt-cli/blob/main/';

const WRITE = process.argv.includes('--write');

// ────────────────────────────────────────────────────────────────────────────
// Utilities
// ────────────────────────────────────────────────────────────────────────────

function listDirs(p: string): string[] {
  return readdirSync(p).filter((n) => {
    try {
      return statSync(join(p, n)).isDirectory();
    } catch {
      return false;
    }
  });
}

function walk(p: string, acc: string[] = []): string[] {
  for (const n of readdirSync(p)) {
    const full = join(p, n);
    if (statSync(full).isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

/** Find the balanced-paren slice starting at `open` (an opening char). */
function sliceBalanced(
  src: string,
  open: number,
  openCh = '(',
  closeCh = ')',
): string {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    const next = src[i + 1];
    // Line comment
    if (c === '/' && next === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    // Block comment
    if (c === '/' && next === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i++; // skip the '*', for-loop increments past '/'
      continue;
    }
    if (c === openCh) depth++;
    else if (c === closeCh) {
      depth--;
      if (depth === 0) return src.slice(open, i + 1);
    } else if (c === '"' || c === "'" || c === '`') {
      // skip string literal
      const quote = c;
      i++;
      while (i < src.length && src[i] !== quote) {
        if (src[i] === '\\') i++;
        i++;
      }
    }
  }
  throw new Error('unbalanced');
}

/** Split top-level comma-separated args inside a paren/brace slice. */
function splitTopLevel(body: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === '(' || c === '{' || c === '[') depth++;
    else if (c === ')' || c === '}' || c === ']') depth--;
    else if ((c === '"' || c === "'" || c === '`') && depth >= 0) {
      const q = c;
      i++;
      while (i < body.length && body[i] !== q) {
        if (body[i] === '\\') i++;
        i++;
      }
    } else if (c === ',' && depth === 0) {
      out.push(body.slice(start, i).trim());
      start = i + 1;
    }
  }
  const tail = body.slice(start).trim();
  if (tail) out.push(tail);
  return out;
}

/** Parse "'foo' + \n 'bar'" style string concatenation into a single string. */
function parseStringExpr(expr: string): string | null {
  const parts: string[] = [];
  // Match any sequence of string literals separated by +
  const re = /['"`]((?:[^'"`\\]|\\.)*)['"`]/g;
  let m;
  let lastEnd = 0;
  while ((m = re.exec(expr)) !== null) {
    const between = expr.slice(lastEnd, m.index).trim();
    if (between && between !== '+' && parts.length) return null; // non-literal content
    parts.push(
      m[1].replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\"/g, '"'),
    );
    lastEnd = m.index + m[0].length;
  }
  const tail = expr.slice(lastEnd).trim();
  if (tail && tail !== '+') return null;
  return parts.length ? parts.join('') : null;
}

// ────────────────────────────────────────────────────────────────────────────
// Shared Zod shapes (resolved from shared-schemas.ts)
// ────────────────────────────────────────────────────────────────────────────

type SchemaField = {
  name: string;
  type: string; // 'string' | 'number' | 'boolean' | 'unknown[]' | ...
  optional: boolean;
  describe: string | null;
};

function zodTypeOf(expr: string): { type: string; optional: boolean } {
  // Zod method chains may be broken across lines: `z\n  .string()` — so tolerate
  // whitespace between `z`, `.`, and the type name.
  const norm = expr.replace(/\s+/g, ' ');
  const optional = /\.\s*optional\s*\(\s*\)/.test(norm);
  if (/\bz\s*\.\s*string\s*\(/.test(norm)) return { type: 'string', optional };
  if (/\bz\s*\.\s*number\s*\(/.test(norm)) return { type: 'number', optional };
  if (/\bz\s*\.\s*boolean\s*\(/.test(norm))
    return { type: 'boolean', optional };
  if (/\bz\s*\.\s*array\s*\(/.test(norm))
    return { type: 'unknown[]', optional };
  if (/\bz\s*\.\s*object\s*\(/.test(norm)) return { type: 'object', optional };
  if (/\bz\s*\.\s*enum\s*\(/.test(norm)) {
    const m = norm.match(/z\s*\.\s*enum\s*\(\s*\[([^\]]+)\]/);
    if (m) {
      const vals = [...m[1].matchAll(/['"`]([^'"`]+)['"`]/g)].map(
        (x) => `'${x[1]}'`,
      );
      return { type: vals.join(' | ') || 'string', optional };
    }
    return { type: 'string', optional };
  }
  return { type: 'unknown', optional };
}

function extractDescribe(expr: string): string | null {
  // Find first `.describe('...')` — supports template-style `+` concat.
  const m = expr.match(/\.describe\(([\s\S]*?)\)\s*(?:,|$|\.)/);
  if (!m) return null;
  return parseStringExpr(m[1].trim().replace(/\)\s*$/, ''));
}

function parseSchemaObject(
  objectLiteral: string,
  sharedShapes: Map<string, SchemaField[]>,
): SchemaField[] {
  // objectLiteral starts with `{` and ends with `}`
  const inner = objectLiteral.slice(1, -1).trim();
  if (!inner) return [];
  const entries = splitTopLevel(inner);
  const out: SchemaField[] = [];
  for (const e of entries) {
    const trimmed = e.trim();
    if (!trimmed) continue;
    // Handle spread: ...someShape
    const spread = trimmed.match(/^\.\.\.\s*([A-Za-z_$][\w$]*)/);
    if (spread) {
      const shape = sharedShapes.get(spread[1]);
      if (shape) out.push(...shape);
      else
        out.push({
          name: `...${spread[1]}`,
          type: 'unknown',
          optional: false,
          describe: 'unresolved spread',
        });
      continue;
    }
    // Handle `name: z.xxx(...).optional().describe(...)`
    const kv = trimmed.match(/^([A-Za-z_$][\w$]*)\s*:\s*([\s\S]+)$/);
    if (!kv) continue;
    const name = kv[1];
    const expr = kv[2];
    const { type, optional } = zodTypeOf(expr);
    const describe = extractDescribe(expr);
    out.push({ name, type, optional, describe });
  }
  return out;
}

function loadSharedShapes(): Map<string, SchemaField[]> {
  const file = join(PACKAGES, 'adt-mcp/src/lib/tools/shared-schemas.ts');
  const src = readFileSync(file, 'utf8');
  const shapes = new Map<string, SchemaField[]>();
  // Find `export const <name> = { ... };` — two-pass: resolve dependencies.
  const order = [
    'connectionShape',
    'optionalConnectionShape',
    'sessionOrConnectionShape',
  ];
  for (const name of order) {
    const re = new RegExp(`export const ${name}\\s*=\\s*\\{`);
    const m = src.match(re);
    if (!m || m.index === undefined) continue;
    const braceStart = m.index + m[0].length - 1;
    const slice = sliceBalanced(src, braceStart, '{', '}');
    shapes.set(name, parseSchemaObject(slice, shapes));
  }
  return shapes;
}

// ────────────────────────────────────────────────────────────────────────────
// MCP tool extraction
// ────────────────────────────────────────────────────────────────────────────

type ToolInfo = {
  name: string;
  description: string | null;
  schema: SchemaField[] | null;
  sourceRelPath: string; // relative to repo root
};

function extractToolsFromFile(
  file: string,
  sharedShapes: Map<string, SchemaField[]>,
): ToolInfo[] {
  const src = readFileSync(file, 'utf8');
  const results: ToolInfo[] = [];
  const sourceRelPath = relative(ROOT, file);

  // Find every `server.tool(` and also detect indirect registration
  // via `config.toolName` by pairing `toolName: 'X'` + `toolDescription: '...'`
  // inside the same object literal.

  // 1. Direct literal form
  const literalRe = /server\.tool\(/g;
  let m: RegExpExecArray | null;
  while ((m = literalRe.exec(src)) !== null) {
    const openParen = m.index + m[0].length - 1;
    let slice: string;
    try {
      slice = sliceBalanced(src, openParen, '(', ')');
    } catch {
      continue;
    }
    const body = slice.slice(1, -1);
    const args = splitTopLevel(body);
    if (args.length < 3) continue;
    const nameExpr = args[0];
    const descExpr = args[1];
    const schemaExpr = args[2];
    const nameLit = parseStringExpr(nameExpr);
    if (!nameLit) continue; // indirect — handled below
    const desc = parseStringExpr(descExpr);
    let schema: SchemaField[] | null = null;
    const trimmedSchema = schemaExpr.trim();
    if (trimmedSchema.startsWith('{')) {
      try {
        schema = parseSchemaObject(trimmedSchema, sharedShapes);
      } catch {
        schema = null;
      }
    } else {
      // Bare identifier referencing a shared shape (e.g. `sessionOrConnectionShape`).
      const identMatch = trimmedSchema.match(/^([A-Za-z_$][\w$]*)$/);
      if (identMatch && sharedShapes.has(identMatch[1])) {
        schema = [...sharedShapes.get(identMatch[1])!];
      }
    }
    results.push({ name: nameLit, description: desc, schema, sourceRelPath });
  }

  // 2. Indirect form: objects with `toolName: '...'`
  const configRe = /\btoolName\s*:\s*['"`]([a-z_][a-z0-9_]*)['"`]/g;
  while ((m = configRe.exec(src)) !== null) {
    const name = m[1];
    if (results.some((r) => r.name === name)) continue;
    // Find toolDescription within ~500 chars around the match
    const window = src.slice(Math.max(0, m.index - 1000), m.index + 1000);
    const descMatch = window.match(
      /toolDescription\s*:\s*([\s\S]*?)(,|\n\s*toolName|\n\s*\})/,
    );
    const desc = descMatch ? parseStringExpr(descMatch[1]) : null;
    results.push({ name, description: desc, schema: null, sourceRelPath });
  }

  return results;
}

function collectAllTools(): Map<string, ToolInfo> {
  const shapes = loadSharedShapes();
  const toolDir = join(PACKAGES, 'adt-mcp/src/lib/tools');
  const files = walk(toolDir).filter(
    (f) => f.endsWith('.ts') && !f.endsWith('.test.ts'),
  );
  const all = new Map<string, ToolInfo>();
  for (const f of files) {
    for (const t of extractToolsFromFile(f, shapes)) {
      if (!all.has(t.name)) all.set(t.name, t);
    }
  }
  return all;
}

// ────────────────────────────────────────────────────────────────────────────
// Package extraction
// ────────────────────────────────────────────────────────────────────────────

type PackageInfo = {
  dirName: string;
  pkgName: string;
  description: string;
  hasAgentsMd: boolean;
  hasReadme: boolean;
  sourceRelPath: string;
};

function extractPackageInfo(dirName: string): PackageInfo | null {
  const dir = join(PACKAGES, dirName);
  const pkgJsonPath = join(dir, 'package.json');
  if (!existsSync(pkgJsonPath)) return null;
  const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
  return {
    dirName,
    pkgName: pkg.name ?? `@abapify/${dirName}`,
    description: pkg.description ?? '',
    hasAgentsMd: existsSync(join(dir, 'AGENTS.md')),
    hasReadme: existsSync(join(dir, 'README.md')),
    sourceRelPath: relative(ROOT, dir),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Rendering
// ────────────────────────────────────────────────────────────────────────────

function escapeFrontmatter(s: string): string {
  return s.replace(/'/g, "''").replace(/\n/g, ' ').trim();
}

function renderMcpTool(info: ToolInfo): string {
  const desc = info.description?.trim() ?? '';
  const sourceLink = `${GITHUB_BLOB}${info.sourceRelPath}`;
  const lines: string[] = [];
  lines.push('---');
  lines.push(`title: ${info.name}`);
  lines.push(`sidebar_label: ${info.name}`);
  if (desc) lines.push(`description: '${escapeFrontmatter(desc)}'`);
  lines.push('---');
  lines.push('');
  lines.push(`# \`${info.name}\``);
  lines.push('');
  if (desc) {
    lines.push(desc);
    lines.push('');
  }
  lines.push(`Defined in [\`${info.sourceRelPath}\`](${sourceLink}).`);
  lines.push('');
  lines.push('## Input schema');
  lines.push('');
  if (info.schema && info.schema.length) {
    lines.push('```ts');
    lines.push('{');
    for (const f of info.schema) {
      const opt = f.optional ? '?' : '';
      const comment = f.describe ? ` // ${f.describe}` : '';
      lines.push(`  ${f.name}${opt}: ${f.type};${comment}`);
    }
    lines.push('}');
    lines.push('```');
  } else if (info.schema && info.schema.length === 0) {
    lines.push('_This tool takes no parameters._');
  } else {
    lines.push(`See [source](${sourceLink}) for the full Zod schema.`);
  }
  lines.push('');
  lines.push('## Output');
  lines.push('');
  lines.push(
    'The tool returns a single text content item whose body is a JSON-serialised object (`content[0].text`). On error, the response has `isError: true` and a human-readable message.',
  );
  lines.push('');
  lines.push('```json');
  lines.push('{');
  lines.push(
    '  "content": [{ "type": "text", "text": "<JSON.stringify(result, null, 2)>" }]',
  );
  lines.push('}');
  lines.push('```');
  lines.push('');
  lines.push('See the source for the exact shape of `result`.');
  lines.push('');
  return lines.join('\n');
}

function renderPackage(info: PackageInfo): string {
  const sourceLink = `${GITHUB_BLOB}${info.sourceRelPath}`;
  const agentsLink = info.hasAgentsMd ? `${sourceLink}/AGENTS.md` : null;
  const readmeLink = info.hasReadme ? `${sourceLink}/README.md` : null;
  const lines: string[] = [];
  lines.push('---');
  lines.push(`title: '${info.pkgName}'`);
  if (info.description)
    lines.push(`description: ${escapeFrontmatter(info.description)}`);
  lines.push('---');
  lines.push('');
  lines.push(`# \`${info.pkgName}\``);
  lines.push('');
  if (info.description) {
    lines.push(info.description);
    lines.push('');
  }
  lines.push('## Install');
  lines.push('');
  lines.push('```bash');
  lines.push(`bun add ${info.pkgName}`);
  lines.push('```');
  lines.push('');
  lines.push('## Source');
  lines.push('');
  lines.push(`- Source: [\`${info.sourceRelPath}\`](${sourceLink})`);
  if (agentsLink)
    lines.push(
      `- Internal guide: [\`${info.sourceRelPath}/AGENTS.md\`](${agentsLink})`,
    );
  if (readmeLink)
    lines.push(
      `- README: [\`${info.sourceRelPath}/README.md\`](${readmeLink})`,
    );
  lines.push('');
  lines.push(
    '> Stub page generated by `docs-sync`. Expand with usage examples, public API, and dependency notes.',
  );
  lines.push('');
  return lines.join('\n');
}

// ────────────────────────────────────────────────────────────────────────────
// Sidebar patching
// ────────────────────────────────────────────────────────────────────────────

function patchSidebarArray(
  src: string,
  arrayName: string,
  newIds: string[],
): { src: string; added: string[] } {
  const re = new RegExp(`const ${arrayName}\\s*=\\s*\\[`);
  const m = src.match(re);
  if (!m || m.index === undefined)
    throw new Error(`sidebar array ${arrayName} not found`);
  const openBracket = m.index + m[0].length - 1;
  const slice = sliceBalanced(src, openBracket, '[', ']');
  const inner = slice.slice(1, -1);
  // Extract existing string-literal entries in order
  const entryRe = /['"`]([^'"`]+)['"`]/g;
  const existing: string[] = [];
  let em;
  while ((em = entryRe.exec(inner)) !== null) existing.push(em[1]);
  const existingSet = new Set(existing);
  const added: string[] = [];
  const merged = [...existing];
  for (const id of newIds) {
    if (existingSet.has(id)) continue;
    merged.push(id);
    added.push(id);
  }
  // Preserve any "fixed" first entries that end in /overview, otherwise sort alphabetically.
  const overviewIdx = merged.findIndex((id) => id.endsWith('/overview'));
  const overview = overviewIdx >= 0 ? merged.splice(overviewIdx, 1) : [];
  merged.sort();
  const finalList = [...overview, ...merged];
  const indent = '  ';
  const rebuilt =
    '[\n' + finalList.map((id) => `${indent}'${id}',`).join('\n') + '\n]';
  const before = src.slice(0, openBracket);
  const after = src.slice(openBracket + slice.length);
  return { src: before + rebuilt + after, added };
}

// ────────────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────────────

function main() {
  const mcpTools = collectAllTools();

  // Discover missing items by comparing to current docs.
  const missingPackages: PackageInfo[] = [];
  const docPackagesDir = join(DOCS, 'sdk/packages');
  const existingPackageDocs = new Set(
    readdirSync(docPackagesDir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => f.replace(/\.md$/, '')),
  );
  for (const dir of listDirs(PACKAGES)) {
    if (existingPackageDocs.has(dir)) continue;
    const info = extractPackageInfo(dir);
    if (info) missingPackages.push(info);
  }

  const missingTools: ToolInfo[] = [];
  const docToolsDir = join(DOCS, 'mcp/tools');
  const existingToolDocs = new Set(
    readdirSync(docToolsDir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => f.replace(/\.md$/, '')),
  );
  for (const [name, info] of mcpTools) {
    if (!existingToolDocs.has(name)) missingTools.push(info);
  }

  console.log(`Missing packages: ${missingPackages.length}`);
  for (const p of missingPackages)
    console.log(`  - ${p.dirName}  (${p.pkgName})`);
  console.log(`Missing MCP tools: ${missingTools.length}`);
  for (const t of missingTools)
    console.log(
      `  - ${t.name}  (schema: ${t.schema ? `${t.schema.length} fields` : 'unresolved'})`,
    );

  if (!WRITE) {
    console.log(
      '\n(dry run — pass --write to create files and patch sidebars.ts)',
    );
    return;
  }

  // Write pages.
  for (const p of missingPackages) {
    const target = join(DOCS, 'sdk/packages', `${p.dirName}.md`);
    writeFileSync(target, renderPackage(p));
    console.log(`wrote ${relative(ROOT, target)}`);
  }
  for (const t of missingTools) {
    const target = join(DOCS, 'mcp/tools', `${t.name}.md`);
    writeFileSync(target, renderMcpTool(t));
    console.log(`wrote ${relative(ROOT, target)}`);
  }

  // Patch sidebars.ts.
  let sidebar = readFileSync(SIDEBAR, 'utf8');
  if (missingPackages.length) {
    const ids = missingPackages.map((p) => `sdk/packages/${p.dirName}`);
    const res = patchSidebarArray(sidebar, 'sdkPackages', ids);
    sidebar = res.src;
    for (const id of res.added) console.log(`sidebar += ${id}`);
  }
  if (missingTools.length) {
    const ids = missingTools.map((t) => `mcp/tools/${t.name}`);
    const res = patchSidebarArray(sidebar, 'mcpTools', ids);
    sidebar = res.src;
    for (const id of res.added) console.log(`sidebar += ${id}`);
  }
  writeFileSync(SIDEBAR, sidebar);
  console.log(`patched ${relative(ROOT, SIDEBAR)}`);
}

main();
