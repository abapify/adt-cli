/**
 * AFF alignment + roundtrip tests for Wave 1 handlers:
 * DDLS, DCLS, BDEF, SRVD, SRVB, MSAG, FUGR per-FM, i18n .properties.
 *
 * Each suite verifies:
 *  - formatVersion "1" at root
 *  - header shape
 *  - type-specific AFF fields
 *  - round-trip: serialize → parse → fromMetadata recovers fields
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

import { ddlSourceHandler } from '../../src/lib/handlers/objects/ddls.ts';
import { dclSourceHandler } from '../../src/lib/handlers/objects/dcls.ts';
import { behaviorDefinitionHandler } from '../../src/lib/handlers/objects/bdef.ts';
import { serviceDefinitionHandler } from '../../src/lib/handlers/objects/srvd.ts';
import { serviceBindingHandler } from '../../src/lib/handlers/objects/srvb.ts';
import { messageClassHandler } from '../../src/lib/handlers/objects/msag.ts';
import { functionGroupHandler } from '../../src/lib/handlers/objects/fugr.ts';
import {
  buildProperties,
  propertiesFilename,
  createPropertiesFiles,
} from '../../src/lib/format/i18n.ts';

function meta(files: { path: string; content: string }[]): Record<string, any> {
  return JSON.parse(files.find((f) => f.path.endsWith('.json'))!.content);
}

function fakeObj(data: Record<string, unknown>): any {
  return { getSource: () => '', ...data };
}

// ============================================================
// DDLS
// ============================================================
describe('DDLS handler — AFF ddls-v1 alignment', () => {
  it('emits formatVersion "1" with header + sourceOrigin + sourceType', async () => {
    const m = meta(
      await ddlSourceHandler.serialize(
        fakeObj({
          name: 'ZC_TEST',
          description: 'Test CDS view',
          originalLanguage: 'EN',
          sourceOrigin: 'abapDevelopmentTools',
          sourceType: 'viewEntity',
        }),
      ),
    );
    assert.strictEqual(m.formatVersion, '1');
    assert.strictEqual(m.header.description, 'Test CDS view');
    assert.strictEqual(m.header.originalLanguage, 'en');
    assert.strictEqual(m.sourceOrigin, 'abapDevelopmentTools');
    assert.strictEqual(m.sourceType, 'viewEntity');
  });

  it('defaults sourceOrigin and sourceType', async () => {
    const m = meta(
      await ddlSourceHandler.serialize(
        fakeObj({
          name: 'ZC_TEST',
          description: 'Test',
          originalLanguage: 'EN',
        }),
      ),
    );
    assert.strictEqual(m.sourceOrigin, 'abapDevelopmentTools');
    assert.strictEqual(m.sourceType, 'unknown');
  });

  it('emits .asddls source file', async () => {
    const files = await ddlSourceHandler.serialize(
      fakeObj({
        name: 'ZC_TEST',
        description: 'Test',
        originalLanguage: 'EN',
        getSource: () => 'define view entity ZC_TEST as select from ...',
      }),
    );
    assert.ok(files.some((f) => f.path.endsWith('.asddls')));
  });

  it('round-trips: serialize → fromMetadata recovers fields', async () => {
    const m = meta(
      await ddlSourceHandler.serialize(
        fakeObj({
          name: 'ZC_TEST',
          description: 'Roundtrip',
          originalLanguage: 'EN',
          sourceOrigin: 'abapDevelopmentTools',
          sourceType: 'viewEntity',
        }),
      ),
    );
    const recovered = (ddlSourceHandler as any).fromAbapGit(m);
    assert.strictEqual(recovered.description, 'Roundtrip');
    assert.strictEqual(recovered.sourceOrigin, 'abapDevelopmentTools');
    assert.strictEqual(recovered.sourceType, 'viewEntity');
  });
});

// ============================================================
// DCLS
// ============================================================
describe('DCLS handler — AFF dcls-v1 alignment', () => {
  it('emits formatVersion "1" with header', async () => {
    const m = meta(
      await dclSourceHandler.serialize(
        fakeObj({
          name: 'ZC_TEST',
          description: 'Access control',
          originalLanguage: 'EN',
        }),
      ),
    );
    assert.strictEqual(m.formatVersion, '1');
    assert.strictEqual(m.header.description, 'Access control');
    assert.strictEqual(m.header.originalLanguage, 'en');
  });

  it('emits .asdcls source file', async () => {
    const files = await dclSourceHandler.serialize(
      fakeObj({
        name: 'ZC_TEST',
        description: 'Test',
        originalLanguage: 'EN',
        getSource: () => 'access control ZC_TEST to ...',
      }),
    );
    assert.ok(files.some((f) => f.path.endsWith('.asdcls')));
  });

  it('round-trips: serialize → fromMetadata recovers fields', async () => {
    const m = meta(
      await dclSourceHandler.serialize(
        fakeObj({
          name: 'ZC_TEST',
          description: 'Roundtrip',
          originalLanguage: 'EN',
        }),
      ),
    );
    const recovered = (dclSourceHandler as any).fromAbapGit(m);
    assert.strictEqual(recovered.description, 'Roundtrip');
  });
});

// ============================================================
// BDEF
// ============================================================
describe('BDEF handler — AFF bdef-v1 alignment', () => {
  it('emits formatVersion "1" with header', async () => {
    const m = meta(
      await behaviorDefinitionHandler.serialize(
        fakeObj({
          name: 'ZBP_TEST',
          description: 'Behavior def',
          originalLanguage: 'EN',
        }),
      ),
    );
    assert.strictEqual(m.formatVersion, '1');
    assert.strictEqual(m.header.description, 'Behavior def');
    assert.strictEqual(m.header.originalLanguage, 'en');
  });

  it('emits .abdl source file', async () => {
    const files = await behaviorDefinitionHandler.serialize(
      fakeObj({
        name: 'ZBP_TEST',
        description: 'Test',
        originalLanguage: 'EN',
        getSource: () => 'managed implementation in class ...',
      }),
    );
    assert.ok(files.some((f) => f.path.endsWith('.abdl')));
  });

  it('round-trips: serialize → fromMetadata recovers fields', async () => {
    const m = meta(
      await behaviorDefinitionHandler.serialize(
        fakeObj({
          name: 'ZBP_TEST',
          description: 'Roundtrip',
          originalLanguage: 'EN',
        }),
      ),
    );
    const recovered = (behaviorDefinitionHandler as any).fromAbapGit(m);
    assert.strictEqual(recovered.description, 'Roundtrip');
  });
});

// ============================================================
// SRVD
// ============================================================
describe('SRVD handler — AFF srvd-v1 alignment', () => {
  it('emits formatVersion "1" with header + generalInformation', async () => {
    const m = meta(
      await serviceDefinitionHandler.serialize(
        fakeObj({
          name: 'ZUI_TEST',
          description: 'Service def',
          originalLanguage: 'EN',
        }),
      ),
    );
    assert.strictEqual(m.formatVersion, '1');
    assert.strictEqual(m.header.description, 'Service def');
    assert.strictEqual(
      m.generalInformation.sourceOrigin,
      'abapDevelopmentTools',
    );
    assert.strictEqual(m.generalInformation.sourceType, 'definition');
  });

  it('emits .acds source file', async () => {
    const files = await serviceDefinitionHandler.serialize(
      fakeObj({
        name: 'ZUI_TEST',
        description: 'Test',
        originalLanguage: 'EN',
        getSource: () => 'define service ZUI_TEST { ... }',
      }),
    );
    assert.ok(files.some((f) => f.path.endsWith('.acds')));
  });

  it('round-trips: serialize → fromMetadata recovers fields', async () => {
    const m = meta(
      await serviceDefinitionHandler.serialize(
        fakeObj({
          name: 'ZUI_TEST',
          description: 'Roundtrip',
          originalLanguage: 'EN',
          sourceOrigin: 'abapDevelopmentTools',
          sourceType: 'extension',
        }),
      ),
    );
    const recovered = (serviceDefinitionHandler as any).fromAbapGit(m);
    assert.strictEqual(recovered.description, 'Roundtrip');
    assert.strictEqual(recovered.sourceType, 'extension');
  });
});

// ============================================================
// SRVB
// ============================================================
describe('SRVB handler — AFF srvb-v1 alignment', () => {
  it('emits formatVersion "1" with header + bindingType + services', async () => {
    const m = meta(
      await serviceBindingHandler.serialize(
        fakeObj({
          name: 'ZUI_BIND',
          description: 'Service binding',
          originalLanguage: 'EN',
          bindingType: 'odataV4',
          bindingTypeCategory: 'ui',
          services: [
            {
              name: 'ZUI_BIND_SRV',
              versions: [
                { serviceVersion: '0001', serviceDefinition: 'ZUI_TEST' },
              ],
            },
          ],
        }),
      ),
    );
    assert.strictEqual(m.formatVersion, '1');
    assert.strictEqual(m.header.description, 'Service binding');
    assert.strictEqual(m.bindingType, 'odataV4');
    assert.strictEqual(m.bindingTypeCategory, 'ui');
    assert.strictEqual(m.services.length, 1);
  });

  it('emits .srvb.json only (no source file)', async () => {
    const files = await serviceBindingHandler.serialize(
      fakeObj({
        name: 'ZUI_BIND',
        description: 'Test',
        originalLanguage: 'EN',
      }),
    );
    assert.strictEqual(files.length, 1);
    assert.ok(files[0].path.endsWith('.srvb.json'));
  });

  it('round-trips: serialize → fromMetadata recovers fields', async () => {
    const m = meta(
      await serviceBindingHandler.serialize(
        fakeObj({
          name: 'ZUI_BIND',
          description: 'Roundtrip',
          originalLanguage: 'EN',
          bindingType: 'odataV4',
          bindingTypeCategory: 'webApi',
        }),
      ),
    );
    const recovered = (serviceBindingHandler as any).fromAbapGit(m);
    assert.strictEqual(recovered.description, 'Roundtrip');
    assert.strictEqual(recovered.bindingType, 'odataV4');
    assert.strictEqual(recovered.bindingTypeCategory, 'webApi');
  });
});

// ============================================================
// MSAG
// ============================================================
describe('MSAG handler — AFF msag-v1 alignment', () => {
  it('emits formatVersion "1" with header + messages', async () => {
    const m = meta(
      await messageClassHandler.serialize(
        fakeObj({
          name: 'ZTEST',
          description: 'Message class',
          originalLanguage: 'EN',
          messages: [{ number: '001', text: 'Hello world' }],
        }),
      ),
    );
    assert.strictEqual(m.formatVersion, '1');
    assert.strictEqual(m.header.description, 'Message class');
    assert.strictEqual(m.header.originalLanguage, 'en');
    assert.strictEqual(m.messages.length, 1);
    assert.strictEqual(m.messages[0].number, '001');
    assert.strictEqual(m.messages[0].text, 'Hello world');
  });

  it('emits .msag.json only (no source file)', async () => {
    const files = await messageClassHandler.serialize(
      fakeObj({
        name: 'ZTEST',
        description: 'Test',
        originalLanguage: 'EN',
      }),
    );
    assert.strictEqual(files.length, 1);
    assert.ok(files[0].path.endsWith('.msag.json'));
  });

  it('round-trips: serialize → fromMetadata recovers fields', async () => {
    const m = meta(
      await messageClassHandler.serialize(
        fakeObj({
          name: 'ZTEST',
          description: 'Roundtrip',
          originalLanguage: 'EN',
          messages: [{ number: '002', text: 'Test' }],
        }),
      ),
    );
    const recovered = (messageClassHandler as any).fromAbapGit(m);
    assert.strictEqual(recovered.description, 'Roundtrip');
    assert.strictEqual(recovered.messages.length, 1);
    assert.strictEqual(recovered.messages[0].number, '002');
  });
});

// ============================================================
// FUGR per-FM
// ============================================================
describe('FUGR handler — per-function-module files', () => {
  it('emits per-FM .func.json + .func.abap files', async () => {
    const files = await functionGroupHandler.serialize(
      fakeObj({
        name: 'ZGRP',
        description: 'Test group',
        dataSync: { language: 'EN', fixPointArithmetic: true },
        functionModules: [
          {
            name: 'Z_FM1',
            description: 'FM one',
            processingType: 'normal',
            source: 'FUNCTION z_fm1. ENDFUNCTION.',
          },
          { name: 'Z_FM2', description: 'FM two', processingType: 'rfc' },
        ],
      }),
    );
    const fm1Json = files.find((f) => f.path === 'z_fm1.func.json');
    const fm1Abap = files.find((f) => f.path === 'z_fm1.func.abap');
    const fm2Json = files.find((f) => f.path === 'z_fm2.func.json');
    assert.ok(fm1Json, 'z_fm1.func.json emitted');
    assert.ok(fm1Abap, 'z_fm1.func.abap emitted');
    assert.ok(fm2Json, 'z_fm2.func.json emitted');

    const m1 = JSON.parse(fm1Json!.content);
    assert.strictEqual(m1.formatVersion, '1');
    assert.strictEqual(m1.header.description, 'FM one');
    assert.strictEqual(m1.processingType, 'normal');

    const m2 = JSON.parse(fm2Json!.content);
    assert.strictEqual(m2.processingType, 'rfc');
  });

  it('emits no per-FM files when functionModules is absent', async () => {
    const files = await functionGroupHandler.serialize(
      fakeObj({
        name: 'ZGRP',
        description: 'Test group',
        dataSync: { language: 'EN' },
      }),
    );
    assert.ok(!files.some((f) => f.path.endsWith('.func.json')));
  });
});

// ============================================================
// i18n .properties
// ============================================================
describe('i18n .properties support', () => {
  it('buildProperties produces key = value lines', () => {
    const content = buildProperties([{ key: 'name', value: 'Test' }]);
    assert.strictEqual(content, 'name = Test\n');
  });

  it('propertiesFilename produces master + per-language names', () => {
    assert.strictEqual(
      propertiesFilename('zcl_foo', 'CLAS'),
      'zcl_foo.clas.properties',
    );
    assert.strictEqual(
      propertiesFilename('zcl_foo', 'CLAS', 'de'),
      'zcl_foo.clas.de.properties',
    );
  });

  it('createPropertiesFiles emits master + per-language files', () => {
    const files = createPropertiesFiles('zcl_foo', 'CLAS', {
      '': [{ key: 'name', value: 'Test' }],
      de: [{ key: 'name', value: 'Test (DE)' }],
    });
    assert.strictEqual(files.length, 2);
    assert.ok(files.some((f) => f.path === 'zcl_foo.clas.properties'));
    assert.ok(files.some((f) => f.path === 'zcl_foo.clas.de.properties'));
  });
});
