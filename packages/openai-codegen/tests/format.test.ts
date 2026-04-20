import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { XMLParser } from 'fast-xml-parser';
import {
  writeAbapgitLayout,
  writeGctsLayout,
  writeLayout,
  type ClassArtifact,
} from '../src/format/index.js';

const DEMO: ClassArtifact = {
  className: 'ZCL_DEMO_CLIENT',
  description: 'Demo Client',
  mainSource:
    'CLASS zcl_demo_client DEFINITION PUBLIC. ENDCLASS.\n' +
    'CLASS zcl_demo_client IMPLEMENTATION. ENDCLASS.\n',
};

async function hashFile(path: string): Promise<string> {
  const buf = await readFile(path);
  return createHash('sha256').update(buf).digest('hex');
}

describe('format/abapgit', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'ocfmt-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('writes the canonical abapGit layout with lowercase filenames', async () => {
    const result = await writeAbapgitLayout(DEMO, dir);
    expect([...result.files]).toEqual([
      'package.devc.xml',
      'src/zcl_demo_client.clas.abap',
      'src/zcl_demo_client.clas.xml',
    ]);
    for (const f of result.files) {
      expect(existsSync(join(dir, f))).toBe(true);
    }
  });

  it('emits a .clas.xml with the abapGit envelope and correct CLSNAME', async () => {
    await writeAbapgitLayout(DEMO, dir);
    const xml = await readFile(
      join(dir, 'src/zcl_demo_client.clas.xml'),
      'utf-8',
    );
    const parser = new XMLParser({ ignoreAttributes: false });
    const parsed = parser.parse(xml);
    expect(parsed.abapGit).toBeDefined();
    expect(parsed.abapGit['@_version']).toBe('v1.0.0');
    const vseo = parsed.abapGit['asx:abap']['asx:values']['VSEOCLASS'];
    expect(vseo.CLSNAME).toBe('ZCL_DEMO_CLIENT');
    expect(vseo.LANGU).toBe('E');
    expect(vseo.DESCRIPT).toBe('Demo Client');
  });

  it('writes a parseable package.devc.xml', async () => {
    await writeAbapgitLayout(DEMO, dir);
    const xml = await readFile(join(dir, 'package.devc.xml'), 'utf-8');
    const parser = new XMLParser({ ignoreAttributes: false });
    const parsed = parser.parse(xml);
    expect(parsed['asx:abap']).toBeDefined();
    expect(parsed['asx:abap']['asx:values']['DEVC']['CTEXT']).toMatch(
      /openai-codegen/,
    );
  });

  it('optionally writes testclasses and locals_def', async () => {
    const result = await writeAbapgitLayout(
      {
        ...DEMO,
        testSource: '* tests\n',
        localsDefSource: '* locals def\n',
      },
      dir,
    );
    expect([...result.files]).toEqual([
      'package.devc.xml',
      'src/zcl_demo_client.clas.abap',
      'src/zcl_demo_client.clas.locals_def.abap',
      'src/zcl_demo_client.clas.testclasses.abap',
      'src/zcl_demo_client.clas.xml',
    ]);
  });

  it('is deterministic (byte-identical on repeat)', async () => {
    const r1 = await writeAbapgitLayout(DEMO, dir);
    const hashes1 = await Promise.all(
      r1.files.map((f) => hashFile(join(dir, f))),
    );
    const r2 = await writeAbapgitLayout(DEMO, dir);
    const hashes2 = await Promise.all(
      r2.files.map((f) => hashFile(join(dir, f))),
    );
    expect(hashes2).toEqual(hashes1);
  });

  it('rejects invalid class names', async () => {
    for (const bad of [
      'zcl_lower',
      'ACL_NOZ',
      'ZCL_WAY_TOO_LONG_NAME_THAT_EXCEEDS_THIRTY_CHARS',
      '',
      'Z-BAD',
    ]) {
      await expect(
        writeAbapgitLayout({ ...DEMO, className: bad }, dir),
      ).rejects.toThrow();
    }
  });
});

describe('format/gcts', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'ocfmt-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('writes the gCTS layout with CLAS/<name>/ subdirectory', async () => {
    const result = await writeGctsLayout(DEMO, dir);
    expect([...result.files]).toContain(
      'CLAS/zcl_demo_client/zcl_demo_client.clas.abap',
    );
    expect([...result.files]).toContain(
      'CLAS/zcl_demo_client/zcl_demo_client.clas.json',
    );
    expect([...result.files]).toContain('package.devc.json');

    const main = await readFile(
      join(dir, 'CLAS/zcl_demo_client/zcl_demo_client.clas.abap'),
      'utf-8',
    );
    expect(main).toBe(DEMO.mainSource);

    const meta = JSON.parse(
      await readFile(
        join(dir, 'CLAS/zcl_demo_client/zcl_demo_client.clas.json'),
        'utf-8',
      ),
    );
    expect(meta.class.name).toBe('ZCL_DEMO_CLIENT');
    expect(meta.header.formatVersion).toBe('1.0');
  });

  it('is deterministic', async () => {
    const r1 = await writeGctsLayout(DEMO, dir);
    const hashes1 = await Promise.all(
      r1.files.map((f) => hashFile(join(dir, f))),
    );
    const r2 = await writeGctsLayout(DEMO, dir);
    const hashes2 = await Promise.all(
      r2.files.map((f) => hashFile(join(dir, f))),
    );
    expect(hashes2).toEqual(hashes1);
  });

  it('rejects invalid class names', async () => {
    await expect(
      writeGctsLayout({ ...DEMO, className: 'bad' }, dir),
    ).rejects.toThrow();
  });
});

describe('format/writeLayout dispatch', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'ocfmt-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('dispatches to abapgit', async () => {
    const r = await writeLayout(DEMO, 'abapgit', dir);
    expect(r.files).toContain('src/zcl_demo_client.clas.xml');
  });

  it('dispatches to gcts', async () => {
    const r = await writeLayout(DEMO, 'gcts', dir);
    expect(r.files).toContain('CLAS/zcl_demo_client/zcl_demo_client.clas.json');
  });
});
