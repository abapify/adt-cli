/**
 * Test for abapGit XML format building
 *
 * The abapGit XML format has a specific namespace structure:
 * - <abapGit> - NO namespace prefix (root element from chameleon schema)
 * - <asx:abap> - asx namespace prefix
 * - <asx:values> - asx namespace prefix
 * - <DEVC>, <CTEXT> - NO namespace prefix (unqualified local elements)
 *
 * Expected output:
 * ```xml
 * <?xml version="1.0" encoding="utf-8"?>
 * <abapGit xmlns:asx="http://www.sap.com/abapxml" version="v1.0.0" serializer="LCL_OBJECT_DEVC" serializer_version="v1.0.0">
 *   <asx:abap version="1.0">
 *     <asx:values>
 *       <DEVC>
 *         <CTEXT>Package description</CTEXT>
 *       </DEVC>
 *     </asx:values>
 *   </asx:abap>
 * </abapGit>
 * ```
 *
 * The key insight is:
 * - elementFormDefault="unqualified" means local elements (DEVC, CTEXT) don't get prefix
 * - The root element (abapGit) should NOT have prefix because it's from a schema with NO targetNamespace
 * - Elements with ref="asx:abap" SHOULD have the asx: prefix
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { build } from '../../src/xml/build';

describe('abapGit XML format building', () => {
  // This schema simulates the resolved devc.xsd schema
  // Key: abapGit element is from a chameleon schema (no targetNamespace originally)
  // but after resolution, the schema has targetNamespace="http://www.sap.com/abapxml"
  const devcSchema = {
    $xmlns: {
      xs: 'http://www.w3.org/2001/XMLSchema',
      asx: 'http://www.sap.com/abapxml',
    },
    targetNamespace: 'http://www.sap.com/abapxml',
    elementFormDefault: 'unqualified',
    element: [
      {
        name: 'abapGit',
        // This element was merged from abapgit.xsd which has NO targetNamespace
        // So it should NOT get the asx: prefix
        complexType: {
          sequence: {
            element: [
              {
                // This ref has explicit asx: prefix - should keep it
                ref: 'asx:abap',
              },
            ],
          },
          attribute: [
            { name: 'version', type: 'xs:string', use: 'required' },
            { name: 'serializer', type: 'xs:string', use: 'required' },
            { name: 'serializer_version', type: 'xs:string', use: 'required' },
          ],
        },
      },
      {
        name: 'abap',
        complexType: {
          sequence: {
            element: [{ name: 'values', type: 'asx:DevcValuesType' }],
          },
          attribute: [{ name: 'version', type: 'xs:string', default: '1.0' }],
        },
      },
    ],
    complexType: [
      {
        name: 'DevcValuesType',
        sequence: {
          element: [{ name: 'DEVC', type: 'asx:DevcType', minOccurs: 0 }],
        },
      },
      {
        name: 'DevcType',
        all: {
          element: [{ name: 'CTEXT', type: 'xs:string', minOccurs: 0 }],
        },
      },
    ],
  } as const;

  it('should NOT prefix root element (abapGit) when elementFormDefault=unqualified', () => {
    const data = {
      version: 'v1.0.0',
      serializer: 'LCL_OBJECT_DEVC',
      serializer_version: 'v1.0.0',
      abap: {
        version: '1.0',
        values: {
          DEVC: {
            CTEXT: 'Package description',
          },
        },
      },
    };

    const xml = build(devcSchema, data, {
      rootElement: 'abapGit',
      pretty: true,
    });
    console.log('Generated XML:');
    console.log(xml);

    // Root element should NOT have asx: prefix
    // Because abapGit is from a chameleon schema (no targetNamespace)
    assert.ok(
      xml.includes('<abapGit'),
      'Root element should be <abapGit> without prefix',
    );
    assert.ok(
      !xml.includes('<asx:abapGit'),
      'Root element should NOT have asx: prefix',
    );

    // Child element with ref="asx:abap" SHOULD have prefix
    assert.ok(
      xml.includes('<asx:abap'),
      'Element with ref should have asx: prefix',
    );

    // Local elements should NOT have prefix (elementFormDefault=unqualified)
    assert.ok(
      xml.includes('<DEVC>') || xml.includes('<DEVC '),
      'DEVC should NOT have prefix',
    );
    assert.ok(!xml.includes('<asx:DEVC'), 'DEVC should NOT have asx: prefix');
    assert.ok(
      xml.includes('<CTEXT>') || xml.includes('<CTEXT '),
      'CTEXT should NOT have prefix',
    );
    assert.ok(!xml.includes('<asx:CTEXT'), 'CTEXT should NOT have asx: prefix');

    // values element should have prefix (it's referenced via asx:DevcValuesType)
    assert.ok(
      xml.includes('<asx:values') || xml.includes('<values'),
      'values element should exist',
    );
  });
});
