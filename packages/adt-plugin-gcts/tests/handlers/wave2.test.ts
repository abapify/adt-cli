/**
 * Wave 2 generic handler tests — verify all mass-generated stubs
 * register correctly and emit the minimal AFF contract.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

import { getHandler } from '../../src/lib/handlers/base.ts';
import { gctsPlugin } from '../../src/index.ts';

const WAVE2_TYPES = [
  'ADVC',
  'AIFA',
  'AIFD',
  'AIFF',
  'AIFI',
  'AIFN',
  'AIFP',
  'AIFR',
  'AOBJ',
  'APIC',
  'APLO',
  'APOB',
  'BGQC',
  'CDBO',
  'CFDF',
  'CHDO',
  'CHKC',
  'CHKO',
  'CHKV',
  'COTA',
  'CSNM',
  'DCAT',
  'DDLA',
  'DDLX',
  'DESD',
  'DMON',
  'DOBJ',
  'DRAS',
  'DRTY',
  'DSFD',
  'DSFI',
  'DTDC',
  'DTEB',
  'DTIX',
  'DTSC',
  'EDCC',
  'EDCK',
  'EDCR',
  'EDOI',
  'EEEC',
  'ENHO',
  'ENHS',
  'ENQU',
  'EVTB',
  'EVTO',
  'GSMP',
  'HTTP',
  'ILMB',
  'INTM',
  'INTS',
  'IWNG',
  'NONT',
  'NROB',
  'NTTA',
  'NTTY',
  'RONT',
  'RVBC',
  'SAIA',
  'SAJC',
  'SAJT',
  'SCP1',
  'SFPF',
  'SIAD',
  'SITO',
  'SMBC',
  'SMTG',
  'SPRV',
  'SRVC',
  'SUCO',
  'SUSI',
  'SWCR',
  'SXTG',
  'UIAD',
  'UIPG',
  'UIST',
];

describe('Wave 2 generic handlers', () => {
  it('registers all 75 remaining AFF types', () => {
    for (const type of WAVE2_TYPES) {
      const handler = getHandler(type);
      assert.ok(handler, `Handler for ${type} should be registered`);
      assert.strictEqual(handler.type, type);
    }
  });

  it('emits formatVersion "1" + header for a sample type', async () => {
    const handler = getHandler('ENHO')!;
    const files = await handler.serialize({
      name: 'Z_TEST',
      description: 'Enhancement',
      originalLanguage: 'EN',
    } as any);
    const json = JSON.parse(
      files.find((f) => f.path.endsWith('.json'))!.content,
    );
    assert.strictEqual(json.formatVersion, '1');
    assert.strictEqual(json.header.description, 'Enhancement');
    assert.strictEqual(json.header.originalLanguage, 'en');
  });

  it('emits .json metadata file with correct type in filename', async () => {
    const handler = getHandler('CHDO')!;
    const files = await handler.serialize({
      name: 'Z_CHDO',
      description: 'Change doc',
      originalLanguage: 'DE',
    } as any);
    assert.ok(files.some((f) => f.path === 'z_chdo.chdo.json'));
  });

  it('round-trips via fromAbapGit', async () => {
    const handler = getHandler('NROB')!;
    const files = await handler.serialize({
      name: 'Z_NROB',
      description: 'Number range',
      originalLanguage: 'EN',
    } as any);
    const json = JSON.parse(
      files.find((f) => f.path.endsWith('.json'))!.content,
    );
    const recovered = (handler as any).fromAbapGit(json);
    assert.strictEqual(recovered.description, 'Number range');
    assert.strictEqual(recovered.language, 'EN');
  });

  it('plugin exposes all Wave 2 types via registry.isSupported', () => {
    const isSupported = gctsPlugin.registry.isSupported;
    for (const type of WAVE2_TYPES) {
      assert.ok(isSupported(type), `Plugin should support ${type}`);
    }
  });
});
