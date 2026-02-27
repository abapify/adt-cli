/**
 * Type Inference Tests
 *
 * These tests verify that InferSchema correctly infers TypeScript types
 * from W3C-compliant schema definitions.
 */

import { describe, test as it } from 'node:test';
import { strict as assert } from 'node:assert';
import type { InferSchema, SchemaLike } from '../../src/infer';

// =============================================================================
// Test Schemas (defined with `as const` for literal types)
// =============================================================================

/** Simple schema with one element and one complexType */
const PersonSchema = {
  element: [{ name: 'Person', type: 'PersonType' }],
  complexType: [
    {
      name: 'PersonType',
      sequence: {
        element: [
          { name: 'firstName', type: 'xs:string' },
          { name: 'lastName', type: 'xs:string' },
          { name: 'age', type: 'xs:int', minOccurs: 0 },
        ],
      },
      attribute: [{ name: 'id', type: 'xs:string', use: 'required' as const }],
    },
  ],
} as const;

/** Schema with nested complexType */
const AddressSchema = {
  element: [{ name: 'Address', type: 'AddressType' }],
  complexType: [
    {
      name: 'AddressType',
      sequence: {
        element: [
          { name: 'street', type: 'xs:string' },
          { name: 'city', type: 'xs:string' },
          { name: 'zip', type: 'xs:string', minOccurs: 0 },
        ],
      },
    },
  ],
} as const;

/** Schema with array elements (maxOccurs="unbounded") */
const OrderSchema = {
  element: [{ name: 'Order', type: 'OrderType' }],
  complexType: [
    {
      name: 'OrderType',
      sequence: {
        element: [
          { name: 'orderId', type: 'xs:string' },
          { name: 'item', type: 'ItemType', maxOccurs: 'unbounded' as const },
        ],
      },
    },
    {
      name: 'ItemType',
      sequence: {
        element: [
          { name: 'name', type: 'xs:string' },
          { name: 'quantity', type: 'xs:int' },
        ],
      },
    },
  ],
} as const;

/** Schema with inheritance (complexContent/extension) */
const InheritanceSchema = {
  element: [{ name: 'Employee', type: 'EmployeeType' }],
  complexType: [
    {
      name: 'PersonType',
      sequence: {
        element: [{ name: 'name', type: 'xs:string' }],
      },
    },
    {
      name: 'EmployeeType',
      complexContent: {
        extension: {
          base: 'PersonType',
          sequence: {
            element: [{ name: 'employeeId', type: 'xs:string' }],
          },
        },
      },
    },
  ],
} as const;

/** Schema with simpleType enum */
const EnumSchema = {
  element: [{ name: 'Status', type: 'StatusType' }],
  simpleType: [
    {
      name: 'StatusType',
      restriction: {
        base: 'xs:string',
        enumeration: [
          { value: 'active' },
          { value: 'inactive' },
          { value: 'pending' },
        ],
      },
    },
  ],
} as const;

// =============================================================================
// Type-level Tests (compile-time verification)
// =============================================================================

// These type aliases verify inference at compile time
// If inference is wrong, TypeScript will error

type Person = InferSchema<typeof PersonSchema>;
type Address = InferSchema<typeof AddressSchema>;
type Order = InferSchema<typeof OrderSchema>;
type _Employee = InferSchema<typeof InheritanceSchema>;
type _Status = InferSchema<typeof EnumSchema>;

// Type assertions - these will fail to compile if inference is wrong
const _personTest: Person = {
  firstName: 'John',
  lastName: 'Doe',
  age: 30, // optional
  id: '123',
};

const _addressTest: Address = {
  street: '123 Main St',
  city: 'Springfield',
  // zip is optional
};

const _orderTest: Order = {
  orderId: 'ORD-001',
  item: [
    { name: 'Widget', quantity: 5 },
    { name: 'Gadget', quantity: 3 },
  ],
};

