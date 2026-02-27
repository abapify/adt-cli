/**
 * XSD Parser - Parse XSD documents to typed Schema objects
 *
 * This parser understands XSD semantics and produces correctly typed output
 * matching the W3C XMLSchema.xsd specification.
 *
 * No intermediate JSON - direct XSD to typed objects.
 */

import { DOMParser } from '@xmldom/xmldom';
import {
  getLocalName,
  getAllChildElements,
  getTextContent,
} from '../xml/dom-utils';
import type {
  Schema,
  Annotation,
  Documentation,
  Appinfo,
  Include,
  Import,
  Redefine,
  Override,
  TopLevelElement,
  LocalElement,
  TopLevelAttribute,
  LocalAttribute,
  TopLevelComplexType,
  LocalComplexType,
  TopLevelSimpleType,
  LocalSimpleType,
  SimpleTypeRestriction,
  List,
  Union,
  ComplexContent,
  SimpleContent,
  ComplexContentRestriction,
  ComplexContentExtension,
  SimpleContentRestriction,
  SimpleContentExtension,
  ExplicitGroup,
  All,
  NamedGroup,
  GroupRef,
  NamedAttributeGroup,
  AttributeGroupRef,
  Any,
  AnyAttribute,
  Unique,
  Key,
  Keyref,
  Selector,
  Field,
  Facet,
  Pattern,
  OpenContent,
  DefaultOpenContent,
  Assertion,
  Alternative,
  Notation,
} from './types';

import type { Element } from '@xmldom/xmldom';

/**
 * Mutable version of a type - removes readonly modifiers for building objects incrementally.
 * Used during parsing to construct typed objects before returning them as readonly.
 */
type Mutable<T> = { -readonly [P in keyof T]: T[P] };

/**
 * Parse an XSD string to a typed Schema object
 */
export function parseXsd(xml: string): Schema {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const root = doc.documentElement;

  if (!root || getLocalName(root) !== 'schema') {
    throw new Error('Invalid XSD: root element must be xs:schema');
  }

  return parseSchema(root);
}

// =============================================================================
// Schema (root)
// =============================================================================

function parseSchema(el: Element): Schema {
  const schema: Mutable<Schema> = {};

  // XML namespace declarations (xmlns:prefix -> URI)
  copyXmlns(el, schema);

  // Attributes
  copyAttr(el, schema, 'id');
  copyAttr(el, schema, 'targetNamespace');
  copyAttr(el, schema, 'version');
  copyAttr(el, schema, 'finalDefault');
  copyAttr(el, schema, 'blockDefault');
  copyAttr(el, schema, 'attributeFormDefault');
  copyAttr(el, schema, 'elementFormDefault');
  copyAttr(el, schema, 'defaultAttributes');
  copyAttr(el, schema, 'xpathDefaultNamespace');
  copyAttr(el, schema, 'xml:lang');

  // Child elements
  for (const child of getAllChildElements(el)) {
    const name = getLocalName(child);
    switch (name) {
      case 'annotation':
        pushTo(schema, 'annotation', parseAnnotation(child));
        break;
      case 'include':
        pushTo(schema, 'include', parseInclude(child));
        break;
      case 'import':
        pushTo(schema, 'import', parseImport(child));
        break;
      case 'redefine':
        pushTo(schema, 'redefine', parseRedefine(child));
        break;
      case 'override':
        pushTo(schema, 'override', parseOverride(child));
        break;
      case 'element':
        pushTo(schema, 'element', parseTopLevelElement(child));
        break;
      case 'attribute':
        pushTo(schema, 'attribute', parseTopLevelAttribute(child));
        break;
      case 'simpleType':
        pushTo(schema, 'simpleType', parseTopLevelSimpleType(child));
        break;
      case 'complexType':
        pushTo(schema, 'complexType', parseTopLevelComplexType(child));
        break;
      case 'group':
        pushTo(schema, 'group', parseNamedGroup(child));
        break;
      case 'attributeGroup':
        pushTo(schema, 'attributeGroup', parseNamedAttributeGroup(child));
        break;
      case 'notation':
        pushTo(schema, 'notation', parseNotation(child));
        break;
      case 'defaultOpenContent':
        schema.defaultOpenContent = parseDefaultOpenContent(child);
        break;
    }
  }

  return schema;
}

