/**
 * deps-check — phantom-dependency gate for the workspace.
 *
 * bun hoists every install to the root node_modules, so a package can
 * `import 'foo'` without declaring it and the missing dep only surfaces
 * when the package is published or isolated. This script runs per project
 * (nx run <project>:deps-check) and fails when an external import is not
 * backed by a declared dependency.
 *
 * Imports are collected with the TypeScript AST — template literals that
 * merely *generate* import statements are not counted.
 *
 * Allowed sources for an import specifier:
 *   - the project's own package.json (dependencies, devDependencies,
 *     peerDependencies, optionalDependencies)
 *   - the workspace ROOT devDependencies — the shared toolchain
 *     (vitest, tsdown, @types/*, nx plugins) that repo convention keeps
 *     out of package manifests
 *   - the project's own package name (self-referencing imports)
 *   - node builtins, `#private` import-map specifiers, relative paths
 *
 * Everything else — including packages that would resolve through the
 * root `dependencies` — is a phantom and fails the check.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import ts from 'typescript';

const projectRoot = process.cwd();

function findWorkspaceRoot(dir: string): string {
  let cur = resolve(dir);
  for (;;) {
    if (existsSync(join(cur, 'nx.json'))) return cur;
    const parent = dirname(cur);
    if (parent === cur) throw new Error('nx.json not found above ' + dir);
    cur = parent;
  }
}

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

const workspaceRoot = findWorkspaceRoot(projectRoot);
const rootManifest = readJson(join(workspaceRoot, 'package.json'));
const manifestPath = join(projectRoot, 'package.json');
if (!existsSync(manifestPath)) {
  console.error(`deps-check: no package.json at ${projectRoot}`);
  process.exit(1);
}
const manifest = readJson(manifestPath);

const declared = new Set<string>();
for (const field of [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
]) {
  const deps = manifest[field];
  if (deps && typeof deps === 'object') {
    for (const name of Object.keys(deps)) declared.add(name);
  }
}
const rootDevDeps = rootManifest['devDependencies'];
const rootAllowed = new Set<string>(
  rootDevDeps && typeof rootDevDeps === 'object'
    ? Object.keys(rootDevDeps)
    : [],
);
const selfName =
  typeof manifest['name'] === 'string' ? (manifest['name'] as string) : null;

const NODE_BUILTINS = new Set([
  'assert',
  'async_hooks',
  'buffer',
  'child_process',
  'cluster',
  'console',
  'constants',
  'crypto',
  'dgram',
  'diagnostics_channel',
  'dns',
  'domain',
  'events',
  'fs',
  'http',
  'http2',
  'https',
  'inspector',
  'module',
  'net',
  'os',
  'path',
  'perf_hooks',
  'process',
  'punycode',
  'querystring',
  'readline',
  'repl',
  'stream',
  'string_decoder',
  'sys',
  'timers',
  'tls',
  'trace_events',
  'tty',
  'url',
  'util',
  'v8',
  'vm',
  'worker_threads',
  'zlib',
  'bun',
  'bun:test',
  'node:test',
  'test',
]);

const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  '.nx',
  '.git',
  'coverage',
  '.xsd',
  '.turbo',
  'out',
  '.next',
  '.docusaurus',
  'build',
  '.beads',
  'tmp',
]);
const SCAN_EXT = new Map<string, ts.ScriptKind>([
  ['.ts', ts.ScriptKind.TS],
  ['.mts', ts.ScriptKind.TS],
  ['.cts', ts.ScriptKind.TS],
  ['.tsx', ts.ScriptKind.TSX],
  ['.js', ts.ScriptKind.JS],
  ['.mjs', ts.ScriptKind.JS],
  ['.cjs', ts.ScriptKind.JS],
  ['.jsx', ts.ScriptKind.JSX],
]);

function toPackageName(spec: string): string | null {
  const clean = spec.split('?')[0];
  if (!clean || clean.startsWith('.') || clean.startsWith('/')) return null;
  if (clean.startsWith('#')) return null;
  if (clean.startsWith('node:')) return null;
  if (clean.startsWith('virtual:')) return null;
  const parts = clean.split('/');
  if (clean.startsWith('@')) {
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : clean;
  }
  return parts[0];
}

function* scanFiles(dir: string): Generator<string> {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(entry)) yield* scanFiles(full);
    } else {
      const ext = entry.slice(entry.lastIndexOf('.'));
      if (SCAN_EXT.has(ext)) yield full;
    }
  }
}

function* importSpecs(
  sf: ts.SourceFile,
): Generator<{ spec: string; pos: number }> {
  const stack: ts.Node[] = [sf];
  while (stack.length) {
    const node = stack.pop()!;
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      yield {
        spec: node.moduleSpecifier.text,
        pos: node.moduleSpecifier.getStart(sf),
      };
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      ts.isStringLiteral(node.moduleReference.expression)
    ) {
      yield {
        spec: node.moduleReference.expression.text,
        pos: node.moduleReference.expression.getStart(sf),
      };
    } else if (
      ts.isCallExpression(node) &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0]) &&
      ((ts.isIdentifier(node.expression) &&
        node.expression.text === 'require') ||
        node.expression.kind === ts.SyntaxKind.ImportKeyword)
    ) {
      const arg = node.arguments[0] as ts.StringLiteral;
      yield { spec: arg.text, pos: arg.getStart(sf) };
    }
    node.forEachChild((c) => stack.push(c));
  }
}

// package name -> list of "file:line"
const violations = new Map<string, string[]>();

for (const file of scanFiles(projectRoot)) {
  const ext = file.slice(file.lastIndexOf('.'));
  let content: string;
  try {
    content = readFileSync(file, 'utf-8');
  } catch {
    continue;
  }
  const sf = ts.createSourceFile(
    file,
    content,
    ts.ScriptTarget.Latest,
    true,
    SCAN_EXT.get(ext)!,
  );
  for (const { spec, pos } of importSpecs(sf)) {
    const pkg = toPackageName(spec);
    if (!pkg) continue;
    if (NODE_BUILTINS.has(pkg)) continue;
    if (selfName && pkg === selfName) continue;
    if (declared.has(pkg) || rootAllowed.has(pkg)) continue;
    const { line } = sf.getLineAndCharacterOfPosition(pos);
    const rel = file.slice(projectRoot.length + 1);
    const list = violations.get(pkg) ?? [];
    if (list.length < 5) list.push(`${rel}:${line + 1}`);
    violations.set(pkg, list);
  }
}

if (violations.size === 0) {
  console.log(`deps-check ok: ${selfName ?? projectRoot}`);
  process.exit(0);
}

console.error(
  `deps-check: ${violations.size} undeclared import(s) in ${selfName ?? projectRoot}\n` +
    "Every external import must be declared in this package's package.json " +
    '(or exist in root devDependencies for shared tooling).\n',
);
for (const [pkg, files] of [...violations].sort()) {
  console.error(`  ${pkg}`);
  for (const f of files) console.error(`    ${f}`);
}
process.exit(1);
