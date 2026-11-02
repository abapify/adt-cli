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

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import ts from 'typescript';
import {
  NODE_BUILTINS,
  importSpecs,
  SCAN_EXT,
  scanFiles,
  toPackageName,
} from './imports.js';

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
const runtimeDeclared = new Set<string>();
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
for (const field of [
  'dependencies',
  'peerDependencies',
  'optionalDependencies',
]) {
  const deps = manifest[field];
  if (deps && typeof deps === 'object') {
    for (const name of Object.keys(deps)) runtimeDeclared.add(name);
  }
}
// devDependencies don't ship — only private projects may lean on them
// at runtime. Published packages must declare src/ imports in
// dependencies|peerDependencies|optionalDependencies.
const isPrivate = manifest['private'] === true;
const rootDevDeps = rootManifest['devDependencies'];
const rootDevNames =
  rootDevDeps && typeof rootDevDeps === 'object'
    ? Object.keys(rootDevDeps)
    : [];
// Shared toolchain — usable from dev-context files in any project.
const rootAllowed = new Set<string>(
  rootDevNames.filter((n) => !n.startsWith('@abapify/')),
);
// Workspace packages linked via root `workspace:*` devDeps — dev-context
// files (tests, scripts, codegen config) may reach them without creating
// a dependency edge. Production files must still declare them.
const rootWorkspace = new Set<string>(
  rootDevNames.filter((n) => n.startsWith('@abapify/')),
);
const selfName =
  typeof manifest['name'] === 'string' ? (manifest['name'] as string) : null;

// package name -> list of "file:line"
const violations = new Map<string, string[]>();

const DEV_DIR =
  /(^|\/)(tests?|__tests__|e2e|fixtures?|scripts?|generators?|config)\//i;
const DEV_SUFFIX = /\.(test|spec|config)\.[a-z]+$/i;

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
    SCAN_EXT.get(ext) ?? ts.ScriptKind.JS,
  );
  const rel = file.slice(projectRoot.length + 1);
  const fileDev = DEV_DIR.test(rel) || DEV_SUFFIX.test(rel);
  // Private projects never ship, so their files may lean on devDeps —
  // but the root workspace-link allowance stays gated on dev files so a
  // private project's prod file can't silently pull a sibling package.
  const devContext = isPrivate || fileDev;
  for (const { spec, pos } of importSpecs(sf)) {
    const pkg = toPackageName(spec);
    if (!pkg) continue;
    if (NODE_BUILTINS.has(pkg)) continue;
    if (selfName && pkg === selfName) continue;
    if (
      declared.has(pkg) ||
      rootAllowed.has(pkg) ||
      (fileDev && rootWorkspace.has(pkg))
    ) {
      // Published packages ship only deps|peer|optional — a production
      // file leaning on devDeps or root tooling breaks for consumers.
      if (devContext || runtimeDeclared.has(pkg)) continue;
      const { line } = sf.getLineAndCharacterOfPosition(pos);
      const list = violations.get(pkg) ?? [];
      if (list.length < 5)
        list.push(`${rel}:${line + 1} (devDependency — not shipped)`);
      violations.set(pkg, list);
      continue;
    }
    const { line } = sf.getLineAndCharacterOfPosition(pos);
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
for (const [pkg, files] of [...violations].sort((a, b) =>
  a[0].localeCompare(b[0]),
)) {
  console.error(`  ${pkg}`);
  for (const f of files) console.error(`    ${f}`);
}
process.exit(1);