// =============================================================================
// Annotation
// =============================================================================

function parseAnnotation(el: Element): Annotation {
  const result: Mutable<Annotation> = {};
  copyAttr(el, result, 'id');

  for (const child of getAllChildElements(el)) {
    const name = getLocalName(child);
    if (name === 'documentation') {
      pushTo(result, 'documentation', parseDocumentation(child));
    } else if (name === 'appinfo') {
      pushTo(result, 'appinfo', parseAppinfo(child));
    }
  }

  return result;
}

function parseDocumentation(el: Element): Documentation {
  const result: Mutable<Documentation> = {};
  copyAttr(el, result, 'source');
  copyAttr(el, result, 'xml:lang');

  const text = getTextContent(el);
  if (text) {
    result._text = text;
  }

  return result;
}

function parseAppinfo(el: Element): Appinfo {
  const result: Mutable<Appinfo> = {};
  copyAttr(el, result, 'source');

  const text = getTextContent(el);
  if (text) {
    result._text = text;
  }

  return result;
}

// =============================================================================
// Include / Import / Redefine / Override
// =============================================================================

function parseInclude(el: Element): Include {
  const result: Mutable<Include> = { schemaLocation: '' };
  copyAttr(el, result, 'id');
  copyAttr(el, result, 'schemaLocation');
  parseAnnotationChild(el, result);
  return result;
}

function parseImport(el: Element): Import {
  const result: Mutable<Import> = {};
  copyAttr(el, result, 'id');
  copyAttr(el, result, 'namespace');
  copyAttr(el, result, 'schemaLocation');
  parseAnnotationChild(el, result);
  return result;
}

function parseRedefine(el: Element): Redefine {
  const result: Mutable<Redefine> = { schemaLocation: '' };
  copyAttr(el, result, 'id');
  copyAttr(el, result, 'schemaLocation');

  for (const child of getAllChildElements(el)) {
    const name = getLocalName(child);
    switch (name) {
      case 'annotation':
        pushTo(result, 'annotation', parseAnnotation(child));
        break;
      case 'simpleType':
        pushTo(result, 'simpleType', parseTopLevelSimpleType(child));
        break;
      case 'complexType':
        pushTo(result, 'complexType', parseTopLevelComplexType(child));
        break;
      case 'group':
        pushTo(result, 'group', parseNamedGroup(child));
        break;
      case 'attributeGroup':
        pushTo(result, 'attributeGroup', parseNamedAttributeGroup(child));
        break;
    }
  }

  return result;
}

function parseOverride(el: Element): Override {
  const result: Mutable<Override> = { schemaLocation: '' };
  copyAttr(el, result, 'id');
  copyAttr(el, result, 'schemaLocation');

  for (const child of getAllChildElements(el)) {
    const name = getLocalName(child);
    switch (name) {
      case 'annotation':
        pushTo(result, 'annotation', parseAnnotation(child));
        break;
      case 'simpleType':
        pushTo(result, 'simpleType', parseTopLevelSimpleType(child));
        break;
      case 'complexType':
        pushTo(result, 'complexType', parseTopLevelComplexType(child));
        break;
      case 'group':
        pushTo(result, 'group', parseNamedGroup(child));
        break;
      case 'attributeGroup':
        pushTo(result, 'attributeGroup', parseNamedAttributeGroup(child));
        break;
      case 'element':
        pushTo(result, 'element', parseTopLevelElement(child));
        break;
      case 'attribute':
        pushTo(result, 'attribute', parseTopLevelAttribute(child));
        break;
      case 'notation':
        pushTo(result, 'notation', parseNotation(child));
        break;
    }
  }

  return result;
}

// =============================================================================
// Element Declarations
// =============================================================================

