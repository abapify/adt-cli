/**
 * Integration tests for XML parse/build roundtrip
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseXml, buildXml } from '../../src/xml';
import type { SchemaLike } from '../../src/xsd/schema-like';

describe('XML Roundtrip', () => {
  describe('parse → build → parse', () => {
    it('should roundtrip simple schema', () => {
      const schema = {
        targetNamespace: 'http://example.com',
        element: [{ name: 'Person', type: 'PersonType' }],
        complexType: [
          {
            name: 'PersonType',
            sequence: {
              element: [
                { name: 'firstName', type: 'xs:string' },
                { name: 'lastName', type: 'xs:string' },
              ],
            },
            attribute: [{ name: 'id', type: 'xs:string' }],
          },
        ],
      } as const satisfies SchemaLike;

      const original = { id: '123', firstName: 'John', lastName: 'Doe' };

      // Build XML from data
      const xml = buildXml(schema, original, { xmlDecl: false });

      // Parse XML back to data - now returns wrapped format
      const parsed = parseXml(schema, xml);

      // parse() returns { Person: { ...content } }
      assert.deepStrictEqual(parsed, { Person: original });
    });

    it('should roundtrip nested complex types', () => {
      const schema = {
        element: [{ name: 'Order', type: 'OrderType' }],
        complexType: [
          {
            name: 'OrderType',
            sequence: {
              element: [
                { name: 'customer', type: 'CustomerType' },
                { name: 'total', type: 'xs:decimal' },
              ],
            },
            attribute: [{ name: 'orderId', type: 'xs:string' }],
          },
          {
            name: 'CustomerType',
            sequence: {
              element: [
                { name: 'name', type: 'xs:string' },
                { name: 'email', type: 'xs:string' },
              ],
            },
          },
        ],
      } as const satisfies SchemaLike;

      const original = {
        orderId: 'ORD-001',
        customer: {
          name: 'John Doe',
          email: 'john@example.com',
        },
        total: 99.99,
      };

      const xml = buildXml(schema, original, { xmlDecl: false });
      const parsed = parseXml(schema, xml);

      assert.deepStrictEqual(parsed, { Order: original });
    });

    it('should roundtrip arrays', () => {
      const schema = {
        element: [{ name: 'Order', type: 'OrderType' }],
        complexType: [
          {
            name: 'OrderType',
            sequence: {
              element: [
                { name: 'item', type: 'ItemType', maxOccurs: 'unbounded' },
              ],
            },
          },
          {
            name: 'ItemType',
            sequence: {
              element: [
                { name: 'sku', type: 'xs:string' },
                { name: 'quantity', type: 'xs:int' },
                { name: 'price', type: 'xs:decimal' },
              ],
            },
          },
        ],
      } as const satisfies SchemaLike;

      const original = {
        item: [
          { sku: 'ITEM-A', quantity: 2, price: 19.99 },
          { sku: 'ITEM-B', quantity: 1, price: 49.99 },
          { sku: 'ITEM-C', quantity: 5, price: 9.99 },
        ],
      };

      const xml = buildXml(schema, original, { xmlDecl: false });
      const parsed = parseXml(schema, xml);

      assert.deepStrictEqual(parsed, { Order: original });
    });

    it('should roundtrip with type inheritance', () => {
      const schema = {
        element: [{ name: 'Employee', type: 'EmployeeType' }],
        complexType: [
          {
            name: 'PersonType',
            sequence: {
              element: [
                { name: 'name', type: 'xs:string' },
                { name: 'age', type: 'xs:int' },
              ],
            },
            attribute: [{ name: 'id', type: 'xs:string' }],
          },
          {
            name: 'EmployeeType',
            complexContent: {
              extension: {
                base: 'PersonType',
                sequence: {
                  element: [
                    { name: 'department', type: 'xs:string' },
                    { name: 'salary', type: 'xs:decimal' },
                  ],
                },
                attribute: [{ name: 'employeeId', type: 'xs:string' }],
              },
            },
          },
        ],
      } as const satisfies SchemaLike;

      const original = {
        id: 'P001',
        employeeId: 'E001',
        name: 'Jane Smith',
        age: 30,
        department: 'Engineering',
        salary: 75000,
      };

      const xml = buildXml(schema, original, { xmlDecl: false });
      const parsed = parseXml(schema, xml);

      assert.deepStrictEqual(parsed, { Employee: original });
    });

    it('should roundtrip with namespaced elements', () => {
      const schema = {
        targetNamespace: 'http://example.com/order',
        $xmlns: {
          ord: 'http://example.com/order',
        },
        element: [{ name: 'Order', type: 'OrderType' }],
        complexType: [
          {
            name: 'OrderType',
            sequence: {
              element: [{ name: 'description', type: 'xs:string' }],
            },
            attribute: [{ name: 'id', type: 'xs:string' }],
          },
        ],
      } as const satisfies SchemaLike;

      const original = { id: 'ORD-123', description: 'Test order' };

      const xml = buildXml(schema, original, { xmlDecl: false });
      const parsed = parseXml(schema, xml);

      assert.deepStrictEqual(parsed, { Order: original });
    });

    it('should roundtrip with boolean values', () => {
      const schema = {
        element: [{ name: 'Settings', type: 'SettingsType' }],
        complexType: [
          {
            name: 'SettingsType',
            sequence: {
              element: [
                { name: 'enabled', type: 'xs:boolean' },
                { name: 'visible', type: 'xs:boolean' },
              ],
            },
          },
        ],
      } as const satisfies SchemaLike;

      const original = { enabled: true, visible: false };

      const xml = buildXml(schema, original, { xmlDecl: false });
      const parsed = parseXml(schema, xml);

      assert.deepStrictEqual(parsed, { Settings: original });
    });

    it('should roundtrip with choice group', () => {
      const schema = {
        element: [{ name: 'Payment', type: 'PaymentType' }],
        complexType: [
          {
            name: 'PaymentType',
            choice: {
              element: [
                { name: 'creditCard', type: 'xs:string' },
                { name: 'bankTransfer', type: 'xs:string' },
                { name: 'cash', type: 'xs:boolean' },
              ],
            },
          },
        ],
      } as const satisfies SchemaLike;

      const original = { creditCard: '4111-1111-1111-1111' };

      const xml = buildXml(schema, original, { xmlDecl: false });
      const parsed = parseXml(schema, xml);

      assert.deepStrictEqual(parsed, { Payment: original });
    });
  });

  describe('build → parse consistency', () => {
    it('should produce consistent results across multiple roundtrips', () => {
      const schema = {
        element: [{ name: 'Data', type: 'DataType' }],
        complexType: [
          {
            name: 'DataType',
            sequence: {
              element: [
                { name: 'value', type: 'xs:string' },
                { name: 'count', type: 'xs:int' },
              ],
            },
          },
        ],
      } as const satisfies SchemaLike;

      const original = { value: 'test', count: 42 };
      const wrapped = { Data: original };

      // First roundtrip
      const xml1 = buildXml(schema, original, { xmlDecl: false });
      const parsed1 = parseXml(schema, xml1);

      // Second roundtrip - build accepts wrapped format
      const xml2 = buildXml(schema, parsed1, { xmlDecl: false });
      const parsed2 = parseXml(schema, xml2);

      // Third roundtrip
      const xml3 = buildXml(schema, parsed2, { xmlDecl: false });
      const parsed3 = parseXml(schema, xml3);

      // All should be equal (wrapped format)
      assert.deepStrictEqual(parsed1, wrapped);
      assert.deepStrictEqual(parsed2, wrapped);
      assert.deepStrictEqual(parsed3, wrapped);

      // XML should be identical after first roundtrip
      assert.strictEqual(xml2, xml1);
      assert.strictEqual(xml3, xml1);
    });
  });
});
