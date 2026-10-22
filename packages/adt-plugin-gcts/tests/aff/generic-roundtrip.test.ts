/**
 * Generic emit round-trip: for every stub type (no dedicated
 * `objects/{type}.ts`), take each upstream example as the payload,
 * synthesize a GenericAffLike, run `genericToMetadata`, and require the
 * emitted metadata to validate against the official schema. Also checks
 * `genericFromMetadata` preserves every body field for the trip back.
 */

import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  listAffTypes,
  affExamples,
  readAffExample,
  schemaTargetForExample,
  affValidate,
  affBodyProps,
} from '../../src/lib/aff/schemas.ts';
import {
  genericToMetadata,
  genericFromMetadata,
  type MinimalAff,
} from '../../src/lib/aff/generic.ts';

const OBJECTS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../src/lib/handlers/objects',
);
const dedicated = (t: string) => existsSync(join(OBJECTS_DIR, `${t}.ts`));

interface Fail {
  type: string;
  file: string;
  errors: string[];
}
const emitFailures: Fail[] = [];
const bodyDrops: string[] = [];
let emitted = 0;

function collect() {
  for (const type of listAffTypes()) {
    if (dedicated(type)) continue;
    for (const rel of affExamples({ type })) {
      const example = readAffExample({ type }, rel);
      const target = schemaTargetForExample({ type }, rel, example);
      if (target.companion || target.type !== type) continue;

      const { formatVersion, header, ...body } = example as MinimalAff & {
        formatVersion: string;
        header: { description: string; originalLanguage: string };
      };
      const obj = {
        name: 'zz_aff_fixture',
        description: header?.description ?? '',
        originalLanguage: header?.originalLanguage ?? 'en',
        data: { formatVersion, ...body },
      };

      const meta = genericToMetadata(type)(obj);
      const { valid, errors } = affValidate(
        {
          type,
          version: Number.isNaN(Number(meta.formatVersion))
            ? undefined
            : Number(meta.formatVersion),
        },
        meta,
      );
      if (!valid) {
        emitFailures.push({ type, file: rel, errors: errors.slice(0, 3) });
        continue;
      }
      emitted++;

      // fromMetadata must return every body field so it survives to _data
      const back = genericFromMetadata(example as MinimalAff);
      for (const prop of affBodyProps({ type })) {
        if (
          body[prop] !== undefined &&
          (back as Record<string, unknown>)[prop] === undefined
        ) {
          bodyDrops.push(`${type}/${rel}: ${prop}`);
        }
      }
    }
  }
}

describe('generic AFF emit round-trip (stubs)', () => {
  before(collect);

  it('emits schema-valid metadata for upstream examples', () => {
    assert.ok(emitted > 30, `expected >30 stub emissions, got ${emitted}`);
    assert.deepEqual(
      emitFailures.map((f) => `${f.type}/${f.file}: ${f.errors[0]}`),
      [],
    );
  });

  it('fromMetadata preserves all body fields', () => {
    assert.deepEqual(bodyDrops, []);
  });
});
