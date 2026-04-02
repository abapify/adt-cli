/**
 * Handler-level roundtrip tests for INTF and CLAS
 *
 * Verifies bidirectional mapping symmetry:
 *   fixture XML → schema.parse → fromAbapGit → mock ADK → toAbapGit → serialize → re-parse → compare
 *
 * This catches data loss or transformation errors that schema-level roundtrip
 * (parse→build→re-parse) would not detect — e.g. fields dropped by fromAbapGit
 * or toAbapGit producing values that don't match the original fixture.
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Import handlers to trigger registration
import '../../src/lib/handlers/objects/intf.ts';
import '../../src/lib/handlers/objects/clas.ts';
import { getHandler } from '../../src/lib/handlers/base.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fixturesDir = join(__dirname, '../fixtures');

function loadFixture(relativePath: string): string {
  return readFileSync(join(fixturesDir, relativePath), 'utf-8');
}

function createMockClasObject(adkData: any) {
  return {
    name: adkData.name,
    type: adkData.type,
    kind: 'Class',
    description: adkData.description ?? '',
    dataSync: {
      language: adkData.language,
      masterLanguage: adkData.masterLanguage,
      description: adkData.description,
      category: (adkData as any).category,
      visibility: (adkData as any).visibility,
      final: (adkData as any).final,
      abstract: (adkData as any).abstract,
      sharedMemoryEnabled: (adkData as any).sharedMemoryEnabled,
      fixPointArithmetic: (adkData as any).fixPointArithmetic,
      activeUnicodeCheck: (adkData as any).activeUnicodeCheck,
      withUnitTests: (adkData as any).withUnitTests,
      superClassRef: (adkData as any).superClassRef,
      messageClassRef: (adkData as any).messageClassRef,
      abapLanguageVersion: (adkData as any).abapLanguageVersion,
      include: [],
    },
    getIncludeSource: () => Promise.resolve(''),
  };
}

function assertFieldsRoundtrip(
  reValues: any,
  originalValues: any,
  rootKey: string,
  fields: string[],
): void {
  for (const field of fields) {
    assert.strictEqual(
      reValues[rootKey]?.[field],
      originalValues[rootKey]?.[field],
      `${field} should roundtrip`,
    );
  }
}

/**
 * Registers a `before` hook that fetches the handler and an `it` test that
 * asserts handler metadata (type + fileExtension).  Returns a getter for the
 * handler so that subsequent tests in the same `describe` scope can use it.
 */
function describeHandlerSetup(
  type: string,
): () => NonNullable<ReturnType<typeof getHandler>> {
  let handler: ReturnType<typeof getHandler>;

  before(() => {
    handler = getHandler(type);
    assert.ok(handler, `${type} handler should be registered`);
  });

  it('handler is registered with correct metadata', () => {
    assert.strictEqual(handler!.type, type);
    assert.strictEqual(handler!.fileExtension, type.toLowerCase());
  });

  return () => handler!;
}

/**
 * Serialize a mock ADK object via the handler, locate the produced XML file,
 * re-parse it through the handler's schema and return the abapGit values.
 */
async function serializeAndReparse(
  handler: NonNullable<ReturnType<typeof getHandler>>,
  mockObj: unknown,
  ext: string,
) {
  const files = await handler.serialize(mockObj as any);
  const xmlFile = files.find((f) => f.path.endsWith(`.${ext}.xml`));
  assert.ok(xmlFile, `Should produce .${ext}.xml file`);
  const reparsed = handler.schema.parse(xmlFile!.content) as any;
  return reparsed.abapGit.abap.values;
}

// ============================================
// INTF Roundtrip
// ============================================

