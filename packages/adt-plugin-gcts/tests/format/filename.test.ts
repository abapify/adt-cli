/**
 * Filename mapping tests for the gCTS / AFF format.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  gctsFilename,
  parseGctsFilename,
  adtUriToGctsPath,
  PACKAGE_FILENAME,
  METADATA_EXTENSION,
} from '../../src/lib/format/filename.ts';

describe('gctsFilename — metadata', () => {
  it('CLAS → <name>.clas.json', () => {
    assert.strictEqual(gctsFilename('ZCL_FOO', 'CLAS'), 'zcl_foo.clas.json');
  });

  it('INTF → <name>.intf.json', () => {
    assert.strictEqual(gctsFilename('ZIF_BAR', 'INTF'), 'zif_bar.intf.json');
  });

  it('PROG → <name>.prog.json', () => {
    assert.strictEqual(gctsFilename('ZMYPROG', 'PROG'), 'zmyprog.prog.json');
  });

  it('DOMA → <name>.doma.json', () => {
    assert.strictEqual(gctsFilename('ZDOMAIN', 'DOMA'), 'zdomain.doma.json');
  });

  it('DTEL → <name>.dtel.json', () => {
    assert.strictEqual(gctsFilename('ZDTEL', 'DTEL'), 'zdtel.dtel.json');
  });

  it('TABL → <name>.tabl.json', () => {
    assert.strictEqual(gctsFilename('ZTABLE', 'TABL'), 'ztable.tabl.json');
  });

  it('TTYP → <name>.ttyp.json', () => {
    assert.strictEqual(gctsFilename('ZTTYP', 'TTYP'), 'zttyp.ttyp.json');
  });

  it('FUGR → <name>.fugr.json', () => {
    assert.strictEqual(gctsFilename('ZFG', 'FUGR'), 'zfg.fugr.json');
  });

  it('strips subtype suffix from type (CLAS/OC → clas)', () => {
    assert.strictEqual(gctsFilename('ZCL_X', 'CLAS/OC'), 'zcl_x.clas.json');
  });

  it('uses .json as metadata extension', () => {
    assert.strictEqual(METADATA_EXTENSION, 'json');
  });
});

describe('gctsFilename — source', () => {
  it('CLAS main source → <name>.clas.abap', () => {
    assert.strictEqual(
      gctsFilename('ZCL_FOO', 'CLAS', 'source'),
      'zcl_foo.clas.abap',
    );
  });

  it('CLAS with suffix → <name>.clas.<suffix>.abap', () => {
    assert.strictEqual(
      gctsFilename('ZCL_FOO', 'CLAS', 'source', 'testclasses'),
      'zcl_foo.clas.testclasses.abap',
    );
  });

  it('DDLS → .asddls extension', () => {
    assert.strictEqual(
      gctsFilename('ZDDL', 'DDLS', 'source'),
      'zddl.ddls.asddls',
    );
  });

  it('DCLS → .asdcls extension', () => {
    assert.strictEqual(
      gctsFilename('ZDCL', 'DCLS', 'source'),
      'zdcl.dcls.asdcls',
    );
  });

  it('PROG → .abap extension', () => {
    assert.strictEqual(
      gctsFilename('ZPROG', 'PROG', 'source'),
      'zprog.prog.abap',
    );
  });
});

describe('parseGctsFilename', () => {
  it('parses package.devc.json', () => {
    const p = parseGctsFilename(PACKAGE_FILENAME);
    assert.deepStrictEqual(p, { name: '', type: 'DEVC', extension: 'json' });
  });

  it('parses <name>.clas.json', () => {
    const p = parseGctsFilename('zcl_foo.clas.json');
    assert.strictEqual(p?.name, 'zcl_foo');
    assert.strictEqual(p?.type, 'CLAS');
    assert.strictEqual(p?.extension, 'json');
  });

  it('parses <name>.clas.abap (no suffix)', () => {
    const p = parseGctsFilename('zcl_foo.clas.abap');
    assert.strictEqual(p?.name, 'zcl_foo');
    assert.strictEqual(p?.type, 'CLAS');
    assert.strictEqual(p?.extension, 'abap');
    assert.strictEqual(p?.suffix, undefined);
  });

  it('parses <name>.clas.testclasses.abap (with suffix)', () => {
    const p = parseGctsFilename('zcl_foo.clas.testclasses.abap');
    assert.strictEqual(p?.name, 'zcl_foo');
    assert.strictEqual(p?.type, 'CLAS');
    assert.strictEqual(p?.suffix, 'testclasses');
    assert.strictEqual(p?.extension, 'abap');
  });

  it('returns undefined for unknown filenames', () => {
    assert.strictEqual(parseGctsFilename('README.md'), undefined);
    assert.strictEqual(parseGctsFilename('notes'), undefined);
  });

  it('returns undefined for unknown source extensions', () => {
    assert.strictEqual(parseGctsFilename('zcl_foo.clas.yaml'), undefined);
  });
});

describe('adtUriToGctsPath', () => {
  it('maps CLAS URI → <name>/<name>.clas.json', () => {
    assert.strictEqual(
      adtUriToGctsPath('/sap/bc/adt/oo/classes/zcl_foo'),
      'zcl_foo/zcl_foo.clas.json',
    );
  });

  it('maps INTF URI', () => {
    assert.strictEqual(
      adtUriToGctsPath('/sap/bc/adt/oo/interfaces/zif_bar'),
      'zif_bar/zif_bar.intf.json',
    );
  });

  it('maps PROG URI', () => {
    assert.strictEqual(
      adtUriToGctsPath('/sap/bc/adt/programs/programs/zmyprog'),
      'zmyprog/zmyprog.prog.json',
    );
  });

  it('maps DEVC URI → <name>/package.devc.json', () => {
    assert.strictEqual(
      adtUriToGctsPath('/sap/bc/adt/packages/zmypkg'),
      'zmypkg/package.devc.json',
    );
  });

  it('maps DDLS URI', () => {
    assert.strictEqual(
      adtUriToGctsPath('/sap/bc/adt/ddic/ddl/sources/zddl_v1'),
      'zddl_v1/zddl_v1.ddls.json',
    );
  });

  it('returns undefined for non-ADT URIs', () => {
    assert.strictEqual(adtUriToGctsPath('/foo/bar'), undefined);
  });

  it('returns undefined for unknown ADT paths', () => {
    assert.strictEqual(
      adtUriToGctsPath('/sap/bc/adt/something/else/foo'),
      undefined,
    );
  });
});
