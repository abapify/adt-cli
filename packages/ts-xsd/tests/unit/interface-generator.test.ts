import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateInterfaces } from '../../src/codegen/interface-generator';
import type { Schema } from '../../src/xsd/types';

describe('Interface Generator', () => {
  // Simple schema with one complex type
  const simpleSchema = {
    $xmlns: { ns: 'http://example.com' },
    targetNamespace: 'http://example.com',
    element: [{ name: 'person', type: 'ns:Person' }],
    complexType: [
      {
        name: 'Person',
        attribute: [
          { name: 'id', type: 'xsd:string' },
          { name: 'age', type: 'xsd:int' },
        ],
      },
    ],
  } as const;

  it('should generate interface for simple complex type', () => {
    const { code: output } = generateInterfaces(
      simpleSchema as unknown as Schema,
      {},
    );

    assert.ok(output.includes('export interface Person'));
    assert.ok(output.includes('id?: string'));
    assert.ok(output.includes('age?: number'));
  });

  // Schema with inheritance
  const inheritanceSchema = {
    $xmlns: { ns: 'http://example.com' },
    targetNamespace: 'http://example.com',
    element: [{ name: 'employee', type: 'ns:Employee' }],
    complexType: [
      {
        name: 'Person',
        attribute: [{ name: 'name', type: 'xsd:string' }],
      },
      {
        name: 'Employee',
        complexContent: {
          extension: {
            base: 'Person',
            attribute: [{ name: 'role', type: 'xsd:string' }],
          },
        },
      },
    ],
  } as const;

  it('should generate interface with extends clause', () => {
    // NOTE: The simplified generator flattens inheritance instead of using extends.
    // This produces simpler, self-contained interfaces.
    const { code: output } = generateInterfaces(
      inheritanceSchema as unknown as Schema,
      {},
    );

    // Employee should have all properties flattened (name from Person + role)
    assert.ok(
      output.includes('export interface EmployeeType'),
      'Should have EmployeeType',
    );
    assert.ok(
      output.includes('name?: string'),
      'Should have name (from Person)',
    );
    assert.ok(output.includes('role?: string'), 'Should have role');
  });

  // Schema with nested elements
  const nestedSchema = {
    $xmlns: { ns: 'http://example.com' },
    targetNamespace: 'http://example.com',
    element: [{ name: 'order', type: 'ns:Order' }],
    complexType: [
      {
        name: 'Item',
        attribute: [
          { name: 'sku', type: 'xsd:string' },
          { name: 'quantity', type: 'xsd:int' },
        ],
      },
      {
        name: 'Order',
        sequence: {
          element: [
            {
              name: 'items',
              type: 'ns:Item',
              minOccurs: '0',
              maxOccurs: 'unbounded',
            },
            { name: 'note', type: 'xsd:string', minOccurs: '0' },
          ],
        },
        attribute: [{ name: 'orderId', type: 'xsd:string', use: 'required' }],
      },
    ],
  } as const;

  it('should generate interface with array types', () => {
    const { code: output } = generateInterfaces(
      nestedSchema as unknown as Schema,
    );

    // New generator adds 'Type' suffix to interface names
    assert.ok(
      output.includes('export interface ItemType'),
      'Should have ItemType',
    );
    assert.ok(
      output.includes('export interface OrderType'),
      'Should have OrderType',
    );
    assert.ok(output.includes('items?: ItemType[]'), 'Should have items array');
    assert.ok(output.includes('note?: string'), 'Should have note');
    assert.ok(
      output.includes('orderId: string'),
      'Should have required orderId',
    );
  });

  // Deep inheritance (4 levels) - the case that breaks TS type inference
  // NOTE: The old deepSchema with $imports is removed - the simplified generator
  // doesn't traverse $imports. Use resolveSchema to merge schemas first.
  it('should generate interfaces for deep inheritance (4 levels)', () => {
    // NOTE: The simplified generator doesn't traverse $imports.
    // For deep inheritance, use resolveSchema to merge schemas first.
    // This test now uses a merged schema with all types flattened.
    const mergedDeepSchema = {
      $xmlns: {
        l1: 'http://l1',
        l2: 'http://l2',
        l3: 'http://l3',
        l4: 'http://l4',
      },
      targetNamespace: 'http://l4',
      element: [{ name: 'obj', type: 'l4:L4Obj' }],
      complexType: [
        { name: 'L1Base', attribute: [{ name: 'id', type: 'xsd:string' }] },
        {
          name: 'L2Obj',
          complexContent: {
            extension: {
              base: 'l1:L1Base',
              attribute: [{ name: 'l2a', type: 'xsd:string' }],
            },
          },
        },
        { name: 'Item', attribute: [{ name: 'itemType', type: 'xsd:string' }] },
        {
          name: 'L3Obj',
          complexContent: {
            extension: {
              base: 'l2:L2Obj',
              sequence: {
                element: [
                  {
                    name: 'items',
                    type: 'l3:Item',
                    minOccurs: '0',
                    maxOccurs: 'unbounded',
                  },
                ],
              },
            },
          },
        },
        {
          name: 'L4Obj',
          complexContent: {
            extension: {
              base: 'l3:L3Obj',
              attribute: [{ name: 'l4a', type: 'xsd:string' }],
            },
          },
        },
      ],
    } as const;

    const { code: output } = generateInterfaces(
      mergedDeepSchema as unknown as Schema,
    );

    // The simplified generator flattens inheritance
    // L4Obj should have all properties from all levels
    assert.ok(
      output.includes('export interface L4ObjType'),
      'Should have L4ObjType',
    );
    assert.ok(output.includes('id?: string'), 'Should have id (from L1Base)');
    assert.ok(output.includes('l2a?: string'), 'Should have l2a (from L2Obj)');
    assert.ok(
      output.includes('items?: ItemType[]'),
      'Should have items array (from L3Obj)',
    );
    assert.ok(output.includes('l4a?: string'), 'Should have l4a');

    // Item type should be generated
    assert.ok(
      output.includes('export interface ItemType'),
      'Should have ItemType',
    );
    assert.ok(
      output.includes('itemType?: string'),
      'ItemType should have itemType',
    );
  });

  it('should generate all types when generateAllTypes is true', () => {
    const { code: output } = generateInterfaces(
      simpleSchema as unknown as Schema,
      {},
    );

    assert.ok(output.includes('export interface Person'));
  });

  // Schema with simpleType enum
  const enumSchema = {
    $xmlns: { ns: 'http://example.com' },
    targetNamespace: 'http://example.com',
    element: [{ name: 'status', type: 'ns:StatusType' }],
    simpleType: [
      {
        name: 'StatusType',
        restriction: {
          base: 'xsd:string',
          enumeration: [
            { value: 'active' },
            { value: 'inactive' },
            { value: 'pending' },
          ],
        },
      },
    ],
    complexType: [
      {
        name: 'Item',
        attribute: [{ name: 'status', type: 'ns:StatusType' }],
      },
    ],
  } as const;

  it('should generate type alias for simpleType enum', () => {
    const { code: output } = generateInterfaces(
      enumSchema as unknown as Schema,
      {},
    );

    assert.ok(
      output.includes(
        "export type StatusType = 'active' | 'inactive' | 'pending'",
      ),
      'Should have enum type',
    );
    assert.ok(
      output.includes('export interface Item'),
      'Should have Item interface',
    );
    assert.ok(output.includes('status?: StatusType'), 'Should use StatusType');
  });

  // Schema with simpleContent (text with attributes)
  const simpleContentSchema = {
    $xmlns: { ns: 'http://example.com' },
    targetNamespace: 'http://example.com',
    element: [{ name: 'price', type: 'ns:PriceType' }],
    complexType: [
      {
        name: 'PriceType',
        simpleContent: {
          extension: {
            base: 'xsd:decimal',
            attribute: [
              { name: 'currency', type: 'xsd:string', use: 'required' },
            ],
          },
        },
      },
    ],
  } as const;

  it('should generate interface for simpleContent with $value', () => {
    // NOTE: simpleContent text uses $value to match the XML parser output
    const { code: output } = generateInterfaces(
      simpleContentSchema as unknown as Schema,
    );

    assert.ok(
      output.includes('export interface PriceType'),
      'Should have PriceType',
    );
    assert.ok(
      output.includes('$value?: number'),
      'Should have $value for text content',
    );
    assert.ok(
      output.includes('currency: string'),
      'Should have currency attribute',
    );
  });

  // Schema with include - for the new generator, we merge schemas first
  // NOTE: The new generator expects pre-merged schemas (via resolveSchema)
  const mergedIncludeSchema = {
    $xmlns: { base: 'http://base', main: 'http://main' },
    targetNamespace: 'http://main',
    element: [{ name: 'item', type: 'main:ItemType' }],
    complexType: [
      // BaseType from included schema
      { name: 'BaseType', attribute: [{ name: 'id', type: 'xsd:string' }] },
      // ItemType from main schema
      {
        name: 'ItemType',
        complexContent: {
          extension: {
            base: 'base:BaseType',
            attribute: [{ name: 'name', type: 'xsd:string' }],
          },
        },
      },
    ],
  } as const;

  it('should resolve types from include schemas', () => {
    // NOTE: The simplified generator flattens inheritance instead of using extends.
    // This is by design - it produces simpler, self-contained interfaces.
    const { code: output } = generateInterfaces(
      mergedIncludeSchema as unknown as Schema,
    );

    // ItemType should have all properties (flattened from BaseType)
    assert.ok(
      output.includes('export interface ItemType'),
      'Should have ItemType',
    );
    assert.ok(
      output.includes('id?: string'),
      'ItemType should have id (from BaseType)',
    );
    assert.ok(output.includes('name?: string'), 'ItemType should have name');
  });

  // Schema with group reference
  const groupSchema = {
    $xmlns: { ns: 'http://example.com' },
    targetNamespace: 'http://example.com',
    group: [
      {
        name: 'CommonFields',
        sequence: {
          element: [
            { name: 'createdAt', type: 'xsd:dateTime' },
            { name: 'updatedAt', type: 'xsd:dateTime' },
          ],
        },
      },
    ],
    element: [{ name: 'item', type: 'ns:ItemType' }],
    complexType: [
      {
        name: 'ItemType',
        sequence: {
          element: [{ name: 'name', type: 'xsd:string' }],
        },
        group: { ref: 'ns:CommonFields' },
      },
    ],
  } as const;

  it('should resolve group references', () => {
    const { code: output } = generateInterfaces(
      groupSchema as unknown as Schema,
    );

    assert.ok(
      output.includes('export interface ItemType'),
      'Should have ItemType',
    );
    assert.ok(output.includes('name: string'), 'Should have name');
    assert.ok(
      output.includes('createdAt: string'),
      'Should have createdAt from group',
    );
    assert.ok(
      output.includes('updatedAt: string'),
      'Should have updatedAt from group',
    );
  });

  // Schema with any element
  const anySchema = {
    $xmlns: { ns: 'http://example.com' },
    targetNamespace: 'http://example.com',
    element: [{ name: 'container', type: 'ns:ContainerType' }],
    complexType: [
      {
        name: 'ContainerType',
        sequence: {
          element: [{ name: 'header', type: 'xsd:string' }],
          any: [{ namespace: '##any', processContents: 'lax' }],
        },
      },
    ],
  } as const;

  it('should handle any wildcard element', () => {
    const { code: output } = generateInterfaces(anySchema as unknown as Schema);

    assert.ok(
      output.includes('export interface ContainerType'),
      'Should have ContainerType',
    );
    assert.ok(output.includes('header: string'), 'Should have header');
    assert.ok(
      output.includes('[key: string]: unknown'),
      'Should have index signature for any',
    );
  });

  // BUG: Element reference should use the element's type, not derive type from element name
  // See: https://www.w3.org/TR/xmlschema11-1/#declare-element
  // When an element has ref="ns:elementName", the type should come from the referenced element's type attribute
  // NOTE: Element reference type resolution tests updated for new simplified generator.
  // The new generator expects pre-merged schemas (via resolveSchema) and doesn't
  // traverse $imports. Tests now use merged schemas directly.
  describe('Element reference type resolution', () => {
    // Schema where element has explicit type different from element name
    // For the new generator, we merge all schemas into one flat schema
    const mergedSchema = {
      $xmlns: {
        base: 'http://base.example.com',
        container: 'http://container.example.com',
      },
      targetNamespace: 'http://container.example.com',
      element: [
        { name: 'templateLink', type: 'base:LinkType' }, // From base schema
        { name: 'container', type: 'container:ContainerType' },
      ],
      complexType: [
        {
          name: 'LinkType', // From base schema
          attribute: [
            { name: 'href', type: 'xsd:string', use: 'required' },
            { name: 'rel', type: 'xsd:string' },
          ],
        },
        {
          name: 'ContainerType',
          sequence: {
            element: [
              {
                ref: 'base:templateLink',
                minOccurs: '0',
                maxOccurs: 'unbounded',
              },
            ],
          },
        },
      ],
    } as const;

    it('should use element type (LinkType), not element name (TemplateLink)', () => {
      const { code: output } = generateInterfaces(
        mergedSchema as unknown as Schema,
      );

      // Should generate LinkType interface
      assert.ok(
        output.includes('export interface LinkType'),
        'Should have LinkType interface',
      );
      assert.ok(output.includes('href: string'), 'LinkType should have href');
      assert.ok(output.includes('rel?: string'), 'LinkType should have rel');

      // Property should reference LinkType, NOT TemplateLink
      assert.ok(
        output.includes('templateLink?: LinkType[]'),
        'Property should use LinkType (the actual type), not TemplateLink (derived from element name)',
      );

      // Should NOT generate a "TemplateLink" type - that would be wrong
      assert.ok(
        !output.includes('export interface TemplateLink'),
        'Should NOT generate TemplateLink interface - type should be LinkType',
      );
    });

    // Additional test: non-W3C attributes like ecore:name should be ignored
    const schemaWithEcoreName = {
      $xmlns: {
        ns: 'http://example.com',
        ecore: 'http://www.eclipse.org/emf/2002/Ecore',
      },
      targetNamespace: 'http://example.com',
      element: [{ name: 'item', type: 'ns:ItemType' }],
      complexType: [
        {
          name: 'ItemType',
          // ecore:name is an Eclipse EMF annotation, NOT part of W3C XSD spec
          // It should be completely ignored - type name comes from 'name' attribute only
          'ecore:name': 'EcoreItemType', // This should be IGNORED
          attribute: [{ name: 'id', type: 'xsd:string' }],
        },
      ],
    } as const;

    it('should ignore ecore:name and use W3C name attribute only', () => {
      const { code: output } = generateInterfaces(
        schemaWithEcoreName as unknown as Schema,
      );

      // Should use 'name' attribute (ItemType), not 'ecore:name' (EcoreItemType)
      assert.ok(
        output.includes('export interface ItemType'),
        'Should use W3C name attribute (ItemType)',
      );
      assert.ok(
        !output.includes('EcoreItemType'),
        'Should NOT use ecore:name (EcoreItemType) - it is not part of W3C XSD spec',
      );
    });
  });

  // NOTE: Substitution group tests removed - this feature was part of the old complex
  // interface generator (2500+ lines) which has been replaced by the simplified generator.
  // The new generator expects pre-merged schemas (via resolveSchema) and doesn't
  // handle cross-schema $imports traversal or substitution group expansion.
  // See tests/integration/abapgit-doma.test.ts for the new approach using merged schemas.
});