describe('INTF handler roundtrip', () => {
  const getIntfHandler = describeHandlerSetup('INTF');

  describe('fromAbapGit', () => {
    it('maps VSEOINTERF to ADK data', () => {
      const result = getIntfHandler().fromAbapGit!({
        VSEOINTERF: {
          CLSNAME: 'ZIF_TEST_INTF',
          LANGU: 'E',
          DESCRIPT: 'Test interface',
          EXPOSURE: '2',
          STATE: '1',
          UNICODE: 'X',
        },
      });

      assert.strictEqual(result.name, 'ZIF_TEST_INTF');
      assert.strictEqual(result.type, 'INTF/OI');
      assert.strictEqual(result.description, 'Test interface');
      assert.strictEqual(result.language, 'EN');
      assert.strictEqual(result.masterLanguage, 'EN');
    });

    it('maps ABAP_LANGUAGE_VERSION correctly', () => {
      const result = getIntfHandler().fromAbapGit!({
        VSEOINTERF: {
          CLSNAME: 'ZIF_CLOUD',
          ABAP_LANGUAGE_VERSION: '5',
        },
      });

      assert.strictEqual(result.name, 'ZIF_CLOUD');
      assert.strictEqual(
        (result as any).abapLanguageVersion,
        'cloudDevelopment',
      );
    });

    it('handles empty/missing VSEOINTERF gracefully', () => {
      const result = getIntfHandler().fromAbapGit!({});
      assert.strictEqual(result.name, '');
      assert.strictEqual(result.type, 'INTF/OI');
    });
  });

  describe('fixture roundtrip: parse → fromAbapGit → mock ADK → serialize → compare', () => {
    it('round-trips zif_age_test.intf.xml', async () => {
      const handler = getIntfHandler();
      const xml = loadFixture('intf/zif_age_test.intf.xml');

      // Step 1: Parse fixture XML
      const parsed = handler.schema.parse(xml) as any;
      const values = parsed.abapGit.abap.values;

      // Step 2: fromAbapGit → ADK data
      const adkData = handler.fromAbapGit!(values);
      assert.strictEqual(adkData.name, 'ZIF_AGE_TEST');
      assert.strictEqual(adkData.description, 'Test interface');

      // Step 3: Create mock ADK object (simulates what adk.getWithData returns)
      const mockAdkObject = {
        name: adkData.name,
        type: adkData.type,
        kind: 'Interface',
        description: adkData.description ?? '',
        dataSync: {
          language: adkData.language,
          masterLanguage: adkData.masterLanguage,
          abapLanguageVersion: (adkData as any).abapLanguageVersion,
        },
        getSource: async () => '',
      };

      // Step 4–5: Serialize → re-parse
      const reValues = await serializeAndReparse(
        handler,
        mockAdkObject,
        'intf',
      );

      // Step 6: Compare key VSEOINTERF fields
      assertFieldsRoundtrip(reValues, values, 'VSEOINTERF', [
        'CLSNAME',
        'LANGU',
        'DESCRIPT',
        'EXPOSURE',
        'STATE',
        'UNICODE',
      ]);
    });
  });
});

// ============================================
// CLAS Roundtrip
// ============================================

