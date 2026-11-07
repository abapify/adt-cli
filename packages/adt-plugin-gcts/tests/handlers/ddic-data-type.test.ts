import assert from 'node:assert/strict';
import { test } from 'node:test';
import { affDataType } from '../../src/lib/handlers/objects/ddic-data-type.ts';

test('ADT DDIC type codes are validated before writing AFF metadata', () => {
  for (const type of ['CHAR', 'NUMC', 'DECFLOAT34', 'GEOM_EWKB', 'UTCLONG']) {
    assert.equal(affDataType(type), type);
  }
  for (const type of ['invented', '', 17, undefined, '__proto__']) {
    assert.throws(() => affDataType(type), /Unsupported AFF DDIC data type/);
  }
});
