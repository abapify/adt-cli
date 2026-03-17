/**
 * Tests for DTEL end-to-end: SAP XML response → schema parse → handler serialize
 *
 * This tests the full data flow that happens during roundtrip Phase 2:
 * 1. SAP returns XML response for GET /sap/bc/adt/ddic/dataelements/{name}
 * 2. The dataelementWrapper schema parses it into JS object
 * 3. The wbobj content becomes the ADK object's dataSync
 * 4. The DTEL handler maps dataSync → abapGit DD04V XML
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

import { parseXml, type Schema } from '@abapify/ts-xsd';

// Import the raw schema literals (these are the generated schema JS objects)
// The dataelementWrapper imports adtcore + dataelements schemas
import dataelementWrapperSchema from '../../../adt-schemas/src/schemas/generated/schemas/custom/dataelementWrapper.ts';
import adtcoreSchema from '../../../adt-schemas/src/schemas/generated/schemas/sap/adtcore.ts';
import dataelementsSchema from '../../../adt-schemas/src/schemas/generated/schemas/sap/dataelements.ts';

// Import handler to trigger registration
import '../../src/lib/handlers/objects/dtel.ts';
import { getHandler } from '../../src/lib/handlers/base.ts';

/**
 * Parse SAP DTEL XML response using the dataelementWrapper schema
 * Replicates what the adt-client adapter does at runtime
 */
function parseDtelResponse(xml: string): any {
  // The schema needs its $imports resolved - we do this manually since
  // we're not using the TypedSchema wrapper
  const schema = {
    ...dataelementWrapperSchema,
    $imports: [adtcoreSchema, dataelementsSchema],
  };
  return parseXml(schema as unknown as Schema, xml);
}

/**
 * Mock SAP ADT XML response for a domain-based data element
 *
 * This is what SAP returns from GET /sap/bc/adt/ddic/dataelements/ztest_dtel
 * with Accept: application/vnd.sap.adt.dataelements.v2+xml
 */
const SAP_DTEL_RESPONSE_DOMAIN = `<?xml version="1.0" encoding="utf-8"?>
<blue:wbobj xmlns:blue="http://www.sap.com/wbobj/dictionary/dtel"
            xmlns:adtcore="http://www.sap.com/adt/core"
            xmlns:dtel="http://www.sap.com/adt/dictionary/dataelements"
            adtcore:name="ZTEST_DTEL_DOMAIN"
            adtcore:type="DTEL/DE"
            adtcore:changedAt="2024-01-15T10:30:00Z"
            adtcore:changedBy="TESTUSER"
            adtcore:createdAt="2024-01-10T08:00:00Z"
            adtcore:createdBy="TESTUSER"
            adtcore:version="active"
            adtcore:description="Domain-based data element"
            adtcore:language="EN"
            adtcore:masterLanguage="EN"
            adtcore:masterSystem="ABC"
            adtcore:responsible="TESTUSER"
            adtcore:abapLanguageVersion="">
  <adtcore:packageRef adtcore:uri="/sap/bc/adt/packages/ztest_pkg" adtcore:type="DEVC/K" adtcore:name="ZTEST_PKG"/>
  <dtel:dataElement>
    <dtel:typeKind>domain</dtel:typeKind>
    <dtel:typeName>ZTEST_DOMAIN</dtel:typeName>
    <dtel:dataType></dtel:dataType>
    <dtel:dataTypeLength>0</dtel:dataTypeLength>
    <dtel:dataTypeLengthEnabled>false</dtel:dataTypeLengthEnabled>
    <dtel:dataTypeDecimals>0</dtel:dataTypeDecimals>
    <dtel:dataTypeDecimalsEnabled>false</dtel:dataTypeDecimalsEnabled>
    <dtel:shortFieldLabel>Short</dtel:shortFieldLabel>
    <dtel:shortFieldLength>10</dtel:shortFieldLength>
    <dtel:shortFieldMaxLength>10</dtel:shortFieldMaxLength>
    <dtel:mediumFieldLabel>Medium Text</dtel:mediumFieldLabel>
    <dtel:mediumFieldLength>20</dtel:mediumFieldLength>
    <dtel:mediumFieldMaxLength>20</dtel:mediumFieldMaxLength>
    <dtel:longFieldLabel>Long Description</dtel:longFieldLabel>
    <dtel:longFieldLength>40</dtel:longFieldLength>
    <dtel:longFieldMaxLength>40</dtel:longFieldMaxLength>
    <dtel:headingFieldLabel>Heading Text</dtel:headingFieldLabel>
    <dtel:headingFieldLength>55</dtel:headingFieldLength>
    <dtel:headingFieldMaxLength>55</dtel:headingFieldMaxLength>
  </dtel:dataElement>
</blue:wbobj>`;

