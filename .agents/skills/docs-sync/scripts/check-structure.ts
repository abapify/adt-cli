#!/usr/bin/env bun
/**
 * docs-sync: check-structure
 *
 * Detects structural drift between code and Docusaurus docs (`website/`).
 * Exits with code 1 if any drift is found. No LLM, no writes.
 *
 * Checks:
 *   1. packages/*               ↔ website/docs/sdk/packages/*.md    ↔ sidebars.ts
 *   2. MCP tools (server.tool)  ↔ website/docs/mcp/tools/*.md       ↔ sidebars.ts
 *   3. Every doc file under website/docs is listed somewhere in sidebars.ts
 *      (except the root `index.md`, which is the generated-index landing page)
 *   4. Every sidebar entry resolves to an existing doc file
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('../../../../', import.meta.url)).replace(
  /[/\\]$/,
  '',
);
const websiteDir = join(rootDir, 'website');
const docsDir = join(websiteDir, 'docs');
const sidebarFile = join(websiteDir, 'sidebars.ts');
const packagesDir = join(rootDir, 'packages');

type Report = { section: string; missing: string[]; orphan: string[] };
const reports: Report[] = [];

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
    const st = statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

// --- Parse sidebars.ts: collect every quoted doc id ---
const sidebarText = readFileSync(sidebarFile, 'utf8');
const sidebarIds = new Set<string>();
for (const m of sidebarText.matchAll(/['"`]([a-z0-9][a-z0-9/_-]*?)['"`]/gi)) {
  const id = m[1];
  // Heuristic: doc ids contain at least one path char or match a known root doc
  if (/[/]/.test(id) || id === 'index') sidebarIds.add(id);
}

// --- 1. Packages ---
{
  const codePkgs = new Set(listDirs(packagesDir));
  const docPkgsDir = join(docsDir, 'sdk/packages');
  const docPkgs = new Set(
    readdirSync(docPkgsDir)
      .filter((f) => f.endsWith('.md') && f !== 'overview.md')
      .map((f) => f.replace(/\.md$/, '')),
  );
  const sidebarPkgs = new Set(
    [...sidebarIds]
      .filter(
        (id) =>
          id.startsWith('sdk/packages/') && id !== 'sdk/packages/overview',
      )
      .map((id) => id.slice('sdk/packages/'.length)),
  );

  reports.push({
    section: 'packages: code → docs file',
    missing: [...codePkgs].filter((p) => !docPkgs.has(p)).sort(),
    orphan: [...docPkgs].filter((p) => !codePkgs.has(p)).sort(),
  });
  reports.push({
    section: 'packages: code → sidebar',
    missing: [...codePkgs].filter((p) => !sidebarPkgs.has(p)).sort(),
    orphan: [...sidebarPkgs].filter((p) => !codePkgs.has(p)).sort(),
  });
}

// --- 2. MCP tools ---
{
  const toolDir = join(packagesDir, 'adt-mcp/src/lib/tools');
  const toolFiles = walk(toolDir).filter(
    (f) => f.endsWith('.ts') && !f.endsWith('.test.ts'),
  );
  const codeTools = new Set<string>();
  for (const file of toolFiles) {
    const text = readFileSync(file, 'utf8');
    // Direct: server.tool('name', ...)
    for (const m of text.matchAll(
      /server\.tool\(\s*['"`]([a-z_][a-z0-9_]*)['"`]/g,
    )) {
      codeTools.add(m[1]);
    }
    // Indirect via config wrapper: `toolName: 'name'` (see call-hierarchy.ts)
    for (const m of text.matchAll(
      /\btoolName\s*:\s*['"`]([a-z_][a-z0-9_]*)['"`]/g,
    )) {
      codeTools.add(m[1]);
    }
  }

  const docToolsDir = join(docsDir, 'mcp/tools');
  const docTools = new Set(
    readdirSync(docToolsDir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => f.replace(/\.md$/, '')),
  );
  const sidebarTools = new Set(
    [...sidebarIds]
      .filter((id) => id.startsWith('mcp/tools/'))
      .map((id) => id.slice('mcp/tools/'.length)),
  );

  reports.push({
    section: 'mcp tools: code → docs file',
    missing: [...codeTools].filter((t) => !docTools.has(t)).sort(),
    orphan: [...docTools].filter((t) => !codeTools.has(t)).sort(),
  });
  reports.push({
    section: 'mcp tools: code → sidebar',
    missing: [...codeTools].filter((t) => !sidebarTools.has(t)).sort(),
    orphan: [...sidebarTools].filter((t) => !codeTools.has(t)).sort(),
  });
}

// --- 3 + 4. Cross-check sidebar ↔ files for every doc under website/docs ---
{
  // The root `index.md` is the docs landing page and is always reachable
  // through Docusaurus's category/generated-index machinery, so don't
  // treat it as a sidebar drift candidate.
  const allDocFiles = walk(docsDir)
    .filter((f) => f.endsWith('.md') || f.endsWith('.mdx'))
    .map((f) => relative(docsDir, f).replace(/\.(md|mdx)$/, ''))
    .filter((id) => id !== 'index');
  const docSet = new Set(allDocFiles);
  const sidebarIdsForCrossCheck = [...sidebarIds].filter(
    (id) => id !== 'index',
  );

  reports.push({
    section: 'sidebar ↔ doc files',
    // missing: sidebar references a doc that does not exist on disk
    missing: sidebarIdsForCrossCheck.filter((id) => !docSet.has(id)).sort(),
    // orphan: doc file on disk but not referenced anywhere in sidebars.ts
    orphan: allDocFiles
      .filter((id) => !sidebarIdsForCrossCheck.includes(id))
      .sort(),
  });
}

// --- Output ---
let drift = 0;
for (const r of reports) {
  const total = r.missing.length + r.orphan.length;
  drift += total;
  const header = total === 0 ? `✓ ${r.section}` : `✗ ${r.section} (${total})`;
  console.log(header);
  if (r.missing.length) {
    console.log(`    missing in docs: ${r.missing.length}`);
    for (const m of r.missing) console.log(`      - ${m}`);
  }
  if (r.orphan.length) {
    console.log(`    orphan in docs: ${r.orphan.length}`);
    for (const o of r.orphan) console.log(`      - ${o}`);
  }
}
console.log('');
if (drift === 0) {
  console.log('No drift detected.');
  process.exit(0);
} else {
  console.log(`Drift detected: ${drift} item(s). See above.`);
  process.exit(1);
}
