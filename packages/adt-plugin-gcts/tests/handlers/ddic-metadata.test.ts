import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AdkDataElement, AdkDomain, type AdkContext } from '@abapify/adk';
import { dataElementHandler } from '../../src/lib/handlers/objects/dtel.ts';
import { domainHandler } from '../../src/lib/handlers/objects/doma.ts';

const context: AdkContext = {
  get client() {
    throw new Error('Metadata serialization must not access SAP');
  },
};

test('schema-backed DDIC handlers retain declared format and field labels offline', async () => {
  const domain = new AdkDomain(context, {
    name: 'Z_DOMAIN',
    language: 'EN',
    description: 'Domain fixture',
    content: {
      typeInformation: { datatype: 'CHAR', length: 12, decimals: 0 },
      valueInformation: { valueTableRef: {}, fixValues: {} },
    },
  });
  const [domainFile] = await domainHandler.serialize(domain);
  assert.deepEqual(JSON.parse(domainFile.content), {
    formatVersion: '1',
    header: { description: 'Domain fixture', originalLanguage: 'en' },
    format: { dataType: 'CHAR', length: 12, decimals: 0 },
  });
  const element = new AdkDataElement(context, {
    name: 'Z_ELEMENT',
    language: 'EN',
    description: 'Element fixture',
    typeKind: 'predefinedAbapType',
    dataType: 'NUMC',
    dataTypeLength: 8,
    shortFieldLabel: 'Number',
    shortFieldLength: 6,
  });
  const [elementFile] = await dataElementHandler.serialize(element);
  assert.deepEqual(JSON.parse(elementFile.content), {
    formatVersion: '1',
    header: { description: 'Element fixture', originalLanguage: 'en' },
    dataTypeInformation: { predefinedType: { dataType: 'NUMC', length: 8 } },
    fieldLabels: { short: 'Number', shortLength: 6 },
  });
});

test('incomplete or unsupported DDIC metadata is rejected instead of emitting invalid AFF', async () => {
  const missingLength = new AdkDataElement(context, {
    name: 'Z_MISSING',
    typeKind: 'predefinedAbapType',
    dataType: 'CHAR',
  });
  await assert.rejects(
    dataElementHandler.serialize(missingLength),
    /requires a length/,
  );
  const unsupportedType = new AdkDataElement(context, {
    name: 'Z_UNKNOWN',
    typeKind: 'predefinedAbapType',
    dataType: 'UNSUPPORTED',
    dataTypeLength: 8,
  });
  await assert.rejects(
    dataElementHandler.serialize(unsupportedType),
    /Unsupported AFF DDIC data type/,
  );
});
