/**
 * AFF JSON Schema → TypeScript codegen for adt-plugin-gcts.
 *
 * Auto-discovers every `*-v{n}.json` schema in
 * git_modules/abap-file-formats/file-formats (type dirs + root-level
 * schemas like docu) and emits one interface `Aff{Stem}V{n}` per file.
 * Barrel `src/schemas/generated/index.ts` re-exports everything.
 *
 * Usage: bun scripts/generate-aff-schemas.ts
 * Nx target: nx codegen adt-plugin-gcts
 */

import { compile } from 'json-schema-to-typescript';
import { mkdir, rm, writeFile, readFile, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(HERE, '..');
const REPO_ROOT = resolve(PKG_ROOT, '..', '..');
const AFF_ROOT = join(
  REPO_ROOT,
  'git_modules',
  'abap-file-formats',
  'file-formats',
);
const OUT_DIR = join(PKG_ROOT, 'src', 'schemas', 'generated');

const SCHEMA_RE = /^([a-z0-9]+)-v(\d+)\.json$/;

interface SchemaEntry {
  stem: string;
  version: number;
  file: string;
}

async function discoverSchemas(): Promise<SchemaEntry[]> {
  const entries: SchemaEntry[] = [];
  const collect = async (dir: string): Promise<void> => {
    for (const f of await readdir(dir, { withFileTypes: true })) {
      if (!f.isFile()) continue;
      const m = SCHEMA_RE.exec(f.name);
      if (m)
        entries.push({
          stem: m[1],
          version: Number(m[2]),
          file: join(dir, f.name),
        });
    }
  };
  await collect(AFF_ROOT); // root-level (docu)
  for (const d of await readdir(AFF_ROOT, { withFileTypes: true })) {
    if (d.isDirectory()) await collect(join(AFF_ROOT, d.name));
  }
  return entries.sort(
    (a, b) => a.stem.localeCompare(b.stem) || a.version - b.version,
  );
}

function pascal(stem: string): string {
  return stem[0].toUpperCase() + stem.slice(1);
}

const BANNER = `/**
 * Auto-generated from SAP/abap-file-formats JSON schemas.
 * Do not edit — regenerate with \`bun scripts/generate-aff-schemas.ts\`.
 */
`;

async function main(): Promise<void> {
  const schemas = await discoverSchemas();
  console.log(`[aff-codegen] discovered ${schemas.length} schemas`);

  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  const exports: string[] = [];
  const latestAlias = new Map<string, string>();
  let ok = 0;
  const failed: string[] = [];

  for (const { stem, version, file } of schemas) {
    const name = `Aff${pascal(stem)}V${version}`;
    const outFile = `${stem}-v${version}.ts`;
    try {
      const raw = await readFile(file, 'utf8');
      // compile() names the root interface after schema.title, ignoring
      // the `name` arg — override so the root is `Aff{Type}V{n}`.
      const schema = JSON.parse(raw) as { title?: string };
      schema.title = name;
      const ts = await compile(schema, name, {
        bannerComment: '',
        strictIndexSignatures: true,
        additionalProperties: false,
        format: false,
        ignoreMinAndMaxItems: true,
      });
      // Back-compat alias: dedicated handlers import `{Type}Aff`.
      const alias = `\nexport type ${pascal(stem)}Aff = ${name};\n`;
      await writeFile(join(OUT_DIR, outFile), BANNER + ts + alias, 'utf8');
      // `export * as` namespaces each version file — schema titles repeat
      // across versions (cfdf-v1/v2 both declare `CustomField`), so a flat
      // barrel would collide. Flat `{Type}Aff` aliases are emitted only
      // for the latest version (see below).
      exports.push(
        `export * as ${pascal(stem)}V${version} from './${stem}-v${version}.js';`,
      );
      latestAlias.set(
        stem,
        `export type { ${pascal(stem)}Aff } from './${stem}-v${version}.js';`,
      );
      ok++;
    } catch (e) {
      failed.push(
        `${stem}-v${version}: ${(e as Error).message.split('\n')[0]}`,
      );
    }
  }

  await writeFile(
    join(OUT_DIR, 'index.ts'),
    `${BANNER}\n${exports.join('\n')}\n\n` +
      `// Flat {Type}Aff aliases — latest version per type (handler imports).\n` +
      `${[...latestAlias.values()].join('\n')}\n`,
    'utf8',
  );

  console.log(`[aff-codegen] generated ${ok} types → ${OUT_DIR}`);
  if (failed.length) {
    console.error(`[aff-codegen] ${failed.length} failed:`);
    for (const f of failed) console.error(`  - ${f}`);
    process.exitCode = 1;
  }
}

await main();
