/**
 * Tests for parseAbapGitFilename — dual-format extension support
 *
 * Verifies that the filename parser correctly handles:
 * - Legacy XML metadata (.xml)
 * - AFF JSON metadata (.json)
 * - ABAP source (.abap)
 * - AFF source extensions (.abdl, .acds, .asrvd)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

import { parseAbapGitFilename } from '../src/lib/filename-parser.ts';

describe('parseAbapGitFilename', () => {
  describe('legacy XML metadata', () => {
    it('parses name.type.xml', () => {
      const result = parseAbapGitFilename('zcl_test.clas.xml');
      assert.ok(result);
      assert.strictEqual(result.name, 'ZCL_TEST');
      assert.strictEqual(result.type, 'CLAS');
      assert.strictEqual(result.extension, 'xml');
      assert.strictEqual(result.suffix, undefined);
    });

    it('parses package.devc.xml', () => {
      const result = parseAbapGitFilename('package.devc.xml');
      assert.ok(result);
      assert.strictEqual(result.name, 'PACKAGE');
      assert.strictEqual(result.type, 'DEVC');
      assert.strictEqual(result.extension, 'xml');
    });
  });

  describe('AFF JSON metadata', () => {
    it('parses name.type.json', () => {
      const result = parseAbapGitFilename('zfoo.bdef.json');
      assert.ok(result);
      assert.strictEqual(result.name, 'ZFOO');
      assert.strictEqual(result.type, 'BDEF');
      assert.strictEqual(result.extension, 'json');
      assert.strictEqual(result.suffix, undefined);
    });

    it('parses srvd.json', () => {
      const result = parseAbapGitFilename('zui_orders.srvd.json');
      assert.ok(result);
      assert.strictEqual(result.name, 'ZUI_ORDERS');
      assert.strictEqual(result.type, 'SRVD');
      assert.strictEqual(result.extension, 'json');
    });

    it('parses ddls.json', () => {
      const result = parseAbapGitFilename('zi_orders.ddls.json');
      assert.ok(result);
      assert.strictEqual(result.name, 'ZI_ORDERS');
      assert.strictEqual(result.type, 'DDLS');
      assert.strictEqual(result.extension, 'json');
    });

    it('parses desd.json', () => {
      const result = parseAbapGitFilename('zmy_schema.desd.json');
      assert.ok(result);
      assert.strictEqual(result.name, 'ZMY_SCHEMA');
      assert.strictEqual(result.type, 'DESD');
      assert.strictEqual(result.extension, 'json');
    });
  });

  describe('ABAP source files', () => {
    it('parses name.type.abap', () => {
      const result = parseAbapGitFilename('zcl_test.clas.abap');
      assert.ok(result);
      assert.strictEqual(result.name, 'ZCL_TEST');
      assert.strictEqual(result.type, 'CLAS');
      assert.strictEqual(result.extension, 'abap');
      assert.strictEqual(result.suffix, undefined);
    });

    it('parses name.type.suffix.abap', () => {
      const result = parseAbapGitFilename('zcl_test.clas.testclasses.abap');
      assert.ok(result);
      assert.strictEqual(result.name, 'ZCL_TEST');
      assert.strictEqual(result.type, 'CLAS');
      assert.strictEqual(result.extension, 'abap');
      assert.strictEqual(result.suffix, 'testclasses');
    });
  });

  describe('AFF source files', () => {
    it('parses .abdl source (BDEF)', () => {
      const result = parseAbapGitFilename('zbp_foo.bdef.abdl');
      assert.ok(result);
      assert.strictEqual(result.name, 'ZBP_FOO');
      assert.strictEqual(result.type, 'BDEF');
      assert.strictEqual(result.extension, 'abdl');
      assert.strictEqual(result.suffix, undefined);
    });

    it('parses .acds source (CDS types)', () => {
      const result = parseAbapGitFilename('zi_orders.ddls.acds');
      assert.ok(result);
      assert.strictEqual(result.name, 'ZI_ORDERS');
      assert.strictEqual(result.type, 'DDLS');
      assert.strictEqual(result.extension, 'acds');
      assert.strictEqual(result.suffix, undefined);
    });

    it('parses .asrvd source (SRVD)', () => {
      const result = parseAbapGitFilename('zui_orders.srvd.asrvd');
      assert.ok(result);
      assert.strictEqual(result.name, 'ZUI_ORDERS');
      assert.strictEqual(result.type, 'SRVD');
      assert.strictEqual(result.extension, 'asrvd');
      assert.strictEqual(result.suffix, undefined);
    });
  });

  describe('invalid filenames', () => {
    it('returns null for .abapgit.xml', () => {
      // .abapgit.xml has 4 parts but "abapgit" is not a valid type
      // Actually this DOES parse — the deserializer filters it separately
      const result = parseAbapGitFilename('.abapgit.xml');
      // Leading dot means name is empty, which won't match the regex
      assert.strictEqual(result, null);
    });

    it('returns null for unsupported extension', () => {
      const result = parseAbapGitFilename('zfoo.bdef.txt');
      assert.strictEqual(result, null);
    });

    it('returns null for random filename', () => {
      const result = parseAbapGitFilename('README.md');
      assert.strictEqual(result, null);
    });
  });
});
