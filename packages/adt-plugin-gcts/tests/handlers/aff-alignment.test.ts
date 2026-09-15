/**
 * AFF alignment tests for all aligned handlers (INTF, PROG, DOMA, DTEL, FUGR).
 *
 * Each suite verifies:
 *  - formatVersion "1" at root
 *  - header shape (description, originalLanguage lowercase, abapLanguageVersion omitted when standard)
 *  - no legacy wrapper object (e.g. "interface", "program", "domain")
 *  - type-specific AFF fields
 *  - round-trip: serialize → parse → fromMetadata recovers ADK fields
 *
 * Handlers are imported directly to avoid interference from base.test.ts's
 * __resetRegistry() hook.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

import { interfaceHandler } from '../../src/lib/handlers/objects/intf.ts';
import { programHandler } from '../../src/lib/handlers/objects/prog.ts';
import { domainHandler } from '../../src/lib/handlers/objects/doma.ts';
import { dataElementHandler } from '../../src/lib/handlers/objects/dtel.ts';
import { functionGroupHandler } from '../../src/lib/handlers/objects/fugr.ts';

function meta(files: { path: string; content: string }[]): Record<string, any> {
  return JSON.parse(files.find((f) => f.path.endsWith('.json'))!.content);
}

/** Fake object with a no-op getSource for handlers that call it (INTF, PROG). */
function fakeObj(data: Record<string, unknown>): any {
  return { getSource: () => undefined, ...data };
}

// ============================================================
// INTF
// ============================================================

describe('INTF handler — AFF intf-v1 alignment', () => {
  it('emits formatVersion "1" at root with header', async () => {
    const m = meta(
      await interfaceHandler.serialize(
        fakeObj({
          name: 'ZIF_TEST',
          description: 'Test interface',
          dataSync: { language: 'EN' },
        }),
      ),
    );
    assert.strictEqual(m.formatVersion, '1');
    assert.strictEqual(m.header.description, 'Test interface');
    assert.strictEqual(m.header.originalLanguage, 'en');
    assert.ok(!('formatVersion' in m.header));
  });

  it('does NOT emit an "interface" wrapper', async () => {
    const m = meta(
      await interfaceHandler.serialize(
        fakeObj({
          name: 'ZIF_TEST',
          description: 'x',
          dataSync: { language: 'EN' },
        }),
      ),
    );
    assert.ok(!('interface' in m));
  });

  it('omits abapLanguageVersion when standard', async () => {
    const m = meta(
      await interfaceHandler.serialize(
        fakeObj({
          name: 'ZIF_TEST',
          description: 'x',
          dataSync: { language: 'EN', abapLanguageVersion: 'standard' },
        }),
      ),
    );
    assert.ok(!('abapLanguageVersion' in m.header));
  });

  it('round-trips: serialize → fromMetadata recovers ADK fields', async () => {
    const files = await interfaceHandler.serialize(
      fakeObj({
        name: 'ZIF_TEST',
        description: 'Roundtrip intf',
        dataSync: { language: 'EN', abapLanguageVersion: 'cloudDevelopment' },
      }),
    );
    const recovered = interfaceHandler.fromAbapGit!(meta(files));
    assert.strictEqual(recovered.description, 'Roundtrip intf');
    assert.strictEqual(recovered.language, 'EN');
    assert.strictEqual(recovered.abapLanguageVersion, 'cloudDevelopment');
  });
});

// ============================================================
// PROG
// ============================================================