function parseTopLevelElement(el: Element): TopLevelElement {
  const result: Mutable<TopLevelElement> = { name: '' };
  copyAttr(el, result, 'id');
  copyAttr(el, result, 'name');
  copyAttr(el, result, 'type');
  copyAttr(el, result, 'substitutionGroup');
  copyAttr(el, result, 'default');
  copyAttr(el, result, 'fixed');
  copyBoolAttr(el, result, 'nillable');
  copyBoolAttr(el, result, 'abstract');
  copyAttr(el, result, 'final');
  copyAttr(el, result, 'block');

  parseAnnotationChild(el, result);

  for (const child of getAllChildElements(el)) {
    const name = getLocalName(child);
    switch (name) {
      case 'simpleType':
        result.simpleType = parseLocalSimpleType(child);
        break;
      case 'complexType':
        result.complexType = parseLocalComplexType(child);
        break;
      case 'unique':
        pushTo(result, 'unique', parseUnique(child));
        break;
      case 'key':
        pushTo(result, 'key', parseKey(child));
        break;
      case 'keyref':
        pushTo(result, 'keyref', parseKeyref(child));
        break;
      case 'alternative':
        pushTo(result, 'alternative', parseAlternative(child));
        break;
    }
  }

  return result;
}

function parseLocalElement(el: Element): LocalElement {
  const result: Mutable<LocalElement> = {};
  copyAttr(el, result, 'id');
  copyAttr(el, result, 'name');
  copyAttr(el, result, 'ref');
  copyAttr(el, result, 'type');
  copyAttr(el, result, 'minOccurs');
  copyAttr(el, result, 'maxOccurs');
  copyAttr(el, result, 'default');
  copyAttr(el, result, 'fixed');
  copyBoolAttr(el, result, 'nillable');
  copyAttr(el, result, 'block');
  copyAttr(el, result, 'form');
  copyAttr(el, result, 'targetNamespace');

  parseAnnotationChild(el, result);

  for (const child of getAllChildElements(el)) {
    const name = getLocalName(child);
    switch (name) {
      case 'simpleType':
        result.simpleType = parseLocalSimpleType(child);
        break;
      case 'complexType':
        result.complexType = parseLocalComplexType(child);
        break;
      case 'unique':
        pushTo(result, 'unique', parseUnique(child));
        break;
      case 'key':
        pushTo(result, 'key', parseKey(child));
        break;
      case 'keyref':
        pushTo(result, 'keyref', parseKeyref(child));
        break;
      case 'alternative':
        pushTo(result, 'alternative', parseAlternative(child));
        break;
    }
  }

  return result;
}

// =============================================================================
// Attribute Declarations
// =============================================================================

function parseTopLevelAttribute(el: Element): TopLevelAttribute {
  const result: Mutable<TopLevelAttribute> = { name: '' };
  copyAttr(el, result, 'id');
  copyAttr(el, result, 'name');
  copyAttr(el, result, 'type');
  copyAttr(el, result, 'default');
  copyAttr(el, result, 'fixed');
  copyBoolAttr(el, result, 'inheritable');

  parseAnnotationChild(el, result);

  for (const child of getAllChildElements(el)) {
    if (getLocalName(child) === 'simpleType') {
      result.simpleType = parseLocalSimpleType(child);
    }
  }

  return result;
}

function parseLocalAttribute(el: Element): LocalAttribute {
  const result: Mutable<LocalAttribute> = {};
  copyAttr(el, result, 'id');
  copyAttr(el, result, 'name');
  copyAttr(el, result, 'ref');
  copyAttr(el, result, 'type');
  copyAttr(el, result, 'use');
  copyAttr(el, result, 'default');
  copyAttr(el, result, 'fixed');
  copyAttr(el, result, 'form');
  copyAttr(el, result, 'targetNamespace');
  copyBoolAttr(el, result, 'inheritable');

  parseAnnotationChild(el, result);

  for (const child of getAllChildElements(el)) {
    if (getLocalName(child) === 'simpleType') {
      result.simpleType = parseLocalSimpleType(child);
    }
  }

  return result;
}

// =============================================================================
// Complex Types
// =============================================================================

function parseTopLevelComplexType(el: Element): TopLevelComplexType {
  const result: Mutable<TopLevelComplexType> = { name: '' };
  copyAttr(el, result, 'id');
  copyAttr(el, result, 'name');
  copyBoolAttr(el, result, 'mixed');
  copyBoolAttr(el, result, 'abstract');
  copyAttr(el, result, 'final');
  copyAttr(el, result, 'block');
  copyBoolAttr(el, result, 'defaultAttributesApply');

  parseAnnotationChild(el, result);
  parseComplexTypeContent(el, result);

  return result;
}

