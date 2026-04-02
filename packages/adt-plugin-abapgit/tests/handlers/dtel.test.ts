/**
 * Tests for DTEL handler toAbapGit mapping
 *
 * Verifies that ADK DataElement data is correctly mapped to abapGit DD04V fields.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

// Import handler to trigger registration
import '../../src/lib/handlers/objects/dtel.ts';
import { getHandler } from '../../src/lib/handlers/base.ts';

/**
 * Create a mock ADK DataElement object that mimics what SAP returns after load()
 *
 * The dataSync structure matches DataelementWrapperSchema['wbobj']:
 * - Flat AdtMainObject fields: name, type, description, language, masterLanguage, etc.
 * - Nested dataElement: typeKind, typeName, dataType, labels, etc.
 */
function createMockDtel(overrides?: {
  name?: string;
  description?: string;
  language?: string;
  masterLanguage?: string;
  abapLanguageVersion?: string;
  dataElement?: Record<string, unknown>;
}) {
  const name = overrides?.name ?? 'ZTEST_DTEL';
  const description = overrides?.description ?? 'Test Data Element';
  const language = overrides?.language ?? 'EN';
  const masterLanguage = overrides?.masterLanguage ?? 'EN';
  const abapLanguageVersion = overrides?.abapLanguageVersion ?? '';

  const dataElement = overrides?.dataElement ?? {
    typeKind: 'domain',
    typeName: 'ZTEST_DOMAIN',
    dataType: '',
    dataTypeLength: 0,
    dataTypeLengthEnabled: false,
    dataTypeDecimals: 0,
    dataTypeDecimalsEnabled: false,
    shortFieldLabel: 'Short',
    shortFieldLength: 10,
    shortFieldMaxLength: 10,
    mediumFieldLabel: 'Medium Text',
    mediumFieldLength: 20,
    mediumFieldMaxLength: 20,
    longFieldLabel: 'Long Text Label',
    longFieldLength: 40,
    longFieldMaxLength: 40,
    headingFieldLabel: 'Heading',
    headingFieldLength: 55,
    headingFieldMaxLength: 55,
    searchHelp: '',
    searchHelpParameter: '',
    setGetParameter: '',
    defaultComponentName: '',
    deactivateInputHistory: false,
    changeDocument: false,
    leftToRightDirection: false,
    deactivateBIDIFiltering: false,
  };

  // The mock mimics the real ADK object after load()
  // dataSync returns the wbobj content, base properties use getters
  const data = {
    name,
    type: 'DTEL/DE',
    description,
    language,
    masterLanguage,
    abapLanguageVersion,
    dataElement,
  };

  return {
    // Base class properties (implemented as getters in real ADK)
    name,
    type: 'DTEL/DE',
    kind: 'DataElement',
    description,
    language,
    masterLanguage,
    abapLanguageVersion,
    // dataSync returns the full wbobj data
    dataSync: data,
  };
}

