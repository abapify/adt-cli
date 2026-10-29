/**
 * W3: source-bearing + special types — companion emit/parse round-trips
 * driven by upstream example file shapes.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  genericGetSources,
  genericGetExtraFiles,
  genericSetSources,
  type GenericAffLike,
} from '../../src/lib/aff/generic.ts';
import { gctsFilename } from '../../src/lib/format/filename.ts';
import { affValidate, readAffExample } from '../../src/lib/aff/schemas.ts';

describe('companion sources — suffix grammar', () => {
  it('ddla: sources.main → {name}.ddla.acds', () => {
    const obj: GenericAffLike = {
      name: 'abapcatalog',
      sources: { main: 'define data element zz_dtel { }' },
    };
    const [entry] = genericGetSources(obj);
    assert.equal(
      gctsFilename('abapcatalog', 'ddla', 'source', entry.suffix),
      'abapcatalog.ddla.acds',
    );
  });

  it('csnm: sources.model_inferred → {name}.csnm.model_inferred.csn', () => {
    const obj: GenericAffLike = {
      name: 'z_aff_example_csnm',
      sources: { model_inferred: '{ "definitions": {} }' },
    };
    const [entry] = genericGetSources(obj);
    assert.equal(entry.suffix, 'model_inferred');
    assert.equal(
      gctsFilename('z_aff_example_csnm', 'csnm', 'source', entry.suffix),
      'z_aff_example_csnm.csnm.model_inferred.csn',
    );
  });

  it('getSource fallback → suffix-less main file', () => {
    const obj = {
      name: 'z',
      getSource: () => 'source text',
    } as GenericAffLike;
    const entries = genericGetSources(obj);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].suffix, undefined);
  });
});

describe('DOCU companions', () => {
  const docuJson = readAffExample(
    { type: 'doma' },
    'z_aff_example.doma.docu.json',
  );

  it('emits {name}.{type}.docu.json when data.docu present', () => {
    const obj: GenericAffLike = {
      name: 'z_aff_example',
      data: { docu: docuJson },
    };
    const files = genericGetExtraFiles('doma')(obj);
    assert.equal(files.length, 1);
    assert.equal(files[0].path, 'z_aff_example.doma.docu.json');
    assert.deepEqual(JSON.parse(files[0].content as string), docuJson);
    assert.ok((files[0].content as string).endsWith('\n'));
  });

  it('emits nothing when data.docu absent', () => {
    assert.deepEqual(genericGetExtraFiles('doma')({ name: 'x' }), []);
  });

  it('upstream docu example validates against docu schema', () => {
    const { valid, errors } = affValidate({ type: 'docu' }, docuJson);
    assert.deepEqual(errors, []);
    assert.ok(valid);
  });

  it('setSources parses docu JSON into data.docu (round-trip)', () => {
    const obj: GenericAffLike = { name: 'z' };
    genericSetSources(obj, {
      docu: JSON.stringify(docuJson),
      'texts.en': 'k = v\n',
    });
    assert.deepEqual(obj.data?.docu, docuJson);
    assert.deepEqual(
      (obj.data?.sources as Record<string, string>)['texts.en'],
      'k = v\n',
    );
    // and it re-emits via extras, not as a source file
    const extras = genericGetExtraFiles('doma')(obj);
    assert.equal(extras[0]?.path, 'z.doma.docu.json');
  });
});

describe('companion preservation — deserialize → serialize (#243/#244)', () => {
  it('generic wave2 handler round-trips docu + .properties', async () => {
    const { deserialize } = await import('../../src/lib/deserializer.ts');
    const { getHandler } = await import('../../src/lib/handlers/base.ts');
    await import('../../src/lib/handlers/objects/index.ts');

    const files = new Map<string, string>([
      [
        'src/z.nrob.json',
        JSON.stringify({
          formatVersion: '1',
          header: { description: 'Number range' },
        }),
      ],
      ['src/z.nrob.docu.json', '{"formatVersion":"1","header":{}}'],
      ['src/z.nrob.properties', 'master=1\n'],
      ['src/z.nrob.en.properties', 'eng=1\n'],
    ]);
    const fileTree = {
      root: '/',
      glob: async (p: string) =>
        [...files.keys()].filter((f) =>
          p.startsWith('**/*.') ? f.endsWith(p.slice(4)) : f === p,
        ),
      read: async (p: string) => {
        const c = files.get(p);
        if (c === undefined) throw new Error(`ENOENT ${p}`);
        return c;
      },
      readBuffer: async (p: string) => Buffer.from(files.get(p) ?? ''),
      exists: async (p: string) => files.has(p),
      list: async () => [...files.keys()],
    };

    const objects = [];
    for await (const obj of deserialize(fileTree as never, {} as never)) {
      objects.push(obj);
    }
    assert.equal(objects.length, 1);

    const handler = getHandler('NROB');
    assert.ok(handler);
    const out = await handler.serialize(objects[0] as never);
    const paths = out.map((f) => f.path);
    const byPath = new Map(out.map((f) => [f.path, f.content]));
    const docuPath = paths.find((p) => p.endsWith('.docu.json'));
    assert.ok(docuPath, `docu emitted: ${paths}`);
    assert.deepEqual(JSON.parse(byPath.get(docuPath!) as string), {
      formatVersion: '1',
      header: {},
    });
    const props = paths.filter((p) => p.endsWith('.properties')).sort();
    assert.deepEqual(props, [
      docuPath!.replace('.docu.json', '.en.properties'),
      docuPath!.replace('.docu.json', '.properties'),
    ]);
    assert.equal(byPath.get(props[0]!), 'eng=1\n');
    assert.equal(byPath.get(props[1]!), 'master=1\n');
  });
});