function parseLocalComplexType(el: Element): LocalComplexType {
  const result: Mutable<LocalComplexType> = {};
  copyAttr(el, result, 'id');
  copyBoolAttr(el, result, 'mixed');

  parseAnnotationChild(el, result);
  parseComplexTypeContent(el, result);

  return result;
}

function parseComplexTypeContent(
  el: Element,
  result: Mutable<TopLevelComplexType> | Mutable<LocalComplexType>,
): void {
  for (const child of getAllChildElements(el)) {
    const name = getLocalName(child);
    switch (name) {
      case 'simpleContent':
        result.simpleContent = parseSimpleContent(child);
        break;
      case 'complexContent':
        result.complexContent = parseComplexContent(child);
        break;
      case 'openContent':
        result.openContent = parseOpenContent(child);
        break;
      case 'group':
        result.group = parseGroupRef(child);
        break;
      case 'all':
        result.all = parseAll(child);
        break;
      case 'choice':
        result.choice = parseExplicitGroup(child);
        break;
      case 'sequence':
        result.sequence = parseExplicitGroup(child);
        break;
      case 'attribute':
        pushTo(result, 'attribute', parseLocalAttribute(child));
        break;
      case 'attributeGroup':
        pushTo(result, 'attributeGroup', parseAttributeGroupRef(child));
        break;
      case 'anyAttribute':
        result.anyAttribute = parseAnyAttribute(child);
        break;
      case 'assert':
        pushTo(result, 'assert', parseAssertion(child));
        break;
    }
  }
}

// =============================================================================
// Simple Types
// =============================================================================

function parseTopLevelSimpleType(el: Element): TopLevelSimpleType {
  const result: Mutable<TopLevelSimpleType> = { name: '' };
  copyAttr(el, result, 'id');
  copyAttr(el, result, 'name');
  copyAttr(el, result, 'final');

  parseAnnotationChild(el, result);
  parseSimpleTypeContent(el, result);

  return result;
}

function parseLocalSimpleType(el: Element): LocalSimpleType {
  const result: Mutable<LocalSimpleType> = {};
  copyAttr(el, result, 'id');

  parseAnnotationChild(el, result);
  parseSimpleTypeContent(el, result);

  return result;
}

function parseSimpleTypeContent(
  el: Element,
  result: Mutable<TopLevelSimpleType> | Mutable<LocalSimpleType>,
): void {
  for (const child of getAllChildElements(el)) {
    const name = getLocalName(child);
    switch (name) {
      case 'restriction':
        result.restriction = parseSimpleTypeRestriction(child);
        break;
      case 'list':
        result.list = parseList(child);
        break;
      case 'union':
        result.union = parseUnion(child);
        break;
    }
  }
}

function parseSimpleTypeRestriction(el: Element): SimpleTypeRestriction {
  const result: Mutable<SimpleTypeRestriction> = {};
  copyAttr(el, result, 'id');
  copyAttr(el, result, 'base');

  parseAnnotationChild(el, result);

  for (const child of getAllChildElements(el)) {
    const name = getLocalName(child);
    switch (name) {
      case 'simpleType':
        result.simpleType = parseLocalSimpleType(child);
        break;
      case 'minExclusive':
      case 'minInclusive':
      case 'maxExclusive':
      case 'maxInclusive':
      case 'totalDigits':
      case 'fractionDigits':
      case 'length':
      case 'minLength':
      case 'maxLength':
      case 'enumeration':
      case 'whiteSpace':
      case 'explicitTimezone':
        pushTo(result, name, parseFacet(child));
        break;
      case 'pattern':
        pushTo(result, 'pattern', parsePattern(child));
        break;
      case 'assertion':
        pushTo(result, 'assertion', parseAssertion(child));
        break;
    }
  }

  return result;
}

