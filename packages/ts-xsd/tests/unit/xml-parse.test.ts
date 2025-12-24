/**
 * Unit tests for XML parse functionality
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseXml } from '../../src/xml';
import type { SchemaLike } from '../../src/xsd/schema-like';

describe('parseXml', () => {
  describe('Basic parsing', () => {
    it('should parse simple element with text content', () => {
      const schema = {
        element: [{ name: 'Person', type: 'PersonType' }],
        complexType: [
          {
            name: 'PersonType',
            sequence: {
              element: [{ name: 'name', type: 'xs:string' }],
            },
          },
        ],
      } as const satisfies SchemaLike;

      const xml = `<Person><name>John</name></Person>`;
      const result = parseXml(schema, xml);

      assert.deepStrictEqual(result, { Person: { name: 'John' } });
    });

    it('should parse multiple elements in sequence', () => {
      const schema = {
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
          },
        ],
      } as const satisfies SchemaLike;

      const xml = `<Person><firstName>John</firstName><lastName>Doe</lastName></Person>`;
      const result = parseXml(schema, xml);

      assert.deepStrictEqual(result, {
        Person: { firstName: 'John', lastName: 'Doe' },
      });
    });

    it('should handle missing optional elements', () => {
      const schema = {
        element: [{ name: 'Person', type: 'PersonType' }],
        complexType: [
          {
            name: 'PersonType',
            sequence: {
              element: [
                { name: 'name', type: 'xs:string' },
                { name: 'age', type: 'xs:int', minOccurs: 0 },
              ],
            },
          },
        ],
      } as const satisfies SchemaLike;

      const xml = `<Person><name>John</name></Person>`;
      const result = parseXml(schema, xml);

      assert.deepStrictEqual(result, { Person: { name: 'John' } });
    });
  });

  describe('Attributes', () => {
    it('should parse attributes', () => {
      const schema = {
        element: [{ name: 'Person', type: 'PersonType' }],
        complexType: [
          {
            name: 'PersonType',
            attribute: [{ name: 'id', type: 'xs:string' }],
          },
        ],
      } as const satisfies SchemaLike;

      const xml = `<Person id="123"/>`;
      const result = parseXml(schema, xml);

      assert.deepStrictEqual(result, { Person: { id: '123' } });
    });

    it('should apply default attribute values', () => {
      const schema = {
        element: [{ name: 'Person', type: 'PersonType' }],
        complexType: [
          {
            name: 'PersonType',
            attribute: [
              { name: 'status', type: 'xs:string', default: 'active' },
            ],
          },
        ],
      } as const satisfies SchemaLike;

      const xml = `<Person/>`;
      const result = parseXml(schema, xml);

      assert.deepStrictEqual(result, { Person: { status: 'active' } });
    });

    it('should parse namespaced attributes', () => {
      const schema = {
        element: [{ name: 'Person', type: 'PersonType' }],
        complexType: [
          {
            name: 'PersonType',
            attribute: [{ name: 'id', type: 'xs:string' }],
          },
        ],
      } as const satisfies SchemaLike;

      const xml = `<Person xmlns:custom="http://example.com" custom:id="456"/>`;
      const result = parseXml(schema, xml);

      assert.deepStrictEqual(result, { Person: { id: '456' } });
    });
  });

  describe('Type conversion', () => {
    it('should convert integer types', () => {
      const schema = {
        element: [{ name: 'Data', type: 'DataType' }],
        complexType: [
          {
            name: 'DataType',
            sequence: {
              element: [
                { name: 'count', type: 'xs:int' },
                { name: 'total', type: 'xs:integer' },
              ],
            },
          },
        ],
      } as const satisfies SchemaLike;

      const xml = `<Data><count>42</count><total>100</total></Data>`;
      const result = parseXml(schema, xml);

      assert.strictEqual(result.Data.count, 42);
      assert.strictEqual(result.Data.total, 100);
    });

    it('should convert boolean types', () => {
      const schema = {
        element: [{ name: 'Data', type: 'DataType' }],
        complexType: [
          {
            name: 'DataType',
            sequence: {
              element: [
                { name: 'active', type: 'xs:boolean' },
                { name: 'enabled', type: 'xs:boolean' },
              ],
            },
          },
        ],
      } as const satisfies SchemaLike;

      const xml = `<Data><active>true</active><enabled>1</enabled></Data>`;
      const result = parseXml(schema, xml);

      assert.strictEqual(result.Data.active, true);
      assert.strictEqual(result.Data.enabled, true);
    });

    it('should convert numeric types', () => {
      const schema = {
        element: [{ name: 'Data', type: 'DataType' }],
        complexType: [
          {
            name: 'DataType',
            sequence: {
              element: [
                { name: 'price', type: 'xs:decimal' },
                { name: 'rate', type: 'xs:float' },
                { name: 'value', type: 'xs:double' },
              ],
            },
          },
        ],
      } as const satisfies SchemaLike;

      const xml = `<Data><price>19.99</price><rate>3.14</rate><value>2.718</value></Data>`;
      const result = parseXml(schema, xml);

      assert.strictEqual(result.Data.price, 19.99);
      assert.strictEqual(result.Data.rate, 3.14);
      assert.strictEqual(result.Data.value, 2.718);
    });

    it('should keep date types as strings', () => {
      const schema = {
        element: [{ name: 'Data', type: 'DataType' }],
        complexType: [
          {
            name: 'DataType',
            sequence: {
              element: [
                { name: 'date', type: 'xs:date' },
                { name: 'timestamp', type: 'xs:dateTime' },
              ],
            },
          },
        ],
      } as const satisfies SchemaLike;

      const xml = `<Data><date>2024-01-15</date><timestamp>2024-01-15T10:30:00Z</timestamp></Data>`;
      const result = parseXml(schema, xml);

      // parse() returns wrapped format: { ElementName: content }
      assert.strictEqual(result.Data.date, '2024-01-15');
      assert.strictEqual(result.Data.timestamp, '2024-01-15T10:30:00Z');
    });
  });

  describe('Arrays', () => {
    it('should parse unbounded elements as arrays', () => {
      const schema = {
        element: [{ name: 'List', type: 'ListType' }],
        complexType: [
          {
            name: 'ListType',
            sequence: {
              element: [
                { name: 'item', type: 'xs:string', maxOccurs: 'unbounded' },
              ],
            },
          },
        ],
      } as const satisfies SchemaLike;

      const xml = `<List><item>a</item><item>b</item><item>c</item></List>`;
      const result = parseXml(schema, xml);

      assert.deepStrictEqual(result, { List: { item: ['a', 'b', 'c'] } });
    });

    it('should parse maxOccurs > 1 as arrays', () => {
      const schema = {
        element: [{ name: 'List', type: 'ListType' }],
        complexType: [
          {
            name: 'ListType',
            sequence: {
              element: [{ name: 'item', type: 'xs:string', maxOccurs: 5 }],
            },
          },
        ],
      } as const satisfies SchemaLike;

      const xml = `<List><item>a</item><item>b</item></List>`;
      const result = parseXml(schema, xml);

      assert.deepStrictEqual(result, { List: { item: ['a', 'b'] } });
    });

    it('should parse string maxOccurs as arrays', () => {
      const schema = {
        element: [{ name: 'List', type: 'ListType' }],
        complexType: [
          {
            name: 'ListType',
            sequence: {
              element: [{ name: 'item', type: 'xs:string', maxOccurs: '10' }],
            },
          },
        ],
      } as const satisfies SchemaLike;

      const xml = `<List><item>x</item></List>`;
      const result = parseXml(schema, xml);

      assert.deepStrictEqual(result, { List: { item: ['x'] } });
    });
  });

  describe('Nested types', () => {
    it('should parse nested complex types', () => {
      const schema = {
        element: [{ name: 'Order', type: 'OrderType' }],
        complexType: [
          {
            name: 'OrderType',
            sequence: {
              element: [{ name: 'customer', type: 'CustomerType' }],
            },
          },
          {
            name: 'CustomerType',
            sequence: {
              element: [{ name: 'name', type: 'xs:string' }],
            },
          },
        ],
      } as const satisfies SchemaLike;

      const xml = `<Order><customer><name>John</name></customer></Order>`;
      const result = parseXml(schema, xml);

      assert.deepStrictEqual(result, { Order: { customer: { name: 'John' } } });
    });

    it('should parse arrays of complex types', () => {
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
                { name: 'qty', type: 'xs:int' },
              ],
            },
          },
        ],
      } as const satisfies SchemaLike;

      const xml = `<Order><item><sku>A1</sku><qty>2</qty></item><item><sku>B2</sku><qty>3</qty></item></Order>`;
      const result = parseXml(schema, xml);

      assert.deepStrictEqual(result, {
        Order: {
          item: [
            { sku: 'A1', qty: 2 },
            { sku: 'B2', qty: 3 },
          ],
        },
      });
    });
  });

  describe('Namespace handling', () => {
    it('should strip namespace prefix from root element', () => {
      const schema = {
        element: [{ name: 'Person', type: 'PersonType' }],
        complexType: [
          {
            name: 'PersonType',
            sequence: {
              element: [{ name: 'name', type: 'xs:string' }],
            },
          },
        ],
      } as const satisfies SchemaLike;

      const xml = `<ns:Person xmlns:ns="http://example.com"><ns:name>John</ns:name></ns:Person>`;
      const result = parseXml(schema, xml);

      assert.deepStrictEqual(result, { Person: { name: 'John' } });
    });

    it('should handle type names with namespace prefix', () => {
      const schema = {
        element: [{ name: 'Person', type: 'tns:PersonType' }],
        complexType: [
          {
            name: 'PersonType',
            sequence: {
              element: [{ name: 'name', type: 'xs:string' }],
            },
          },
        ],
      } as const satisfies SchemaLike;

      const xml = `<Person><name>Jane</name></Person>`;
      const result = parseXml(schema, xml);

      assert.deepStrictEqual(result, { Person: { name: 'Jane' } });
    });
  });

  describe('Choice and All groups', () => {
    it('should parse choice elements', () => {
      const schema = {
        element: [{ name: 'Data', type: 'DataType' }],
        complexType: [
          {
            name: 'DataType',
            choice: {
              element: [
                { name: 'optionA', type: 'xs:string' },
                { name: 'optionB', type: 'xs:string' },
              ],
            },
          },
        ],
      } as const satisfies SchemaLike;

      const xml = `<Data><optionA>selected</optionA></Data>`;
      const result = parseXml(schema, xml);

      assert.deepStrictEqual(result, { Data: { optionA: 'selected' } });
    });

    it('should parse all elements', () => {
      const schema = {
        element: [{ name: 'Data', type: 'DataType' }],
        complexType: [
          {
            name: 'DataType',
            all: {
              element: [
                { name: 'field1', type: 'xs:string' },
                { name: 'field2', type: 'xs:string' },
              ],
            },
          },
        ],
      } as const satisfies SchemaLike;

      const xml = `<Data><field2>b</field2><field1>a</field1></Data>`;
      const result = parseXml(schema, xml);

      assert.deepStrictEqual(result, { Data: { field1: 'a', field2: 'b' } });
    });
  });

  describe('Type inheritance', () => {
    it('should merge inherited fields from base type', () => {
      const schema = {
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
                  element: [{ name: 'department', type: 'xs:string' }],
                },
              },
            },
          },
        ],
      } as const satisfies SchemaLike;

      const xml = `<Employee><name>John</name><department>Engineering</department></Employee>`;
      const result = parseXml(schema, xml);

      assert.deepStrictEqual(result, {
        Employee: { name: 'John', department: 'Engineering' },
      });
    });

    it('should merge inherited attributes', () => {
      const schema = {
        element: [{ name: 'Employee', type: 'EmployeeType' }],
        complexType: [
          {
            name: 'PersonType',
            attribute: [{ name: 'id', type: 'xs:string' }],
          },
          {
            name: 'EmployeeType',
            complexContent: {
              extension: {
                base: 'PersonType',
                attribute: [{ name: 'empId', type: 'xs:string' }],
              },
            },
          },
        ],
      } as const satisfies SchemaLike;

      const xml = `<Employee id="P1" empId="E1"/>`;
      const result = parseXml(schema, xml);

      assert.deepStrictEqual(result, { Employee: { id: 'P1', empId: 'E1' } });
    });
  });

  describe('Object-format complexType', () => {
    it('should handle complexType as object (not array)', () => {
      const schema = {
        element: [{ name: 'Person', type: 'PersonType' }],
        complexType: {
          PersonType: {
            sequence: {
              element: [{ name: 'name', type: 'xs:string' }],
            },
          },
        },
      } as const satisfies SchemaLike;

      const xml = `<Person><name>Bob</name></Person>`;
      const result = parseXml(schema, xml);

      assert.deepStrictEqual(result, { Person: { name: 'Bob' } });
    });
  });

  describe('Error handling', () => {
    it('should throw on invalid XML', () => {
      const schema = {
        element: [{ name: 'Person', type: 'PersonType' }],
        complexType: [{ name: 'PersonType' }],
      } as const satisfies SchemaLike;

      assert.throws(() => {
        parseXml(schema, '');
      }, /missing root element|Invalid XML/);
    });

    it('should throw on missing element declaration', () => {
      const schema = {
        element: [{ name: 'Other', type: 'OtherType' }],
        complexType: [{ name: 'OtherType' }],
      } as const satisfies SchemaLike;

      assert.throws(() => {
        parseXml(schema, '<Person/>');
      }, /missing element declaration/);
    });

    it('should throw on missing complexType', () => {
      const schema = {
        element: [{ name: 'Person', type: 'PersonType' }],
        complexType: [],
      } as const satisfies SchemaLike;

      assert.throws(() => {
        parseXml(schema, '<Person/>');
      }, /missing complexType/);
    });
  });

  describe('Case-insensitive element matching', () => {
    it('should match element names case-insensitively', () => {
      const schema = {
        element: [{ name: 'person', type: 'PersonType' }],
        complexType: [
          {
            name: 'PersonType',
            sequence: {
              element: [{ name: 'name', type: 'xs:string' }],
            },
          },
        ],
      } as const satisfies SchemaLike;

      const xml = `<Person><name>Test</name></Person>`;
      const result = parseXml(schema, xml);

      assert.deepStrictEqual(result, { Person: { name: 'Test' } });
    });
  });

  describe('Inline complexType on elements', () => {
    it('should parse element with inline complexType', () => {
      const schema = {
        element: [
          {
            name: 'Person',
            complexType: {
              sequence: {
                element: [{ name: 'name', type: 'xs:string' }],
              },
              attribute: [{ name: 'id', type: 'xs:string' }],
            },
          },
        ],
      } as const satisfies SchemaLike;

      const xml = `<Person id="123"><name>John</name></Person>`;
      const result = parseXml(schema, xml);

      assert.deepStrictEqual(result, { Person: { id: '123', name: 'John' } });
    });

    it('should parse nested inline complexType', () => {
      const schema = {
        element: [
          {
            name: 'Envelope',
            complexType: {
              sequence: {
                element: [{ name: 'body', type: 'BodyType' }],
              },
              attribute: [{ name: 'version', type: 'xs:string' }],
            },
          },
        ],
        complexType: [
          {
            name: 'BodyType',
            sequence: {
              element: [{ name: 'content', type: 'xs:string' }],
            },
          },
        ],
      } as const satisfies SchemaLike;

      const xml = `<Envelope version="1.0"><body><content>Hello</content></body></Envelope>`;
      const result = parseXml(schema, xml);

      assert.deepStrictEqual(result, {
        Envelope: { version: '1.0', body: { content: 'Hello' } },
      });
    });
  });

  describe('Element references', () => {
    it('should resolve element ref in sequence', () => {
      const schema = {
        $imports: [
          {
            targetNamespace: 'http://example.com/common',
            element: [{ name: 'header', type: 'HeaderType' }],
            complexType: [
              {
                name: 'HeaderType',
                sequence: {
                  element: [{ name: 'title', type: 'xs:string' }],
                },
              },
            ],
          },
        ],
        element: [
          {
            name: 'Document',
            complexType: {
              sequence: {
                element: [{ ref: 'common:header' }],
              },
            },
          },
        ],
      } as const satisfies SchemaLike;

      const xml = `<Document><header><title>Test</title></header></Document>`;
      const result = parseXml(schema, xml);

      assert.deepStrictEqual(result, {
        Document: { header: { title: 'Test' } },
      });
    });

    it('should resolve element ref to imported schema element', () => {
      const commonSchema = {
        targetNamespace: 'http://www.sap.com/abapxml',
        element: [{ name: 'abap', type: 'AbapType' }],
        complexType: [
          {
            name: 'AbapType',
            sequence: {
              element: [{ name: 'values', type: 'ValuesType' }],
            },
            attribute: [{ name: 'version', type: 'xs:string' }],
          },
          {
            name: 'ValuesType',
            sequence: {
              element: [{ name: 'data', type: 'xs:string' }],
            },
          },
        ],
      } as const;

      const schema = {
        $xmlns: { asx: 'http://www.sap.com/abapxml' },
        $imports: [commonSchema],
        element: [
          {
            name: 'wrapper',
            complexType: {
              sequence: {
                element: [{ ref: 'asx:abap' }],
              },
              attribute: [{ name: 'id', type: 'xs:string' }],
            },
          },
        ],
      } as const satisfies SchemaLike;

      const xml = `<wrapper id="W1"><abap version="1.0"><values><data>test</data></values></abap></wrapper>`;
      const result = parseXml(schema, xml);

      assert.deepStrictEqual(result, {
        wrapper: {
          id: 'W1',
          abap: {
            version: '1.0',
            values: { data: 'test' },
          },
        },
      });
    });
  });

  describe('XSD substitution groups', () => {
    it('should parse elements that substitute for abstract element', () => {
      // This tests the abapGit pattern where:
      // - asx:Schema is abstract
      // - DD01V substitutes for asx:Schema
      // - asx:values contains ref to asx:Schema (which can be any substitute)
      const asxSchema = {
        targetNamespace: 'http://www.sap.com/abapxml',
        element: [
          { name: 'Schema', abstract: true },
          { name: 'abap', type: 'AbapType' },
        ],
        complexType: [
          {
            name: 'AbapValuesType',
            sequence: {
              element: [
                { ref: 'asx:Schema', minOccurs: '0', maxOccurs: 'unbounded' },
              ],
            },
          },
          {
            name: 'AbapType',
            sequence: {
              element: [{ name: 'values', type: 'AbapValuesType' }],
            },
            attribute: [{ name: 'version', type: 'xs:string' }],
          },
        ],
      } as const;

      const domaSchema = {
        $xmlns: { asx: 'http://www.sap.com/abapxml' },
        $imports: [asxSchema],
        element: [
          { name: 'DD01V', type: 'Dd01vType', substitutionGroup: 'asx:Schema' },
        ],
        complexType: [
          {
            name: 'Dd01vType',
            sequence: {
              element: [{ name: 'DOMNAME', type: 'xs:string' }],
            },
          },
        ],
      } as const;

      // Combined schema that includes both (simulating XSD include)
      const combinedSchema = {
        $xmlns: { asx: 'http://www.sap.com/abapxml' },
        $imports: [asxSchema, domaSchema],
        element: [
          {
            name: 'abapGit',
            complexType: {
              sequence: {
                element: [{ ref: 'asx:abap' }],
              },
              attribute: [{ name: 'version', type: 'xs:string' }],
            },
          },
        ],
      } as const satisfies SchemaLike;

      const xml = `<abapGit version="1.0"><abap version="1.0"><values><DD01V><DOMNAME>TEST</DOMNAME></DD01V></values></abap></abapGit>`;
      const result = parseXml(combinedSchema, xml);

      assert.deepStrictEqual(result, {
        abapGit: {
          version: '1.0',
          abap: {
            version: '1.0',
            values: {
              DD01V: { DOMNAME: 'TEST' },
            },
          },
        },
      });
    });
  });

  describe('simpleContent with extension', () => {
    it('should parse element with simpleContent extension', () => {
      // Schema with simpleContent - text content with attributes
      const schema = {
        element: [{ name: 'Price', type: 'PriceType' }],
        complexType: [
          {
            name: 'PriceType',
            simpleContent: {
              extension: {
                base: 'xs:decimal',
                attribute: [
                  { name: 'currency', type: 'xs:string' },
                  { name: 'discount', type: 'xs:boolean' },
                ],
              },
            },
          },
        ],
      } as const satisfies SchemaLike;

      const xml = `<Price currency="USD" discount="true">99.99</Price>`;
      const result = parseXml(schema, xml);

      assert.deepStrictEqual(result, {
        Price: {
          $value: 99.99,
          currency: 'USD',
          discount: true,
        },
      });
    });

    it('should parse simpleContent with default attribute value', () => {
      const schema = {
        element: [{ name: 'Amount', type: 'AmountType' }],
        complexType: [
          {
            name: 'AmountType',
            simpleContent: {
              extension: {
                base: 'xs:integer',
                attribute: [
                  { name: 'unit', type: 'xs:string', default: 'pieces' },
                ],
              },
            },
          },
        ],
      } as const satisfies SchemaLike;

      // XML without the unit attribute - should use default
      const xml = `<Amount>42</Amount>`;
      const result = parseXml(schema, xml);

      assert.deepStrictEqual(result, {
        Amount: {
          $value: 42,
          unit: 'pieces',
        },
      });
    });

    it('should parse simpleContent with string base type', () => {
      const schema = {
        element: [{ name: 'Label', type: 'LabelType' }],
        complexType: [
          {
            name: 'LabelType',
            simpleContent: {
              extension: {
                base: 'xs:string',
                attribute: [{ name: 'lang', type: 'xs:string' }],
              },
            },
          },
        ],
      } as const satisfies SchemaLike;

      const xml = `<Label lang="en">Hello World</Label>`;
      const result = parseXml(schema, xml);

      assert.deepStrictEqual(result, {
        Label: {
          $value: 'Hello World',
          lang: 'en',
        },
      });
    });
  });

  describe('Case-insensitive element matching fallback', () => {
    it('should match element name case-insensitively when exact match fails', () => {
      // Schema has "Person" but XML has "person" (lowercase)
      const schema = {
        element: [{ name: 'Person', type: 'PersonType' }],
        complexType: [
          {
            name: 'PersonType',
            sequence: {
              element: [{ name: 'name', type: 'xs:string' }],
            },
          },
        ],
      } as const satisfies SchemaLike;

      // XML with lowercase root element
      const xml = `<person><name>John</name></person>`;
      const result = parseXml(schema, xml);

      // Wrapper uses actual XML element name (lowercase 'person')
      assert.deepStrictEqual(result, { person: { name: 'John' } });
    });

    it('should match element name with different casing', () => {
      const schema = {
        element: [{ name: 'EMPLOYEE', type: 'EmployeeType' }],
        complexType: [
          {
            name: 'EmployeeType',
            sequence: {
              element: [{ name: 'id', type: 'xs:string' }],
            },
          },
        ],
      } as const satisfies SchemaLike;

      // XML with mixed case
      const xml = `<Employee><id>E123</id></Employee>`;
      const result = parseXml(schema, xml);

      assert.deepStrictEqual(result, { Employee: { id: 'E123' } });
    });
  });
});
