/**
 * AFF JSON Schema → TypeScript codegen for adt-plugin-gcts.
 *
 * Reads JSON schemas from git_modules/abap-file-formats/file-formats/<type>/<type>-v1.json
 * and generates TypeScript interfaces to src/schemas/generated/types/.
 * Also emits a barrel index.ts re-exporting all generated types.
 *
 * Usage: bun scripts/generate-aff-schemas.ts
 * Nx target: nx codegen adt-plugin-gcts
 */

import { compile, type JSONSchema } from 'json-schema-to-typescript';
import { mkdir, rm, writeFile, readFile, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, '..');
const REPO_ROOT = resolve(PKG_ROOT, '..', '..');
const AFF_ROOT = join(REPO_ROOT, 'git_modules', 'abap-file-formats', 'file-formats');
const OUT_DIR = join(PKG_ROOT, 'src', 'schemas', 'generated');

/**
 * AFF types with schemas, mapped to their handler type code.
 * Only types that have a corresponding gCTS handler AND an AFF schema are listed.
 * DEVC, TABL, TTYP have no AFF schema — they stay loosely typed.
 */
const AFF_TYPES: Record<string, { schema: string; typeName: string }> = {
  clas: { schema: 'clas-v1.json', typeName: 'Clas' },
  intf: { schema: 'intf-v1.json', typeName: 'Intf' },
  prog: { schema: 'prog-v1.json', typeName: 'Prog' },
  doma: { schema: 'doma-v1.json', typeName: 'Doma' },
  dtel: { schema: 'dtel-v1.json', typeName: 'Dtel' },
  fugr: { schema: 'fugr-v1.json', typeName: 'Fugr' },
  ddls: { schema: 'ddls-v1.json', typeName: 'Ddls' },
  dcls: { schema: 'dcls-v1.json', typeName: 'Dcls' },
  bdef: { schema: 'bdef-v1.json', typeName: 'Bdef' },
  srvb: { schema: 'srvb-v1.json', typeName: 'Srvb' },
  srvd: { schema: 'srvd-v1.json', typeName: 'Srvd' },
  msag: { schema: 'msag-v1.json', typeName: 'Msag' },
};

/** Extra sub-schemas for FUGR (function modules + includes). */
const FUGR_SUB_SCHEMAS: Record<string, { schema: string; typeName: string }> = {
  func: { schema: 'func-v1.json', typeName: 'Func' },
  reps: { schema: 'reps-v1.json', typeName: 'Reps' },
};

const BANNER = `/**
 * Auto-generated from SAP/abap-file-formats JSON schemas.
 * DO NOT EDIT — run \`nx codegen adt-plugin-gcts\` to regenerate.
 * Source: git_modules/abap-file-formats/file-formats/<type>/<type>-v1.json
 */
`;

async function generateOne(
  affDir: string,
  schemaFile: string,
  typeName: string,
  outDir: string,
): Promise<void> {
  const schemaPath = join(AFF_ROOT, affDir, schemaFile);
  const raw = JSON.parse(await readFile(schemaPath, 'utf8')) as JSONSchema;

  // Force the root interface name to match our convention (<TypeName>Aff).
  raw.title = `${typeName}Aff`;

  const ts = await compile(raw, `${typeName}Aff`, {
    bannerComment: '',
    cwd: join(AFF_ROOT, affDir),
    style: { semi: true, singleQuote: true, useTabs: false },
    additionalProperties: false,
  });

  const outPath = join(outDir, 'types', `${typeName.toLowerCase()}.ts`);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, BANNER + ts + '\n', 'utf8');
  console.log(`  ✓ ${typeName} → ${outPath.replace(PKG_ROOT + '/', '')}`);
}

async function generateBarrel(
  types: { typeName: string; file: string }[],
  outDir: string,
): Promise<void> {
  const lines: string[] = [
    BANNER,
    '// Re-export all generated AFF types.',
    '',
    ...types.map(
      (t) =>
        `export type { ${t.typeName}Aff } from './types/${t.file}';`,
    ),
    '',
  ];
  await writeFile(join(outDir, 'index.ts'), lines.join('\n'), 'utf8');
  console.log(`  ✓ barrel → src/schemas/generated/index.ts`);
}

async function main(): Promise<void> {
  console.log('AFF schema codegen → src/schemas/generated/');

  // Clean + recreate output dir.
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  const allTypes: { typeName: string; file: string }[] = [];

  // Explicitly typed AFF types (Wave 0 + Wave 1).
  for (const [affDir, { schema, typeName }] of Object.entries(AFF_TYPES)) {
    await generateOne(affDir, schema, typeName, OUT_DIR);
    allTypes.push({ typeName, file: typeName.toLowerCase() });
  }

  // FUGR sub-schemas (func, reps) live in the same fugr/ dir.
  for (const [, { schema, typeName }] of Object.entries(
    FUGR_SUB_SCHEMAS,
  )) {
    await generateOne('fugr', schema, typeName, OUT_DIR);
    allTypes.push({ typeName, file: typeName.toLowerCase() });
  }

  // Wave 2: auto-discover all remaining AFF types with *-v1.json schemas.
  const handled = new Set(Object.keys(AFF_TYPES));
  const entries = await readdir(AFF_ROOT, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dirName = entry.name;
    if (handled.has(dirName)) continue;
    // Find *-v1.json (skip zif_aff_*.json interface metadata).
    const schemaFile = `${dirName}-v1.json`;
    const schemaPath = join(AFF_ROOT, dirName, schemaFile);
    try {
      await readFile(schemaPath, 'utf8');
    } catch {
      continue; // No schema for this type
    }
    const typeName = dirName.charAt(0).toUpperCase() + dirName.slice(1);
    await generateOne(dirName, schemaFile, typeName, OUT_DIR);
    allTypes.push({ typeName, file: typeName.toLowerCase() });
  }

  await generateBarrel(allTypes, OUT_DIR);
  console.log(`Done: ${allTypes.length} types generated.`);
}

main().catch((err) => {
  console.error('AFF codegen failed:', err);
  process.exit(1);
});
