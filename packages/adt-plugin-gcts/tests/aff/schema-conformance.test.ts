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

const SUB_OBJECT_RE =
  /\.(reps|sotr|sotu|cpub|cpro|cprt|cpri|func|settings)\.json$/i;

interface Row {
  type: string;
  file: string;
  errors: string[];
}

const failures: Row[] = [];
let checked = 0;
let companions = 0;
let limuObjects = 0;
let subObjects = 0;

for (const type of listAffTypes()) {
  for (const rel of affExamples({ type })) {
    let json: any;
    try {
      json = readAffExample({ type }, rel);
    } catch (e) {
      if (!(e instanceof SyntaxError)) throw e;
      continue;
    }
    const target = schemaTargetForExample({ type }, rel, json);
    if (!target.companion && SUB_OBJECT_RE.test(rel)) {
      subObjects++;
      continue;
    }
    const { valid, errors } = affValidate(target, json);
    if (!valid) failures.push({ type: target.type, file: rel, errors });
    else if (target.companion && SUB_OBJECT_RE.test(rel)) limuObjects++;
    else if (target.companion) companions++;
    else checked++;
  }
}

describe('AFF schema conformance (upstream examples)', () => {
  it('has a substantial corpus', () => {
    assert.ok(
      checked + companions + limuObjects + subObjects > 50,
      `expected >50 example files, got ${checked + companions + subObjects}`,
    );
  });

  it('every root example validates against its official schema', () => {
    assert.deepEqual(
      failures.map((f) => `${f.type}/${f.file}: ${f.errors[0]}`),
      [],
    );
  });

  it('classifies companion and sub-object examples', () => {
    console.log(
      `[conformance] root-valid=${checked} companions=${companions} ` +
        `limu=${limuObjects} unvalidated-sub-objects=${subObjects} ` +
        `failures=${failures.length}`,
    );
    assert.ok(companions >= 1, `expected ≥1 DOCU companion, got ${companions}`);
    assert.ok(
      limuObjects >= 1,
      `expected ≥1 schema-validated LIMU sub-object (func/reps), got ${limuObjects}`,
    );
    assert.equal(
      subObjects,
      0,
      `all LIMU sub-objects should validate now, got ${subObjects} skipped`,
    );
  });
});
