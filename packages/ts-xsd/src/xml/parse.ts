/**
 * XML Parser for W3C Schema
 *
 * Parse XML string to typed JavaScript object using W3C-compliant Schema definition.
 * Uses the walker module for schema traversal.
 */

import { DOMParser } from '@xmldom/xmldom';
import type {
  InferParsedSchema,
  SchemaLike,
  ComplexTypeLike,
  ElementLike,
} from '../infer';
import {
  findComplexType,
  findElement,
  walkElements,
  walkAttributes,
  stripNsPrefix,
} from '../walker';
import {
  getAttributeValue,
  getChildElements,
  getAllChildElements,
  getTextContent,
  getLocalName,
} from './dom-utils';

/**
 * Find all elements that substitute for a given abstract element
 * Searches current schema and all $imports
 */
function findSubstitutingElements(
  abstractElementName: string,
  schema: SchemaLike,
): Array<{ element: ElementLike; schema: SchemaLike }> {
  const results: Array<{ element: ElementLike; schema: SchemaLike }> = [];

  // Helper to check elements in a schema
  const checkSchema = (s: SchemaLike) => {
    const elements = s.element;
    if (!elements) return;

    for (const el of elements) {
      if (el.substitutionGroup) {
        const subGroupName = stripNsPrefix(el.substitutionGroup);
        if (subGroupName === abstractElementName) {
          results.push({ element: el, schema: s });
        }
      }
    }
  };

  // Check current schema
  checkSchema(schema);

  // Check all imported schemas
  const imports = (schema as { $imports?: SchemaLike[] }).$imports;
  if (imports) {
    for (const imported of imports) {
      checkSchema(imported);
      // Recursively check nested imports
      const nestedResults = findSubstitutingElements(
        abstractElementName,
        imported,
      );
      results.push(...nestedResults);
    }
  }

  return results;
}

/**
 * Check if an element is abstract
 * Searches current schema and all $imports
 */
function isAbstractElement(elementName: string, schema: SchemaLike): boolean {
  // Check current schema
  const elements = schema.element;
  if (elements) {
    for (const el of elements) {
      if (el.name === elementName && el.abstract === true) {
        return true;
      }
    }
  }

  // Check imported schemas
  const imports = (schema as { $imports?: SchemaLike[] }).$imports;
  if (imports) {
    for (const imported of imports) {
      if (isAbstractElement(elementName, imported)) {
        return true;
      }
    }
  }

  return false;
}

import type { Element } from '@xmldom/xmldom';

type XmlElement = Element;

/**
 * Parse XML string to typed object using schema definition
 */
export function parse<T extends SchemaLike>(
  schema: T,
  xml: string,
): InferParsedSchema<T> {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const root = doc.documentElement;

  if (!root) {
    throw new Error('Invalid XML: no root element');
  }

  // Get root element name from XML (strip namespace prefix)
  const rootLocalName = getLocalName(root);

  // Find the element declaration for this root
  const elementEntry = findElementByName(schema, rootLocalName);

  if (!elementEntry) {
    throw new Error(`Schema missing element declaration for: ${rootLocalName}`);
  }

  // Check for inline complexType first
  const inlineComplexType = (
    elementEntry.element as { complexType?: ComplexTypeLike }
  ).complexType;
  if (inlineComplexType) {
    const content = parseElement(
      root,
      inlineComplexType,
      elementEntry.schema,
      schema,
    );
    // Wrap result with root element name for type discrimination
    return { [rootLocalName]: content } as InferParsedSchema<T>;
  }

  // Get the type name (strip namespace prefix if present)
  const typeName = stripNsPrefix(
    elementEntry.element.type || elementEntry.element.name || '',
  );

  // Find the complexType definition (searches current schema and $imports)
  const typeEntry = findComplexType(typeName, schema);

  if (!typeEntry) {
    throw new Error(`Schema missing complexType for: ${typeName}`);
  }

  const content = parseElement(root, typeEntry.ct, typeEntry.schema, schema);
  // Wrap result with root element name for type discrimination
  return { [rootLocalName]: content } as InferParsedSchema<T>;
}

/**
 * Find element declaration by name (case-insensitive fallback)
 */
function findElementByName(
  schema: SchemaLike,
  name: string,
): { element: ElementLike; schema: SchemaLike } | undefined {
  // Try exact match first using walker
  const exact = findElement(name, schema);
  if (exact) return exact;

  // Try case-insensitive match in current schema
  const elements = schema.element;
  if (elements) {
    const lowerName = name.toLowerCase();
    const found = elements.find((el) => el.name?.toLowerCase() === lowerName);
    if (found) return { element: found, schema };
  }

  return undefined;
}

/**
 * Parse a single element using its complexType definition
 * Uses walker to iterate elements and attributes (handles inheritance automatically)
 * @param node - The XML element to parse
 * @param typeDef - The complexType definition for this element
 * @param schema - The schema where typeDef is defined (for type resolution)
 * @param rootSchema - The root schema (for substitution group lookups)
 */
