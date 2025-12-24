/**
 * Unit tests for cross-schema XML parse/build functionality
 *
 * These tests verify that parsing and building works correctly when:
 * 1. Types are inherited from imported schemas ($imports)
 * 2. Elements reference types from other schemas
 * 3. Attributes come from multiple namespaces
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseXml, buildXml } from '../../src/xml';
import type { SchemaLike } from '../../src/xsd/schema-like';

describe('Cross-schema XML parsing', () => {
  describe('Element ref from $imports', () => {
    // Imported schema defines the element
    const atomSchema = {
      $xmlns: {
        atom: 'http://www.w3.org/2005/Atom',
      },
      targetNamespace: 'http://www.w3.org/2005/Atom',
      element: [{ name: 'link', type: 'atom:LinkType' }],
      complexType: [
        {
          name: 'LinkType',
          attribute: [
            { name: 'href', type: 'xs:string' },
            { name: 'rel', type: 'xs:string' },
            { name: 'type', type: 'xs:string' },
          ],
        },
      ],
    } as const satisfies SchemaLike;

    // Main schema uses ref to reference element from imported schema
    const mainSchema = {
      $xmlns: {
        atom: 'http://www.w3.org/2005/Atom',
        main: 'http://example.com/main',
      },
      $imports: [atomSchema],
      targetNamespace: 'http://example.com/main',
      element: [{ name: 'Object', type: 'main:ObjectType' }],
      complexType: [
        {
          name: 'ObjectType',
          sequence: {
            element: [
              { name: 'title', type: 'xs:string' },
              { ref: 'atom:link', minOccurs: '0', maxOccurs: 'unbounded' },
            ],
          },
          attribute: [{ name: 'id', type: 'xs:string' }],
        },
      ],
    } as const satisfies SchemaLike;

    it('should parse elements referenced via ref from $imports', () => {
      const xml = `
        <Object xmlns:main="http://example.com/main" xmlns:atom="http://www.w3.org/2005/Atom" id="obj-1">
          <main:title>My Object</main:title>
          <atom:link href="/path/1" rel="self" type="application/xml"/>
          <atom:link href="/path/2" rel="related"/>
        </Object>
      `;
      const result = parseXml(mainSchema, xml);

      // parse() now returns wrapped format: { ElementName: content }
      assert.strictEqual(result.Object.id, 'obj-1');
      assert.strictEqual(result.Object.title, 'My Object');
      assert.ok(Array.isArray(result.Object.link), 'link should be an array');
      assert.strictEqual(result.Object.link.length, 2);
      assert.strictEqual(result.Object.link[0].href, '/path/1');
      assert.strictEqual(result.Object.link[0].rel, 'self');
      assert.strictEqual(result.Object.link[1].href, '/path/2');
    });

    it('should build elements referenced via ref', () => {
      const data = {
        id: 'obj-1',
        title: 'My Object',
        link: [
          { href: '/path/1', rel: 'self', type: 'application/xml' },
          { href: '/path/2', rel: 'related' },
        ],
      };

      const xml = buildXml(mainSchema, data);

      assert.ok(xml.includes('title'), 'Should have title element');
      assert.ok(xml.includes('link'), 'Should have link elements');
      assert.ok(xml.includes('href="/path/1"'), 'Should have href attribute');
      assert.ok(xml.includes('rel="self"'), 'Should have rel attribute');
    });
  });

  describe('Type inheritance from $imports', () => {
    // Base schema (like adtcore)
    const baseSchema = {
      $xmlns: {
        base: 'http://example.com/base',
      },
      targetNamespace: 'http://example.com/base',
      complexType: [
        {
          name: 'BaseType',
          attribute: [
            { name: 'id', type: 'xs:string' },
            { name: 'name', type: 'xs:string' },
          ],
        },
      ],
    } as const satisfies SchemaLike;

    // Derived schema (like classes)
    const derivedSchema = {
      $xmlns: {
        base: 'http://example.com/base',
        derived: 'http://example.com/derived',
      },
      $imports: [baseSchema],
      targetNamespace: 'http://example.com/derived',
      element: [{ name: 'DerivedObject', type: 'derived:DerivedType' }],
      complexType: [
        {
          name: 'DerivedType',
          complexContent: {
            extension: {
              base: 'base:BaseType',
              attribute: [{ name: 'status', type: 'xs:string' }],
            },
          },
        },
      ],
    } as const satisfies SchemaLike;

    it('should parse inherited attributes from base type in $imports', () => {
      const xml = `<DerivedObject xmlns:derived="http://example.com/derived" id="123" name="Test" status="active"/>`;
      const result = parseXml(derivedSchema, xml);

      assert.deepStrictEqual(result, {
        DerivedObject: {
          id: '123',
          name: 'Test',
          status: 'active',
        },
      });
    });

    it('should parse namespaced attributes from different schemas', () => {
      // SAP-style XML with attributes from multiple namespaces
      const xml = `
        <derived:DerivedObject 
          xmlns:derived="http://example.com/derived"
          xmlns:base="http://example.com/base"
          base:id="456"
          base:name="Namespaced"
          derived:status="pending"/>
      `;
      const result = parseXml(derivedSchema, xml);

      assert.deepStrictEqual(result, {
        DerivedObject: {
          id: '456',
          name: 'Namespaced',
          status: 'pending',
        },
      });
    });
  });

  describe('Nested types from $imports', () => {
    // Reference schema (like adtcore with packageRef)
    const refSchema = {
      $xmlns: {
        ref: 'http://example.com/ref',
      },
      targetNamespace: 'http://example.com/ref',
      element: [{ name: 'packageRef', type: 'ref:PackageRefType' }],
      complexType: [
        {
          name: 'PackageRefType',
          attribute: [
            { name: 'uri', type: 'xs:string' },
            { name: 'type', type: 'xs:string' },
            { name: 'name', type: 'xs:string' },
          ],
        },
      ],
    } as const satisfies SchemaLike;

    // Main schema that uses the reference type
    const mainSchema = {
      $xmlns: {
        ref: 'http://example.com/ref',
        main: 'http://example.com/main',
      },
      $imports: [refSchema],
      targetNamespace: 'http://example.com/main',
      element: [{ name: 'MainObject', type: 'main:MainType' }],
      complexType: [
        {
          name: 'MainType',
          sequence: {
            element: [{ name: 'packageRef', type: 'ref:PackageRefType' }],
          },
          attribute: [{ name: 'name', type: 'xs:string' }],
        },
      ],
    } as const satisfies SchemaLike;

    it('should parse nested elements with types from $imports', () => {
      const xml = `
        <MainObject xmlns:main="http://example.com/main" name="MyObject">
          <main:packageRef uri="/path/to/pkg" type="DEVC/K" name="$TMP"/>
        </MainObject>
      `;
      const result = parseXml(mainSchema, xml);

      assert.deepStrictEqual(result, {
        MainObject: {
          name: 'MyObject',
          packageRef: {
            uri: '/path/to/pkg',
            type: 'DEVC/K',
            name: '$TMP',
          },
        },
      });
    });
  });

  describe('Element ref inherited from base type', () => {
    // This tests the case where a ref element is defined in a base type
    // and the derived type inherits it through multiple levels

    // atom schema defines the link element
    const atomSchema = {
      $xmlns: { atom: 'http://www.w3.org/2005/Atom' },
      targetNamespace: 'http://www.w3.org/2005/Atom',
      element: [{ name: 'link', type: 'atom:LinkType' }],
      complexType: [
        {
          name: 'LinkType',
          attribute: [
            { name: 'href', type: 'xs:string' },
            { name: 'rel', type: 'xs:string' },
          ],
        },
      ],
    } as const satisfies SchemaLike;

    // adtcore imports atom and defines AdtObject with ref to atom:link
    const adtcoreSchema = {
      $xmlns: {
        atom: 'http://www.w3.org/2005/Atom',
        adtcore: 'http://www.sap.com/adt/core',
      },
      $imports: [atomSchema],
      targetNamespace: 'http://www.sap.com/adt/core',
      complexType: [
        {
          name: 'AdtObject',
          sequence: {
            element: [
              { ref: 'atom:link', minOccurs: '0', maxOccurs: 'unbounded' },
            ],
          },
          attribute: [{ name: 'name', type: 'xs:string' }],
        },
      ],
    } as const satisfies SchemaLike;

    // derived schema extends AdtObject
    const derivedSchema = {
      $xmlns: {
        adtcore: 'http://www.sap.com/adt/core',
        derived: 'http://example.com/derived',
      },
      $imports: [adtcoreSchema],
      targetNamespace: 'http://example.com/derived',
      element: [{ name: 'DerivedObject', type: 'derived:DerivedType' }],
      complexType: [
        {
          name: 'DerivedType',
          complexContent: {
            extension: {
              base: 'adtcore:AdtObject',
              attribute: [{ name: 'extra', type: 'xs:string' }],
            },
          },
        },
      ],
    } as const satisfies SchemaLike;

    it('should parse ref elements inherited from base type in $imports', () => {
      const xml = `
        <DerivedObject xmlns:derived="http://example.com/derived" xmlns:atom="http://www.w3.org/2005/Atom" name="test" extra="value">
          <atom:link href="/path/1" rel="self"/>
          <atom:link href="/path/2" rel="related"/>
        </DerivedObject>
      `;
      const result = parseXml(derivedSchema, xml);

      // parse() returns wrapped format: { ElementName: content }
      assert.strictEqual(result.DerivedObject.name, 'test');
      assert.strictEqual(result.DerivedObject.extra, 'value');
      // This is the key test - link should be parsed from inherited base type
      assert.ok(
        Array.isArray(result.DerivedObject.link),
        'link should be an array',
      );
      assert.strictEqual(result.DerivedObject.link.length, 2);
      assert.strictEqual(result.DerivedObject.link[0].href, '/path/1');
    });
  });

  describe('Ref in base type with derived element (SAP ADT exact scenario)', () => {
    // This reproduces the EXACT SAP ADT scenario:
    // - AdtObject has ref: "atom:link" in its sequence
    // - AdtMainObject extends AdtObject (adds packageRef)
    // - Element declaration uses AdtMainObject type
    // - When parsing, the ref should be resolved from the base type

    const atomSchema = {
      $xmlns: { atom: 'http://www.w3.org/2005/Atom' },
      targetNamespace: 'http://www.w3.org/2005/Atom',
      element: [{ name: 'link', type: 'atom:LinkType' }],
      complexType: [
        {
          name: 'LinkType',
          attribute: [
            { name: 'href', type: 'xs:string' },
            { name: 'rel', type: 'xs:string' },
          ],
        },
      ],
    } as const satisfies SchemaLike;

    const adtcoreSchema = {
      $xmlns: {
        atom: 'http://www.w3.org/2005/Atom',
        adtcore: 'http://www.sap.com/adt/core',
      },
      $imports: [atomSchema],
      targetNamespace: 'http://www.sap.com/adt/core',
      element: [{ name: 'mainObject', type: 'adtcore:AdtMainObject' }],
      complexType: [
        {
          name: 'AdtObject',
          sequence: {
            element: [
              { ref: 'atom:link', minOccurs: '0', maxOccurs: 'unbounded' },
            ],
          },
          attribute: [{ name: 'name', type: 'xs:string' }],
        },
        {
          name: 'AdtMainObject',
          complexContent: {
            extension: {
              base: 'adtcore:AdtObject',
              sequence: {
                element: [
                  { name: 'packageRef', type: 'xs:string', minOccurs: '0' },
                ],
              },
            },
          },
        },
      ],
    } as const satisfies SchemaLike;

    it('should parse ref elements from base type when using derived type element', () => {
      const xml = `
        <adtcore:mainObject xmlns:adtcore="http://www.sap.com/adt/core" xmlns:atom="http://www.w3.org/2005/Atom" adtcore:name="TEST">
          <atom:link href="/test" rel="self"/>
        </adtcore:mainObject>
      `;
      const result = parseXml(adtcoreSchema, xml);

      // parse() returns wrapped format: { ElementName: content }
      assert.strictEqual(result.mainObject.name, 'TEST');
      // Key assertion: link should be parsed from base type AdtObject
      assert.ok(
        Array.isArray(result.mainObject.link),
        'link should be an array (from base type AdtObject)',
      );
      assert.strictEqual(result.mainObject.link.length, 1);
      assert.strictEqual(result.mainObject.link[0].href, '/test');
    });
  });

  describe('Deep inheritance chain with ref (like SAP ADT)', () => {
    // This reproduces the exact SAP ADT schema structure:
    // AbapInterface → AbapOoObject → AbapSourceMainObject → AdtMainObject → AdtObject
    // where atom:link ref is in AdtObject, but interfaces doesn't directly import atom

    const atomSchema = {
      $xmlns: { atom: 'http://www.w3.org/2005/Atom' },
      targetNamespace: 'http://www.w3.org/2005/Atom',
      element: [{ name: 'link', type: 'atom:LinkType' }],
      complexType: [
        {
          name: 'LinkType',
          attribute: [
            { name: 'href', type: 'xs:string' },
            { name: 'rel', type: 'xs:string' },
          ],
        },
      ],
    } as const satisfies SchemaLike;

    // adtcore imports atom, defines AdtObject with ref
    const adtcoreSchema = {
      $xmlns: {
        atom: 'http://www.w3.org/2005/Atom',
        adtcore: 'http://www.sap.com/adt/core',
      },
      $imports: [atomSchema],
      targetNamespace: 'http://www.sap.com/adt/core',
      complexType: [
        {
          name: 'AdtObject',
          sequence: {
            element: [
              { ref: 'atom:link', minOccurs: '0', maxOccurs: 'unbounded' },
            ],
          },
          attribute: [{ name: 'name', type: 'xs:string' }],
        },
        {
          name: 'AdtMainObject',
          complexContent: {
            extension: {
              base: 'adtcore:AdtObject',
              sequence: {
                element: [
                  { name: 'packageRef', type: 'xs:string', minOccurs: '0' },
                ],
              },
            },
          },
        },
      ],
    } as const satisfies SchemaLike;

    // abapsource imports adtcore AND atom
    const abapsourceSchema = {
      $xmlns: {
        adtcore: 'http://www.sap.com/adt/core',
        atom: 'http://www.w3.org/2005/Atom',
        abapsource: 'http://www.sap.com/adt/abapsource',
      },
      $imports: [adtcoreSchema, atomSchema],
      targetNamespace: 'http://www.sap.com/adt/abapsource',
      complexType: [
        {
          name: 'AbapSourceMainObject',
          complexContent: {
            extension: {
              base: 'adtcore:AdtMainObject',
              attribute: [{ name: 'sourceUri', type: 'xs:string' }],
            },
          },
        },
      ],
    } as const satisfies SchemaLike;

    // abapoo imports adtcore and abapsource (NOT atom directly)
    const abapooSchema = {
      $xmlns: {
        adtcore: 'http://www.sap.com/adt/core',
        abapsource: 'http://www.sap.com/adt/abapsource',
        abapoo: 'http://www.sap.com/adt/oo',
      },
      $imports: [adtcoreSchema, abapsourceSchema],
      targetNamespace: 'http://www.sap.com/adt/oo',
      complexType: [
        {
          name: 'AbapOoObject',
          complexContent: {
            extension: {
              base: 'abapsource:AbapSourceMainObject',
              attribute: [{ name: 'modeled', type: 'xs:boolean' }],
            },
          },
        },
      ],
    } as const satisfies SchemaLike;

    // interfaces imports abapsource and abapoo (NOT adtcore, NOT atom)
    const interfacesSchema = {
      $xmlns: {
        abapsource: 'http://www.sap.com/adt/abapsource',
        abapoo: 'http://www.sap.com/adt/oo',
        intf: 'http://www.sap.com/adt/oo/interfaces',
      },
      $imports: [abapsourceSchema, abapooSchema],
      targetNamespace: 'http://www.sap.com/adt/oo/interfaces',
      element: [{ name: 'abapInterface', type: 'intf:AbapInterface' }],
      complexType: [
        {
          name: 'AbapInterface',
          complexContent: {
            extension: {
              base: 'abapoo:AbapOoObject',
            },
          },
        },
      ],
    } as const satisfies SchemaLike;

    it('should parse ref elements through deep inheritance chain', () => {
      const xml = `
        <abapInterface xmlns:intf="http://www.sap.com/adt/oo/interfaces" xmlns:atom="http://www.w3.org/2005/Atom" name="ZIF_TEST">
          <atom:link href="/sap/bc/adt/oo/interfaces/zif_test" rel="self"/>
          <atom:link href="/sap/bc/adt/oo/interfaces/zif_test/source/main" rel="source"/>
        </abapInterface>
      `;
      const result = parseXml(interfacesSchema, xml);

      // parse() returns wrapped format: { ElementName: content }
      assert.strictEqual(result.abapInterface.name, 'ZIF_TEST');
      // Key assertion: link should be parsed even though interfaces doesn't directly import atom
      assert.ok(
        Array.isArray(result.abapInterface.link),
        'link should be an array (inherited from AdtObject via deep chain)',
      );
      assert.strictEqual(result.abapInterface.link.length, 2);
      assert.strictEqual(
        result.abapInterface.link[0].href,
        '/sap/bc/adt/oo/interfaces/zif_test',
      );
      assert.strictEqual(result.abapInterface.link[0].rel, 'self');
    });
  });

  describe('Deep inheritance with qualified elements (exact SAP ADT match)', () => {
    // This test matches the EXACT structure of the real SAP ADT schemas
    // including elementFormDefault: "qualified" and attributeFormDefault: "qualified"

    const atomSchema = {
      $xmlns: { atom: 'http://www.w3.org/2005/Atom' },
      targetNamespace: 'http://www.w3.org/2005/Atom',
      element: [{ name: 'link', type: 'atom:LinkType' }],
      complexType: [
        {
          name: 'LinkType',
          attribute: [
            { name: 'href', type: 'xs:string' },
            { name: 'rel', type: 'xs:string' },
          ],
        },
      ],
    } as const satisfies SchemaLike;

    const adtcoreSchema = {
      $xmlns: {
        atom: 'http://www.w3.org/2005/Atom',
        adtcore: 'http://www.sap.com/adt/core',
      },
      $imports: [atomSchema],
      targetNamespace: 'http://www.sap.com/adt/core',
      attributeFormDefault: 'qualified',
      elementFormDefault: 'qualified',
      complexType: [
        {
          name: 'AdtObject',
          sequence: {
            element: [
              { ref: 'atom:link', minOccurs: '0', maxOccurs: 'unbounded' },
            ],
          },
          attribute: [{ name: 'name', type: 'xs:string' }],
        },
        {
          name: 'AdtMainObject',
          complexContent: {
            extension: {
              base: 'adtcore:AdtObject',
              sequence: {
                element: [
                  { name: 'packageRef', type: 'xs:string', minOccurs: '0' },
                ],
              },
            },
          },
        },
      ],
    } as const satisfies SchemaLike;

    const abapsourceSchema = {
      $xmlns: {
        adtcore: 'http://www.sap.com/adt/core',
        atom: 'http://www.w3.org/2005/Atom',
        abapsource: 'http://www.sap.com/adt/abapsource',
      },
      $imports: [adtcoreSchema, atomSchema],
      targetNamespace: 'http://www.sap.com/adt/abapsource',
      attributeFormDefault: 'qualified',
      elementFormDefault: 'qualified',
      complexType: [
        {
          name: 'AbapSourceMainObject',
          complexContent: {
            extension: {
              base: 'adtcore:AdtMainObject',
            },
          },
        },
      ],
    } as const satisfies SchemaLike;

    const abapooSchema = {
      $xmlns: {
        adtcore: 'http://www.sap.com/adt/core',
        abapsource: 'http://www.sap.com/adt/abapsource',
        abapoo: 'http://www.sap.com/adt/oo',
      },
      $imports: [adtcoreSchema, abapsourceSchema],
      targetNamespace: 'http://www.sap.com/adt/oo',
      attributeFormDefault: 'qualified',
      elementFormDefault: 'qualified',
      complexType: [
        {
          name: 'AbapOoObject',
          complexContent: {
            extension: {
              base: 'abapsource:AbapSourceMainObject',
              sequence: {
                element: [
                  {
                    name: 'interfaceRef',
                    type: 'xs:string',
                    minOccurs: '0',
                    maxOccurs: 'unbounded',
                  },
                ],
              },
            },
          },
        },
      ],
    } as const satisfies SchemaLike;

    // interfaces schema - matches real SAP structure exactly
    const interfacesSchema = {
      $xmlns: {
        abapsource: 'http://www.sap.com/adt/abapsource',
        abapoo: 'http://www.sap.com/adt/oo',
        intf: 'http://www.sap.com/adt/oo/interfaces',
      },
      $imports: [abapsourceSchema, abapooSchema],
      targetNamespace: 'http://www.sap.com/adt/oo/interfaces',
      attributeFormDefault: 'qualified',
      elementFormDefault: 'qualified',
      element: [{ name: 'abapInterface', type: 'intf:AbapInterface' }],
      complexType: [
        {
          name: 'AbapInterface',
          complexContent: {
            extension: {
              base: 'abapoo:AbapOoObject',
            },
          },
        },
      ],
    } as const satisfies SchemaLike;

    it('should parse ref elements with qualified elements and attributes', () => {
      // This XML matches the exact format SAP returns
      const xml = `<?xml version="1.0" encoding="utf-8"?>
<intf:abapInterface xmlns:intf="http://www.sap.com/adt/oo/interfaces" 
                    xmlns:adtcore="http://www.sap.com/adt/core"
                    xmlns:atom="http://www.w3.org/2005/Atom"
                    adtcore:name="ZIF_TEST">
  <atom:link href="/test" rel="self"/>
</intf:abapInterface>`;

      const result = parseXml(interfacesSchema, xml);

      // parse() returns wrapped format: { ElementName: content }
      assert.strictEqual(result.abapInterface.name, 'ZIF_TEST');
      // Key assertion: link should be parsed from base type AdtObject
      assert.ok(
        Array.isArray(result.abapInterface.link),
        'link should be an array (from base type AdtObject)',
      );
      assert.strictEqual(result.abapInterface.link.length, 1);
      assert.strictEqual(result.abapInterface.link[0].href, '/test');
    });
  });

  describe('Multi-level inheritance', () => {
    // Level 1: Base
    const level1Schema = {
      $xmlns: { l1: 'http://example.com/l1' },
      targetNamespace: 'http://example.com/l1',
      complexType: [
        {
          name: 'Level1Type',
          attribute: [{ name: 'l1Attr', type: 'xs:string' }],
        },
      ],
    } as const satisfies SchemaLike;

    // Level 2: Extends Level1
    const level2Schema = {
      $xmlns: {
        l1: 'http://example.com/l1',
        l2: 'http://example.com/l2',
      },
      $imports: [level1Schema],
      targetNamespace: 'http://example.com/l2',
      complexType: [
        {
          name: 'Level2Type',
          complexContent: {
            extension: {
              base: 'l1:Level1Type',
              attribute: [{ name: 'l2Attr', type: 'xs:string' }],
            },
          },
        },
      ],
    } as const satisfies SchemaLike;

    // Level 3: Extends Level2
    const level3Schema = {
      $xmlns: {
        l1: 'http://example.com/l1',
        l2: 'http://example.com/l2',
        l3: 'http://example.com/l3',
      },
      $imports: [level2Schema],
      targetNamespace: 'http://example.com/l3',
      element: [{ name: 'Level3Object', type: 'l3:Level3Type' }],
      complexType: [
        {
          name: 'Level3Type',
          complexContent: {
            extension: {
              base: 'l2:Level2Type',
              attribute: [{ name: 'l3Attr', type: 'xs:string' }],
            },
          },
        },
      ],
    } as const satisfies SchemaLike;

    it('should parse attributes from all inheritance levels', () => {
      const xml = `<Level3Object l1Attr="val1" l2Attr="val2" l3Attr="val3"/>`;
      const result = parseXml(level3Schema, xml);

      assert.deepStrictEqual(result, {
        Level3Object: {
          l1Attr: 'val1',
          l2Attr: 'val2',
          l3Attr: 'val3',
        },
      });
    });
  });
});

describe('Cross-schema XML building', () => {
  describe('Type inheritance from $imports', () => {
    const baseSchema = {
      $xmlns: { base: 'http://example.com/base' },
      targetNamespace: 'http://example.com/base',
      complexType: [
        {
          name: 'BaseType',
          attribute: [
            { name: 'id', type: 'xs:string' },
            { name: 'name', type: 'xs:string' },
          ],
        },
      ],
    } as const satisfies SchemaLike;

    const derivedSchema = {
      $xmlns: {
        base: 'http://example.com/base',
        derived: 'http://example.com/derived',
      },
      $imports: [baseSchema],
      targetNamespace: 'http://example.com/derived',
      element: [{ name: 'DerivedObject', type: 'derived:DerivedType' }],
      complexType: [
        {
          name: 'DerivedType',
          complexContent: {
            extension: {
              base: 'base:BaseType',
              attribute: [{ name: 'status', type: 'xs:string' }],
            },
          },
        },
      ],
    } as const satisfies SchemaLike;

    it('should build XML with inherited attributes from $imports', () => {
      const data = {
        id: '123',
        name: 'Test',
        status: 'active',
      };

      const xml = buildXml(derivedSchema, data);

      // Should contain all attributes (inherited + own)
      assert.ok(xml.includes('id="123"'), 'Should have inherited id attribute');
      assert.ok(
        xml.includes('name="Test"'),
        'Should have inherited name attribute',
      );
      assert.ok(
        xml.includes('status="active"'),
        'Should have own status attribute',
      );
    });
  });

  describe('Nested types from $imports', () => {
    const refSchema = {
      $xmlns: { ref: 'http://example.com/ref' },
      targetNamespace: 'http://example.com/ref',
      element: [{ name: 'packageRef', type: 'ref:PackageRefType' }],
      complexType: [
        {
          name: 'PackageRefType',
          attribute: [
            { name: 'uri', type: 'xs:string' },
            { name: 'type', type: 'xs:string' },
            { name: 'name', type: 'xs:string' },
          ],
        },
      ],
    } as const satisfies SchemaLike;

    const mainSchema = {
      $xmlns: {
        ref: 'http://example.com/ref',
        main: 'http://example.com/main',
      },
      $imports: [refSchema],
      targetNamespace: 'http://example.com/main',
      element: [{ name: 'MainObject', type: 'main:MainType' }],
      complexType: [
        {
          name: 'MainType',
          sequence: {
            element: [{ name: 'packageRef', type: 'ref:PackageRefType' }],
          },
          attribute: [{ name: 'name', type: 'xs:string' }],
        },
      ],
    } as const satisfies SchemaLike;

    it('should build XML with nested elements using types from $imports', () => {
      const data = {
        name: 'MyObject',
        packageRef: {
          uri: '/path/to/pkg',
          type: 'DEVC/K',
          name: '$TMP',
        },
      };

      const xml = buildXml(mainSchema, data);

      // Should contain nested element with attributes
      assert.ok(xml.includes('packageRef'), 'Should have packageRef element');
      assert.ok(
        xml.includes('uri="/path/to/pkg"'),
        'Should have uri attribute',
      );
      assert.ok(xml.includes('type="DEVC/K"'), 'Should have type attribute');
      assert.ok(
        xml.includes('name="$TMP"') || xml.includes("name='$TMP'"),
        'Should have name attribute on packageRef',
      );
    });
  });

  describe('Roundtrip with cross-schema types', () => {
    const baseSchema = {
      $xmlns: { base: 'http://example.com/base' },
      targetNamespace: 'http://example.com/base',
      complexType: [
        {
          name: 'BaseType',
          attribute: [{ name: 'id', type: 'xs:string' }],
          sequence: {
            element: [{ name: 'description', type: 'xs:string' }],
          },
        },
      ],
    } as const satisfies SchemaLike;

    const derivedSchema = {
      $xmlns: {
        base: 'http://example.com/base',
        derived: 'http://example.com/derived',
      },
      $imports: [baseSchema],
      targetNamespace: 'http://example.com/derived',
      element: [{ name: 'DerivedObject', type: 'derived:DerivedType' }],
      complexType: [
        {
          name: 'DerivedType',
          complexContent: {
            extension: {
              base: 'base:BaseType',
              attribute: [{ name: 'status', type: 'xs:string' }],
              sequence: {
                element: [{ name: 'extra', type: 'xs:string' }],
              },
            },
          },
        },
      ],
    } as const satisfies SchemaLike;

    it('should roundtrip data with inherited fields', () => {
      const original = {
        id: 'obj-1',
        status: 'active',
        description: 'A test object',
        extra: 'Extra data',
      };

      const xml = buildXml(derivedSchema, original);
      const parsed = parseXml(derivedSchema, xml);

      // parse() returns wrapped format: { ElementName: content }
      assert.deepStrictEqual(parsed, { DerivedObject: original });
    });
  });
});
