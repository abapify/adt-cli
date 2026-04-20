import { describe, expect, it, beforeAll } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate } from '../src/generate';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PETSTORE_PATH = resolve(
  __dirname,
  '../../../samples/petstore3-client/spec/openapi.json',
);

async function makeTmp(prefix: string): Promise<string> {
  return mkdtemp(join(tmpdir(), `openai-codegen-${prefix}-`));
}

describe('generate() end-to-end', () => {
  describe('abapgit (base=petstore)', () => {
    let outDir: string;
    let result: Awaited<ReturnType<typeof generate>>;

    beforeAll(async () => {
      outDir = await makeTmp('abapgit');
      result = await generate({
        input: PETSTORE_PATH,
        outDir,
        format: 'abapgit',
        names: { base: 'petstore' },
      });
    });

    it('writes the four artifacts plus envelope files', () => {
      const files = [...result.files];
      // Implementation class: .clas.abap + .clas.xml + locals_def + locals_imp
      expect(files).toContain('src/zcl_petstore.clas.abap');
      expect(files).toContain('src/zcl_petstore.clas.xml');
      expect(files).toContain('src/zcl_petstore.clas.locals_def.abap');
      expect(files).toContain('src/zcl_petstore.clas.locals_imp.abap');
      // Exception class
      expect(files).toContain('src/zcx_petstore_error.clas.abap');
      expect(files).toContain('src/zcx_petstore_error.clas.xml');
      // Types interface
      expect(files).toContain('src/zif_petstore_types.intf.abap');
      expect(files).toContain('src/zif_petstore_types.intf.xml');
      // Operations interface
      expect(files).toContain('src/zif_petstore.intf.abap');
      expect(files).toContain('src/zif_petstore.intf.xml');
      // Package envelope
      expect(files).toContain('package.devc.xml');
    });

    it('implementation class references the interface and lcl_http client', async () => {
      const src = await readFile(
        join(outDir, 'src/zcl_petstore.clas.abap'),
        'utf-8',
      );
      const normalized = src.toLowerCase();
      expect(normalized).toContain(
        'class zcl_petstore definition public create public.',
      );
      expect(normalized).toContain('interfaces zif_petstore.');
      expect(normalized).toContain('data client type ref to lcl_http');
      expect(src).toMatch(/client->fetch\(/);
    });

    it('types interface declares the pet type', async () => {
      const src = await readFile(
        join(outDir, 'src/zif_petstore_types.intf.abap'),
        'utf-8',
      );
      expect(src).toContain('INTERFACE ZIF_PETSTORE_TYPES PUBLIC.');
      expect(src).toMatch(/BEGIN OF pet\b/);
    });

    it('operations interface declares get_pet_by_id raising zcx_petstore_error', async () => {
      const src = await readFile(
        join(outDir, 'src/zif_petstore.intf.abap'),
        'utf-8',
      );
      expect(src).toMatch(/METHODS\s+get_pet_by_id/i);
      const idx = src.toLowerCase().indexOf('get_pet_by_id');
      const tail = src.slice(idx, idx + 600).toLowerCase();
      expect(tail).toContain('raising');
      expect(tail).toContain('zcx_petstore_error');
    });

    it('exception class inherits from cx_static_check', async () => {
      const src = await readFile(
        join(outDir, 'src/zcx_petstore_error.clas.abap'),
        'utf-8',
      );
      expect(src).toContain('INHERITING FROM cx_static_check');
    });

    it('locals_imp uses /ui2/cl_json and cl_web_http_client_manager and stays Z-free', async () => {
      const src = await readFile(
        join(outDir, 'src/zcl_petstore.clas.locals_imp.abap'),
        'utf-8',
      );
      expect(src).toContain('/ui2/cl_json=>serialize(');
      expect(src).toContain(
        'cl_web_http_client_manager=>create_by_http_destination(',
      );
      // No Z-prefixed ABAP symbols (zcl_*, zif_*, zcx_*).
      expect(src).not.toMatch(/\bz(cl|if|cx)_/i);
    });

    it('returns plan and operation counts', () => {
      expect(result.typeCount).toBeGreaterThan(0);
      expect(result.operationCount).toBe(19);
      expect(result.resolvedNames.implementationClass).toBe('ZCL_PETSTORE');
    });

    it('is byte-identical on a second run into a fresh directory', async () => {
      const secondDir = await makeTmp('abapgit-2');
      try {
        await generate({
          input: PETSTORE_PATH,
          outDir: secondDir,
          format: 'abapgit',
          names: { base: 'petstore' },
        });
        const files = [
          'src/zcl_petstore.clas.abap',
          'src/zif_petstore.intf.abap',
          'src/zif_petstore_types.intf.abap',
          'src/zcx_petstore_error.clas.abap',
          'src/zcl_petstore.clas.locals_def.abap',
          'src/zcl_petstore.clas.locals_imp.abap',
        ];
        for (const f of files) {
          const a = await readFile(join(outDir, f), 'utf-8');
          const b = await readFile(join(secondDir, f), 'utf-8');
          expect(b).toBe(a);
        }
      } finally {
        await rm(secondDir, { recursive: true, force: true });
      }
    });
  });

  it('honours per-name overrides (types interface)', async () => {
    const outDir = await makeTmp('override');
    try {
      const result = await generate({
        input: PETSTORE_PATH,
        outDir,
        format: 'abapgit',
        names: { base: 'demo', typesInterface: 'ZIF_DEMO_ALL_TYPES' },
      });
      expect(result.resolvedNames.typesInterface).toBe('ZIF_DEMO_ALL_TYPES');
      expect(result.files).toContain('src/zif_demo_all_types.intf.abap');
      expect(result.files).toContain('src/zcl_demo.clas.abap');
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  it('writes the gCTS layout when format is gcts', async () => {
    const outDir = await makeTmp('gcts');
    try {
      const result = await generate({
        input: PETSTORE_PATH,
        outDir,
        format: 'gcts',
        names: { base: 'petstore' },
      });
      const files = [...result.files];
      expect(files).toContain('package.devc.json');
      expect(files).toContain('CLAS/zcl_petstore/zcl_petstore.clas.abap');
      expect(files).toContain('CLAS/zcl_petstore/zcl_petstore.clas.json');
      expect(files).toContain(
        'CLAS/zcx_petstore_error/zcx_petstore_error.clas.abap',
      );
      expect(files).toContain('INTF/zif_petstore/zif_petstore.intf.abap');
      expect(files).toContain(
        'INTF/zif_petstore_types/zif_petstore_types.intf.abap',
      );
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });
});
