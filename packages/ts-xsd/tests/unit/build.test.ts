/**
 * XSD Builder Unit Tests
 *
 * Tests for buildXsd function covering all XSD constructs
 */

import { describe, test as it } from 'node:test';
import { strict as assert } from 'node:assert';
import { buildXsd, parseXsd, type Schema } from '../../src/xsd';

describe('buildXsd', () => {
  describe('BuildOptions', () => {
    it('should use default options', () => {
      const schema: Schema = {
        $xmlns: { xs: 'http://www.w3.org/2001/XMLSchema' },
        targetNamespace: 'http://example.com',
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('xmlns:xs='));
      assert.ok(xsd.includes('\n')); // pretty print by default
    });

    it('should use custom prefix for element names', () => {
      const schema: Schema = {
        $xmlns: { xsd: 'http://www.w3.org/2001/XMLSchema' },
        targetNamespace: 'http://example.com',
      };
      const xsd = buildXsd(schema, { prefix: 'xsd' });

      assert.ok(xsd.includes('xmlns:xsd='));
      assert.ok(xsd.includes('<xsd:schema'));
    });

    it('should disable pretty printing', () => {
      const schema: Schema = { targetNamespace: 'http://example.com' };
      const xsd = buildXsd(schema, { pretty: false });

      // Without pretty print, no newlines between elements
      assert.ok(!xsd.includes('\n  <'));
    });

    it('should use custom indent', () => {
      const schema: Schema = {
        targetNamespace: 'http://example.com',
        simpleType: [{ name: 'test', restriction: { base: 'xs:string' } }],
      };
      const xsd = buildXsd(schema, { indent: '    ' }); // 4 spaces

      assert.ok(xsd.includes('    <xs:simpleType'));
    });
  });

  describe('Schema attributes', () => {
    it('should build all schema attributes', () => {
      const schema: Schema = {
        id: 'schema-id',
        targetNamespace: 'http://example.com',
        version: '1.0',
        finalDefault: '#all',
        blockDefault: 'extension',
        attributeFormDefault: 'qualified',
        elementFormDefault: 'qualified',
        defaultAttributes: 'myAttrGroup',
        xpathDefaultNamespace: '##targetNamespace',
        'xml:lang': 'en',
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('id="schema-id"'));
      assert.ok(xsd.includes('targetNamespace="http://example.com"'));
      assert.ok(xsd.includes('version="1.0"'));
      assert.ok(xsd.includes('finalDefault="#all"'));
      assert.ok(xsd.includes('blockDefault="extension"'));
      assert.ok(xsd.includes('attributeFormDefault="qualified"'));
      assert.ok(xsd.includes('elementFormDefault="qualified"'));
      assert.ok(xsd.includes('defaultAttributes="myAttrGroup"'));
      assert.ok(xsd.includes('xpathDefaultNamespace="##targetNamespace"'));
      assert.ok(xsd.includes('xml:lang="en"'));
    });
  });

  describe('Include/Import/Redefine/Override', () => {
    it('should build include', () => {
      const schema: Schema = {
        include: [{ schemaLocation: 'other.xsd', id: 'inc1' }],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('<xs:include'));
      assert.ok(xsd.includes('schemaLocation="other.xsd"'));
      assert.ok(xsd.includes('id="inc1"'));
    });

    it('should build include with annotation', () => {
      const schema: Schema = {
        include: [
          {
            schemaLocation: 'other.xsd',
            annotation: { documentation: [{ _text: 'Include docs' }] },
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('<xs:include'));
      assert.ok(xsd.includes('<xs:annotation'));
      assert.ok(xsd.includes('Include docs'));
    });

    it('should build import', () => {
      const schema: Schema = {
        import: [
          {
            namespace: 'http://other.com',
            schemaLocation: 'other.xsd',
            id: 'imp1',
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('<xs:import'));
      assert.ok(xsd.includes('namespace="http://other.com"'));
      assert.ok(xsd.includes('schemaLocation="other.xsd"'));
    });

    it('should build redefine', () => {
      const schema: Schema = {
        redefine: [
          {
            schemaLocation: 'base.xsd',
            simpleType: [
              { name: 'myType', restriction: { base: 'xs:string' } },
            ],
            complexType: [{ name: 'myComplex' }],
            group: [{ name: 'myGroup' }],
            attributeGroup: [{ name: 'myAttrGroup' }],
            annotation: [{ documentation: [{ _text: 'Redefine docs' }] }],
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('<xs:redefine'));
      assert.ok(xsd.includes('schemaLocation="base.xsd"'));
      assert.ok(xsd.includes('<xs:simpleType'));
      assert.ok(xsd.includes('<xs:complexType'));
      assert.ok(xsd.includes('<xs:group'));
      assert.ok(xsd.includes('<xs:attributeGroup'));
    });

    it('should build override', () => {
      const schema: Schema = {
        override: [
          {
            schemaLocation: 'base.xsd',
            simpleType: [
              { name: 'myType', restriction: { base: 'xs:string' } },
            ],
            complexType: [{ name: 'myComplex' }],
            group: [{ name: 'myGroup' }],
            attributeGroup: [{ name: 'myAttrGroup' }],
            element: [{ name: 'myElement' }],
            attribute: [{ name: 'myAttr' }],
            notation: [{ name: 'myNotation', public: 'public-id' }],
            annotation: [{ documentation: [{ _text: 'Override docs' }] }],
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('<xs:override'));
      assert.ok(xsd.includes('schemaLocation="base.xsd"'));
    });
  });

  describe('SimpleType', () => {
    it('should build simpleType with restriction', () => {
      const schema: Schema = {
        simpleType: [
          {
            name: 'myString',
            id: 'st1',
            final: '#all',
            restriction: {
              base: 'xs:string',
              minLength: [{ value: '1' }],
              maxLength: [{ value: '100' }],
            },
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('<xs:simpleType'));
      assert.ok(xsd.includes('name="myString"'));
      assert.ok(xsd.includes('<xs:restriction'));
      assert.ok(xsd.includes('base="xs:string"'));
      assert.ok(xsd.includes('<xs:minLength'));
      assert.ok(xsd.includes('<xs:maxLength'));
    });

    it('should build simpleType with list', () => {
      const schema: Schema = {
        simpleType: [
          {
            name: 'myList',
            list: {
              itemType: 'xs:string',
              annotation: { documentation: [{ _text: 'List docs' }] },
            },
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('<xs:list'));
      assert.ok(xsd.includes('itemType="xs:string"'));
    });

    it('should build simpleType with list and inline simpleType', () => {
      const schema: Schema = {
        simpleType: [
          {
            name: 'myList',
            list: {
              simpleType: { restriction: { base: 'xs:integer' } },
            },
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('<xs:list'));
      assert.ok(xsd.includes('<xs:simpleType'));
    });

    it('should build simpleType with union', () => {
      const schema: Schema = {
        simpleType: [
          {
            name: 'myUnion',
            union: {
              memberTypes: 'xs:string xs:integer',
              annotation: { documentation: [{ _text: 'Union docs' }] },
            },
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('<xs:union'));
      assert.ok(xsd.includes('memberTypes="xs:string xs:integer"'));
    });

    it('should build simpleType with union and inline simpleTypes', () => {
      const schema: Schema = {
        simpleType: [
          {
            name: 'myUnion',
            union: {
              simpleType: [
                { restriction: { base: 'xs:string' } },
                { restriction: { base: 'xs:integer' } },
              ],
            },
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('<xs:union'));
      // Should have two nested simpleTypes
      const matches = xsd.match(/<xs:simpleType/g);
      assert.ok(matches && matches.length >= 3); // 1 top-level + 2 inline
    });

    it('should build all facets', () => {
      const schema: Schema = {
        simpleType: [
          {
            name: 'allFacets',
            restriction: {
              base: 'xs:decimal',
              minExclusive: [{ value: '0' }],
              minInclusive: [{ value: '1' }],
              maxExclusive: [{ value: '100' }],
              maxInclusive: [{ value: '99' }],
              totalDigits: [{ value: '5' }],
              fractionDigits: [{ value: '2' }],
              length: [{ value: '10' }],
              enumeration: [{ value: 'A' }, { value: 'B' }],
              whiteSpace: [{ value: 'collapse' }],
              pattern: [{ value: '[A-Z]+' }],
              assertion: [{ test: '$value > 0' }],
              explicitTimezone: [{ value: 'required' }],
            },
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('<xs:minExclusive'));
      assert.ok(xsd.includes('<xs:minInclusive'));
      assert.ok(xsd.includes('<xs:maxExclusive'));
      assert.ok(xsd.includes('<xs:maxInclusive'));
      assert.ok(xsd.includes('<xs:totalDigits'));
      assert.ok(xsd.includes('<xs:fractionDigits'));
      assert.ok(xsd.includes('<xs:length'));
      assert.ok(xsd.includes('<xs:enumeration'));
      assert.ok(xsd.includes('<xs:whiteSpace'));
      assert.ok(xsd.includes('<xs:pattern'));
      assert.ok(xsd.includes('<xs:assert'));
      assert.ok(xsd.includes('<xs:explicitTimezone'));
    });

    it('should build facet with annotation', () => {
      const schema: Schema = {
        simpleType: [
          {
            name: 'annotatedFacet',
            restriction: {
              base: 'xs:string',
              enumeration: [
                {
                  value: 'A',
                  id: 'enum-a',
                  fixed: true,
                  annotation: { documentation: [{ _text: 'Value A' }] },
                },
              ],
            },
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('id="enum-a"'));
      assert.ok(xsd.includes('fixed="true"'));
      assert.ok(xsd.includes('Value A'));
    });

    it('should build pattern with annotation', () => {
      const schema: Schema = {
        simpleType: [
          {
            name: 'patternType',
            restriction: {
              base: 'xs:string',
              pattern: [
                {
                  value: '[A-Z]+',
                  id: 'pat1',
                  annotation: { documentation: [{ _text: 'Pattern docs' }] },
                },
              ],
            },
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('<xs:pattern'));
      assert.ok(xsd.includes('id="pat1"'));
    });

    it('should build restriction with inline simpleType', () => {
      const schema: Schema = {
        simpleType: [
          {
            name: 'derivedType',
            restriction: {
              simpleType: { restriction: { base: 'xs:string' } },
              minLength: [{ value: '1' }],
            },
          },
        ],
      };
      const xsd = buildXsd(schema);

      // Should have nested simpleType inside restriction
      assert.ok(xsd.includes('<xs:restriction'));
    });
  });

  describe('ComplexType', () => {
    it('should build complexType with simpleContent extension', () => {
      const schema: Schema = {
        complexType: [
          {
            name: 'myType',
            simpleContent: {
              extension: {
                base: 'xs:string',
                attribute: [{ name: 'attr1', type: 'xs:string' }],
                attributeGroup: [{ ref: 'myAttrGroup' }],
                anyAttribute: { namespace: '##any' },
                assert: [{ test: '$value != ""' }],
              },
            },
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('<xs:simpleContent'));
      assert.ok(xsd.includes('<xs:extension'));
      assert.ok(xsd.includes('base="xs:string"'));
      assert.ok(xsd.includes('<xs:attribute'));
      assert.ok(xsd.includes('<xs:attributeGroup'));
      assert.ok(xsd.includes('<xs:anyAttribute'));
      assert.ok(xsd.includes('<xs:assert'));
    });

    it('should build complexType with simpleContent restriction', () => {
      const schema: Schema = {
        complexType: [
          {
            name: 'myType',
            simpleContent: {
              restriction: {
                base: 'xs:string',
                simpleType: { restriction: { base: 'xs:token' } },
                minLength: [{ value: '1' }],
                attribute: [{ name: 'attr1' }],
                attributeGroup: [{ ref: 'myAttrGroup' }],
                anyAttribute: { namespace: '##other' },
                assert: [{ test: 'true()' }],
              },
            },
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('<xs:simpleContent'));
      assert.ok(xsd.includes('<xs:restriction'));
    });

    it('should build complexType with complexContent extension', () => {
      const schema: Schema = {
        complexType: [
          {
            name: 'myType',
            complexContent: {
              mixed: true,
              extension: {
                base: 'baseType',
                openContent: {
                  mode: 'interleave',
                  any: { namespace: '##any' },
                },
                group: { ref: 'myGroup' },
                sequence: { element: [{ name: 'child' }] },
                attribute: [{ name: 'attr1' }],
                attributeGroup: [{ ref: 'myAttrGroup' }],
                anyAttribute: { namespace: '##any' },
                assert: [{ test: 'true()' }],
              },
            },
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('<xs:complexContent'));
      assert.ok(xsd.includes('mixed="true"'));
      assert.ok(xsd.includes('<xs:extension'));
      assert.ok(xsd.includes('<xs:openContent'));
      assert.ok(xsd.includes('<xs:group'));
      assert.ok(xsd.includes('<xs:sequence'));
    });

    it('should build complexType with complexContent restriction', () => {
      const schema: Schema = {
        complexType: [
          {
            name: 'myType',
            complexContent: {
              restriction: {
                base: 'baseType',
                openContent: { mode: 'suffix' },
                all: { element: [{ name: 'child' }] },
                choice: { element: [{ name: 'opt1' }] },
                attribute: [{ name: 'attr1' }],
                attributeGroup: [{ ref: 'myAttrGroup' }],
                anyAttribute: { namespace: '##local' },
                assert: [{ test: 'true()' }],
              },
            },
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('<xs:complexContent'));
      assert.ok(xsd.includes('<xs:restriction'));
      assert.ok(xsd.includes('<xs:all'));
      assert.ok(xsd.includes('<xs:choice'));
    });

    it('should build complexType with short form (no content model)', () => {
      const schema: Schema = {
        complexType: [
          {
            name: 'myType',
            mixed: true,
            abstract: true,
            final: '#all',
            block: 'extension',
            defaultAttributesApply: false,
            openContent: { mode: 'interleave' },
            group: { ref: 'myGroup' },
            all: { element: [{ name: 'child' }] },
            choice: { element: [{ name: 'opt1' }] },
            sequence: { element: [{ name: 'seq1' }] },
            attribute: [{ name: 'attr1' }],
            attributeGroup: [{ ref: 'myAttrGroup' }],
            anyAttribute: { namespace: '##any' },
            assert: [{ test: 'true()' }],
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('mixed="true"'));
      assert.ok(xsd.includes('abstract="true"'));
      assert.ok(xsd.includes('final="#all"'));
      assert.ok(xsd.includes('block="extension"'));
      assert.ok(xsd.includes('defaultAttributesApply="false"'));
    });

    it('should build local complexType', () => {
      const schema: Schema = {
        element: [
          {
            name: 'myElement',
            complexType: {
              mixed: true,
              sequence: { element: [{ name: 'child' }] },
            },
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('<xs:element'));
      assert.ok(xsd.includes('<xs:complexType'));
      assert.ok(xsd.includes('mixed="true"'));
    });
  });

  describe('Element', () => {
    it('should build top-level element with all attributes', () => {
      const schema: Schema = {
        element: [
          {
            name: 'myElement',
            id: 'el1',
            type: 'xs:string',
            substitutionGroup: 'baseElement',
            default: 'defaultValue',
            fixed: 'fixedValue',
            nillable: true,
            abstract: true,
            final: '#all',
            block: 'extension',
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('name="myElement"'));
      assert.ok(xsd.includes('id="el1"'));
      assert.ok(xsd.includes('type="xs:string"'));
      assert.ok(xsd.includes('substitutionGroup="baseElement"'));
      assert.ok(xsd.includes('default="defaultValue"'));
      assert.ok(xsd.includes('fixed="fixedValue"'));
      assert.ok(xsd.includes('nillable="true"'));
      assert.ok(xsd.includes('abstract="true"'));
      assert.ok(xsd.includes('final="#all"'));
      assert.ok(xsd.includes('block="extension"'));
    });

    it('should build element with inline simpleType', () => {
      const schema: Schema = {
        element: [
          {
            name: 'myElement',
            simpleType: { restriction: { base: 'xs:string' } },
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('<xs:element'));
      assert.ok(xsd.includes('<xs:simpleType'));
    });

    it('should build element with alternative', () => {
      const schema: Schema = {
        element: [
          {
            name: 'myElement',
            type: 'baseType',
            alternative: [
              { test: '@type="A"', type: 'typeA' },
              {
                test: '@type="B"',
                simpleType: { restriction: { base: 'xs:string' } },
              },
              { test: '@type="C"', complexType: { sequence: {} } },
            ],
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('<xs:alternative'));
      assert.ok(xsd.includes('test="@type='));
    });

    it('should build local element with all attributes', () => {
      const schema: Schema = {
        complexType: [
          {
            name: 'myType',
            sequence: {
              element: [
                {
                  name: 'child',
                  ref: 'otherElement',
                  type: 'xs:string',
                  minOccurs: '0',
                  maxOccurs: 'unbounded',
                  default: 'def',
                  fixed: 'fix',
                  nillable: true,
                  block: 'extension',
                  form: 'qualified',
                  targetNamespace: 'http://example.com',
                },
              ],
            },
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('minOccurs="0"'));
      assert.ok(xsd.includes('maxOccurs="unbounded"'));
      assert.ok(xsd.includes('form="qualified"'));
    });

    it('should build element with identity constraints', () => {
      const schema: Schema = {
        element: [
          {
            name: 'myElement',
            unique: [
              {
                name: 'uniqueConstraint',
                selector: { xpath: './/item' },
                field: [{ xpath: '@id' }],
              },
            ],
            key: [
              {
                name: 'keyConstraint',
                selector: { xpath: './/item' },
                field: [{ xpath: '@id' }, { xpath: '@name' }],
              },
            ],
            keyref: [
              {
                name: 'keyrefConstraint',
                refer: 'keyConstraint',
                selector: { xpath: './/ref' },
                field: [{ xpath: '@refId' }],
              },
            ],
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('<xs:unique'));
      assert.ok(xsd.includes('<xs:key'));
      assert.ok(xsd.includes('<xs:keyref'));
      assert.ok(xsd.includes('<xs:selector'));
      assert.ok(xsd.includes('<xs:field'));
      assert.ok(xsd.includes('refer="keyConstraint"'));
    });

    it('should build identity constraint with ref', () => {
      const schema: Schema = {
        element: [
          {
            name: 'myElement',
            unique: [{ name: 'u1', ref: 'otherUnique' }],
            key: [{ name: 'k1', ref: 'otherKey' }],
            keyref: [{ name: 'kr1', refer: 'k1', ref: 'otherKeyref' }],
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('ref="otherUnique"'));
      assert.ok(xsd.includes('ref="otherKey"'));
      assert.ok(xsd.includes('ref="otherKeyref"'));
    });

    it('should build selector and field with all attributes', () => {
      const schema: Schema = {
        element: [
          {
            name: 'myElement',
            unique: [
              {
                name: 'u1',
                selector: {
                  xpath: './/item',
                  id: 'sel1',
                  xpathDefaultNamespace: '##targetNamespace',
                  annotation: { documentation: [{ _text: 'Selector docs' }] },
                },
                field: [
                  {
                    xpath: '@id',
                    id: 'fld1',
                    xpathDefaultNamespace: '##local',
                    annotation: { documentation: [{ _text: 'Field docs' }] },
                  },
                ],
              },
            ],
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('xpathDefaultNamespace="##targetNamespace"'));
      assert.ok(xsd.includes('xpathDefaultNamespace="##local"'));
    });
  });

  describe('Attribute', () => {
    it('should build top-level attribute', () => {
      const schema: Schema = {
        attribute: [
          {
            name: 'myAttr',
            id: 'attr1',
            type: 'xs:string',
            default: 'defaultValue',
            fixed: 'fixedValue',
            inheritable: true,
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('<xs:attribute'));
      assert.ok(xsd.includes('name="myAttr"'));
      assert.ok(xsd.includes('inheritable="true"'));
    });

    it('should build attribute with inline simpleType', () => {
      const schema: Schema = {
        attribute: [
          {
            name: 'myAttr',
            simpleType: { restriction: { base: 'xs:string' } },
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('<xs:attribute'));
      assert.ok(xsd.includes('<xs:simpleType'));
    });

    it('should build local attribute with all attributes', () => {
      const schema: Schema = {
        complexType: [
          {
            name: 'myType',
            attribute: [
              {
                name: 'localAttr',
                ref: 'otherAttr',
                type: 'xs:string',
                use: 'required',
                default: 'def',
                fixed: 'fix',
                form: 'qualified',
                targetNamespace: 'http://example.com',
                inheritable: false,
              },
            ],
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('use="required"'));
      assert.ok(xsd.includes('form="qualified"'));
    });
  });

  describe('Groups', () => {
    it('should build named group with all', () => {
      const schema: Schema = {
        group: [
          {
            name: 'myGroup',
            id: 'grp1',
            all: {
              element: [{ name: 'child1' }, { name: 'child2' }],
              any: [{ namespace: '##any' }],
              group: [{ ref: 'otherGroup' }],
            },
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('<xs:group'));
      assert.ok(xsd.includes('name="myGroup"'));
      assert.ok(xsd.includes('<xs:all'));
    });

    it('should build named group with choice', () => {
      const schema: Schema = {
        group: [
          {
            name: 'myGroup',
            choice: {
              element: [{ name: 'opt1' }],
              group: [{ ref: 'otherGroup' }],
              choice: [{ element: [{ name: 'nested' }] }],
              sequence: [{ element: [{ name: 'seq' }] }],
              any: [{ namespace: '##other' }],
            },
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('<xs:choice'));
    });

    it('should build named group with sequence', () => {
      const schema: Schema = {
        group: [
          {
            name: 'myGroup',
            sequence: {
              element: [{ name: 'first' }, { name: 'second' }],
            },
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('<xs:sequence'));
    });

    it('should build group reference with occurs', () => {
      const schema: Schema = {
        complexType: [
          {
            name: 'myType',
            sequence: {
              group: [
                {
                  ref: 'myGroup',
                  id: 'grpRef1',
                  minOccurs: '0',
                  maxOccurs: '5',
                  annotation: { documentation: [{ _text: 'Group ref docs' }] },
                },
              ],
            },
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('ref="myGroup"'));
      assert.ok(xsd.includes('minOccurs="0"'));
      assert.ok(xsd.includes('maxOccurs="5"'));
    });

    it('should build explicit group with occurs', () => {
      const schema: Schema = {
        complexType: [
          {
            name: 'myType',
            sequence: {
              id: 'seq1',
              minOccurs: '1',
              maxOccurs: 'unbounded',
              annotation: { documentation: [{ _text: 'Sequence docs' }] },
              element: [{ name: 'child' }],
            },
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('id="seq1"'));
      assert.ok(xsd.includes('minOccurs="1"'));
      assert.ok(xsd.includes('maxOccurs="unbounded"'));
    });
  });

  describe('AttributeGroup', () => {
    it('should build named attributeGroup', () => {
      const schema: Schema = {
        attributeGroup: [
          {
            name: 'myAttrGroup',
            id: 'ag1',
            attribute: [{ name: 'attr1' }, { name: 'attr2' }],
            attributeGroup: [{ ref: 'otherAttrGroup' }],
            anyAttribute: { namespace: '##any', processContents: 'lax' },
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('<xs:attributeGroup'));
      assert.ok(xsd.includes('name="myAttrGroup"'));
      assert.ok(xsd.includes('<xs:anyAttribute'));
    });

    it('should build attributeGroup reference', () => {
      const schema: Schema = {
        complexType: [
          {
            name: 'myType',
            attributeGroup: [
              {
                ref: 'myAttrGroup',
                id: 'agRef1',
                annotation: {
                  documentation: [{ _text: 'AttrGroup ref docs' }],
                },
              },
            ],
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('ref="myAttrGroup"'));
    });
  });

  describe('Wildcards', () => {
    it('should build any with all attributes', () => {
      const schema: Schema = {
        complexType: [
          {
            name: 'myType',
            sequence: {
              any: [
                {
                  id: 'any1',
                  minOccurs: '0',
                  maxOccurs: 'unbounded',
                  namespace: '##other',
                  processContents: 'lax',
                  notNamespace: 'http://excluded.com',
                  notQName: 'excluded:element',
                  annotation: { documentation: [{ _text: 'Any docs' }] },
                },
              ],
            },
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('<xs:any'));
      assert.ok(xsd.includes('namespace="##other"'));
      assert.ok(xsd.includes('processContents="lax"'));
      assert.ok(xsd.includes('notNamespace="http://excluded.com"'));
      assert.ok(xsd.includes('notQName="excluded:element"'));
    });

    it('should build anyAttribute with all attributes', () => {
      const schema: Schema = {
        complexType: [
          {
            name: 'myType',
            anyAttribute: {
              id: 'anyAttr1',
              namespace: '##local',
              processContents: 'strict',
              notNamespace: 'http://excluded.com',
              notQName: 'excluded:attr',
              annotation: { documentation: [{ _text: 'AnyAttribute docs' }] },
            },
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('<xs:anyAttribute'));
      assert.ok(xsd.includes('namespace="##local"'));
      assert.ok(xsd.includes('processContents="strict"'));
    });
  });

  describe('XSD 1.1 Features', () => {
    it('should build openContent', () => {
      const schema: Schema = {
        complexType: [
          {
            name: 'myType',
            openContent: {
              id: 'oc1',
              mode: 'interleave',
              annotation: { documentation: [{ _text: 'OpenContent docs' }] },
              any: { namespace: '##any' },
            },
            sequence: { element: [{ name: 'child' }] },
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('<xs:openContent'));
      assert.ok(xsd.includes('mode="interleave"'));
    });

    it('should build defaultOpenContent', () => {
      const schema: Schema = {
        defaultOpenContent: {
          id: 'doc1',
          appliesToEmpty: true,
          mode: 'suffix',
          annotation: { documentation: [{ _text: 'DefaultOpenContent docs' }] },
          any: { namespace: '##targetNamespace' },
        },
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('<xs:defaultOpenContent'));
      assert.ok(xsd.includes('appliesToEmpty="true"'));
      assert.ok(xsd.includes('mode="suffix"'));
    });

    it('should build assertion', () => {
      const schema: Schema = {
        complexType: [
          {
            name: 'myType',
            assert: [
              {
                id: 'assert1',
                test: '$value > 0',
                xpathDefaultNamespace: '##targetNamespace',
                annotation: { documentation: [{ _text: 'Assertion docs' }] },
              },
            ],
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('<xs:assert'));
      assert.ok(xsd.includes('test="$value &gt; 0"')); // XML escaped
      assert.ok(xsd.includes('xpathDefaultNamespace="##targetNamespace"'));
    });

    it('should build alternative with all attributes', () => {
      const schema: Schema = {
        element: [
          {
            name: 'myElement',
            alternative: [
              {
                id: 'alt1',
                test: '@type="special"',
                type: 'specialType',
                xpathDefaultNamespace: '##local',
                annotation: { documentation: [{ _text: 'Alternative docs' }] },
              },
            ],
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('<xs:alternative'));
      assert.ok(xsd.includes('test="@type='));
      assert.ok(xsd.includes('type="specialType"'));
    });
  });

  describe('Notation', () => {
    it('should build notation', () => {
      const schema: Schema = {
        notation: [
          {
            name: 'jpeg',
            id: 'not1',
            public: 'image/jpeg',
            system: 'viewer.exe',
            annotation: { documentation: [{ _text: 'JPEG notation' }] },
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('<xs:notation'));
      assert.ok(xsd.includes('name="jpeg"'));
      assert.ok(xsd.includes('public="image/jpeg"'));
      assert.ok(xsd.includes('system="viewer.exe"'));
    });
  });

  describe('Annotation', () => {
    it('should build annotation with documentation', () => {
      const schema: Schema = {
        annotation: [
          {
            id: 'ann1',
            documentation: [
              {
                source: 'http://docs.example.com',
                'xml:lang': 'en',
                _text: 'Documentation text',
              },
            ],
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('<xs:annotation'));
      assert.ok(xsd.includes('id="ann1"'));
      assert.ok(xsd.includes('<xs:documentation'));
      assert.ok(xsd.includes('source="http://docs.example.com"'));
      assert.ok(xsd.includes('xml:lang="en"'));
      assert.ok(xsd.includes('Documentation text'));
    });

    it('should build annotation with appinfo', () => {
      const schema: Schema = {
        annotation: [
          {
            appinfo: [
              {
                source: 'http://tools.example.com',
                _text: 'Tool-specific info',
              },
            ],
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('<xs:appinfo'));
      assert.ok(xsd.includes('source="http://tools.example.com"'));
      assert.ok(xsd.includes('Tool-specific info'));
    });

    it('should build empty documentation', () => {
      const schema: Schema = {
        annotation: [
          {
            documentation: [{ source: 'http://example.com' }],
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('<xs:documentation'));
      assert.ok(xsd.includes('/>') || xsd.includes('</xs:documentation>'));
    });

    it('should build empty appinfo', () => {
      const schema: Schema = {
        annotation: [
          {
            appinfo: [{ source: 'http://example.com' }],
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('<xs:appinfo'));
    });
  });

  describe('XML escaping', () => {
    it('should escape special characters in attribute values', () => {
      const schema: Schema = {
        annotation: [
          {
            documentation: [
              {
                _text: 'Text with <special> & "characters" and \'quotes\'',
              },
            ],
          },
        ],
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('&lt;special&gt;'));
      assert.ok(xsd.includes('&amp;'));
      assert.ok(xsd.includes('&quot;characters&quot;'));
      assert.ok(xsd.includes('&apos;quotes&apos;'));
    });
  });

  describe('$xmlns declarations', () => {
    it('should output xmlns from schema.$xmlns', () => {
      const schema: Schema = {
        $xmlns: {
          xs: 'http://www.w3.org/2001/XMLSchema',
          tns: 'http://example.com/order',
        },
        targetNamespace: 'http://example.com/order',
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('xmlns:xs="http://www.w3.org/2001/XMLSchema"'));
      assert.ok(xsd.includes('xmlns:tns="http://example.com/order"'));
    });

    it('should output default namespace (empty prefix)', () => {
      const schema: Schema = {
        $xmlns: {
          '': 'http://www.w3.org/2001/XMLSchema',
          tns: 'http://example.com/order',
        },
        targetNamespace: 'http://example.com/order',
      };
      const xsd = buildXsd(schema);

      assert.ok(xsd.includes('xmlns="http://www.w3.org/2001/XMLSchema"'));
      assert.ok(xsd.includes('xmlns:tns="http://example.com/order"'));
    });

    it('should not add xmlns when not present in schema', () => {
      const schema: Schema = {
        targetNamespace: 'http://example.com',
      };
      const xsd = buildXsd(schema);

      // No xmlns should be added if not in schema
      assert.ok(!xsd.includes('xmlns:'));
      assert.ok(!xsd.includes('xmlns='));
    });

    it('should preserve $xmlns in roundtrip', () => {
      const original = `<?xml version="1.0"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
           xmlns:tns="http://example.com/order"
           targetNamespace="http://example.com/order">
  <xs:element name="Order" type="tns:OrderType"/>
</xs:schema>`;

      const parsed = parseXsd(original);
      const rebuilt = buildXsd(parsed);
      const reparsed = parseXsd(rebuilt);

      assert.deepEqual(reparsed.$xmlns, parsed.$xmlns);
      assert.equal(reparsed.$xmlns?.xs, 'http://www.w3.org/2001/XMLSchema');
      assert.equal(reparsed.$xmlns?.tns, 'http://example.com/order');
    });
  });
});
