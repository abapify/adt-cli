/**
 * AFF file-name grammar conformance — driven by real filenames found in
 * the upstream examples, not invented shapes. `.properties` text files
 * carry an optional content-type + BCP47 language segment; source
 * extensions cover the full spec surface (.abap .abdl .acds .csn .ddic
 * .xdp .properties).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseGctsFilename,
  gctsFilename,
} from '../../src/lib/format/filename.ts';

const AFF_EXAMPLES = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../git_modules/abap-file-formats/file-formats',
);

describe('parseGctsFilename — upstream example shapes', () => {
  it('name.type.texts.en.properties (5-part content-type+lang)', () => {
    const p = parseGctsFilename('z_aff_example_prog.prog.texts.en.properties');
    assert.equal(p?.name, 'z_aff_example_prog');
    assert.equal(p?.type, 'PROG');
    assert.equal(p?.suffix, 'texts.en');
    assert.equal(p?.extension, 'properties');
  });

  it('name.clas.texts.en.properties', () => {
    const p = parseGctsFilename('z_aff_example_clas.clas.texts.en.properties');
    assert.equal(p?.name, 'z_aff_example_clas');
    assert.equal(p?.type, 'CLAS');
    assert.equal(p?.suffix, 'texts.en');
  });

  it('name.fugr.texts.en.properties', () => {
    const p = parseGctsFilename('z_aff_example_fugr.fugr.texts.en.properties');
    assert.equal(p?.name, 'z_aff_example_fugr');
    assert.equal(p?.type, 'FUGR');
  });

  it('prog selections/headings content types', () => {
    for (const ct of ['selections', 'headings', 'texts']) {
      const p = parseGctsFilename(
        `z_aff_example_prog.prog.${ct}.en.properties`,
      );
      assert.equal(p?.type, 'PROG');
      assert.equal(p?.suffix, `${ct}.en`);
    }
  });

  it('abapcatalog.ddla.acds (ddla CDS source)', () => {
    const p = parseGctsFilename('abapcatalog.ddla.acds');
    assert.equal(p?.name, 'abapcatalog');
    assert.equal(p?.type, 'DDLA');
    assert.equal(p?.extension, 'acds');
  });

  it('z_aff_example_csnm.csnm.model_inferred.csn', () => {
    const p = parseGctsFilename('z_aff_example_csnm.csnm.model_inferred.csn');
    assert.equal(p?.type, 'CSNM');
    assert.equal(p?.suffix, 'model_inferred');
    assert.equal(p?.extension, 'csn');
  });

  it('z_aff_example_sfpf.sfpf.xdp (Adobe form layout)', () => {
    const p = parseGctsFilename('z_aff_example_sfpf.sfpf.xdp');
    assert.equal(p?.type, 'SFPF');
    assert.equal(p?.extension, 'xdp');
  });

  it('LIMU sub-object: fugr.reps.json parses as metadata', () => {
    const p = parseGctsFilename('z_aff_example_fugr.fugr.reps.json');
    assert.equal(p?.extension, 'json');
  });
});

describe('gctsFilename — spec extension coverage', () => {
  it('maps every example-evidenced source extension', () => {
    const cases: Array<[string, string]> = [
      ['ddla', 'acds'],
      ['ddlx', 'acds'],
      ['dtsc', 'acds'],
      ['dtix', 'acds'],
      ['dteb', 'acds'],
      ['dtdc', 'acds'],
      ['dras', 'acds'],
      ['drty', 'acds'],
      ['dsfd', 'acds'],
      ['csnm', 'csn'],
      ['sfpf', 'xdp'],
      ['bdef', 'abdl'],
      ['clas', 'abap'],
    ];
    for (const [type, ext] of cases) {
      assert.equal(
        gctsFilename('z_obj', type, 'source'),
        `z_obj.${type}.${ext}`,
        `${type} source ext`,
      );
    }
  });
});

describe('upstream corpus — every example filename parses', () => {
  it('no example filename is unparsable', (t) => {
    if (!existsSync(AFF_EXAMPLES)) {
      t.diagnostic('AFF submodule not checked out — skipping corpus sweep');
      return;
    }
    const unparsed: string[] = [];
    const walk = (dir: string): void => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (dir.includes('examples') && e.name.includes('.')) {
          const p = parseGctsFilename(e.name);
          if (!p?.type) unparsed.push(e.name);
        }
      }
    };
    walk(AFF_EXAMPLES);
    // README/other non-example files are excluded by the examples-dir check
    assert.deepEqual(unparsed, []);
  });
});
