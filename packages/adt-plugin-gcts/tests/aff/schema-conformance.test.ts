/**
 * Schema conformance: every upstream example in the AFF submodule must
 * validate against the official schema for its type and declared
 * `formatVersion`. Zero network — reads `git_modules/abap-file-formats`
 * directly. Companion files (`.docu.json`, LIMU sub-objects) are routed
 * to their own schema or skipped as non-root documents.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  listAffTypes,
  affExamples,
  readAffExample,
  schemaTargetForExample,
  affValidate,
} from '../../src/lib/aff/schemas.ts';

const SUB_OBJECT_RE = /\.(reps|sotr|sotu|cpub|cpro|cprt|cpri|func)\.json$/i;

interface Row {
  type: string;
  file: string;
  errors: string[];
}

const failures: Row[] = [];
let checked = 0;
let companions = 0;
let subObjects = 0;

for (const type of listAffTypes()) {
  for (const rel of affExamples(type)) {
    const json = readAffExample(type, rel);
    const target = schemaTargetForExample(type, rel, json);
    if (target.companion) {
      companions++;
    } else if (SUB_OBJECT_RE.test(rel)) {
      subObjects++;
      continue;
    }
    const { valid, errors } = affValidate(target.type, json, target.version);
    if (valid) checked++;
    else failures.push({ type: target.type, file: rel, errors });
  }
}

describe('AFF schema conformance (upstream examples)', () => {
  it('has a substantial corpus', () => {
    assert.ok(
      checked + companions + subObjects > 50,
      `expected >50 example files, got ${checked + companions + subObjects}`,
    );
  });

  it('every root example validates against its official schema', () => {
    assert.deepEqual(
      failures.map((f) => `${f.type}/${f.file}: ${f.errors[0]}`),
      [],
    );
  });

  it('reports', () => {
    console.log(
      `[conformance] root-valid=${checked} companions=${companions} ` +
        `sub-objects=${subObjects} failures=${failures.length}`,
    );
  });
});