describe('PROG handler — AFF prog-v1 alignment', () => {
  it('emits formatVersion "1" and generalInformation', async () => {
    const m = meta(
      await programHandler.serialize(
        fakeObj({
          name: 'ZTEST',
          description: 'Test prog',
          dataSync: { language: 'EN', programType: 'executableProgram' },
        }),
      ),
    );
    assert.strictEqual(m.formatVersion, '1');
    assert.ok(m.generalInformation, 'must have generalInformation');
    assert.strictEqual(m.generalInformation.programType, 'executableProgram');
    assert.strictEqual(m.generalInformation.programStatus, 'systemProgram');
  });

  it('does NOT emit a "program" wrapper', async () => {
    const m = meta(
      await programHandler.serialize(
        fakeObj({
          name: 'ZTEST',
          description: 'x',
          dataSync: { language: 'EN' },
        }),
      ),
    );
    assert.ok(!('program' in m));
  });

  it('maps sourceObjectStatus to AFF programStatus', async () => {
    const m = meta(
      await programHandler.serialize(
        fakeObj({
          name: 'ZTEST',
          description: 'x',
          dataSync: {
            language: 'EN',
            sourceObjectStatus: 'SAPStandardProduction',
          },
        }),
      ),
    );
    assert.strictEqual(
      m.generalInformation.programStatus,
      'sapProductionProgram',
    );
  });

  it('round-trips: serialize → fromMetadata recovers ADK fields', async () => {
    const files = await programHandler.serialize(
      fakeObj({
        name: 'ZTEST',
        description: 'Roundtrip prog',
        dataSync: {
          language: 'EN',
          programType: 'modulePool',
          fixPointArithmetic: true,
        },
      }),
    );
    const recovered = programHandler.fromAbapGit!(meta(files));
    assert.strictEqual(recovered.description, 'Roundtrip prog');
    assert.strictEqual(recovered.programType, 'modulePool');
    assert.strictEqual(recovered.fixPointArithmetic, true);
  });
});

// ============================================================
// DOMA
// ============================================================

describe('DOMA handler — AFF doma-v1 alignment', () => {
  it('emits formatVersion "1" and required format object', async () => {
    const m = meta(
      await domainHandler.serialize({
        name: 'ZTEST',
        description: 'Test domain',
        dataSync: {
          language: 'EN',
          content: { typeInformation: { datatype: 'CHAR', length: 10 } },
        },
      } as any),
    );
    assert.strictEqual(m.formatVersion, '1');
    assert.ok(m.format, 'must have format (required by AFF)');
    assert.strictEqual(m.format.dataType, 'CHAR');
    assert.strictEqual(m.format.length, 10);
  });

  it('does NOT emit a "domain" wrapper', async () => {
    const m = meta(
      await domainHandler.serialize({
        name: 'ZTEST',
        description: 'x',
        dataSync: {
          language: 'EN',
          content: { typeInformation: { datatype: 'CHAR', length: 3 } },
        },
      } as any),
    );
    assert.ok(!('domain' in m));
  });

  it('emits outputCharacteristics when outputInformation present', async () => {
    const m = meta(
      await domainHandler.serialize({
        name: 'ZTEST',
        description: 'x',
        dataSync: {
          language: 'EN',
          content: {
            typeInformation: { datatype: 'CHAR', length: 3 },
            outputInformation: {
              length: 3,
              lowercase: true,
              conversionExit: 'ALPHA',
            },
          },
        },
      } as any),
    );
    assert.ok(m.outputCharacteristics);
    assert.strictEqual(m.outputCharacteristics.caseSensitive, false); // lowercase=true → caseSensitive=false
    assert.strictEqual(m.outputCharacteristics.conversionRoutine, 'ALPHA');
  });

  it('round-trips: serialize → fromMetadata recovers ADK fields', async () => {
    const files = await domainHandler.serialize({
      name: 'ZTEST',
      description: 'Roundtrip domain',
      dataSync: {
        language: 'EN',
        content: { typeInformation: { datatype: 'NUMC', length: 8 } },
      },
    } as any);
    const recovered = domainHandler.fromAbapGit!(meta(files));
    assert.strictEqual(recovered.description, 'Roundtrip domain');
    assert.strictEqual(recovered.content.typeInformation.datatype, 'NUMC');
    assert.strictEqual(recovered.content.typeInformation.length, 8);
  });
});

// ============================================================
// DTEL
// ============================================================