function parseList(el: Element): List {
  const result: Mutable<List> = {};
  copyAttr(el, result, 'id');
  copyAttr(el, result, 'itemType');

  parseAnnotationChild(el, result);

  for (const child of getAllChildElements(el)) {
    if (getLocalName(child) === 'simpleType') {
      result.simpleType = parseLocalSimpleType(child);
    }
  }

  return result;
}

function parseUnion(el: Element): Union {
  const result: Mutable<Union> = {};
  copyAttr(el, result, 'id');
  copyAttr(el, result, 'memberTypes');

  parseAnnotationChild(el, result);

  for (const child of getAllChildElements(el)) {
    if (getLocalName(child) === 'simpleType') {
      pushTo(result, 'simpleType', parseLocalSimpleType(child));
    }
  }

  return result;
}

function parseFacet(el: Element): Facet {
  const result: Mutable<Facet> = { value: '' };
  copyAttr(el, result, 'id');
  copyAttr(el, result, 'value');
  copyBoolAttr(el, result, 'fixed');
  parseAnnotationChild(el, result);
  return result;
}

function parsePattern(el: Element): Pattern {
  const result: Mutable<Pattern> = { value: '' };
  copyAttr(el, result, 'id');
  copyAttr(el, result, 'value');
  parseAnnotationChild(el, result);
  return result;
}

// =============================================================================
// Complex Content / Simple Content
// =============================================================================

function parseComplexContent(el: Element): ComplexContent {
  const result: Mutable<ComplexContent> = {};
  copyAttr(el, result, 'id');
  copyBoolAttr(el, result, 'mixed');

  parseAnnotationChild(el, result);

  for (const child of getAllChildElements(el)) {
    const name = getLocalName(child);
    if (name === 'restriction') {
      result.restriction = parseComplexContentRestriction(child);
    } else if (name === 'extension') {
      result.extension = parseComplexContentExtension(child);
    }
  }

  return result;
}

function parseSimpleContent(el: Element): SimpleContent {
  const result: Mutable<SimpleContent> = {};
  copyAttr(el, result, 'id');

  parseAnnotationChild(el, result);

  for (const child of getAllChildElements(el)) {
    const name = getLocalName(child);
    if (name === 'restriction') {
      result.restriction = parseSimpleContentRestriction(child);
    } else if (name === 'extension') {
      result.extension = parseSimpleContentExtension(child);
    }
  }

  return result;
}

function parseComplexContentRestriction(
  el: Element,
): ComplexContentRestriction {
  const result: Mutable<ComplexContentRestriction> = { base: '' };
  copyAttr(el, result, 'id');
  copyAttr(el, result, 'base');

  parseAnnotationChild(el, result);
  parseComplexTypeContent(el, result);

  return result;
}

function parseComplexContentExtension(el: Element): ComplexContentExtension {
  const result: Mutable<ComplexContentExtension> = { base: '' };
  copyAttr(el, result, 'id');
  copyAttr(el, result, 'base');

  parseAnnotationChild(el, result);
  parseComplexTypeContent(el, result);

  return result;
}

function parseSimpleContentRestriction(el: Element): SimpleContentRestriction {
  const result: Mutable<SimpleContentRestriction> = { base: '' };
  copyAttr(el, result, 'id');
  copyAttr(el, result, 'base');

  parseAnnotationChild(el, result);

  for (const child of getAllChildElements(el)) {
    const name = getLocalName(child);
    switch (name) {
      case 'simpleType':
        result.simpleType = parseLocalSimpleType(child);
        break;
      case 'minExclusive':
      case 'minInclusive':
      case 'maxExclusive':
      case 'maxInclusive':
      case 'totalDigits':
      case 'fractionDigits':
      case 'length':
      case 'minLength':
      case 'maxLength':
      case 'enumeration':
      case 'whiteSpace':
      case 'explicitTimezone':
        pushTo(result, name, parseFacet(child));
        break;
      case 'pattern':
        pushTo(result, 'pattern', parsePattern(child));
        break;
      case 'assertion':
        pushTo(result, 'assertion', parseAssertion(child));
        break;
      case 'attribute':
        pushTo(result, 'attribute', parseLocalAttribute(child));
        break;
      case 'attributeGroup':
        pushTo(result, 'attributeGroup', parseAttributeGroupRef(child));
        break;
      case 'anyAttribute':
        result.anyAttribute = parseAnyAttribute(child);
        break;
      case 'assert':
        pushTo(result, 'assert', parseAssertion(child));
        break;
    }
  }

  return result;
}

