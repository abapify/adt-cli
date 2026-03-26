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
    assert.ok(
      xml.includes('<ROLLNAME>ZTEST_DTEL</ROLLNAME>'),
      `ROLLNAME should be object name. XML:\n${xml}`,
    );
    assert.ok(
      xml.includes('<DDTEXT>Test Data Element</DDTEXT>'),
      `DDTEXT should be description. XML:\n${xml}`,
    );

    // Check DD04V fields derived from dataElement
    assert.ok(
      xml.includes('<DOMNAME>ZTEST_DOMAIN</DOMNAME>'),
      `DOMNAME should be typeName from dataElement. XML:\n${xml}`,
    );
    assert.ok(
      xml.includes('<REFKIND>D</REFKIND>'),
      `REFKIND should be D for domain typeKind. XML:\n${xml}`,
    );

    // Check language mapping (ISO EN → SAP E)
    assert.ok(
      xml.includes('<DDLANGUAGE>E</DDLANGUAGE>'),
      `DDLANGUAGE should be SAP lang code. XML:\n${xml}`,
    );
    assert.ok(
      xml.includes('<DTELMASTER>E</DTELMASTER>'),
      `DTELMASTER should be SAP lang code. XML:\n${xml}`,
    );

    // Check field labels
    assert.ok(
      xml.includes('<REPTEXT>Heading</REPTEXT>'),
      `REPTEXT should be headingFieldLabel. XML:\n${xml}`,
    );
    assert.ok(
      xml.includes('<SCRTEXT_S>Short</SCRTEXT_S>'),
      `SCRTEXT_S should be shortFieldLabel. XML:\n${xml}`,
    );
    assert.ok(
      xml.includes('<SCRTEXT_M>Medium Text</SCRTEXT_M>'),
      `SCRTEXT_M should be mediumFieldLabel. XML:\n${xml}`,
    );
    assert.ok(
      xml.includes('<SCRTEXT_L>Long Text Label</SCRTEXT_L>'),
      `SCRTEXT_L should be longFieldLabel. XML:\n${xml}`,
    );

    // Check field lengths
    assert.ok(
      xml.includes('<HEADLEN>55</HEADLEN>'),
      `HEADLEN should be headingFieldLength. XML:\n${xml}`,
    );
    assert.ok(
      xml.includes('<SCRLEN1>10</SCRLEN1>'),
      `SCRLEN1 should be shortFieldLength. XML:\n${xml}`,
    );
    assert.ok(
      xml.includes('<SCRLEN2>20</SCRLEN2>'),
      `SCRLEN2 should be mediumFieldLength. XML:\n${xml}`,
    );
    assert.ok(
      xml.includes('<SCRLEN3>40</SCRLEN3>'),
      `SCRLEN3 should be longFieldLength. XML:\n${xml}`,
    );

    // Domain-based DTELs should NOT have DATATYPE/LENG/OUTPUTLEN
    // (those are inherited from the domain)
    assert.ok(
      !xml.includes('<DATATYPE'),
      `DATATYPE should be omitted for domain-based DTELs. XML:\n${xml}`,
    );
    assert.ok(
      !xml.includes('<LENG'),
      `LENG should be omitted for domain-based DTELs. XML:\n${xml}`,
    );
    assert.ok(
      !xml.includes('<OUTPUTLEN'),
      `OUTPUTLEN should be omitted for domain-based DTELs. XML:\n${xml}`,
    );
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

    const files = await handler!.serialize(mock as any);
    const xmlFile = files.find((f) => f.path.endsWith('.dtel.xml'));
    const xml = xmlFile!.content;

    assert.ok(
      xml.includes('<ROLLNAME>ZTEST_PREDEFINED</ROLLNAME>'),
      'ROLLNAME should be set',
    );
    assert.ok(
      xml.includes('<DATATYPE>CHAR</DATATYPE>'),
      `DATATYPE should be CHAR. XML:\n${xml}`,
    );
    assert.ok(
      xml.includes('<LENG>000010</LENG>'),
      `LENG should be zero-padded. XML:\n${xml}`,
    );

    // predefinedAbapType → REFKIND empty (not 'D')
    assert.ok(
      !xml.includes('<REFKIND>D</REFKIND>'),
      'REFKIND should NOT be D for predefined type',
    );

    // OUTPUTLEN should be derived for CHAR(10) → 000010
    assert.ok(
      xml.includes('<OUTPUTLEN>000010</OUTPUTLEN>'),
      `OUTPUTLEN should be derived for CHAR type. XML:\n${xml}`,
    );

    // Empty typeName → DOMNAME should be omitted entirely
    assert.ok(
      !xml.includes('<DOMNAME'),
      `DOMNAME should be omitted when typeName is empty. XML:\n${xml}`,
    );
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

    const files = await handler!.serialize(mock as any);
    const xmlFile = files.find((f) => f.path.endsWith('.dtel.xml'));
    const xml = xmlFile!.content;

    assert.ok(
      xml.includes('<DOMNAME>ZCL_SOME_CLASS</DOMNAME>'),
      `DOMNAME should be typeName for ref types. XML:\n${xml}`,
    );
    assert.ok(
      xml.includes('<REFKIND>R</REFKIND>'),
      `REFKIND should be R for ref types. XML:\n${xml}`,
    );
    assert.ok(
      xml.includes('<REFTYPE>C</REFTYPE>'),
      `REFTYPE should be C for refToClifType. XML:\n${xml}`,
    );

    // Reference types should emit DATATYPE=REF (abapGit convention)
    assert.ok(
      xml.includes('<DATATYPE>REF</DATATYPE>'),
      `DATATYPE should be REF for reference types. XML:\n${xml}`,
    );
  });

  it('handles missing dataElement gracefully', async () => {
    // Simulate case where SAP response has no dataElement
    const mock = createMockDtel({
      name: 'ZTEST_EMPTY',
      description: 'Empty DTEL',
      dataElement: undefined as any,
    });

    // Should not throw
    const files = await handler!.serialize(mock as any);
    const xmlFile = files.find((f) => f.path.endsWith('.dtel.xml'));
    assert.ok(xmlFile, 'Should still produce XML file');

    const xml = xmlFile!.content;
    // Base fields should still be present
    assert.ok(
      xml.includes('<ROLLNAME>ZTEST_EMPTY</ROLLNAME>'),
      `ROLLNAME should still be set from obj.name. XML:\n${xml}`,
    );
    assert.ok(
      xml.includes('<DDTEXT>Empty DTEL</DDTEXT>'),
      `DDTEXT should still be set from obj.description. XML:\n${xml}`,
    );
  });

  it('emits ABAP_LANGUAGE_VERSION when set', async () => {
    const mock = createMockDtel({
      name: 'ZTEST_ALV',
      description: 'Cloud Element',
      abapLanguageVersion: 'cloudDevelopment',
    });

    const files = await handler!.serialize(mock as any);
    const xmlFile = files.find((f) => f.path.endsWith('.dtel.xml'));
    const xml = xmlFile!.content;

    assert.ok(
      xml.includes('<ABAP_LANGUAGE_VERSION>5</ABAP_LANGUAGE_VERSION>'),
      `ABAP_LANGUAGE_VERSION should be emitted as '5' for cloudDevelopment. XML:\n${xml}`,
    );
  });

  it('omits ABAP_LANGUAGE_VERSION when not set', async () => {
    const mock = createMockDtel({
      name: 'ZTEST_NO_ALV',
      description: 'Standard Element',
    });

    const files = await handler!.serialize(mock as any);
    const xmlFile = files.find((f) => f.path.endsWith('.dtel.xml'));
    const xml = xmlFile!.content;

    assert.ok(
      !xml.includes('<ABAP_LANGUAGE_VERSION'),
      `ABAP_LANGUAGE_VERSION should be omitted when not set. XML:\n${xml}`,
    );
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

    const files = await handler!.serialize(mock as any);
    const xmlFile = files.find((f) => f.path.endsWith('.dtel.xml'));
    const xml = xmlFile!.content;

    // DEC(13,2): intDigits=11, separators=3, outputLen=13+1+3=17
    assert.ok(
      xml.includes('<OUTPUTLEN>000017</OUTPUTLEN>'),
      `OUTPUTLEN for DEC(13,2) should be 000017. XML:\n${xml}`,
    );
    assert.ok(
      xml.includes('<DECIMALS>000002</DECIMALS>'),
      `DECIMALS should be zero-padded. XML:\n${xml}`,
    );
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

    const files = await handler!.serialize(mock as any);
    const xmlFile = files.find((f) => f.path.endsWith('.dtel.xml'));
    const xml = xmlFile!.content;

    // INT4 always has OUTPUTLEN 000010
    assert.ok(
      xml.includes('<OUTPUTLEN>000010</OUTPUTLEN>'),
      `OUTPUTLEN for INT4 should be 000010. XML:\n${xml}`,
    );
  });

  it('omits OUTPUTLEN for domain-based data elements', async () => {
    const mock = createMockDtel({
      name: 'ZTEST_DOM',
      description: 'Domain Element',
    });

    const files = await handler!.serialize(mock as any);
    const xmlFile = files.find((f) => f.path.endsWith('.dtel.xml'));
    const xml = xmlFile!.content;

    // Domain-based DTELs have no dataType → OUTPUTLEN should be absent
    assert.ok(
      !xml.includes('<OUTPUTLEN'),
      `OUTPUTLEN should be omitted for domain-based elements. XML:\n${xml}`,
    );
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

    const files = await handler!.serialize(mock as any);
    const xmlFile = files.find((f) => f.path.endsWith('.dtel.xml'));
    const xml = xmlFile!.content;

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