describe('DTEL handler toAbapGit', () => {
  const handler = getHandler('DTEL');

  async function serializeDtel(mock: any): Promise<string> {
    const files = await handler!.serialize(mock as any);
    const xmlFile = files.find((f) => f.path.endsWith('.dtel.xml'));
    assert.ok(xmlFile, 'Should produce a .dtel.xml file');
    return xmlFile!.content;
  }

  function assertXmlTag(
    xml: string,
    tag: string,
    value: string,
    message?: string,
  ): void {
    assert.ok(
      xml.includes(`<${tag}>${value}</${tag}>`),
      message ?? `${tag} should be ${value}. XML:\n${xml}`,
    );
  }

  function assertXmlNoTag(xml: string, tag: string, message?: string): void {
    assert.ok(
      !xml.includes(`<${tag}`),
      message ?? `${tag} should be absent. XML:\n${xml}`,
    );
  }

  it('handler is registered', () => {
    assert.ok(handler, 'DTEL handler should be registered');
    assert.strictEqual(handler!.type, 'DTEL');
  });

  it('serializes domain-based data element correctly', async () => {
    const mock = createMockDtel();
    const files = await handler!.serialize(mock as any);

    assert.ok(files.length >= 1, 'Should produce at least one file');

    const xmlFile = files.find((f) => f.path.endsWith('.dtel.xml'));
    assert.ok(xmlFile, 'Should produce a .dtel.xml file');

    const xml = xmlFile!.content;

    // Check envelope attributes
    assert.ok(xml.includes('LCL_OBJECT_DTEL'), 'Should have serializer name');
    assert.ok(
      xml.includes('serializer_version'),
      'Should have serializer_version',
    );

    // Check DD04V fields derived from obj.name / obj.description
    assertXmlTag(xml, 'ROLLNAME', 'ZTEST_DTEL');
    assertXmlTag(xml, 'DDTEXT', 'Test Data Element');

    // Check DD04V fields derived from dataElement
    assertXmlTag(xml, 'DOMNAME', 'ZTEST_DOMAIN');
    assertXmlTag(xml, 'REFKIND', 'D');

    // Check language mapping (ISO EN → SAP E)
    assertXmlTag(xml, 'DDLANGUAGE', 'E');
    assertXmlTag(xml, 'DTELMASTER', 'E');

    // Check field labels
    assertXmlTag(xml, 'REPTEXT', 'Heading');
    assertXmlTag(xml, 'SCRTEXT_S', 'Short');
    assertXmlTag(xml, 'SCRTEXT_M', 'Medium Text');
    assertXmlTag(xml, 'SCRTEXT_L', 'Long Text Label');

    // Check field lengths
    assertXmlTag(xml, 'HEADLEN', '55');
    assertXmlTag(xml, 'SCRLEN1', '10');
    assertXmlTag(xml, 'SCRLEN2', '20');
    assertXmlTag(xml, 'SCRLEN3', '40');

    // Domain-based DTELs should NOT have DATATYPE/LENG/OUTPUTLEN
    // (those are inherited from the domain)
    assertXmlNoTag(xml, 'DATATYPE');
    assertXmlNoTag(xml, 'LENG');
    assertXmlNoTag(xml, 'OUTPUTLEN');
  });

  it('serializes predefined type data element correctly', async () => {
    const mock = createMockDtel({
      name: 'ZTEST_PREDEFINED',
      description: 'Predefined Type Element',
      dataElement: {
        typeKind: 'predefinedAbapType',
        typeName: '',
        dataType: 'CHAR',
        dataTypeLength: 10,
        dataTypeLengthEnabled: true,
        dataTypeDecimals: 0,
        dataTypeDecimalsEnabled: false,
        shortFieldLabel: 'Short',
        shortFieldLength: 10,
        mediumFieldLabel: 'Medium',
        mediumFieldLength: 20,
        longFieldLabel: 'Long',
        longFieldLength: 40,
        headingFieldLabel: 'Head',
        headingFieldLength: 55,
      },
    });

    const xml = await serializeDtel(mock);

    assertXmlTag(xml, 'ROLLNAME', 'ZTEST_PREDEFINED');
    assertXmlTag(xml, 'DATATYPE', 'CHAR');
    assertXmlTag(xml, 'LENG', '000010');

    // predefinedAbapType → REFKIND empty (not 'D')
    assert.ok(
      !xml.includes('<REFKIND>D</REFKIND>'),
      'REFKIND should NOT be D for predefined type',
    );

    // OUTPUTLEN should be derived for CHAR(10) → 000010
    assertXmlTag(xml, 'OUTPUTLEN', '000010');

    // Empty typeName → DOMNAME should be omitted entirely
    assertXmlNoTag(xml, 'DOMNAME');
  });

  it('serializes reference type data element correctly', async () => {
    const mock = createMockDtel({
      name: 'ZTEST_REF',
      description: 'Ref to CLAS',
      dataElement: {
        typeKind: 'refToClifType',
        typeName: 'ZCL_SOME_CLASS',
        shortFieldLabel: 'Ref',
        shortFieldLength: 10,
        mediumFieldLabel: 'Reference',
        mediumFieldLength: 20,
        longFieldLabel: 'Class Reference',
        longFieldLength: 40,
        headingFieldLabel: 'ClsRef',
        headingFieldLength: 20,
      },
    });

    const xml = await serializeDtel(mock);

    assertXmlTag(xml, 'DOMNAME', 'ZCL_SOME_CLASS');
    assertXmlTag(xml, 'REFKIND', 'R');
    assertXmlTag(xml, 'REFTYPE', 'C');

    // Reference types should emit DATATYPE=REF (abapGit convention)
    assertXmlTag(xml, 'DATATYPE', 'REF');
  });

  it('handles missing dataElement gracefully', async () => {
    // Simulate case where SAP response has no dataElement
    const mock = createMockDtel({
      name: 'ZTEST_EMPTY',
      description: 'Empty DTEL',
      dataElement: undefined as any,
    });

    // Should not throw
    const xml = await serializeDtel(mock);
    // Base fields should still be present
    assertXmlTag(xml, 'ROLLNAME', 'ZTEST_EMPTY');
    assertXmlTag(xml, 'DDTEXT', 'Empty DTEL');
  });

  it('emits ABAP_LANGUAGE_VERSION when set', async () => {
    const mock = createMockDtel({
      name: 'ZTEST_ALV',
      description: 'Cloud Element',
      abapLanguageVersion: 'cloudDevelopment',
    });

    const xml = await serializeDtel(mock);

    assertXmlTag(xml, 'ABAP_LANGUAGE_VERSION', '5');
  });

  it('omits ABAP_LANGUAGE_VERSION when not set', async () => {
    const mock = createMockDtel({
      name: 'ZTEST_NO_ALV',
      description: 'Standard Element',
    });

    const xml = await serializeDtel(mock);

    assertXmlNoTag(xml, 'ABAP_LANGUAGE_VERSION');
  });

  it('derives OUTPUTLEN for DEC type with decimals', async () => {
    const mock = createMockDtel({
      name: 'ZTEST_DEC',
      description: 'Decimal Element',
      dataElement: {
        typeKind: 'predefinedAbapType',
        typeName: '',
        dataType: 'DEC',
        dataTypeLength: 13,
        dataTypeLengthEnabled: true,
        dataTypeDecimals: 2,
        dataTypeDecimalsEnabled: true,
        shortFieldLabel: 'Dec',
        shortFieldLength: 10,
        mediumFieldLabel: 'Decimal',
        mediumFieldLength: 20,
        longFieldLabel: 'Decimal Value',
        longFieldLength: 40,
        headingFieldLabel: 'DecVal',
        headingFieldLength: 20,
      },
    });

    const xml = await serializeDtel(mock);

    // DEC(13,2): intDigits=11, separators=3, outputLen=13+1+3=17
    assertXmlTag(xml, 'OUTPUTLEN', '000017');
    assertXmlTag(xml, 'DECIMALS', '000002');
  });

  it('derives OUTPUTLEN for INT4 type', async () => {
    const mock = createMockDtel({
      name: 'ZTEST_INT',
      description: 'Integer Element',
      dataElement: {
        typeKind: 'predefinedAbapType',
        typeName: '',
        dataType: 'INT4',
        dataTypeLength: 10,
        dataTypeLengthEnabled: false,
        dataTypeDecimals: 0,
        dataTypeDecimalsEnabled: false,
        shortFieldLabel: 'Int',
        shortFieldLength: 10,
        mediumFieldLabel: 'Integer',
        mediumFieldLength: 20,
        longFieldLabel: 'Integer Value',
        longFieldLength: 40,
        headingFieldLabel: 'IntVal',
        headingFieldLength: 20,
      },
    });

    const xml = await serializeDtel(mock);

    // INT4 always has OUTPUTLEN 000010
    assertXmlTag(xml, 'OUTPUTLEN', '000010');
  });

  it('omits OUTPUTLEN for domain-based data elements', async () => {
    const mock = createMockDtel({
      name: 'ZTEST_DOM',
      description: 'Domain Element',
    });

    const xml = await serializeDtel(mock);

    // Domain-based DTELs have no dataType → OUTPUTLEN should be absent
    assertXmlNoTag(xml, 'OUTPUTLEN');
  });

  it('produces XML elements in canonical DD04V order', async () => {
    const mock = createMockDtel({
      name: 'ZTEST_ORDER',
      description: 'Order Test',
      dataElement: {
        typeKind: 'predefinedAbapType',
        typeName: '',
        dataType: 'CHAR',
        dataTypeLength: 20,
        dataTypeLengthEnabled: true,
        dataTypeDecimals: 0,
        dataTypeDecimalsEnabled: false,
        shortFieldLabel: 'Short',
        shortFieldLength: 10,
        mediumFieldLabel: 'Medium',
        mediumFieldLength: 20,
        longFieldLabel: 'Long Text',
        longFieldLength: 40,
        headingFieldLabel: 'Heading',
        headingFieldLength: 55,
      },
    });

    const xml = await serializeDtel(mock);

    // Verify canonical order: ROLLNAME before DDLANGUAGE before HEADLEN ...
    const rollnameIdx = xml.indexOf('<ROLLNAME>');
    const ddlanguageIdx = xml.indexOf('<DDLANGUAGE>');
    const headlenIdx = xml.indexOf('<HEADLEN>');
    const scrlen1Idx = xml.indexOf('<SCRLEN1>');
    const ddtextIdx = xml.indexOf('<DDTEXT>');
    const reptextIdx = xml.indexOf('<REPTEXT>');
    const dtelmasterIdx = xml.indexOf('<DTELMASTER>');
    const datatypeIdx = xml.indexOf('<DATATYPE>');
    const lengIdx = xml.indexOf('<LENG>');
    const outputlenIdx = xml.indexOf('<OUTPUTLEN>');

    assert.ok(rollnameIdx < ddlanguageIdx, 'ROLLNAME before DDLANGUAGE');
    assert.ok(ddlanguageIdx < headlenIdx, 'DDLANGUAGE before HEADLEN');
    assert.ok(headlenIdx < scrlen1Idx, 'HEADLEN before SCRLEN1');
    assert.ok(scrlen1Idx < ddtextIdx, 'SCRLEN1 before DDTEXT');
    assert.ok(ddtextIdx < reptextIdx, 'DDTEXT before REPTEXT');
    assert.ok(reptextIdx < dtelmasterIdx, 'REPTEXT before DTELMASTER');
    assert.ok(dtelmasterIdx < datatypeIdx, 'DTELMASTER before DATATYPE');
    assert.ok(datatypeIdx < lengIdx, 'DATATYPE before LENG');
    assert.ok(lengIdx < outputlenIdx, 'LENG before OUTPUTLEN');
  });
});