function parseSimpleContentExtension(el: Element): SimpleContentExtension {
  const result: Mutable<SimpleContentExtension> = { base: '' };
  copyAttr(el, result, 'id');
  copyAttr(el, result, 'base');

  parseAnnotationChild(el, result);

  for (const child of getAllChildElements(el)) {
    const name = getLocalName(child);
    switch (name) {
      case 'attribute':
        pushTo(result, 'attribute', parseLocalAttribute(child));
        break;
      case 'attributeGroup':
        pushTo(result, 'attributeGroup', parseAttributeGroupRef(child));
        break;
      case 'anyAttribute':
        result.anyAttribute = parseAnyAttribute(child);
        break;
      case 'assert':
        pushTo(result, 'assert', parseAssertion(child));
        break;
    }
  }

  return result;
}

// =============================================================================
// Model Groups
// =============================================================================

function parseExplicitGroup(el: Element): ExplicitGroup {
  const result: Mutable<ExplicitGroup> = {};
  copyAttr(el, result, 'id');
  copyAttr(el, result, 'minOccurs');
  copyAttr(el, result, 'maxOccurs');

  parseAnnotationChild(el, result);

  for (const child of getAllChildElements(el)) {
    const name = getLocalName(child);
    switch (name) {
      case 'element':
        pushTo(result, 'element', parseLocalElement(child));
        break;
      case 'group':
        pushTo(result, 'group', parseGroupRef(child));
        break;
      case 'choice':
        pushTo(result, 'choice', parseExplicitGroup(child));
        break;
      case 'sequence':
        pushTo(result, 'sequence', parseExplicitGroup(child));
        break;
      case 'any':
        pushTo(result, 'any', parseAny(child));
        break;
    }
  }

  return result;
}

function parseAll(el: Element): All {
  const result: Mutable<All> = {};
  copyAttr(el, result, 'id');
  copyAttr(el, result, 'minOccurs');
  copyAttr(el, result, 'maxOccurs');

  parseAnnotationChild(el, result);

  for (const child of getAllChildElements(el)) {
    const name = getLocalName(child);
    switch (name) {
      case 'element':
        pushTo(result, 'element', parseLocalElement(child));
        break;
      case 'any':
        pushTo(result, 'any', parseAny(child));
        break;
      case 'group':
        pushTo(result, 'group', parseGroupRef(child));
        break;
    }
  }

  return result;
}

// =============================================================================
// Groups and Attribute Groups
// =============================================================================

function parseNamedGroup(el: Element): NamedGroup {
  const result: Mutable<NamedGroup> = { name: '' };
  copyAttr(el, result, 'id');
  copyAttr(el, result, 'name');

  parseAnnotationChild(el, result);

  for (const child of getAllChildElements(el)) {
    const name = getLocalName(child);
    switch (name) {
      case 'all':
        result.all = parseAll(child);
        break;
      case 'choice':
        result.choice = parseExplicitGroup(child);
        break;
      case 'sequence':
        result.sequence = parseExplicitGroup(child);
        break;
    }
  }

  return result;
}

function parseGroupRef(el: Element): GroupRef {
  const result: Mutable<GroupRef> = { ref: '' };
  copyAttr(el, result, 'id');
  copyAttr(el, result, 'ref');
  copyAttr(el, result, 'minOccurs');
  copyAttr(el, result, 'maxOccurs');
  parseAnnotationChild(el, result);
  return result;
}

function parseNamedAttributeGroup(el: Element): NamedAttributeGroup {
  const result: Mutable<NamedAttributeGroup> = { name: '' };
  copyAttr(el, result, 'id');
  copyAttr(el, result, 'name');

  parseAnnotationChild(el, result);

  for (const child of getAllChildElements(el)) {
    const name = getLocalName(child);
    switch (name) {
      case 'attribute':
        pushTo(result, 'attribute', parseLocalAttribute(child));
        break;
      case 'attributeGroup':
        pushTo(result, 'attributeGroup', parseAttributeGroupRef(child));
        break;
      case 'anyAttribute':
        result.anyAttribute = parseAnyAttribute(child);
        break;
    }
  }

  return result;
}