function parseElement(
  node: XmlElement,
  typeDef: ComplexTypeLike,
  schema: SchemaLike,
  rootSchema: SchemaLike,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // Handle simpleContent (text content with attributes)
  if (typeDef.simpleContent?.extension) {
    return parseSimpleContent(node, typeDef, schema, rootSchema);
  }

  // Parse attributes using walker (handles inheritance)
  for (const { attribute } of walkAttributes(typeDef, schema)) {
    if (!attribute.name) continue;
    const value = getAttributeValue(node, attribute.name);
    if (value !== null) {
      result[attribute.name] = convertValue(value, attribute.type || 'string');
    } else if (attribute.default !== undefined) {
      result[attribute.name] = convertValue(
        String(attribute.default),
        attribute.type || 'string',
      );
    }
  }

  // Parse child elements using walker (handles inheritance, groups, refs)
  for (const { element, array } of walkElements(typeDef, schema)) {
    const resolved = resolveElementInfo(element, schema);
    if (!resolved) continue;

    // Check if this is a reference to an abstract element (substitution group head)
    // Use rootSchema for substitution lookups since substitutes can be in any imported schema
    const isAbstract = isAbstractElement(resolved.name, rootSchema);
    if (isAbstract) {
      // Find all elements that substitute for this abstract element
      const substitutes = findSubstitutingElements(resolved.name, rootSchema);

      // Get all child elements and check if any match a substituting element
      const allChildren = getAllChildElements(node);
      for (const child of allChildren) {
        const childName = getLocalName(child);
        const substitute = substitutes.find(
          (s) => s.element.name === childName,
        );
        if (substitute && substitute.element.name) {
          const subTypeName = substitute.element.type
            ? stripNsPrefix(substitute.element.type)
            : undefined;
          result[substitute.element.name] = parseChildValue(
            child,
            subTypeName,
            substitute.schema,
            rootSchema,
          );
        }
      }
    } else {
      // Normal element handling
      const children = getChildElements(node, resolved.name);

      if (array || children.length > 1) {
        // Array element
        const values = children.map((child) =>
          parseChildValue(child, resolved.typeName, schema, rootSchema),
        );
        if (values.length > 0) {
          result[resolved.name] = values;
        }
      } else if (children.length === 1) {
        // Single element
        result[resolved.name] = parseChildValue(
          children[0],
          resolved.typeName,
          schema,
          rootSchema,
        );
      }
    }
  }

  return result;
}

/**
 * Parse simpleContent (text content with attributes)
 */
function parseSimpleContent(
  node: XmlElement,
  typeDef: ComplexTypeLike,
  _schema: SchemaLike,
  _rootSchema: SchemaLike,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const simpleContent = typeDef.simpleContent;
  if (!simpleContent?.extension) {
    return result;
  }
  const ext = simpleContent.extension;

  // Get text content as $value
  const textContent = getTextContent(node);
  const baseType = ext.base ? stripNsPrefix(ext.base) : 'string';
  result.$value = convertValue(textContent, baseType);

  // Parse attributes from simpleContent extension
  if (ext.attribute) {
    for (const attrDef of ext.attribute) {
      if (!attrDef.name) continue;
      const value = getAttributeValue(node, attrDef.name);
      if (value !== null) {
        result[attrDef.name] = convertValue(value, attrDef.type || 'string');
      } else if (attrDef.default !== undefined) {
        result[attrDef.name] = convertValue(
          String(attrDef.default),
          attrDef.type || 'string',
        );
      }
    }
  }

  return result;
}

/**
 * Resolve element info (name and type), handling ref
 */
function resolveElementInfo(
  element: ElementLike,
  schema: SchemaLike,
): { name: string; typeName: string | undefined } | undefined {
  // Direct element with name
  if (element.name) {
    return {
      name: element.name,
      typeName: element.type ? stripNsPrefix(element.type) : undefined,
    };
  }

  // Handle element reference - get type from referenced element declaration
  if (element.ref) {
    const refName = stripNsPrefix(element.ref);
    const refElement = findElement(refName, schema);
    if (refElement) {
      const name = refElement.element.name ?? refName;
      return {
        name,
        typeName: refElement.element.type
          ? stripNsPrefix(refElement.element.type)
          : undefined,
      };
    }
    // Fallback: use ref name, no type
    return { name: refName, typeName: undefined };
  }

  return undefined;
}

/**
 * Parse a child element's value (either complex type or simple value)
 */
function parseChildValue(
  child: XmlElement,
  typeName: string | undefined,
  schema: SchemaLike,
  rootSchema: SchemaLike,
): unknown {
  // Find nested complexType if this field has a complex type
  const nestedType = typeName ? findComplexType(typeName, schema) : undefined;

  if (nestedType) {
    return parseElement(child, nestedType.ct, nestedType.schema, rootSchema);
  }

  return convertValue(getTextContent(child) || '', typeName || 'string');
}

/**
 * Convert string value to typed value based on XSD type
 */
function convertValue(value: string, type: string): unknown {
  const localType = stripNsPrefix(type);

  switch (localType) {
    case 'int':
    case 'integer':
    case 'decimal':
    case 'float':
    case 'double':
    case 'short':
    case 'long':
    case 'byte':
    case 'unsignedInt':
    case 'unsignedShort':
    case 'unsignedLong':
    case 'unsignedByte':
    case 'positiveInteger':
    case 'negativeInteger':
    case 'nonPositiveInteger':
    case 'nonNegativeInteger':
      return Number(value);

    case 'boolean':
      return value === 'true' || value === '1';

    case 'date':
    case 'dateTime':
      return value; // Keep as string, let consumer parse if needed

    default:
      return value;
  }
}