/**
 * Mock SAP ADT XML response for a predefined-type data element
 */
const SAP_DTEL_RESPONSE_PREDEFINED = `<?xml version="1.0" encoding="utf-8"?>
<blue:wbobj xmlns:blue="http://www.sap.com/wbobj/dictionary/dtel"
            xmlns:adtcore="http://www.sap.com/adt/core"
            xmlns:dtel="http://www.sap.com/adt/dictionary/dataelements"
            adtcore:name="ZTEST_DTEL_PREDEF"
            adtcore:type="DTEL/DE"
            adtcore:version="active"
            adtcore:description="Predefined type element"
            adtcore:language="EN"
            adtcore:masterLanguage="EN"
            adtcore:responsible="TESTUSER">
  <adtcore:packageRef adtcore:uri="/sap/bc/adt/packages/ztest_pkg" adtcore:type="DEVC/K" adtcore:name="ZTEST_PKG"/>
  <dtel:dataElement>
    <dtel:typeKind>predefinedAbapType</dtel:typeKind>
    <dtel:typeName></dtel:typeName>
    <dtel:dataType>CHAR</dtel:dataType>
    <dtel:dataTypeLength>10</dtel:dataTypeLength>
    <dtel:dataTypeLengthEnabled>true</dtel:dataTypeLengthEnabled>
    <dtel:dataTypeDecimals>0</dtel:dataTypeDecimals>
    <dtel:dataTypeDecimalsEnabled>false</dtel:dataTypeDecimalsEnabled>
    <dtel:shortFieldLabel>Short</dtel:shortFieldLabel>
    <dtel:shortFieldLength>10</dtel:shortFieldLength>
    <dtel:shortFieldMaxLength>10</dtel:shortFieldMaxLength>
    <dtel:mediumFieldLabel>Medium</dtel:mediumFieldLabel>
    <dtel:mediumFieldLength>20</dtel:mediumFieldLength>
    <dtel:mediumFieldMaxLength>20</dtel:mediumFieldMaxLength>
    <dtel:longFieldLabel>Long Text</dtel:longFieldLabel>
    <dtel:longFieldLength>40</dtel:longFieldLength>
    <dtel:longFieldMaxLength>40</dtel:longFieldMaxLength>
    <dtel:headingFieldLabel>Head</dtel:headingFieldLabel>
    <dtel:headingFieldLength>55</dtel:headingFieldLength>
    <dtel:headingFieldMaxLength>55</dtel:headingFieldMaxLength>
  </dtel:dataElement>
</blue:wbobj>`;