describe('DTEL handler — AFF dtel-v1 alignment', () => {
  it('emits formatVersion "1" and dataTypeInformation with domainName', async () => {
    const m = meta(
      await dataElementHandler.serialize({
        name: 'ZTEST',
        description: 'Test dtel',
        dataSync: { language: 'EN', typeKind: 'domain', typeName: 'ZMYDOMA' },
      } as any),
    );
    assert.strictEqual(m.formatVersion, '1');
    assert.ok(m.dataTypeInformation);
    assert.strictEqual(m.dataTypeInformation.domainName, 'ZMYDOMA');
  });

  it('emits dataTypeInformation with predefinedType when not domain', async () => {
    const m = meta(
      await dataElementHandler.serialize({
        name: 'ZTEST',
        description: 'x',
        dataSync: {
          language: 'EN',
          typeKind: 'predefinedAbapType',
          dataType: 'CHAR',
          dataTypeLength: 20,
        },
      } as any),
    );
    assert.ok(m.dataTypeInformation.predefinedType);
    assert.strictEqual(m.dataTypeInformation.predefinedType.dataType, 'CHAR');
    assert.strictEqual(m.dataTypeInformation.predefinedType.length, 20);
  });

  it('does NOT emit a "dataElement" wrapper', async () => {
    const m = meta(
      await dataElementHandler.serialize({
        name: 'ZTEST',
        description: 'x',
        dataSync: { language: 'EN', typeKind: 'domain', typeName: 'ZD' },
      } as any),
    );
    assert.ok(!('dataElement' in m));
  });

  it('emits fieldLabels when label fields present', async () => {
    const m = meta(
      await dataElementHandler.serialize({
        name: 'ZTEST',
        description: 'x',
        dataSync: {
          language: 'EN',
          typeKind: 'domain',
          typeName: 'ZD',
          shortFieldLabel: 'Short',
          shortFieldLength: 5,
          mediumFieldLabel: 'Medium',
          mediumFieldLength: 10,
        },
      } as any),
    );
    assert.ok(m.fieldLabels);
    assert.strictEqual(m.fieldLabels.short, 'Short');
    assert.strictEqual(m.fieldLabels.shortLength, 5);
    assert.strictEqual(m.fieldLabels.medium, 'Medium');
  });

  it('round-trips: serialize → fromMetadata recovers domain reference', async () => {
    const files = await dataElementHandler.serialize({
      name: 'ZTEST',
      description: 'Roundtrip dtel',
      dataSync: { language: 'EN', typeKind: 'domain', typeName: 'ZMYDOMA' },
    } as any);
    const recovered = dataElementHandler.fromAbapGit!(meta(files));
    assert.strictEqual(recovered.description, 'Roundtrip dtel');
    assert.strictEqual(recovered.typeKind, 'domain');
    assert.strictEqual(recovered.typeName, 'ZMYDOMA');
  });
});

// ============================================================
// FUGR
// ============================================================

describe('FUGR handler — AFF fugr-v1 alignment', () => {
  it('emits formatVersion "1" and required fixPointArithmetic', async () => {
    const m = meta(
      await functionGroupHandler.serialize({
        name: 'ZTEST',
        description: 'Test fugr',
        dataSync: { language: 'EN', fixPointArithmetic: true },
      } as any),
    );
    assert.strictEqual(m.formatVersion, '1');
    assert.strictEqual(m.fixPointArithmetic, true);
  });

  it('does NOT emit a "functionGroup" wrapper', async () => {
    const m = meta(
      await functionGroupHandler.serialize({
        name: 'ZTEST',
        description: 'x',
        dataSync: { language: 'EN', fixPointArithmetic: false },
      } as any),
    );
    assert.ok(!('functionGroup' in m));
  });

  it('round-trips: serialize → fromMetadata recovers ADK fields', async () => {
    const files = await functionGroupHandler.serialize({
      name: 'ZTEST',
      description: 'Roundtrip fugr',
      dataSync: { language: 'EN', fixPointArithmetic: true },
    } as any);
    const recovered = functionGroupHandler.fromAbapGit!(meta(files));
    assert.strictEqual(recovered.description, 'Roundtrip fugr');
    assert.strictEqual(recovered.fixPointArithmetic, true);
    assert.strictEqual(recovered.language, 'EN');
  });

  it('matches AFF example shape (fixPointArithmetic: true)', async () => {
    const m = meta(
      await functionGroupHandler.serialize({
        name: 'Z_AFF_EXAMPLE_FUGR',
        description: 'Example FUGR for ABAP file formats',
        dataSync: { language: 'EN', fixPointArithmetic: true },
      } as any),
    );
    assert.strictEqual(m.formatVersion, '1');
    assert.strictEqual(
      m.header.description,
      'Example FUGR for ABAP file formats',
    );
    assert.strictEqual(m.header.originalLanguage, 'en');
    assert.strictEqual(m.fixPointArithmetic, true);
  });
});
