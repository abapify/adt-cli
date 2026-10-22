/**
 * AFF coverage matrix — per official type: schema versions, example
 * fixtures, and handler kind (dedicated objects/{type}.ts vs wave2 stub).
 * Pure filesystem scan — runs with zero builds, exits 1 below threshold.
 *
 * Usage: bun scripts/aff-coverage.ts [--json] [--fail-under=N]
 * Nx target: nx aff-coverage adt-plugin-gcts
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(HERE, '..');
const REPO_ROOT = resolve(PKG_ROOT, '..', '..');
const AFF_ROOT = join(
  REPO_ROOT,
  'git_modules',
  'abap-file-formats',
  'file-formats',
);
const OBJECTS_DIR = join(PKG_ROOT, 'src', 'lib', 'handlers', 'objects');

const SCHEMA_RE = /^([a-z0-9]+)-v(\d+)\.json$/;
const args = process.argv.slice(2);
const asJson = args.includes('--json');
const failUnder = Number(
  args.find((a) => a.startsWith('--fail-under='))?.split('=')[1] ?? '0',
);

interface Row {
  type: string;
  versions: number[];
  bodyProps: string[];
  examples: number;
  handler: 'dedicated' | 'stub' | 'none';
  docu: boolean;
}

const types = readdirSync(AFF_ROOT, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

const rows: Row[] = types.map((type) => {
  const dir = join(AFF_ROOT, type);
  const files = readdirSync(dir);
  const versions = files
    .map((f) => SCHEMA_RE.exec(f))
    .filter((m): m is RegExpExecArray => !!m && m[1] === type)
    .map((m) => Number(m[2]))
    .sort();

  // Top-level body fields beyond formatVersion+header
  let bodyProps: string[] = [];
  for (const v of versions) {
    const file = join(dir, `${type}-v${v}.json`);
    try {
      const schema = JSON.parse(readFileSync(file, 'utf8')) as {
        properties?: Record<string, unknown>;
      };
      const props = Object.keys(schema.properties ?? {}).filter(
        (p) => p !== 'formatVersion' && p !== 'header',
      );
      bodyProps = [...new Set([...bodyProps, ...props])];
    } catch {
      /* schema unreadable — leave props empty */
    }
  }

  const examplesDir = join(dir, 'examples');
  let examples = 0;
  if (existsSync(examplesDir)) {
    const walk = (sub: string): number =>
      readdirSync(join(examplesDir, sub), { withFileTypes: true })
        .map((e) =>
          e.isDirectory()
            ? walk(sub ? `${sub}/${e.name}` : e.name)
            : e.name.endsWith('.json')
              ? 1
              : 0,
        )
        .reduce((a, b) => a + b, 0);
    examples = walk('');
  }

  const dedicated = existsSync(join(OBJECTS_DIR, `${type}.ts`));
  return {
    type,
    versions,
    bodyProps,
    examples,
    handler: dedicated ? 'dedicated' : 'stub',
    docu: existsSync(join(examplesDir))
      ? readdirSync(examplesDir).some((f) => f.endsWith('.docu.json'))
      : false,
  };
});

const dedicated = rows.filter((r) => r.handler === 'dedicated').length;
const coverage = Math.round((dedicated / rows.length) * 100);

function affPin(): string {
  try {
    const out = execSync(
      `git -C ${REPO_ROOT} submodule status git_modules/abap-file-formats`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim();
    return (
      out
        .replace(/^[+\- ]/, '')
        .split(' ')[0]
        .slice(0, 10) || 'unknown'
    );
  } catch {
    return 'unknown';
  }
}

if (asJson) {
  console.log(
    JSON.stringify({ rows, dedicated, total: rows.length, coverage }, null, 2),
  );
} else {
  console.log(`# AFF coverage — submodule pin ${affPin()}\n`);
  console.log('| Type | Versions | Body fields | Examples | Handler | DOCU |');
  console.log('| ---- | -------- | ----------- | -------- | ------- | ---- |');
  for (const r of rows) {
    console.log(
      `| ${r.type} | ${r.versions.join(',') || '-'} | ` +
        `${r.bodyProps.length ? r.bodyProps.join(', ') : '∅'} | ` +
        `${r.examples} | ${r.handler} | ${r.docu ? '✓' : ''} |`,
    );
  }
  console.log(
    `\n**${dedicated}/${rows.length} dedicated handlers (${coverage}%)** — ` +
      `${rows.length - dedicated} stubs`,
  );
}

if (coverage < failUnder) {
  console.error(`aff-coverage: ${coverage}% < ${failUnder}% threshold`);
  process.exit(1);
}