describe('DTEL end-to-end: SAP XML → schema parse → handler serialize', () => {
  it('parses SAP XML response and extracts dataElement', () => {
    const parsed = parseDtelResponse(SAP_DTEL_RESPONSE_DOMAIN);

    // Verify root structure
    assert.ok(parsed.wbobj, 'Should have wbobj root');
    assert.strictEqual(parsed.wbobj.name, 'ZTEST_DTEL_DOMAIN');
    assert.strictEqual(parsed.wbobj.type, 'DTEL/DE');
    assert.strictEqual(parsed.wbobj.description, 'Domain-based data element');
    assert.strictEqual(parsed.wbobj.language, 'EN');
    assert.strictEqual(parsed.wbobj.masterLanguage, 'EN');

    // CRITICAL: Verify nested dataElement is present
    assert.ok(
      parsed.wbobj.dataElement,
      'dataElement should be present in parsed response',
    );
    assert.strictEqual(
      parsed.wbobj.dataElement!.typeKind,
      'domain',
      'typeKind should be domain',
    );
    assert.strictEqual(
      parsed.wbobj.dataElement!.typeName,
      'ZTEST_DOMAIN',
      'typeName should be ZTEST_DOMAIN',
    );
    assert.strictEqual(
      parsed.wbobj.dataElement!.shortFieldLabel,
      'Short',
      'shortFieldLabel should be Short',
    );
    assert.strictEqual(
      parsed.wbobj.dataElement!.headingFieldLength,
      55,
      'headingFieldLength should be 55',
    );
  });

  it('full chain: SAP XML → parse → mock ADK object → handler serialize', async () => {
    // Step 1: Parse SAP response (this is what the adapter does)
    const parsed = parseDtelResponse(SAP_DTEL_RESPONSE_DOMAIN);
    const wbobj = parsed.wbobj;

    // Step 2: Create mock ADK object using parsed data (this is what load() does)
    const mockAdkObject = {
      name: wbobj.name,
      type: wbobj.type,
      kind: 'DataElement',
      description: wbobj.description ?? '',
      language: wbobj.language ?? '',
      masterLanguage: wbobj.masterLanguage ?? '',
      abapLanguageVersion: wbobj.abapLanguageVersion ?? '',
      dataSync: wbobj,
    };

    // Step 3: Serialize using handler (this is what format.import does)
    const handler = getHandler('DTEL');
    assert.ok(handler, 'DTEL handler should be registered');

    const files = await handler!.serialize(mockAdkObject as any);
    const xmlFile = files.find((f) => f.path.endsWith('.dtel.xml'));
    assert.ok(xmlFile, 'Should produce .dtel.xml file');

    const xml = xmlFile!.content;

    // Verify ALL key fields are populated (not empty)
    assert.ok(
      xml.includes('<ROLLNAME>ZTEST_DTEL_DOMAIN</ROLLNAME>'),
      `ROLLNAME should be set. XML:\n${xml}`,
    );
    assert.ok(
      xml.includes('<DDTEXT>Domain-based data element</DDTEXT>'),
      `DDTEXT should be set. XML:\n${xml}`,
    );
    assert.ok(
      xml.includes('<DOMNAME>ZTEST_DOMAIN</DOMNAME>'),
      `DOMNAME should be set from dataElement.typeName. XML:\n${xml}`,
    );
    assert.ok(
      xml.includes('<DDLANGUAGE>E</DDLANGUAGE>'),
      `DDLANGUAGE should be E (mapped from EN). XML:\n${xml}`,
    );
    assert.ok(
      xml.includes('<DTELMASTER>E</DTELMASTER>'),
      `DTELMASTER should be E (mapped from EN). XML:\n${xml}`,
    );
    assert.ok(
      xml.includes('<REFKIND>D</REFKIND>'),
      `REFKIND should be D for domain. XML:\n${xml}`,
    );
    assert.ok(
      xml.includes('<SCRTEXT_S>Short</SCRTEXT_S>'),
      `SCRTEXT_S should be set. XML:\n${xml}`,
    );
    assert.ok(
      xml.includes('<SCRTEXT_M>Medium Text</SCRTEXT_M>'),
      `SCRTEXT_M should be set. XML:\n${xml}`,
    );
    assert.ok(
      xml.includes('<SCRTEXT_L>Long Description</SCRTEXT_L>'),
      `SCRTEXT_L should be set. XML:\n${xml}`,
    );
    assert.ok(
      xml.includes('<REPTEXT>Heading Text</REPTEXT>'),
      `REPTEXT should be set. XML:\n${xml}`,
    );
  });

  it('full chain with predefined type', async () => {
    const parsed = parseDtelResponse(SAP_DTEL_RESPONSE_PREDEFINED);
    const wbobj = parsed.wbobj;

    const mockAdkObject = {
      name: wbobj.name,
      type: wbobj.type,
      kind: 'DataElement',
      description: wbobj.description ?? '',
      language: wbobj.language ?? '',
      masterLanguage: wbobj.masterLanguage ?? '',
      abapLanguageVersion: wbobj.abapLanguageVersion ?? '',
      dataSync: wbobj,
    };

    const handler = getHandler('DTEL');
    const files = await handler!.serialize(mockAdkObject as any);
    const xmlFile = files.find((f) => f.path.endsWith('.dtel.xml'));
    const xml = xmlFile!.content;

    assert.ok(
      xml.includes('<DATATYPE>CHAR</DATATYPE>'),
      `DATATYPE should be CHAR. XML:\n${xml}`,
    );
    assert.ok(
      xml.includes('<LENG>000010</LENG>'),
      `LENG should be zero-padded 10. XML:\n${xml}`,
    );
    assert.ok(
      !xml.includes('<REFKIND>D</REFKIND>'),
      'REFKIND should NOT be D for predefined type',
    );
  });
});