// =============================================================================
// Runtime Tests
// =============================================================================

describe('Type Inference', () => {
  describe('InferSchema', () => {
    it('should infer simple schema with sequence elements', () => {
      // This test verifies the type is usable at runtime
      const person: Person = {
        firstName: 'John',
        lastName: 'Doe',
        id: '123',
      };

      assert.equal(person.firstName, 'John');
      assert.equal(person.lastName, 'Doe');
      assert.equal(person.id, '123');
      assert.equal(person.age, undefined);
    });

    it('should infer optional fields from minOccurs=0', () => {
      const address: Address = {
        street: '123 Main St',
        city: 'Springfield',
      };

      assert.equal(address.street, '123 Main St');
      assert.equal(address.city, 'Springfield');
      assert.equal(address.zip, undefined);
    });

    it('should infer arrays from maxOccurs=unbounded', () => {
      const order: Order = {
        orderId: 'ORD-001',
        item: [{ name: 'Widget', quantity: 5 }],
      };

      assert.ok(Array.isArray(order.item));
      assert.equal(order.item.length, 1);
      assert.equal(order.item[0].name, 'Widget');
    });

    it('should infer required attributes', () => {
      const person: Person = {
        firstName: 'Jane',
        lastName: 'Smith',
        id: '456',
      };

      // id is required (use="required")
      assert.equal(person.id, '456');
    });
  });

  describe('Built-in types', () => {
    it('should map xs:string to string', () => {
      const person: Person = {
        firstName: 'Test',
        lastName: 'User',
        id: '789',
      };

      assert.equal(typeof person.firstName, 'string');
    });

    it('should map xs:int to number', () => {
      const person: Person = {
        firstName: 'Test',
        lastName: 'User',
        id: '789',
        age: 25,
      };

      assert.equal(typeof person.age, 'number');
    });
  });

  describe('Schema satisfies SchemaLike', () => {
    it('should accept schema as SchemaLike', () => {
      // Verify our test schemas satisfy SchemaLike
      const schemas: SchemaLike[] = [
        PersonSchema,
        AddressSchema,
        OrderSchema,
        InheritanceSchema,
        EnumSchema,
      ];

      assert.equal(schemas.length, 5);
    });
  });

  describe('XSD Schema self-inference', () => {
    it('should infer type from XSD schema definition (literal)', () => {
      // This is a simplified XSD schema definition - the structure that
      // describes XSD itself. For full inference, we'd need the complete
      // W3C XMLSchema.xsd as a literal type.

      // Simplified xs:schema element definition
      const _XsdSchemaSchema = {
        element: [{ name: 'schema', type: 'schemaType' }],
        complexType: [
          {
            name: 'schemaType',
            sequence: {
              element: [
                {
                  name: 'element',
                  type: 'elementType',
                  minOccurs: 0,
                  maxOccurs: 'unbounded' as const,
                },
                {
                  name: 'complexType',
                  type: 'complexTypeType',
                  minOccurs: 0,
                  maxOccurs: 'unbounded' as const,
                },
                {
                  name: 'simpleType',
                  type: 'simpleTypeType',
                  minOccurs: 0,
                  maxOccurs: 'unbounded' as const,
                },
              ],
            },
            attribute: [
              { name: 'targetNamespace', type: 'xs:anyURI' },
              { name: 'elementFormDefault', type: 'xs:string' },
            ],
          },
          {
            name: 'elementType',
            sequence: {
              element: [
                { name: 'complexType', type: 'complexTypeType', minOccurs: 0 },
              ],
            },
            attribute: [
              { name: 'name', type: 'xs:NCName', use: 'required' as const },
              { name: 'type', type: 'xs:QName' },
            ],
          },
          {
            name: 'complexTypeType',
            sequence: {
              element: [
                { name: 'sequence', type: 'sequenceType', minOccurs: 0 },
              ],
            },
            attribute: [{ name: 'name', type: 'xs:NCName' }],
          },
          {
            name: 'sequenceType',
            sequence: {
              element: [
                {
                  name: 'element',
                  type: 'elementType',
                  minOccurs: 0,
                  maxOccurs: 'unbounded' as const,
                },
              ],
            },
          },
          {
            name: 'simpleTypeType',
            attribute: [
              { name: 'name', type: 'xs:NCName', use: 'required' as const },
            ],
          },
        ],
      } as const;

      // Infer the type of an XSD schema document
      type XsdDocument = InferSchema<typeof _XsdSchemaSchema>;

      // This should give us a type like:
      // {
      //   element?: Array<{ name: string; type?: string; complexType?: ... }>;
      //   complexType?: Array<{ name?: string; sequence?: ... }>;
      //   simpleType?: Array<{ name: string }>;
      //   targetNamespace?: string;
      //   elementFormDefault?: string;
      // }

      const xsdDoc: XsdDocument = {
        element: [{ name: 'Person' }],
        complexType: [{ name: 'PersonType', sequence: { element: [] } }],
      };

      assert.ok(Array.isArray(xsdDoc.element));
      assert.equal(xsdDoc.element?.[0].name, 'Person');
    });

    it('should work with parsed schema (runtime type only)', async () => {
      // When we parse XSD at runtime, we get Schema type (not literal)
      // So inference gives us the general Schema type, not specific fields

      const { parseXsd } = await import('../../src/xsd');
      const { getW3CSchema } = await import('../fixtures');

      const xsdContent = await getW3CSchema();
      const schema = parseXsd(xsdContent);

      // Runtime: we can access the parsed data
      assert.ok(
        Array.isArray(schema.complexType) ||
          typeof schema.complexType === 'object',
      );
      assert.ok(schema.targetNamespace === 'http://www.w3.org/2001/XMLSchema');

      // But for compile-time inference, we'd need the schema as a literal type
      // This is the limitation: parseXsd() returns Schema, not a literal type
    });
  });

  describe('$imports - cross-schema type resolution', () => {
    // Base schema with a shared type
    const BaseSchema = {
      targetNamespace: 'http://example.com/base',
      complexType: [
        {
          name: 'BaseType',
          sequence: {
            element: [
              { name: 'id', type: 'xs:string' },
              { name: 'name', type: 'xs:string' },
            ],
          },
        },
      ],
    } as const;

    // Schema that imports BaseSchema and uses its type
    const DerivedSchema = {
      targetNamespace: 'http://example.com/derived',
      element: [{ name: 'Item', type: 'ItemType' }],
      complexType: [
        {
          name: 'ItemType',
          complexContent: {
            extension: {
              base: 'BaseType', // References type from BaseSchema
              sequence: {
                element: [{ name: 'price', type: 'xs:decimal' }],
              },
            },
          },
        },
      ],
      $imports: [BaseSchema], // Link to imported schema
    } as const;

    it('should resolve types from $imports', () => {
      // Type inference should find BaseType in $imports
      type Item = InferSchema<typeof DerivedSchema>;

      // Compile-time check: Item should have fields from both BaseType and ItemType
      const item: Item = {
        id: '123',
        name: 'Test Item',
        price: 99.99,
      };

      assert.equal(item.id, '123');
      assert.equal(item.name, 'Test Item');
      assert.equal(item.price, 99.99);
    });

    it('should accept schemas with $imports as SchemaLike', () => {
      // Verify $imports is part of SchemaLike
      const schema: SchemaLike = DerivedSchema;
      assert.ok(schema.$imports);
      assert.equal(schema.$imports?.length, 1);
    });

    it('should work without $imports (backward compatible)', () => {
      // Schema without $imports should still work
      type Person = InferSchema<typeof PersonSchema>;

      const person: Person = {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
      };

      assert.equal(person.firstName, 'John');
    });
  });
});