function parseAttributeGroupRef(el: Element): AttributeGroupRef {
  const result: Mutable<AttributeGroupRef> = { ref: '' };
  copyAttr(el, result, 'id');
  copyAttr(el, result, 'ref');
  parseAnnotationChild(el, result);
  return result;
}

// =============================================================================
// Wildcards
// =============================================================================

function parseAny(el: Element): Any {
  const result: Mutable<Any> = {};
  copyAttr(el, result, 'id');
  copyAttr(el, result, 'minOccurs');
  copyAttr(el, result, 'maxOccurs');
  copyAttr(el, result, 'namespace');
  copyAttr(el, result, 'processContents');
  copyAttr(el, result, 'notNamespace');
  copyAttr(el, result, 'notQName');
  parseAnnotationChild(el, result);
  return result;
}

function parseAnyAttribute(el: Element): AnyAttribute {
  const result: Mutable<AnyAttribute> = {};
  copyAttr(el, result, 'id');
  copyAttr(el, result, 'namespace');
  copyAttr(el, result, 'processContents');
  copyAttr(el, result, 'notNamespace');
  copyAttr(el, result, 'notQName');
  parseAnnotationChild(el, result);
  return result;
}

// =============================================================================
// Identity Constraints
// =============================================================================

function parseUnique(el: Element): Unique {
  const result: Mutable<Unique> = { name: '' };
  copyAttr(el, result, 'id');
  copyAttr(el, result, 'name');
  copyAttr(el, result, 'ref');

  parseAnnotationChild(el, result);

  for (const child of getAllChildElements(el)) {
    const name = getLocalName(child);
    if (name === 'selector') {
      result.selector = parseSelector(child);
    } else if (name === 'field') {
      pushTo(result, 'field', parseField(child));
    }
  }

  return result;
}

function parseKey(el: Element): Key {
  const result: Mutable<Key> = { name: '' };
  copyAttr(el, result, 'id');
  copyAttr(el, result, 'name');
  copyAttr(el, result, 'ref');

  parseAnnotationChild(el, result);

  for (const child of getAllChildElements(el)) {
    const name = getLocalName(child);
    if (name === 'selector') {
      result.selector = parseSelector(child);
    } else if (name === 'field') {
      pushTo(result, 'field', parseField(child));
    }
  }

  return result;
}

function parseKeyref(el: Element): Keyref {
  const result: Mutable<Keyref> = { name: '', refer: '' };
  copyAttr(el, result, 'id');
  copyAttr(el, result, 'name');
  copyAttr(el, result, 'ref');
  copyAttr(el, result, 'refer');

  parseAnnotationChild(el, result);

  for (const child of getAllChildElements(el)) {
    const name = getLocalName(child);
    if (name === 'selector') {
      result.selector = parseSelector(child);
    } else if (name === 'field') {
      pushTo(result, 'field', parseField(child));
    }
  }

  return result;
}

function parseSelector(el: Element): Selector {
  const result: Mutable<Selector> = { xpath: '' };
  copyAttr(el, result, 'id');
  copyAttr(el, result, 'xpath');
  copyAttr(el, result, 'xpathDefaultNamespace');
  parseAnnotationChild(el, result);
  return result;
}

function parseField(el: Element): Field {
  const result: Mutable<Field> = { xpath: '' };
  copyAttr(el, result, 'id');
  copyAttr(el, result, 'xpath');
  copyAttr(el, result, 'xpathDefaultNamespace');
  parseAnnotationChild(el, result);
  return result;
}

// =============================================================================
// XSD 1.1 Features
// =============================================================================

function parseOpenContent(el: Element): OpenContent {
  const result: Mutable<OpenContent> = {};
  copyAttr(el, result, 'id');
  copyAttr(el, result, 'mode');

  parseAnnotationChild(el, result);

  for (const child of getAllChildElements(el)) {
    if (getLocalName(child) === 'any') {
      result.any = parseAny(child);
    }
  }

  return result;
}