describe('CLAS handler roundtrip', () => {
  const getClasHandler = describeHandlerSetup('CLAS');

  describe('fromAbapGit', () => {
    it('maps VSEOCLASS to ADK data — basic public class', () => {
      const result = getClasHandler().fromAbapGit!({
        VSEOCLASS: {
          CLSNAME: 'ZCL_TEST',
          LANGU: 'E',
          DESCRIPT: 'Test class',
          STATE: '1',
          CATEGORY: '00',
          EXPOSURE: '2',
          CLSCCINCL: 'X',
          FIXPT: 'X',
          UNICODE: 'X',
        },
      });

      assert.strictEqual(result.name, 'ZCL_TEST');
      assert.strictEqual(result.type, 'CLAS/OC');
      assert.strictEqual(result.description, 'Test class');
      assert.strictEqual(result.language, 'EN');
      assert.strictEqual((result as any).category, '00');
      assert.strictEqual((result as any).visibility, 'public');
      assert.strictEqual((result as any).fixPointArithmetic, true);
      assert.strictEqual((result as any).activeUnicodeCheck, true);
      assert.strictEqual((result as any).final, false);
      assert.strictEqual((result as any).abstract, false);
    });

    it('maps abstract final class attributes', () => {
      const result = getClasHandler().fromAbapGit!({
        VSEOCLASS: {
          CLSNAME: 'ZCL_ABSTRACT',
          CLSABSTRCT: 'X',
          CLSFINAL: 'X',
          EXPOSURE: '1',
        },
      });

      assert.strictEqual(result.name, 'ZCL_ABSTRACT');
      assert.strictEqual((result as any).abstract, true);
      assert.strictEqual((result as any).final, true);
      assert.strictEqual((result as any).visibility, 'protected');
    });

    it('maps superclass and message class references', () => {
      const result = getClasHandler().fromAbapGit!({
        VSEOCLASS: {
          CLSNAME: 'ZCL_CHILD',
          REFCLSNAME: 'ZCL_PARENT',
          MSG_ID: 'ZMSG_CLASS',
        },
      });

      assert.deepStrictEqual((result as any).superClassRef, {
        name: 'ZCL_PARENT',
      });
      assert.deepStrictEqual((result as any).messageClassRef, {
        name: 'ZMSG_CLASS',
      });
    });

    it('maps ABAP_LANGUAGE_VERSION correctly', () => {
      const result = getClasHandler().fromAbapGit!({
        VSEOCLASS: {
          CLSNAME: 'ZCL_CLOUD',
          ABAP_LANGUAGE_VERSION: '5',
        },
      });

      assert.strictEqual(
        (result as any).abapLanguageVersion,
        'cloudDevelopment',
      );
    });

    it('handles empty/missing VSEOCLASS gracefully', () => {
      const result = getClasHandler().fromAbapGit!({});
      assert.strictEqual(result.name, '');
      assert.strictEqual(result.type, 'CLAS/OC');
    });

    it('maps shared memory flag', () => {
      const result = getClasHandler().fromAbapGit!({
        VSEOCLASS: {
          CLSNAME: 'ZCL_SHARED',
          SHRM_ENABLED: 'X',
        },
      });

      assert.strictEqual((result as any).sharedMemoryEnabled, true);
    });
  });

  describe('suffixToSourceKey mapping', () => {
    it('maps abapGit suffixes to ADK source keys', () => {
      const mapping = getClasHandler().suffixToSourceKey;
      assert.ok(mapping, 'suffixToSourceKey should be defined');
      assert.strictEqual(mapping!['locals_def'], 'definitions');
      assert.strictEqual(mapping!['locals_imp'], 'implementations');
      assert.strictEqual(mapping!['locals_types'], 'localtypes');
      assert.strictEqual(mapping!['macros'], 'macros');
      assert.strictEqual(mapping!['testclasses'], 'testclasses');
    });
  });

  describe('fixture roundtrip: parse → fromAbapGit → mock ADK → serialize → compare', () => {
    it('round-trips zcl_age_sample_class.clas.xml', async () => {
      const handler = getClasHandler();
      const xml = loadFixture('clas/zcl_age_sample_class.clas.xml');

      // Step 1: Parse fixture XML
      const parsed = handler.schema.parse(xml) as any;
      const values = parsed.abapGit.abap.values;

      // Step 2: fromAbapGit → ADK data
      const adkData = handler.fromAbapGit!(values);
      assert.strictEqual(adkData.name, 'ZCL_AGE_SAMPLE_CLASS');
      assert.strictEqual(adkData.description, 'Sample class');

      // Step 3: Create mock ADK object (simulates what adk.getWithData returns)
      const mockAdkObject = createMockClasObject(adkData);

      // Step 4–5: Serialize → re-parse
      const reValues = await serializeAndReparse(
        handler,
        mockAdkObject,
        'clas',
      );

      // Step 6: Compare key VSEOCLASS fields
      assertFieldsRoundtrip(reValues, values, 'VSEOCLASS', [
        'CLSNAME',
        'LANGU',
        'DESCRIPT',
        'STATE',
        'CLSCCINCL',
        'FIXPT',
        'UNICODE',
        'WITH_UNIT_TESTS',
      ]);
    });

    it('round-trips class with superclass reference', async () => {
      const handler = getClasHandler();
      // Build from scratch to test superclass ref roundtrip
      // Use non-default EXPOSURE (protected=1) to verify it survives roundtrip
      const inputValues = {
        VSEOCLASS: {
          CLSNAME: 'ZCL_CHILD_CLASS',
          LANGU: 'E',
          DESCRIPT: 'Child class with parent',
          STATE: '1',
          EXPOSURE: '1',
          CLSCCINCL: 'X',
          FIXPT: 'X',
          UNICODE: 'X',
          REFCLSNAME: 'ZCL_PARENT_CLASS',
          MSG_ID: 'ZTEST_MSGCLS',
          CLSFINAL: 'X',
          ABAP_LANGUAGE_VERSION: '5',
        },
      };

      // fromAbapGit
      const adkData = handler.fromAbapGit!(inputValues);
      assert.strictEqual(adkData.name, 'ZCL_CHILD_CLASS');
      assert.deepStrictEqual((adkData as any).superClassRef, {
        name: 'ZCL_PARENT_CLASS',
      });
      assert.deepStrictEqual((adkData as any).messageClassRef, {
        name: 'ZTEST_MSGCLS',
      });
      assert.strictEqual((adkData as any).final, true);
      assert.strictEqual(
        (adkData as any).abapLanguageVersion,
        'cloudDevelopment',
      );
      assert.strictEqual((adkData as any).visibility, 'protected');

      // Create mock ADK object → serialize → re-parse
      const mockAdkObject = createMockClasObject(adkData);
      const reValues = await serializeAndReparse(
        handler,
        mockAdkObject,
        'clas',
      );

      // Verify all fields survive roundtrip
      assert.strictEqual(reValues.VSEOCLASS.CLSNAME, 'ZCL_CHILD_CLASS');
      assert.strictEqual(reValues.VSEOCLASS.REFCLSNAME, 'ZCL_PARENT_CLASS');
      assert.strictEqual(reValues.VSEOCLASS.MSG_ID, 'ZTEST_MSGCLS');
      assert.strictEqual(reValues.VSEOCLASS.CLSFINAL, 'X');
      assert.strictEqual(reValues.VSEOCLASS.ABAP_LANGUAGE_VERSION, '5');
      assert.strictEqual(reValues.VSEOCLASS.EXPOSURE, '1');
    });
  });
});
