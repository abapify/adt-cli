/**
 * XSD Parser Coverage Tests
 *
 * Tests for parseXsd function covering all XSD constructs not in XMLSchema.xsd
 *
 * NOTE: This test file uses non-null assertions (!) extensively because we're testing
 * parsed XSD results where we know the structure.
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { describe, test as it } from 'node:test';
import { strict as assert } from 'node:assert';
import { parseXsd } from '../../src/xsd';

describe('parseXsd coverage', () => {
  describe('Error handling', () => {
    it('should throw on invalid root element', () => {
      const xsd = `<?xml version="1.0"?><notSchema xmlns="http://www.w3.org/2001/XMLSchema"/>`;
      assert.throws(
        () => parseXsd(xsd),
        /Invalid XSD: root element must be xs:schema/,
      );
    });

    it('should throw on empty document', () => {
      const xsd = `<?xml version="1.0"?>`;
      assert.throws(() => parseXsd(xsd));
    });
  });

  describe('Schema attributes', () => {
    it('should parse all schema attributes', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
          id="schema-id"
          targetNamespace="http://example.com"
          version="1.0"
          finalDefault="#all"
          blockDefault="extension"
          attributeFormDefault="qualified"
          elementFormDefault="qualified"
          defaultAttributes="myAttrGroup"
          xpathDefaultNamespace="##targetNamespace"
          xml:lang="en">
        </xs:schema>`;
      const schema = parseXsd(xsd);

      assert.equal(schema.id, 'schema-id');
      assert.equal(schema.targetNamespace, 'http://example.com');
      assert.equal(schema.version, '1.0');
      assert.equal(schema.finalDefault, '#all');
      assert.equal(schema.blockDefault, 'extension');
      assert.equal(schema.attributeFormDefault, 'qualified');
      assert.equal(schema.elementFormDefault, 'qualified');
      assert.equal(schema.defaultAttributes, 'myAttrGroup');
      assert.equal(schema.xpathDefaultNamespace, '##targetNamespace');
      assert.equal(schema['xml:lang'], 'en');
    });
  });

  describe('Include/Import/Redefine/Override', () => {
    it('should parse include', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:include schemaLocation="other.xsd" id="inc1">
            <xs:annotation><xs:documentation>Include docs</xs:documentation></xs:annotation>
          </xs:include>
        </xs:schema>`;
      const schema = parseXsd(xsd);

      assert.ok(schema.include);
      assert.equal(schema.include![0].schemaLocation, 'other.xsd');
      assert.equal(schema.include![0].id, 'inc1');
      assert.ok(schema.include![0].annotation);
    });

    it('should parse redefine with all children', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:redefine schemaLocation="base.xsd" id="red1">
            <xs:annotation><xs:documentation>Redefine docs</xs:documentation></xs:annotation>
            <xs:simpleType name="myType">
              <xs:restriction base="xs:string"/>
            </xs:simpleType>
            <xs:complexType name="myComplex"/>
            <xs:group name="myGroup">
              <xs:sequence/>
            </xs:group>
            <xs:attributeGroup name="myAttrGroup"/>
          </xs:redefine>
        </xs:schema>`;
      const schema = parseXsd(xsd);

      assert.ok(schema.redefine);
      assert.equal(schema.redefine![0].schemaLocation, 'base.xsd');
      assert.ok(schema.redefine![0].annotation);
      assert.ok(schema.redefine![0].simpleType);
      assert.ok(schema.redefine![0].complexType);
      assert.ok(schema.redefine![0].group);
      assert.ok(schema.redefine![0].attributeGroup);
    });

    it('should parse override with all children', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:override schemaLocation="base.xsd" id="ovr1">
            <xs:annotation><xs:documentation>Override docs</xs:documentation></xs:annotation>
            <xs:simpleType name="myType">
              <xs:restriction base="xs:string"/>
            </xs:simpleType>
            <xs:complexType name="myComplex"/>
            <xs:group name="myGroup">
              <xs:sequence/>
            </xs:group>
            <xs:attributeGroup name="myAttrGroup"/>
            <xs:element name="myElement"/>
            <xs:attribute name="myAttr"/>
            <xs:notation name="myNotation" public="public-id"/>
          </xs:override>
        </xs:schema>`;
      const schema = parseXsd(xsd);

      assert.ok(schema.override);
      assert.equal(schema.override![0].schemaLocation, 'base.xsd');
      assert.ok(schema.override![0].annotation);
      assert.ok(schema.override![0].simpleType);
      assert.ok(schema.override![0].complexType);
      assert.ok(schema.override![0].group);
      assert.ok(schema.override![0].attributeGroup);
      assert.ok(schema.override![0].element);
      assert.ok(schema.override![0].attribute);
      assert.ok(schema.override![0].notation);
    });
  });

  describe('SimpleType', () => {
    it('should parse simpleType with list', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:simpleType name="myList">
            <xs:list itemType="xs:string" id="list1">
              <xs:annotation><xs:documentation>List docs</xs:documentation></xs:annotation>
            </xs:list>
          </xs:simpleType>
        </xs:schema>`;
      const schema = parseXsd(xsd);

      const st = schema.simpleType![0];
      assert.ok(st.list);
      assert.equal(st.list.itemType, 'xs:string');
      assert.equal(st.list.id, 'list1');
      assert.ok(st.list.annotation);
    });

    it('should parse simpleType with list and inline simpleType', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:simpleType name="myList">
            <xs:list>
              <xs:simpleType>
                <xs:restriction base="xs:integer"/>
              </xs:simpleType>
            </xs:list>
          </xs:simpleType>
        </xs:schema>`;
      const schema = parseXsd(xsd);

      const st = schema.simpleType![0];
      assert.ok(st.list);
      assert.ok(st.list.simpleType);
    });

    it('should parse simpleType with union', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:simpleType name="myUnion">
            <xs:union memberTypes="xs:string xs:integer" id="union1">
              <xs:annotation><xs:documentation>Union docs</xs:documentation></xs:annotation>
            </xs:union>
          </xs:simpleType>
        </xs:schema>`;
      const schema = parseXsd(xsd);

      const st = schema.simpleType![0];
      assert.ok(st.union);
      assert.equal(st.union.memberTypes, 'xs:string xs:integer');
      assert.equal(st.union.id, 'union1');
    });

    it('should parse simpleType with union and inline simpleTypes', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:simpleType name="myUnion">
            <xs:union>
              <xs:simpleType>
                <xs:restriction base="xs:string"/>
              </xs:simpleType>
              <xs:simpleType>
                <xs:restriction base="xs:integer"/>
              </xs:simpleType>
            </xs:union>
          </xs:simpleType>
        </xs:schema>`;
      const schema = parseXsd(xsd);

      const st = schema.simpleType![0];
      assert.ok(st.union);
      assert.ok(st.union.simpleType);
      assert.equal(st.union.simpleType.length, 2);
    });

    it('should parse all facets', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:simpleType name="allFacets">
            <xs:restriction base="xs:decimal">
              <xs:minExclusive value="0"/>
              <xs:minInclusive value="1"/>
              <xs:maxExclusive value="100"/>
              <xs:maxInclusive value="99"/>
              <xs:totalDigits value="5"/>
              <xs:fractionDigits value="2"/>
              <xs:length value="10"/>
              <xs:minLength value="1"/>
              <xs:maxLength value="100"/>
              <xs:enumeration value="A"/>
              <xs:enumeration value="B"/>
              <xs:whiteSpace value="collapse"/>
              <xs:pattern value="[A-Z]+"/>
              <xs:assertion test="$value > 0"/>
              <xs:explicitTimezone value="required"/>
            </xs:restriction>
          </xs:simpleType>
        </xs:schema>`;
      const schema = parseXsd(xsd);

      const r = schema.simpleType![0].restriction!;
      assert.ok(r.minExclusive);
      assert.ok(r.minInclusive);
      assert.ok(r.maxExclusive);
      assert.ok(r.maxInclusive);
      assert.ok(r.totalDigits);
      assert.ok(r.fractionDigits);
      assert.ok(r.length);
      assert.ok(r.minLength);
      assert.ok(r.maxLength);
      assert.ok(r.enumeration);
      assert.equal(r.enumeration.length, 2);
      assert.ok(r.whiteSpace);
      assert.ok(r.pattern);
      assert.ok(r.assertion);
      assert.ok(r.explicitTimezone);
    });

    it('should parse facet with all attributes', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:simpleType name="facetType">
            <xs:restriction base="xs:string">
              <xs:enumeration value="A" id="enum-a" fixed="true">
                <xs:annotation><xs:documentation>Value A</xs:documentation></xs:annotation>
              </xs:enumeration>
            </xs:restriction>
          </xs:simpleType>
        </xs:schema>`;
      const schema = parseXsd(xsd);

      const e = schema.simpleType![0].restriction!.enumeration![0];
      assert.equal(e.value, 'A');
      assert.equal(e.id, 'enum-a');
      assert.equal(e.fixed, true);
      assert.ok(e.annotation);
    });

    it('should parse pattern with annotation', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:simpleType name="patternType">
            <xs:restriction base="xs:string">
              <xs:pattern value="[A-Z]+" id="pat1">
                <xs:annotation><xs:documentation>Pattern docs</xs:documentation></xs:annotation>
              </xs:pattern>
            </xs:restriction>
          </xs:simpleType>
        </xs:schema>`;
      const schema = parseXsd(xsd);

      const p = schema.simpleType![0].restriction!.pattern![0];
      assert.equal(p.value, '[A-Z]+');
      assert.equal(p.id, 'pat1');
      assert.ok(p.annotation);
    });

    it('should parse restriction with inline simpleType', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:simpleType name="derivedType">
            <xs:restriction>
              <xs:simpleType>
                <xs:restriction base="xs:string"/>
              </xs:simpleType>
              <xs:minLength value="1"/>
            </xs:restriction>
          </xs:simpleType>
        </xs:schema>`;
      const schema = parseXsd(xsd);

      const r = schema.simpleType![0].restriction!;
      assert.ok(r.simpleType);
    });
  });

  describe('ComplexType', () => {
    it('should parse complexType with simpleContent extension', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:complexType name="myType">
            <xs:simpleContent>
              <xs:extension base="xs:string" id="ext1">
                <xs:annotation><xs:documentation>Extension docs</xs:documentation></xs:annotation>
                <xs:attribute name="attr1" type="xs:string"/>
                <xs:attributeGroup ref="myAttrGroup"/>
                <xs:anyAttribute namespace="##any"/>
                <xs:assert test="$value != ''"/>
              </xs:extension>
            </xs:simpleContent>
          </xs:complexType>
        </xs:schema>`;
      const schema = parseXsd(xsd);

      const ct = schema.complexType![0];
      assert.ok(ct.simpleContent);
      assert.ok(ct.simpleContent.extension);
      assert.equal(ct.simpleContent.extension.base, 'xs:string');
      assert.ok(ct.simpleContent.extension.attribute);
      assert.ok(ct.simpleContent.extension.attributeGroup);
      assert.ok(ct.simpleContent.extension.anyAttribute!);
      assert.ok(ct.simpleContent.extension.assert);
    });

    it('should parse complexType with simpleContent restriction', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:complexType name="myType">
            <xs:simpleContent>
              <xs:restriction base="baseType" id="restr1">
                <xs:annotation><xs:documentation>Restriction docs</xs:documentation></xs:annotation>
                <xs:simpleType>
                  <xs:restriction base="xs:token"/>
                </xs:simpleType>
                <xs:minLength value="1"/>
                <xs:pattern value="[A-Z]+"/>
                <xs:assertion test="true()"/>
                <xs:attribute name="attr1"/>
                <xs:attributeGroup ref="myAttrGroup"/>
                <xs:anyAttribute namespace="##other"/>
                <xs:assert test="true()"/>
              </xs:restriction>
            </xs:simpleContent>
          </xs:complexType>
        </xs:schema>`;
      const schema = parseXsd(xsd);

      const ct = schema.complexType![0];
      assert.ok(ct.simpleContent);
      assert.ok(ct.simpleContent.restriction);
      assert.ok(ct.simpleContent.restriction!.simpleType);
      assert.ok(ct.simpleContent.restriction!.minLength);
      assert.ok(ct.simpleContent.restriction!.pattern);
      assert.ok(ct.simpleContent.restriction!.assertion);
      assert.ok(ct.simpleContent.restriction!.attribute);
      assert.ok(ct.simpleContent.restriction!.attributeGroup);
      assert.ok(ct.simpleContent.restriction!.anyAttribute!);
      assert.ok(ct.simpleContent.restriction!.assert);
    });

    it('should parse complexType with complexContent mixed', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:complexType name="myType">
            <xs:complexContent mixed="true" id="cc1">
              <xs:annotation><xs:documentation>ComplexContent docs</xs:documentation></xs:annotation>
              <xs:extension base="baseType"/>
            </xs:complexContent>
          </xs:complexType>
        </xs:schema>`;
      const schema = parseXsd(xsd);

      const ct = schema.complexType![0];
      assert.ok(ct.complexContent);
      assert.equal(ct.complexContent.mixed, true);
      assert.equal(ct.complexContent.id, 'cc1');
    });

    it('should parse complexType with openContent', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:complexType name="myType">
            <xs:openContent mode="interleave" id="oc1">
              <xs:annotation><xs:documentation>OpenContent docs</xs:documentation></xs:annotation>
              <xs:any namespace="##any"/>
            </xs:openContent>
            <xs:sequence>
              <xs:element name="child"/>
            </xs:sequence>
          </xs:complexType>
        </xs:schema>`;
      const schema = parseXsd(xsd);

      const ct = schema.complexType![0];
      assert.ok(ct.openContent);
      assert.equal(ct.openContent.mode, 'interleave');
      assert.ok(ct.openContent.any);
    });

    it('should parse complexType with group ref', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:complexType name="myType">
            <xs:group ref="myGroup" minOccurs="0" maxOccurs="unbounded" id="grpRef1">
              <xs:annotation><xs:documentation>Group ref docs</xs:documentation></xs:annotation>
            </xs:group>
          </xs:complexType>
        </xs:schema>`;
      const schema = parseXsd(xsd);

      const ct = schema.complexType![0];
      assert.ok(ct.group);
      assert.equal(ct.group.ref, 'myGroup');
      assert.equal(ct.group.minOccurs, '0');
      assert.equal(ct.group.maxOccurs, 'unbounded');
    });

    it('should parse complexType with all', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:complexType name="myType">
            <xs:all minOccurs="0" maxOccurs="1" id="all1">
              <xs:annotation><xs:documentation>All docs</xs:documentation></xs:annotation>
              <xs:element name="child1"/>
              <xs:element name="child2"/>
              <xs:any namespace="##any"/>
              <xs:group ref="myGroup"/>
            </xs:all>
          </xs:complexType>
        </xs:schema>`;
      const schema = parseXsd(xsd);

      const ct = schema.complexType![0];
      assert.ok(ct.all);
      assert.equal(ct.all!.minOccurs, '0');
      assert.ok(ct.all!.element);
      assert.ok(ct.all!.any);
      assert.ok(ct.all!.group);
    });

    it('should parse complexType with choice', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:complexType name="myType">
            <xs:choice minOccurs="0" maxOccurs="unbounded" id="choice1">
              <xs:element name="opt1"/>
              <xs:group ref="myGroup"/>
              <xs:choice>
                <xs:element name="nested"/>
              </xs:choice>
              <xs:sequence>
                <xs:element name="seq"/>
              </xs:sequence>
              <xs:any namespace="##other"/>
            </xs:choice>
          </xs:complexType>
        </xs:schema>`;
      const schema = parseXsd(xsd);

      const ct = schema.complexType![0];
      assert.ok(ct.choice);
      assert.ok(ct.choice!.element);
      assert.ok(ct.choice!.group);
      assert.ok(ct.choice!.choice);
      assert.ok(ct.choice!.sequence);
      assert.ok(ct.choice!.any);
    });

    it('should parse complexType with assert', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:complexType name="myType">
            <xs:sequence>
              <xs:element name="child"/>
            </xs:sequence>
            <xs:assert test="$value > 0" id="assert1" xpathDefaultNamespace="##targetNamespace">
              <xs:annotation><xs:documentation>Assertion docs</xs:documentation></xs:annotation>
            </xs:assert>
          </xs:complexType>
        </xs:schema>`;
      const schema = parseXsd(xsd);

      const ct = schema.complexType![0];
      assert.ok(ct.assert);
      assert.equal(ct.assert[0].test, '$value > 0');
      assert.equal(ct.assert[0].xpathDefaultNamespace, '##targetNamespace');
    });

    it('should parse local complexType', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:element name="myElement">
            <xs:complexType mixed="true" id="localCT">
              <xs:annotation><xs:documentation>Local CT docs</xs:documentation></xs:annotation>
              <xs:sequence>
                <xs:element name="child"/>
              </xs:sequence>
            </xs:complexType>
          </xs:element>
        </xs:schema>`;
      const schema = parseXsd(xsd);

      const el = schema.element![0];
      assert.ok(el.complexType);
      assert.equal(el.complexType.mixed, true);
      assert.equal(el.complexType.id, 'localCT');
    });
  });

  describe('Element', () => {
    it('should parse element with all attributes', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:element name="myElement"
            id="el1"
            type="xs:string"
            substitutionGroup="baseElement"
            default="defaultValue"
            fixed="fixedValue"
            nillable="true"
            abstract="true"
            final="#all"
            block="extension">
            <xs:annotation><xs:documentation>Element docs</xs:documentation></xs:annotation>
          </xs:element>
        </xs:schema>`;
      const schema = parseXsd(xsd);

      const el = schema.element![0];
      assert.equal(el.name, 'myElement');
      assert.equal(el.id, 'el1');
      assert.equal(el.type, 'xs:string');
      assert.equal(el.substitutionGroup, 'baseElement');
      assert.equal(el.default, 'defaultValue');
      assert.equal(el.fixed, 'fixedValue');
      assert.equal(el.nillable, true);
      assert.equal(el.abstract, true);
      assert.equal(el.final, '#all');
      assert.equal(el.block, 'extension');
    });

    it('should parse element with inline simpleType', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:element name="myElement">
            <xs:simpleType>
              <xs:restriction base="xs:string"/>
            </xs:simpleType>
          </xs:element>
        </xs:schema>`;
      const schema = parseXsd(xsd);

      const el = schema.element![0];
      assert.ok(el.simpleType);
    });

    it('should parse element with alternative', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:element name="myElement" type="baseType">
            <xs:alternative test="@type='A'" type="typeA" id="alt1" xpathDefaultNamespace="##local">
              <xs:annotation><xs:documentation>Alternative docs</xs:documentation></xs:annotation>
            </xs:alternative>
            <xs:alternative test="@type='B'">
              <xs:simpleType>
                <xs:restriction base="xs:string"/>
              </xs:simpleType>
            </xs:alternative>
            <xs:alternative test="@type='C'">
              <xs:complexType>
                <xs:sequence/>
              </xs:complexType>
            </xs:alternative>
          </xs:element>
        </xs:schema>`;
      const schema = parseXsd(xsd);

      const el = schema.element![0];
      assert.ok(el.alternative);
      assert.equal(el.alternative.length, 3);
      assert.equal(el.alternative[0].type, 'typeA');
      assert.ok(el.alternative[1].simpleType);
      assert.ok(el.alternative[2].complexType);
    });

    it('should parse local element with all attributes', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:complexType name="myType">
            <xs:sequence>
              <xs:element name="child"
                id="child1"
                ref="otherElement"
                type="xs:string"
                minOccurs="0"
                maxOccurs="unbounded"
                default="def"
                fixed="fix"
                nillable="true"
                block="extension"
                form="qualified"
                targetNamespace="http://example.com">
                <xs:annotation><xs:documentation>Local element docs</xs:documentation></xs:annotation>
              </xs:element>
            </xs:sequence>
          </xs:complexType>
        </xs:schema>`;
      const schema = parseXsd(xsd);

      const el = schema.complexType![0].sequence!.element![0];
      assert.equal(el.minOccurs, '0');
      assert.equal(el.maxOccurs, 'unbounded');
      assert.equal(el.form, 'qualified');
      assert.equal(el.targetNamespace, 'http://example.com');
    });

    it('should parse element with identity constraints', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:element name="myElement">
            <xs:complexType>
              <xs:sequence>
                <xs:element name="item" maxOccurs="unbounded"/>
              </xs:sequence>
            </xs:complexType>
            <xs:unique name="uniqueConstraint" id="u1" ref="otherUnique">
              <xs:annotation><xs:documentation>Unique docs</xs:documentation></xs:annotation>
              <xs:selector xpath=".//item" id="sel1" xpathDefaultNamespace="##targetNamespace">
                <xs:annotation><xs:documentation>Selector docs</xs:documentation></xs:annotation>
              </xs:selector>
              <xs:field xpath="@id" id="fld1" xpathDefaultNamespace="##local">
                <xs:annotation><xs:documentation>Field docs</xs:documentation></xs:annotation>
              </xs:field>
            </xs:unique>
            <xs:key name="keyConstraint" id="k1" ref="otherKey">
              <xs:selector xpath=".//item"/>
              <xs:field xpath="@id"/>
              <xs:field xpath="@name"/>
            </xs:key>
            <xs:keyref name="keyrefConstraint" refer="keyConstraint" id="kr1" ref="otherKeyref">
              <xs:selector xpath=".//ref"/>
              <xs:field xpath="@refId"/>
            </xs:keyref>
          </xs:element>
        </xs:schema>`;
      const schema = parseXsd(xsd);

      const el = schema.element![0];
      assert.ok(el.unique);
      assert.equal(el.unique![0].name, 'uniqueConstraint');
      assert.equal(el.unique![0].ref, 'otherUnique');
      assert.ok(el.unique![0].selector);
      assert.ok(el.unique![0].field);

      assert.ok(el.key);
      assert.equal(el.key![0].name, 'keyConstraint');
      assert.equal(el.key![0].field!.length, 2);

      assert.ok(el.keyref);
      assert.equal(el.keyref![0].refer, 'keyConstraint');
    });

    it('should parse local element with identity constraints', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:complexType name="myType">
            <xs:sequence>
              <xs:element name="container">
                <xs:complexType>
                  <xs:sequence>
                    <xs:element name="item" maxOccurs="unbounded"/>
                  </xs:sequence>
                </xs:complexType>
                <xs:unique name="localUnique">
                  <xs:selector xpath="item"/>
                  <xs:field xpath="@id"/>
                </xs:unique>
                <xs:key name="localKey">
                  <xs:selector xpath="item"/>
                  <xs:field xpath="@id"/>
                </xs:key>
                <xs:keyref name="localKeyref" refer="localKey">
                  <xs:selector xpath="item"/>
                  <xs:field xpath="@ref"/>
                </xs:keyref>
                <xs:alternative test="@type='special'" type="specialType"/>
              </xs:element>
            </xs:sequence>
          </xs:complexType>
        </xs:schema>`;
      const schema = parseXsd(xsd);

      const el = schema.complexType![0].sequence!.element![0];
      assert.ok(el.unique);
      assert.ok(el.key);
      assert.ok(el.keyref);
      assert.ok(el.alternative);
    });
  });

  describe('Attribute', () => {
    it('should parse top-level attribute with all attributes', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:attribute name="myAttr"
            id="attr1"
            type="xs:string"
            default="defaultValue"
            fixed="fixedValue"
            inheritable="true">
            <xs:annotation><xs:documentation>Attribute docs</xs:documentation></xs:annotation>
          </xs:attribute>
        </xs:schema>`;
      const schema = parseXsd(xsd);

      const attr = schema.attribute![0];
      assert.equal(attr.name, 'myAttr');
      assert.equal(attr.id, 'attr1');
      assert.equal(attr.type, 'xs:string');
      assert.equal(attr.default, 'defaultValue');
      assert.equal(attr.fixed, 'fixedValue');
      assert.equal(attr.inheritable, true);
    });

    it('should parse attribute with inline simpleType', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:attribute name="myAttr">
            <xs:simpleType>
              <xs:restriction base="xs:string"/>
            </xs:simpleType>
          </xs:attribute>
        </xs:schema>`;
      const schema = parseXsd(xsd);

      const attr = schema.attribute![0];
      assert.ok(attr.simpleType);
    });

    it('should parse local attribute with all attributes', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:complexType name="myType">
            <xs:attribute name="localAttr"
              id="localAttr1"
              ref="otherAttr"
              type="xs:string"
              use="required"
              default="def"
              fixed="fix"
              form="qualified"
              targetNamespace="http://example.com"
              inheritable="false">
              <xs:annotation><xs:documentation>Local attr docs</xs:documentation></xs:annotation>
              <xs:simpleType>
                <xs:restriction base="xs:token"/>
              </xs:simpleType>
            </xs:attribute>
          </xs:complexType>
        </xs:schema>`;
      const schema = parseXsd(xsd);

      const attr = schema.complexType![0].attribute![0];
      assert.equal(attr.use, 'required');
      assert.equal(attr.form, 'qualified');
      assert.equal(attr.targetNamespace, 'http://example.com');
      assert.equal(attr.inheritable, false);
      assert.ok(attr.simpleType);
    });
  });

  describe('Groups', () => {
    it('should parse named group with all', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:group name="myGroup" id="grp1">
            <xs:annotation><xs:documentation>Group docs</xs:documentation></xs:annotation>
            <xs:all>
              <xs:element name="child1"/>
              <xs:element name="child2"/>
            </xs:all>
          </xs:group>
        </xs:schema>`;
      const schema = parseXsd(xsd);

      const grp = schema.group![0];
      assert.equal(grp.name, 'myGroup');
      assert.equal(grp.id, 'grp1');
      assert.ok(grp.all);
    });

    it('should parse named group with choice', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:group name="myGroup">
            <xs:choice>
              <xs:element name="opt1"/>
              <xs:element name="opt2"/>
            </xs:choice>
          </xs:group>
        </xs:schema>`;
      const schema = parseXsd(xsd);

      const grp = schema.group![0];
      assert.ok(grp.choice);
    });

    it('should parse named group with sequence', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:group name="myGroup">
            <xs:sequence>
              <xs:element name="first"/>
              <xs:element name="second"/>
            </xs:sequence>
          </xs:group>
        </xs:schema>`;
      const schema = parseXsd(xsd);

      const grp = schema.group![0];
      assert.ok(grp.sequence);
    });
  });

  describe('AttributeGroup', () => {
    it('should parse named attributeGroup', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:attributeGroup name="myAttrGroup" id="ag1">
            <xs:annotation><xs:documentation>AttrGroup docs</xs:documentation></xs:annotation>
            <xs:attribute name="attr1"/>
            <xs:attribute name="attr2"/>
            <xs:attributeGroup ref="otherAttrGroup"/>
            <xs:anyAttribute namespace="##any" processContents="lax"/>
          </xs:attributeGroup>
        </xs:schema>`;
      const schema = parseXsd(xsd);

      const ag = schema.attributeGroup![0];
      assert.equal(ag.name, 'myAttrGroup');
      assert.equal(ag.id, 'ag1');
      assert.ok(ag.attribute);
      assert.ok(ag.attributeGroup);
      assert.ok(ag.anyAttribute!);
    });

    it('should parse attributeGroup reference', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:complexType name="myType">
            <xs:attributeGroup ref="myAttrGroup" id="agRef1">
              <xs:annotation><xs:documentation>AttrGroup ref docs</xs:documentation></xs:annotation>
            </xs:attributeGroup>
          </xs:complexType>
        </xs:schema>`;
      const schema = parseXsd(xsd);

      const ag = schema.complexType![0].attributeGroup![0];
      assert.equal(ag.ref, 'myAttrGroup');
      assert.equal(ag.id, 'agRef1');
    });
  });

  describe('Wildcards', () => {
    it('should parse any with all attributes', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:complexType name="myType">
            <xs:sequence>
              <xs:any id="any1"
                minOccurs="0"
                maxOccurs="unbounded"
                namespace="##other"
                processContents="lax"
                notNamespace="http://excluded.com"
                notQName="excluded:element">
                <xs:annotation><xs:documentation>Any docs</xs:documentation></xs:annotation>
              </xs:any>
            </xs:sequence>
          </xs:complexType>
        </xs:schema>`;
      const schema = parseXsd(xsd);

      const any = schema.complexType![0].sequence!.any![0];
      assert.equal(any.id, 'any1');
      assert.equal(any.minOccurs, '0');
      assert.equal(any.maxOccurs, 'unbounded');
      assert.equal(any.namespace, '##other');
      assert.equal(any.processContents, 'lax');
      assert.equal(any.notNamespace, 'http://excluded.com');
      assert.equal(any.notQName, 'excluded:element');
    });

    it('should parse anyAttribute with all attributes', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:complexType name="myType">
            <xs:anyAttribute id="anyAttr1"
              namespace="##local"
              processContents="strict"
              notNamespace="http://excluded.com"
              notQName="excluded:attr">
              <xs:annotation><xs:documentation>AnyAttribute docs</xs:documentation></xs:annotation>
            </xs:anyAttribute>
          </xs:complexType>
        </xs:schema>`;
      const schema = parseXsd(xsd);

      const aa = schema.complexType![0].anyAttribute!;
      assert.equal(aa.id, 'anyAttr1');
      assert.equal(aa.namespace, '##local');
      assert.equal(aa.processContents, 'strict');
      assert.equal(aa.notNamespace, 'http://excluded.com');
      assert.equal(aa.notQName, 'excluded:attr');
    });
  });

  describe('XSD 1.1 Features', () => {
    it('should parse defaultOpenContent', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:defaultOpenContent id="doc1" appliesToEmpty="true" mode="suffix">
            <xs:annotation><xs:documentation>DefaultOpenContent docs</xs:documentation></xs:annotation>
            <xs:any namespace="##targetNamespace"/>
          </xs:defaultOpenContent>
        </xs:schema>`;
      const schema = parseXsd(xsd);

      const doc = schema.defaultOpenContent;
      assert.ok(doc);
      assert.equal(doc.id, 'doc1');
      assert.equal(doc.appliesToEmpty, true);
      assert.equal(doc.mode, 'suffix');
      assert.ok(doc.any);
    });
  });

  describe('Annotation', () => {
    it('should parse annotation with appinfo', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:annotation id="ann1">
            <xs:appinfo source="http://tools.example.com">Tool-specific info</xs:appinfo>
          </xs:annotation>
        </xs:schema>`;
      const schema = parseXsd(xsd);

      const ann = schema.annotation![0];
      assert.equal(ann.id, 'ann1');
      assert.ok(ann.appinfo);
      assert.equal(ann.appinfo![0].source, 'http://tools.example.com');
      assert.equal(ann.appinfo![0]._text, 'Tool-specific info');
    });

    it('should parse documentation with xml:lang', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:annotation>
            <xs:documentation source="http://docs.example.com" xml:lang="en">English docs</xs:documentation>
          </xs:annotation>
        </xs:schema>`;
      const schema = parseXsd(xsd);

      const doc = schema.annotation![0].documentation![0];
      assert.equal(doc.source, 'http://docs.example.com');
      assert.equal(doc['xml:lang'], 'en');
      assert.equal(doc._text, 'English docs');
    });
  });

  describe('Notation', () => {
    it('should parse notation', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:notation name="jpeg" id="not1" public="image/jpeg" system="viewer.exe">
            <xs:annotation><xs:documentation>JPEG notation</xs:documentation></xs:annotation>
          </xs:notation>
        </xs:schema>`;
      const schema = parseXsd(xsd);

      const not = schema.notation![0];
      assert.equal(not.name, 'jpeg');
      assert.equal(not.id, 'not1');
      assert.equal(not.public, 'image/jpeg');
      assert.equal(not.system, 'viewer.exe');
      assert.ok(not.annotation);
    });
  });
});
