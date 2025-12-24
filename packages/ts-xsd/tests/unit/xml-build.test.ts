/**
 * Unit tests for XML build functionality
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { buildXml } from '../../src/xml';
import type { SchemaLike } from '../../src/xsd/schema-like';

describe('buildXml', () => {
  describe('Basic building', () => {
    it('should build simple element with text content', () => {
      const schema = {
        targetNamespace: 'http://example.com',
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

      const xml = buildXml(schema, { name: 'John' }, { xmlDecl: false });

      assert.ok(xml.includes('<Person'));
      assert.ok(xml.includes('<name>John</name>'));
      assert.ok(xml.includes('</Person>'));
    });

    it('should build multiple elements in sequence', () => {
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

      const xml = buildXml(
        schema,
        { firstName: 'John', lastName: 'Doe' },
        { xmlDecl: false },
      );

      assert.ok(xml.includes('<firstName>John</firstName>'));
      assert.ok(xml.includes('<lastName>Doe</lastName>'));
    });

    it('should skip undefined/null values', () => {
      const schema = {
        element: [{ name: 'Person', type: 'PersonType' }],
        complexType: [
          {
            name: 'PersonType',
            sequence: {
              element: [
                { name: 'name', type: 'xs:string' },
                { name: 'age', type: 'xs:int' },
              ],
            },
          },
        ],
      } as const satisfies SchemaLike;

      const xml = buildXml(
        schema,
        { name: 'John', age: undefined },
        { xmlDecl: false },
      );

      assert.ok(xml.includes('<name>John</name>'));
      assert.ok(!xml.includes('<age>'));
    });
  });

  describe('XML Declaration', () => {
    it('should include XML declaration by default', () => {
      const schema = {
        element: [{ name: 'Data', type: 'DataType' }],
        complexType: [{ name: 'DataType' }],
      } as const satisfies SchemaLike;

      const xml = buildXml(schema, {});

      assert.ok(xml.startsWith('<?xml version="1.0" encoding="utf-8"?>'));
    });

    it('should omit XML declaration when xmlDecl is false', () => {
      const schema = {
        element: [{ name: 'Data', type: 'DataType' }],
        complexType: [{ name: 'DataType' }],
      } as const satisfies SchemaLike;

      const xml = buildXml(schema, {}, { xmlDecl: false });

      assert.ok(!xml.includes('<?xml'));
    });

    it('should use custom encoding', () => {
      const schema = {
        element: [{ name: 'Data', type: 'DataType' }],
        complexType: [{ name: 'DataType' }],
      } as const satisfies SchemaLike;

      const xml = buildXml(schema, {}, { encoding: 'ISO-8859-1' });

      assert.ok(xml.includes('encoding="ISO-8859-1"'));
    });
  });

  describe('Namespace handling', () => {
    it('should add namespace declaration', () => {
      const schema = {
        targetNamespace: 'http://example.com/ns',
        element: [{ name: 'Data', type: 'DataType' }],
        complexType: [{ name: 'DataType' }],
      } as const satisfies SchemaLike;

      const xml = buildXml(schema, {}, { xmlDecl: false });

      assert.ok(xml.includes('xmlns="http://example.com/ns"'));
    });

    it('should use prefix from $xmlns declarations', () => {
      const schema = {
        targetNamespace: 'http://example.com/ns',
        $xmlns: {
          ex: 'http://example.com/ns',
        },
        element: [{ name: 'Data', type: 'DataType' }],
        complexType: [{ name: 'DataType' }],
      } as const satisfies SchemaLike;

      const xml = buildXml(schema, {}, { xmlDecl: false });

      assert.ok(xml.includes('xmlns:ex="http://example.com/ns"'));
      assert.ok(xml.includes('<ex:Data'));
    });

    it('should use custom prefix from options', () => {
      const schema = {
        targetNamespace: 'http://example.com/ns',
        element: [{ name: 'Data', type: 'DataType' }],
        complexType: [{ name: 'DataType' }],
      } as const satisfies SchemaLike;

      const xml = buildXml(schema, {}, { xmlDecl: false, prefix: 'custom' });

      assert.ok(xml.includes('xmlns:custom="http://example.com/ns"'));
      assert.ok(xml.includes('<custom:Data'));
    });

    it('should include additional $xmlns declarations', () => {
      const schema = {
        targetNamespace: 'http://example.com/ns',
        $xmlns: {
          tns: 'http://example.com/ns',
          other: 'http://other.com',
        },
        element: [{ name: 'Data', type: 'DataType' }],
        complexType: [{ name: 'DataType' }],
      } as const satisfies SchemaLike;

      const xml = buildXml(schema, {}, { xmlDecl: false });

      assert.ok(xml.includes('xmlns:other="http://other.com"'));
    });
  });

  describe('Attributes', () => {
    it('should build attributes', () => {
      const schema = {
        element: [{ name: 'Person', type: 'PersonType' }],
        complexType: [
          {
            name: 'PersonType',
            attribute: [{ name: 'id', type: 'xs:string' }],
          },
        ],
      } as const satisfies SchemaLike;

      const xml = buildXml(schema, { id: '123' }, { xmlDecl: false });

      assert.ok(xml.includes('id="123"'));
    });

    it('should skip undefined attributes', () => {
      const schema = {
        element: [{ name: 'Person', type: 'PersonType' }],
        complexType: [
          {
            name: 'PersonType',
            attribute: [
              { name: 'id', type: 'xs:string' },
              { name: 'status', type: 'xs:string' },
            ],
          },
        ],
      } as const satisfies SchemaLike;

      const xml = buildXml(schema, { id: '123' }, { xmlDecl: false });

      assert.ok(xml.includes('id="123"'));
      assert.ok(!xml.includes('status='));
    });
  });

  describe('Type formatting', () => {
    it('should format boolean values', () => {
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

      const xml = buildXml(
        schema,
        { active: true, enabled: false },
        { xmlDecl: false },
      );

      assert.ok(xml.includes('<active>true</active>'));
      assert.ok(xml.includes('<enabled>false</enabled>'));
    });

    it('should format Date values', () => {
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

      const date = new Date('2024-01-15T10:30:00Z');
      const xml = buildXml(
        schema,
        { date, timestamp: date },
        { xmlDecl: false },
      );

      assert.ok(xml.includes('<date>2024-01-15</date>'));
      assert.ok(
        xml.includes('<timestamp>2024-01-15T10:30:00.000Z</timestamp>'),
      );
    });

    it('should format numbers', () => {
      const schema = {
        element: [{ name: 'Data', type: 'DataType' }],
        complexType: [
          {
            name: 'DataType',
            sequence: {
              element: [{ name: 'count', type: 'xs:int' }],
            },
          },
        ],
      } as const satisfies SchemaLike;

      const xml = buildXml(schema, { count: 42 }, { xmlDecl: false });

      assert.ok(xml.includes('<count>42</count>'));
    });
  });

  describe('Arrays', () => {
    it('should build array elements', () => {
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

      const xml = buildXml(
        schema,
        { item: ['a', 'b', 'c'] },
        { xmlDecl: false },
      );

      assert.ok(xml.includes('<item>a</item>'));
      assert.ok(xml.includes('<item>b</item>'));
      assert.ok(xml.includes('<item>c</item>'));
    });

    it('should build arrays of complex types', () => {
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

      const xml = buildXml(
        schema,
        {
          item: [
            { sku: 'A1', qty: 2 },
            { sku: 'B2', qty: 3 },
          ],
        },
        { xmlDecl: false },
      );

      assert.ok(xml.includes('<sku>A1</sku>'));
      assert.ok(xml.includes('<qty>2</qty>'));
      assert.ok(xml.includes('<sku>B2</sku>'));
      assert.ok(xml.includes('<qty>3</qty>'));
    });
  });

  describe('Nested types', () => {
    it('should build nested complex types', () => {
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

      const xml = buildXml(
        schema,
        { customer: { name: 'John' } },
        { xmlDecl: false },
      );

      assert.ok(xml.includes('<customer>'));
      assert.ok(xml.includes('<name>John</name>'));
      assert.ok(xml.includes('</customer>'));
    });
  });

  describe('Choice and All groups', () => {
    it('should build choice elements', () => {
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

      const xml = buildXml(schema, { optionA: 'selected' }, { xmlDecl: false });

      assert.ok(xml.includes('<optionA>selected</optionA>'));
      assert.ok(!xml.includes('<optionB>'));
    });

    it('should build all elements', () => {
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

      const xml = buildXml(
        schema,
        { field1: 'a', field2: 'b' },
        { xmlDecl: false },
      );

      assert.ok(xml.includes('<field1>a</field1>'));
      assert.ok(xml.includes('<field2>b</field2>'));
    });
  });

  describe('Type inheritance', () => {
    it('should build inherited fields', () => {
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

      const xml = buildXml(
        schema,
        { name: 'John', department: 'Engineering' },
        { xmlDecl: false },
      );

      assert.ok(xml.includes('<name>John</name>'));
      assert.ok(xml.includes('<department>Engineering</department>'));
    });

    it('should build inherited attributes', () => {
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

      const xml = buildXml(
        schema,
        { id: 'P1', empId: 'E1' },
        { xmlDecl: false },
      );

      assert.ok(xml.includes('id="P1"'));
      assert.ok(xml.includes('empId="E1"'));
    });
  });

  describe('Pretty printing', () => {
    it('should format XML with indentation when pretty is true', () => {
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

      const xml = buildXml(
        schema,
        { name: 'John' },
        { xmlDecl: false, pretty: true },
      );

      assert.ok(xml.includes('\n'));
      assert.ok(xml.includes('  ')); // indentation
    });
  });

  describe('Element matching', () => {
    it('should auto-detect element type from data structure', () => {
      const schema = {
        element: [
          { name: 'Person', type: 'PersonType' },
          { name: 'Company', type: 'CompanyType' },
        ],
        complexType: [
          {
            name: 'PersonType',
            sequence: {
              element: [{ name: 'name', type: 'xs:string' }],
            },
          },
          {
            name: 'CompanyType',
            sequence: {
              element: [{ name: 'companyName', type: 'xs:string' }],
            },
          },
        ],
      } as const satisfies SchemaLike;

      const xml = buildXml(schema, { companyName: 'Acme' }, { xmlDecl: false });

      assert.ok(xml.includes('<Company'));
      assert.ok(xml.includes('<companyName>Acme</companyName>'));
    });
  });

  describe('Object-format complexType', () => {
    it('should handle complexType as object', () => {
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

      const xml = buildXml(schema, { name: 'Bob' }, { xmlDecl: false });

      assert.ok(xml.includes('<name>Bob</name>'));
    });
  });

  describe('Error handling', () => {
    it('should throw when no element declarations', () => {
      const schema = {
        element: [],
        complexType: [],
      } as const satisfies SchemaLike;

      assert.throws(() => {
        buildXml(schema, {});
      }, /no element declarations/);
    });

    it('should throw when complexType not found', () => {
      const schema = {
        element: [{ name: 'Person', type: 'PersonType' }],
        complexType: [],
      } as const satisfies SchemaLike;

      assert.throws(() => {
        buildXml(schema, {});
      }, /missing complexType/);
    });
  });

  describe('Substitution groups', () => {
    it('should build elements that substitute for abstract element', () => {
      // Simulates abapGit scenario:
      // - asx:Schema is abstract
      // - DD01V substitutes for asx:Schema
      // - values element contains Schema (abstract) which should be built as DD01V
      const asxSchema = {
        targetNamespace: 'http://www.sap.com/abapxml',
        element: [
          { name: 'Schema', abstract: true },
          { name: 'abap', type: 'AbapType' },
        ],
        complexType: [
          {
            name: 'AbapType',
            sequence: {
              element: [{ name: 'values', type: 'AbapValuesType' }],
            },
            attribute: [{ name: 'version', type: 'xs:string' }],
          },
          {
            name: 'AbapValuesType',
            sequence: {
              element: [
                { ref: 'Schema', minOccurs: '0', maxOccurs: 'unbounded' },
              ],
            },
          },
        ],
      } as const satisfies SchemaLike;

      const domaSchema = {
        element: [
          { name: 'DD01V', type: 'Dd01vType', substitutionGroup: 'Schema' },
        ],
        complexType: [
          {
            name: 'Dd01vType',
            sequence: {
              element: [{ name: 'DOMNAME', type: 'xs:string' }],
            },
          },
        ],
        $imports: [asxSchema],
      } as const satisfies SchemaLike;

      // Combined schema (like doma which includes asx)
      const combinedSchema = {
        ...domaSchema,
        $imports: [asxSchema],
      } as const satisfies SchemaLike;

      const data = {
        version: '1.0',
        values: {
          DD01V: { DOMNAME: 'ZTEST' },
        },
      };

      const xml = buildXml(combinedSchema, data, {
        rootElement: 'abap',
        xmlDecl: false,
      });

      // Should build DD01V element (substitute), not Schema (abstract)
      assert.ok(xml.includes('<abap'), `Expected <abap> but got: ${xml}`);
      assert.ok(xml.includes('<values>'), `Expected <values> but got: ${xml}`);
      assert.ok(
        xml.includes('<DD01V>'),
        `Expected <DD01V> (substitute) but got: ${xml}`,
      );
      assert.ok(
        xml.includes('<DOMNAME>ZTEST</DOMNAME>'),
        `Expected DOMNAME content but got: ${xml}`,
      );
      assert.ok(
        !xml.includes('<Schema>'),
        `Should NOT have abstract <Schema> element`,
      );
    });
  });

  describe('$imports support', () => {
    it('should find root element from $imports when not in main schema', () => {
      // Simulates abapGit scenario: doma.xsd includes abapgit.xsd
      // The root element "abapGit" is in abapgit.xsd, not doma.xsd
      const abapgitSchema = {
        element: [{ name: 'abapGit', type: 'AbapGitType' }],
        complexType: [
          {
            name: 'AbapGitType',
            sequence: {
              element: [
                { name: 'version', type: 'xs:string' },
                { name: 'content', type: 'xs:string' },
              ],
            },
          },
        ],
      } as const satisfies SchemaLike;

      const domaSchema = {
        element: [{ name: 'DD01V', type: 'Dd01vType' }],
        complexType: [
          {
            name: 'Dd01vType',
            sequence: {
              element: [{ name: 'DOMNAME', type: 'xs:string' }],
            },
          },
        ],
        $imports: [abapgitSchema],
      } as const satisfies SchemaLike;

      const data = {
        version: 'v1.0.0',
        content: 'test',
      };

      const xml = buildXml(domaSchema, data, { xmlDecl: false });

      // Should use abapGit as root element (from $imports), not DD01V
      assert.ok(xml.includes('<abapGit'), `Expected <abapGit> but got: ${xml}`);
      assert.ok(xml.includes('<version>v1.0.0</version>'));
      assert.ok(xml.includes('<content>test</content>'));
      assert.ok(xml.includes('</abapGit>'));
    });

    it('should prefer element from main schema when data matches both', () => {
      const importedSchema = {
        element: [{ name: 'Item', type: 'ItemType' }],
        complexType: [
          {
            name: 'ItemType',
            sequence: {
              element: [{ name: 'name', type: 'xs:string' }],
            },
          },
        ],
      } as const satisfies SchemaLike;

      const mainSchema = {
        element: [{ name: 'Product', type: 'ProductType' }],
        complexType: [
          {
            name: 'ProductType',
            sequence: {
              element: [{ name: 'name', type: 'xs:string' }],
            },
          },
        ],
        $imports: [importedSchema],
      } as const satisfies SchemaLike;

      const data = { name: 'Test' };

      const xml = buildXml(mainSchema, data, { xmlDecl: false });

      // Should prefer Product from main schema
      assert.ok(xml.includes('<Product'), `Expected <Product> but got: ${xml}`);
    });
  });

  describe('rootElement option with $imports', () => {
    it('should throw when rootElement not found in schema or $imports', () => {
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

      assert.throws(() => {
        buildXml(schema, { name: 'Test' }, { rootElement: 'NonExistent' });
      }, /Element 'NonExistent' not found in schema/);
    });

    it('should find rootElement in $imports', () => {
      const importedSchema = {
        element: [{ name: 'Item', type: 'ItemType' }],
        complexType: [
          {
            name: 'ItemType',
            sequence: {
              element: [{ name: 'id', type: 'xs:string' }],
            },
          },
        ],
      } as const satisfies SchemaLike;

      const mainSchema = {
        element: [],
        complexType: [],
        $imports: [importedSchema],
      } as const satisfies SchemaLike;

      const xml = buildXml(
        mainSchema,
        { id: '123' },
        { rootElement: 'Item', xmlDecl: false },
      );
      assert.ok(xml.includes('<Item'), `Expected <Item> but got: ${xml}`);
      assert.ok(xml.includes('<id>123</id>'));
    });
  });

  describe('pretty printing', () => {
    it('should format XML with pretty option', () => {
      const schema = {
        element: [{ name: 'Root', type: 'RootType' }],
        complexType: [
          {
            name: 'RootType',
            sequence: {
              element: [
                { name: 'child1', type: 'xs:string' },
                { name: 'child2', type: 'xs:string' },
              ],
            },
          },
        ],
      } as const satisfies SchemaLike;

      const xml = buildXml(
        schema,
        { child1: 'a', child2: 'b' },
        { pretty: true, xmlDecl: false },
      );
      // Pretty printed XML should have newlines
      assert.ok(xml.includes('\n'), 'Pretty XML should contain newlines');
    });
  });

  describe('encoding option', () => {
    it('should use custom encoding in XML declaration', () => {
      const schema = {
        element: [{ name: 'Root', type: 'RootType' }],
        complexType: [
          {
            name: 'RootType',
            sequence: {
              element: [{ name: 'value', type: 'xs:string' }],
            },
          },
        ],
      } as const satisfies SchemaLike;

      const xml = buildXml(
        schema,
        { value: 'test' },
        { encoding: 'ISO-8859-1' },
      );
      assert.ok(
        xml.includes('encoding="ISO-8859-1"'),
        `Expected ISO-8859-1 encoding but got: ${xml}`,
      );
    });
  });

  describe('element without type or complexType', () => {
    it('should throw when element has no type definition', () => {
      const schema = {
        element: [{ name: 'Root' }], // No type or complexType
        complexType: [],
      } as const satisfies SchemaLike;

      assert.throws(() => {
        buildXml(schema, {}, { rootElement: 'Root' });
      }, /has no type or inline complexType/);
    });
  });

  describe('array values', () => {
    it('should build multiple elements for array values', () => {
      const schema = {
        element: [{ name: 'Root', type: 'RootType' }],
        complexType: [
          {
            name: 'RootType',
            sequence: {
              element: [
                { name: 'item', type: 'xs:string', maxOccurs: 'unbounded' },
              ],
            },
          },
        ],
      } as const satisfies SchemaLike;

      const xml = buildXml(
        schema,
        { item: ['a', 'b', 'c'] },
        { xmlDecl: false },
      );
      assert.ok(xml.includes('<item>a</item>'));
      assert.ok(xml.includes('<item>b</item>'));
      assert.ok(xml.includes('<item>c</item>'));
    });

    it('should build array of complex elements', () => {
      const schema = {
        element: [{ name: 'Root', type: 'RootType' }],
        complexType: [
          {
            name: 'RootType',
            sequence: {
              element: [
                { name: 'person', type: 'PersonType', maxOccurs: 'unbounded' },
              ],
            },
          },
          {
            name: 'PersonType',
            sequence: {
              element: [{ name: 'name', type: 'xs:string' }],
            },
          },
        ],
      } as const satisfies SchemaLike;

      const xml = buildXml(
        schema,
        {
          person: [{ name: 'Alice' }, { name: 'Bob' }],
        },
        { xmlDecl: false },
      );

      assert.ok(xml.includes('<person><name>Alice</name></person>'));
      assert.ok(xml.includes('<person><name>Bob</name></person>'));
    });
  });

  describe('null and undefined handling', () => {
    it('should skip null attribute values', () => {
      const schema = {
        element: [{ name: 'Root', type: 'RootType' }],
        complexType: [
          {
            name: 'RootType',
            attribute: [{ name: 'id', type: 'xs:string' }],
          },
        ],
      } as const satisfies SchemaLike;

      const xml = buildXml(schema, { id: null }, { xmlDecl: false });
      assert.ok(!xml.includes('id='), 'Should not include null attribute');
    });

    it('should skip undefined element values', () => {
      const schema = {
        element: [{ name: 'Root', type: 'RootType' }],
        complexType: [
          {
            name: 'RootType',
            sequence: {
              element: [
                { name: 'required', type: 'xs:string' },
                { name: 'optional', type: 'xs:string' },
              ],
            },
          },
        ],
      } as const satisfies SchemaLike;

      const xml = buildXml(
        schema,
        { required: 'yes', optional: undefined },
        { xmlDecl: false },
      );
      assert.ok(xml.includes('<required>yes</required>'));
      assert.ok(
        !xml.includes('<optional'),
        'Should not include undefined element',
      );
    });
  });

  describe('Namespaced type references', () => {
    it('should build nested complex types with namespace prefix in type reference', () => {
      // This mirrors the atcRun schema structure that was failing
      const schema = {
        $xmlns: {
          atc: 'http://www.sap.com/adt/atc',
        },
        targetNamespace: 'http://www.sap.com/adt/atc',
        elementFormDefault: 'qualified',
        element: [{ name: 'run', type: 'atc:RunRequest' }],
        complexType: [
          {
            name: 'RunRequest',
            sequence: {
              element: [
                { name: 'objectSets', type: 'atc:ObjectSets', minOccurs: '1' },
              ],
            },
            attribute: [{ name: 'maximumVerdicts', type: 'xs:integer' }],
          },
          {
            name: 'ObjectSets',
            sequence: {
              element: [
                {
                  name: 'objectSet',
                  type: 'atc:ObjectSet',
                  maxOccurs: 'unbounded',
                },
              ],
            },
          },
          {
            name: 'ObjectSet',
            attribute: [{ name: 'kind', type: 'xs:string' }],
          },
        ],
      } as const satisfies SchemaLike;

      const data = {
        maximumVerdicts: 100,
        objectSets: {
          objectSet: [{ kind: 'inclusive' }],
        },
      };

      const xml = buildXml(schema, data, { xmlDecl: false });

      // Should contain the nested structure
      assert.ok(
        xml.includes('<atc:run'),
        'Should have root element with prefix',
      );
      assert.ok(xml.includes('maximumVerdicts="100"'), 'Should have attribute');
      assert.ok(
        xml.includes('<atc:objectSets'),
        'Should have objectSets element',
      );
      assert.ok(
        xml.includes('<atc:objectSet'),
        'Should have objectSet element',
      );
      assert.ok(xml.includes('kind="inclusive"'), 'Should have kind attribute');
    });

    it('should build schema with element ref to $imports schema', () => {
      // This is the exact pattern from atcRun schema that was failing
      // The issue: element with ref to imported schema
      const adtcoreSchema = {
        $xmlns: {
          adtcore: 'http://www.sap.com/adt/core',
        },
        targetNamespace: 'http://www.sap.com/adt/core',
        elementFormDefault: 'qualified',
        element: [
          { name: 'objectReferences', type: 'adtcore:ObjectReferences' },
        ],
        complexType: [
          {
            name: 'ObjectReferences',
            sequence: {
              element: [
                {
                  name: 'objectReference',
                  type: 'adtcore:ObjectReference',
                  maxOccurs: 'unbounded',
                },
              ],
            },
          },
          {
            name: 'ObjectReference',
            attribute: [{ name: 'uri', type: 'xs:string' }],
          },
        ],
      } as const satisfies SchemaLike;

      const atcSchema = {
        $xmlns: {
          xsd: 'http://www.w3.org/2001/XMLSchema',
          atc: 'http://www.sap.com/adt/atc',
          adtcore: 'http://www.sap.com/adt/core',
        },
        $imports: [adtcoreSchema],
        targetNamespace: 'http://www.sap.com/adt/atc',
        attributeFormDefault: 'unqualified',
        elementFormDefault: 'qualified',
        element: [{ name: 'run', type: 'atc:AtcRunRequest' }],
        complexType: [
          {
            name: 'AtcRunRequest',
            sequence: {
              element: [
                {
                  name: 'objectSets',
                  type: 'atc:AtcObjectSets',
                  minOccurs: '1',
                  maxOccurs: '1',
                },
              ],
            },
            attribute: [{ name: 'maximumVerdicts', type: 'xsd:integer' }],
          },
          {
            name: 'AtcObjectSets',
            sequence: {
              element: [
                {
                  name: 'objectSet',
                  type: 'atc:AtcObjectSetRequest',
                  minOccurs: '1',
                  maxOccurs: 'unbounded',
                },
              ],
            },
          },
          {
            name: 'AtcObjectSetRequest',
            sequence: {
              element: [
                {
                  ref: 'adtcore:objectReferences',
                  minOccurs: '0',
                  maxOccurs: '1',
                },
              ],
            },
            attribute: [{ name: 'kind', type: 'xsd:string' }],
          },
        ],
      } as const satisfies SchemaLike;

      const data = {
        maximumVerdicts: 100,
        objectSets: {
          objectSet: [
            {
              kind: 'inclusive',
              objectReferences: {
                objectReference: [
                  { uri: '/sap/bc/adt/cts/transportrequests/TEST123' },
                ],
              },
            },
          ],
        },
      };

      const xml = buildXml(atcSchema, data, { xmlDecl: false });

      // Should contain the full nested structure including ref element
      assert.ok(
        xml.includes('<atc:run'),
        'Should have root element with prefix',
      );
      assert.ok(xml.includes('maximumVerdicts="100"'), 'Should have attribute');
      assert.ok(
        xml.includes('<atc:objectSets'),
        'Should have objectSets element',
      );
      assert.ok(
        xml.includes('<atc:objectSet'),
        'Should have objectSet element',
      );
      assert.ok(xml.includes('kind="inclusive"'), 'Should have kind attribute');
      assert.ok(
        xml.includes('objectReferences') ||
          xml.includes('adtcore:objectReferences'),
        'Should have objectReferences element',
      );
      assert.ok(
        xml.includes('uri='),
        'Should have uri attribute on objectReference',
      );
    });

    it('should build deeply nested complex types', () => {
      const schema = {
        $xmlns: {
          ns: 'http://example.com/ns',
        },
        targetNamespace: 'http://example.com/ns',
        elementFormDefault: 'qualified',
        element: [{ name: 'root', type: 'ns:Level1' }],
        complexType: [
          {
            name: 'Level1',
            sequence: {
              element: [{ name: 'level2', type: 'ns:Level2' }],
            },
          },
          {
            name: 'Level2',
            sequence: {
              element: [{ name: 'level3', type: 'ns:Level3' }],
            },
          },
          {
            name: 'Level3',
            sequence: {
              element: [{ name: 'value', type: 'xs:string' }],
            },
          },
        ],
      } as const satisfies SchemaLike;

      const data = {
        level2: {
          level3: {
            value: 'deep',
          },
        },
      };

      const xml = buildXml(schema, data, { xmlDecl: false });

      assert.ok(xml.includes('<ns:root'), 'Should have root element');
      assert.ok(xml.includes('<ns:level2'), 'Should have level2 element');
      assert.ok(xml.includes('<ns:level3'), 'Should have level3 element');
      assert.ok(
        xml.includes('<ns:value>deep</ns:value>'),
        'Should have value element with content',
      );
    });
  });

  describe('Root element closing tag', () => {
    it('should never produce self-closing root element even when empty', () => {
      const schema = {
        targetNamespace: 'http://example.com',
        $xmlns: { ex: 'http://example.com' },
        element: [{ name: 'Empty', type: 'ex:EmptyType' }],
        complexType: [
          {
            name: 'EmptyType',
            attribute: [{ name: 'id', type: 'xs:string' }],
          },
        ],
      } as const satisfies SchemaLike;

      const xml = buildXml(schema, { id: 'test' }, { xmlDecl: false });

      // Root element should have explicit closing tag, not self-closing
      assert.ok(
        xml.includes('</ex:Empty>'),
        'Root element should have explicit closing tag',
      );
      assert.ok(!xml.includes('/>'), 'Root element should not be self-closing');
    });

    it('should produce explicit closing tag for root with only attributes', () => {
      const schema = {
        element: [{ name: 'Item', type: 'ItemType' }],
        complexType: [
          {
            name: 'ItemType',
            attribute: [
              { name: 'name', type: 'xs:string' },
              { name: 'value', type: 'xs:string' },
            ],
          },
        ],
      } as const satisfies SchemaLike;

      const xml = buildXml(
        schema,
        { name: 'test', value: '123' },
        { xmlDecl: false },
      );

      assert.ok(
        xml.includes('</Item>'),
        'Root element should have explicit closing tag',
      );
    });
  });

  describe('Inherited attribute namespace prefix', () => {
    it('should use base schema namespace prefix for inherited attributes', () => {
      // Base schema defines attributes in its namespace
      const baseSchema = {
        $xmlns: { base: 'http://example.com/base' },
        targetNamespace: 'http://example.com/base',
        attributeFormDefault: 'qualified',
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

      // Derived schema extends base type
      const derivedSchema = {
        $xmlns: {
          base: 'http://example.com/base',
          derived: 'http://example.com/derived',
        },
        $imports: [baseSchema],
        targetNamespace: 'http://example.com/derived',
        attributeFormDefault: 'qualified',
        element: [{ name: 'Derived', type: 'derived:DerivedType' }],
        complexType: [
          {
            name: 'DerivedType',
            complexContent: {
              extension: {
                base: 'base:BaseType',
                attribute: [{ name: 'extra', type: 'xs:string' }],
              },
            },
          },
        ],
      } as const satisfies SchemaLike;

      const xml = buildXml(
        derivedSchema,
        { id: '123', name: 'Test', extra: 'value' },
        { xmlDecl: false },
      );

      // Inherited attributes should use base namespace prefix
      assert.ok(
        xml.includes('base:id="123"'),
        'Inherited id attribute should use base: prefix',
      );
      assert.ok(
        xml.includes('base:name="Test"'),
        'Inherited name attribute should use base: prefix',
      );
      // Own attribute should use derived namespace prefix
      assert.ok(
        xml.includes('derived:extra="value"'),
        'Own extra attribute should use derived: prefix',
      );
    });
  });
});
