import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import {
  writeAbapgitInterface,
  writeAbapgitLayout,
  writeClientBundle,
  writeGctsInterface,
  writeLayout,
  type ClassArtifact,
  type InterfaceArtifact,
} from '../src/format/index.js';

const TYPES_IF: InterfaceArtifact = {
  name: 'ZIF_DEMO_TYPES',
  description: 'Demo Types Interface',
  source:
    'INTERFACE zif_demo_types PUBLIC.\n  TYPES ty_id TYPE string.\nENDINTERFACE.\n',
};

const OPS_IF: InterfaceArtifact = {
  name: 'ZIF_DEMO',
  description: 'Demo Operations Interface',
  source: 'INTERFACE zif_demo PUBLIC.\n  METHODS ping.\nENDINTERFACE.\n',
};

const EXC_CLASS: ClassArtifact = {
  className: 'ZCX_DEMO_ERROR',
  description: 'Demo Exception',
  mainSource:
    'CLASS zcx_demo_error DEFINITION PUBLIC INHERITING FROM cx_static_check.\nENDCLASS.\n' +
    'CLASS zcx_demo_error IMPLEMENTATION.\nENDCLASS.\n',
};

const IMPL_CLASS: ClassArtifact = {
  className: 'ZCL_DEMO',
  description: 'Demo Implementation',
  mainSource:
    'CLASS zcl_demo DEFINITION PUBLIC FINAL CREATE PUBLIC.\nENDCLASS.\n' +
    'CLASS zcl_demo IMPLEMENTATION.\nENDCLASS.\n',
  localsDefSource: '"! locals def\nCLASS lcl_helper DEFINITION. ENDCLASS.\n',
  localsImpSource:
    '"! locals imp\nCLASS lcl_helper IMPLEMENTATION. ENDCLASS.\n',
};

describe('format/abapgit interface writer', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'ocfmt-intf-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('writes .intf.abap, .intf.xml, package.devc.xml', async () => {
    const result = await writeAbapgitInterface(TYPES_IF, dir);
    expect([...result.files]).toEqual([
      'package.devc.xml',
      'src/zif_demo_types.intf.abap',
      'src/zif_demo_types.intf.xml',
    ]);
    for (const f of result.files) {
      expect(existsSync(join(dir, f))).toBe(true);
    }

    const abap = await readFile(
      join(dir, 'src/zif_demo_types.intf.abap'),
      'utf-8',
    );
    expect(abap).toBe(TYPES_IF.source);

    const xml = await readFile(
      join(dir, 'src/zif_demo_types.intf.xml'),
      'utf-8',
    );
    const parser = new XMLParser({ ignoreAttributes: false });
    const parsed = parser.parse(xml);
    const vseo = parsed.abapGit['asx:abap']['asx:values']['VSEOINTERF'];
    expect(vseo.CLSNAME).toBe('ZIF_DEMO_TYPES');
    expect(vseo.LANGU).toBe('E');
    expect(vseo.DESCRIPT).toBe('Demo Types Interface');
    expect(String(vseo.ABAP_LANGUAGE_VERSION)).toBe('5');
  });

  it('dispatches InterfaceArtifact through writeLayout', async () => {
    const r = await writeLayout(OPS_IF, 'abapgit', dir);
    expect(r.files).toContain('src/zif_demo.intf.xml');
  });

  it('rejects invalid interface names', async () => {
    await expect(
      writeAbapgitInterface({ ...TYPES_IF, name: 'zif_lower' }, dir),
    ).rejects.toThrow();
  });
});

describe('format/abapgit class with locals_def + locals_imp', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'ocfmt-locals-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('writes both locals_def and locals_imp files', async () => {
    const result = await writeAbapgitLayout(IMPL_CLASS, dir);
    expect(result.files).toContain('src/zcl_demo.clas.locals_def.abap');
    expect(result.files).toContain('src/zcl_demo.clas.locals_imp.abap');

    const def = await readFile(
      join(dir, 'src/zcl_demo.clas.locals_def.abap'),
      'utf-8',
    );
    expect(def).toBe(IMPL_CLASS.localsDefSource);

    const imp = await readFile(
      join(dir, 'src/zcl_demo.clas.locals_imp.abap'),
      'utf-8',
    );
    expect(imp).toBe(IMPL_CLASS.localsImpSource);
  });
});

describe('format/writeClientBundle', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'ocfmt-bundle-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('writes all 9 abapgit files (2 intf + 2 clas + locals_def + locals_imp + package)', async () => {
    const result = await writeClientBundle(
      {
        types: TYPES_IF,
        operations: OPS_IF,
        exception: EXC_CLASS,
        implementation: IMPL_CLASS,
      },
      'abapgit',
      dir,
    );

    expect([...result.files]).toEqual([
      'package.devc.xml',
      'src/zcl_demo.clas.abap',
      'src/zcl_demo.clas.locals_def.abap',
      'src/zcl_demo.clas.locals_imp.abap',
      'src/zcl_demo.clas.xml',
      'src/zcx_demo_error.clas.abap',
      'src/zcx_demo_error.clas.xml',
      'src/zif_demo_types.intf.abap',
      'src/zif_demo_types.intf.xml',
      'src/zif_demo.intf.abap',
      'src/zif_demo.intf.xml',
    ]);

    for (const f of result.files) {
      expect(existsSync(join(dir, f))).toBe(true);
    }
  });

  it('writes the expected gcts layout with INTF/ and CLAS/ subdirs', async () => {
    const result = await writeClientBundle(
      {
        types: TYPES_IF,
        operations: OPS_IF,
        exception: EXC_CLASS,
        implementation: IMPL_CLASS,
      },
      'gcts',
      dir,
    );

    expect(result.files).toContain('package.devc.json');
    expect(result.files).toContain(
      'INTF/zif_demo_types/zif_demo_types.intf.abap',
    );
    expect(result.files).toContain(
      'INTF/zif_demo_types/zif_demo_types.intf.json',
    );
    expect(result.files).toContain('INTF/zif_demo/zif_demo.intf.abap');
    expect(result.files).toContain('INTF/zif_demo/zif_demo.intf.json');
    expect(result.files).toContain(
      'CLAS/zcx_demo_error/zcx_demo_error.clas.abap',
    );
    expect(result.files).toContain(
      'CLAS/zcx_demo_error/zcx_demo_error.clas.json',
    );
    expect(result.files).toContain('CLAS/zcl_demo/zcl_demo.clas.abap');
    expect(result.files).toContain('CLAS/zcl_demo/zcl_demo.clas.json');
    expect(result.files).toContain(
      'CLAS/zcl_demo/zcl_demo.clas.locals_def.abap',
    );
    expect(result.files).toContain(
      'CLAS/zcl_demo/zcl_demo.clas.locals_imp.abap',
    );
  });

  it('dispatches gcts InterfaceArtifact through writeLayout', async () => {
    const r = await writeGctsInterface(TYPES_IF, dir);
    expect(r.files).toContain('INTF/zif_demo_types/zif_demo_types.intf.json');
    expect(r.files).toContain('INTF/zif_demo_types/zif_demo_types.intf.abap');
  });
});
