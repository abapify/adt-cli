import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getHandler } from '../../src/lib/handlers/registry.ts';

const CDS_RAP_TYPES = [
  'DCLS',
  'DDLS',
  'DDLX',
  'DRAS',
  'DRTY',
  'DSFD',
  'DSFI',
  'DTEB',
  'DESD',
  'DTDC',
  'DTIX',
  'DTSC',
  'BDEF',
  'SRVD',
  'SRVB',
] as const;

describe('CDS and RAP abapGit handler registration', () => {
  for (const objectType of CDS_RAP_TYPES) {
    it(`registers ${objectType}`, () => {
      assert.ok(getHandler(objectType));
    });
  }
});
