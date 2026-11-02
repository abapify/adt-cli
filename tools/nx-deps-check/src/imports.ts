/** Import specifiers collected from a project's sources — AST walker. */

import { join } from 'node:path';
import { readdirSync } from 'node:fs';
import ts from 'typescript';

export const NODE_BUILTINS = new Set([
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

export function toPackageName(spec: string): string | null {
  const clean = spec.split('?')[0];
  const skip = ['.', '/', '#', 'node:', 'virtual:'];
  if (!clean || skip.some((p) => clean.startsWith(p))) return null;
  const parts = clean.split('/');
  return clean.startsWith('@') && parts.length >= 2
    ? `${parts[0]}/${parts[1]}`
    : parts[0];
}

export function* scanFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) yield* scanFiles(full);
    } else if (SCAN_EXT.has(entry.name.slice(entry.name.lastIndexOf('.')))) {
      yield full;
    }
  }
}

/** A node narrowed to ts.StringLiteral or null. */
function strLit(n: ts.Node | undefined): ts.StringLiteral | null {
  return n && ts.isStringLiteral(n) ? n : null;
}

/** The literal module specifier of a node, when it carries one. */
function moduleSpec(node: ts.Node): ts.StringLiteral | null {
  if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
    return strLit(node.moduleSpecifier);
  if (
    ts.isImportEqualsDeclaration(node) &&
    ts.isExternalModuleReference(node.moduleReference)
  )
    return strLit(node.moduleReference.expression);
  if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument))
    return strLit(node.argument.literal);
  return literalArg(node);
}

/** The literal first argument of `import('x')` / `require('x')` calls. */
function literalArg(node: ts.Node): ts.StringLiteral | null {
  if (!ts.isCallExpression(node) || node.arguments.length < 1) return null;
  const dynamic = node.expression.kind === ts.SyntaxKind.ImportKeyword;
  const cjs =
    ts.isIdentifier(node.expression) && node.expression.text === 'require';
  if (!dynamic && !cjs) return null;
  return strLit(node.arguments[0]);
}

export function* importSpecs(
  sf: ts.SourceFile,
): Generator<{ spec: string; pos: number }> {
  const stack: ts.Node[] = [sf];
  while (stack.length) {
    const node = stack.pop()!;
    const lit = moduleSpec(node);
    if (lit) yield { spec: lit.text, pos: lit.getStart(sf) };
    node.forEachChild((c) => {
      stack.push(c);
    });
  }
}