function parseDefaultOpenContent(el: Element): DefaultOpenContent {
  const result: Mutable<DefaultOpenContent> = { any: {} };
  copyAttr(el, result, 'id');
  copyBoolAttr(el, result, 'appliesToEmpty');
  copyAttr(el, result, 'mode');

  parseAnnotationChild(el, result);

  for (const child of getAllChildElements(el)) {
    if (getLocalName(child) === 'any') {
      result.any = parseAny(child);
    }
  }

  return result;
}

function parseAssertion(el: Element): Assertion {
  const result: Mutable<Assertion> = {};
  copyAttr(el, result, 'id');
  copyAttr(el, result, 'test');
  copyAttr(el, result, 'xpathDefaultNamespace');
  parseAnnotationChild(el, result);
  return result;
}

function parseAlternative(el: Element): Alternative {
  const result: Mutable<Alternative> = {};
  copyAttr(el, result, 'id');
  copyAttr(el, result, 'test');
  copyAttr(el, result, 'type');
  copyAttr(el, result, 'xpathDefaultNamespace');

  parseAnnotationChild(el, result);

  for (const child of getAllChildElements(el)) {
    const name = getLocalName(child);
    if (name === 'simpleType') {
      result.simpleType = parseLocalSimpleType(child);
    } else if (name === 'complexType') {
      result.complexType = parseLocalComplexType(child);
    }
  }

  return result;
}

function parseNotation(el: Element): Notation {
  const result: Mutable<Notation> = { name: '', public: '' };
  copyAttr(el, result, 'id');
  copyAttr(el, result, 'name');
  copyAttr(el, result, 'public');
  copyAttr(el, result, 'system');
  parseAnnotationChild(el, result);
  return result;
}

// =============================================================================
// Utility Functions
// =============================================================================

function copyAttr(
  el: Element,
  target: Record<string, unknown>,
  name: string,
): void {
  const value = el.getAttribute(name);
  if (value !== null) {
    target[name] = value;
  }
}

function copyBoolAttr(
  el: Element,
  target: Record<string, unknown>,
  name: string,
): void {
  const value = el.getAttribute(name);
  if (value !== null) {
    target[name] = value === 'true';
  }
}

function pushTo(
  target: Record<string, unknown>,
  name: string,
  value: unknown,
): void {
  if (!target[name]) {
    target[name] = [];
  }
  (target[name] as unknown[]).push(value);
}

function parseAnnotationChild(
  el: Element,
  result: { annotation?: Annotation },
): void {
  for (const child of getAllChildElements(el)) {
    if (getLocalName(child) === 'annotation') {
      result.annotation = parseAnnotation(child);
      break; // Only one annotation per element
    }
  }
}

/**
 * Extract xmlns declarations from an element's attributes.
 * Returns undefined if no xmlns declarations found.
 *
 * @example
 * For <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:tns="http://example.com">
 * Returns: { xs: "http://www.w3.org/2001/XMLSchema", tns: "http://example.com" }
 *
 * For <xs:element xmlns="http://default.com">
 * Returns: { "": "http://default.com" }
 */
function extractXmlns(el: Element): Record<string, string> | undefined {
  const xmlns: Record<string, string> = {};
  let hasXmlns = false;

  // NamedNodeMap is iterable in xmldom
  for (const attr of el.attributes) {
    const name = attr.name;
    const value = attr.value;

    if (name === 'xmlns') {
      // Default namespace (no prefix)
      xmlns[''] = value;
      hasXmlns = true;
    } else if (name.startsWith('xmlns:')) {
      // Prefixed namespace
      const prefix = name.substring(6); // Remove 'xmlns:'
      xmlns[prefix] = value;
      hasXmlns = true;
    }
  }

  return hasXmlns ? xmlns : undefined;
}

/**
 * Copy xmlns declarations to target if present
 */
function copyXmlns(
  el: Element,
  target: { $xmlns?: Record<string, string> },
): void {
  const xmlns = extractXmlns(el);
  if (xmlns) {
    target.$xmlns = xmlns;
  }
}

export default parseXsd;
