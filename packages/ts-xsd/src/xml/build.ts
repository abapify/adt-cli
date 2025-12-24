/**
 * XML Builder for W3C Schema (Walker-based implementation)
 *
 * Build XML string from typed JavaScript object using W3C-compliant Schema definition.
 * Uses the walker module for schema traversal.
 */

import { XMLSerializer } from '@xmldom/xmldom';
import type { SchemaLike, ComplexTypeLike, ElementLike } from '../infer';
import {
  findComplexType,
  findElement,
  walkElements,
  walkAttributes,
  stripNsPrefix,
} from '../walker';
import {
  type XmlDocument,
  type XmlElement,
  getSchemaPrefix,
  createXmlDocument,
  createRootElement,
  formatValue,
  formatXml,
} from './build-utils';

/**
 * Get the namespace prefix for a schema's targetNamespace from the root schema's $xmlns
 */
function getPrefixForSchema(
  schema: SchemaLike,
  rootSchema: SchemaLike,
): string | undefined {
  const targetNs = (schema as { targetNamespace?: string }).targetNamespace;
  if (!targetNs) return undefined;

  const xmlns = (rootSchema as { $xmlns?: Record<string, string> }).$xmlns;
  if (!xmlns) return undefined;

  // Find prefix that maps to this namespace
  for (const [prefix, ns] of Object.entries(xmlns)) {
    if (ns === targetNs) {
      return prefix;
    }
  }
  return undefined;
}

export type { BuildOptions } from './build-utils';
export { type XmlDocument, type XmlElement } from './build-utils';

import type { BuildOptions } from './build-utils';

/**
 * Build XML string from typed object using schema definition
 */
export function build<T extends SchemaLike>(
  schema: T,
  data: unknown,
  options: BuildOptions = {},
): string {
  const { xmlDecl = true, encoding = 'utf-8', pretty = false } = options;
  const prefix = options.prefix ?? getSchemaPrefix(schema);

  const doc = createXmlDocument(schema);

  // Find the element declaration - either by name or by matching data
  let elementDecl: ElementLike | undefined;
  let elementSchema: SchemaLike = schema;
  let elementData = data as Record<string, unknown>;

  if (options.rootElement) {
    // Search in main schema and $imports
    const found = findElement(options.rootElement, schema);
    if (!found) {
      throw new Error(`Element '${options.rootElement}' not found in schema`);
    }
    elementDecl = found.element;
    elementSchema = found.schema;
    // If data is wrapped with root element name, unwrap it
    if (elementData[options.rootElement] !== undefined) {
      elementData = elementData[options.rootElement] as Record<string, unknown>;
    }
  } else {
    // Check if data is wrapped with element name (new format from parse())
    // Data format: { elementName: { ...content } }
    const dataKeys = Object.keys(elementData);
    if (dataKeys.length === 1) {
      const potentialElementName = dataKeys[0];
      const found = findElement(potentialElementName, schema);
      if (found) {
        elementDecl = found.element;
        elementSchema = found.schema;
        // Unwrap the data
        elementData = elementData[potentialElementName] as Record<
          string,
          unknown
        >;
      }
    }

    // Fallback to matching by data structure if not wrapped
    if (!elementDecl) {
      elementDecl = findMatchingElement(elementData, schema);
      if (!elementDecl) {
        throw new Error('Schema has no element declarations');
      }
    }
  }

  // Get the complexType - either inline or by reference
  let rootType: ComplexTypeLike;
  let rootSchema: SchemaLike = elementSchema;

  if (elementDecl.complexType) {
    rootType = elementDecl.complexType as ComplexTypeLike;
  } else if (elementDecl.type) {
    const typeName = stripNsPrefix(elementDecl.type);
    const rootTypeEntry = findComplexType(typeName, elementSchema);
    if (!rootTypeEntry) {
      throw new Error(`Schema missing complexType for: ${typeName}`);
    }
    rootType = rootTypeEntry.ct;
    rootSchema = rootTypeEntry.schema;
  } else {
    throw new Error(
      `Element ${elementDecl.name} has no type or inline complexType`,
    );
  }

  // Create root element with namespace declarations
  const elementName = elementDecl.name ?? elementDecl.ref;
  if (!elementName) {
    throw new Error('Element declaration has no name or ref');
  }
  const root = createRootElement(doc, elementName, schema, prefix);

  buildElement(doc, root, elementData, rootType, rootSchema, schema, prefix);

  // Ensure root element is never self-closing (SAP ADT requires closing tags)
  // If root has no child nodes, add an empty text node to force </element> instead of />
  if (!root.hasChildNodes()) {
    root.appendChild(doc.createTextNode(''));
  }

  doc.appendChild(root);

  let xml = new XMLSerializer().serializeToString(doc);

  if (xmlDecl) {
    xml = `<?xml version="1.0" encoding="${encoding}"?>\n${xml}`;
  }

  if (pretty) {
    xml = formatXml(xml);
  }

  return xml;
}

/**
 * Find the element declaration that best matches the data structure.
 * Searches in the main schema first, then in $imports.
 */
function findMatchingElement(
  data: Record<string, unknown>,
  schema: SchemaLike,
): ElementLike | undefined {
  const dataKeys = new Set(Object.keys(data));
  let bestMatch: ElementLike | undefined;
  let bestScore = -1;

  // Helper to score an element against the data
  const scoreElement = (
    element: ElementLike,
    searchSchema: SchemaLike,
  ): number => {
    let ct: ComplexTypeLike | undefined;
    let ctSchema: SchemaLike = searchSchema;

    // Handle inline complexType
    if (element.complexType) {
      ct = element.complexType as ComplexTypeLike;
    } else if (element.type) {
      const typeName = stripNsPrefix(element.type);
      const typeEntry = findComplexType(typeName, searchSchema);
      if (typeEntry) {
        ct = typeEntry.ct;
        ctSchema = typeEntry.schema;
      }
    }

    if (!ct) return 0;

    // Get all field names from this type using walker
    const typeFields = new Set<string>();
    for (const { element: el } of walkElements(ct, ctSchema)) {
      if (el.name) typeFields.add(el.name);
    }
    for (const { attribute } of walkAttributes(ct, ctSchema)) {
      if (attribute.name) typeFields.add(attribute.name);
    }

    let score = 0;
    dataKeys.forEach((key) => {
      if (typeFields.has(key)) score++;
    });
    return score;
  };

  // Search in main schema first
  const elements = schema.element;
  if (elements && elements.length > 0) {
    for (const element of elements) {
      const score = scoreElement(element, schema);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = element;
      }
    }
  }

  // Search in $imports if no good match found in main schema
  const imports = schema.$imports as SchemaLike[] | undefined;
  if (imports) {
    for (const importedSchema of imports) {
      const importedElements = importedSchema.element;
      if (!importedElements) continue;

      for (const element of importedElements) {
        const score = scoreElement(element, importedSchema);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = element;
        }
      }
    }
  }

  // Fallback to first element if no match found
  if (!bestMatch && elements && elements.length > 0) {
    return elements[0];
  }

  return bestMatch;
}

/**
 * Build element content using its complexType definition
 * Uses walker to iterate elements and attributes (handles inheritance automatically)
 * @param rootSchema - The original schema passed to build(), used for substitution group lookup
 */
function buildElement(
  doc: XmlDocument,
  node: XmlElement,
  data: Record<string, unknown>,
  typeDef: ComplexTypeLike,
  schema: SchemaLike,
  rootSchema: SchemaLike,
  prefix: string | undefined,
): void {
  // Build attributes using walker (handles inheritance)
  // The walker now returns the schema where each attribute is defined,
  // which is critical for correct namespace prefix resolution in inherited types
  for (const { attribute, schema: attrSchema } of walkAttributes(
    typeDef,
    schema,
  )) {
    if (!attribute.name) continue;
    const value = data[attribute.name];
    if (value !== undefined && value !== null) {
      // Check attributeFormDefault - attributes get prefix when "qualified"
      // Use the schema where the attribute is defined (from walker), not the current schema
      const attributeFormDefault = (
        attrSchema as { attributeFormDefault?: string }
      ).attributeFormDefault;
      const attrForm = (attribute as { form?: string }).form;

      let attrName = attribute.name;
      // Priority: 1. Per-attribute form, 2. Schema attributeFormDefault
      if (
        attrForm === 'qualified' ||
        (attrForm !== 'unqualified' && attributeFormDefault === 'qualified')
      ) {
        // Get prefix for the attribute's defining schema's namespace
        const attrPrefix = getPrefixForSchema(attrSchema, rootSchema);
        if (attrPrefix) {
          attrName = `${attrPrefix}:${attribute.name}`;
        }
      }
      node.setAttribute(
        attrName,
        formatValue(value, attribute.type || 'string'),
      );
    }
  }

  // Build child elements using walker (handles inheritance, groups, refs)
  for (const { element } of walkElements(typeDef, schema)) {
    // Check if this is a ref to an abstract element
    if (element.ref) {
      const refName = stripNsPrefix(element.ref);
      const refElement = findElement(refName, schema);

      if (refElement && refElement.element.abstract) {
        // Abstract element - find substitutes in data using rootSchema
        const substitutes = findSubstitutes(refName, rootSchema);
        for (const substitute of substitutes) {
          const subName = substitute.element.name;
          if (!subName) continue;

          const value = data[subName];
          if (value !== undefined) {
            const typeName = substitute.element.type
              ? stripNsPrefix(substitute.element.type)
              : undefined;
            buildField(
              doc,
              node,
              value,
              subName,
              typeName,
              substitute.schema,
              rootSchema,
              prefix,
            );
          }
        }
        continue;
      }
    }

    const resolved = resolveElementInfo(element, schema);
    if (!resolved) continue;

    const value = data[resolved.dataKey];
    if (value !== undefined) {
      buildFieldWithTagName(
        doc,
        node,
        value,
        resolved.tagName,
        resolved.typeName,
        resolved.inlineComplexType,
        resolved.elementSchema,
        rootSchema,
        prefix,
        resolved.form,
      );
    }
  }
}

/**
 * Resolve element info (name and type), handling ref
 *
 * Returns:
 * - tagName: The XML tag name to use (may include prefix like "asx:abap")
 * - dataKey: The key to look up in data object (local name without prefix)
 * - typeName: The type name for building nested content (if type attribute)
 * - inlineComplexType: The inline complexType definition (if present)
 * - elementSchema: The schema where the element was found
 * - form: Per-element form override ("qualified" or "unqualified")
 */
function resolveElementInfo(
  element: ElementLike,
  schema: SchemaLike,
):
  | {
      tagName: string;
      dataKey: string;
      typeName: string | undefined;
      inlineComplexType: ComplexTypeLike | undefined;
      elementSchema: SchemaLike;
      form: string | undefined;
    }
  | undefined {
  // Direct element with name
  if (element.name) {
    return {
      tagName: element.name,
      dataKey: element.name,
      typeName: element.type ? stripNsPrefix(element.type) : undefined,
      inlineComplexType: element.complexType as ComplexTypeLike | undefined,
      elementSchema: schema,
      form: (element as { form?: string }).form,
    };
  }

  // Handle element reference - get type from referenced element declaration
  // IMPORTANT: Keep the original ref (with prefix) for the tag name
  // This ensures elements like ref="asx:abap" render as <asx:abap>
  if (element.ref) {
    const refName = stripNsPrefix(element.ref);
    const refElement = findElement(refName, schema);
    if (refElement) {
      return {
        tagName: element.ref, // Keep original ref with prefix for tag
        dataKey: refElement.element.name ?? refName, // Local name for data lookup
        typeName: refElement.element.type
          ? stripNsPrefix(refElement.element.type)
          : undefined,
        inlineComplexType: refElement.element.complexType as
          | ComplexTypeLike
          | undefined,
        elementSchema: refElement.schema,
        form: undefined, // Refs always use their prefix
      };
    }
    // Fallback: use ref as tag, local name for data
    return {
      tagName: element.ref,
      dataKey: refName,
      typeName: undefined,
      inlineComplexType: undefined,
      elementSchema: schema,
      form: undefined,
    };
  }

  return undefined;
}

/**
 * Build a field (child element)
 *
 * Respects elementFormDefault:
 * - "qualified": local elements get namespace prefix
 * - "unqualified" (default): local elements do NOT get namespace prefix
 */
function buildField(
  doc: XmlDocument,
  parent: XmlElement,
  value: unknown,
  elementName: string,
  typeName: string | undefined,
  schema: SchemaLike,
  rootSchema: SchemaLike,
  prefix: string | undefined,
): void {
  if (value === undefined || value === null) return;

  // Search for nested complexType
  const nestedType = typeName ? findComplexType(typeName, schema) : undefined;

  // Check elementFormDefault - local elements only get prefix when "qualified"
  // Default is "unqualified" per XSD spec
  const elementFormDefault = (rootSchema as { elementFormDefault?: string })
    .elementFormDefault;
  const usePrefix = elementFormDefault === 'qualified' ? prefix : undefined;
  const tagName = usePrefix ? `${usePrefix}:${elementName}` : elementName;

  if (Array.isArray(value)) {
    for (const item of value) {
      const child = doc.createElement(tagName);
      if (nestedType) {
        buildElement(
          doc,
          child,
          item as Record<string, unknown>,
          nestedType.ct,
          nestedType.schema,
          rootSchema,
          prefix,
        );
      } else {
        // Only add text node if value is not empty (allows self-closing tags)
        const text = formatValue(item, typeName || 'string');
        if (text) child.appendChild(doc.createTextNode(text));
      }
      parent.appendChild(child);
    }
  } else {
    const child = doc.createElement(tagName);
    if (nestedType) {
      buildElement(
        doc,
        child,
        value as Record<string, unknown>,
        nestedType.ct,
        nestedType.schema,
        rootSchema,
        prefix,
      );
    } else {
      // Only add text node if value is not empty (allows self-closing tags)
      const text = formatValue(value, typeName || 'string');
      if (text) child.appendChild(doc.createTextNode(text));
    }
    parent.appendChild(child);
  }
}

/**
 * Build a field with an explicit tag name (used for element refs with prefix)
 *
 * Handles three cases:
 * 1. Element refs with prefix (e.g., ref="asx:abap") - use tagName directly
 * 2. Elements with form="unqualified" - never use prefix
 * 3. Direct elements - apply elementFormDefault logic
 */
function buildFieldWithTagName(
  doc: XmlDocument,
  parent: XmlElement,
  value: unknown,
  tagName: string,
  typeName: string | undefined,
  inlineComplexType: ComplexTypeLike | undefined,
  elementSchema: SchemaLike,
  rootSchema: SchemaLike,
  prefix: string | undefined,
  elementForm: string | undefined,
): void {
  if (value === undefined || value === null) return;

  // First check for inline complexType, then search for named type
  let nestedType: { ct: ComplexTypeLike; schema: SchemaLike } | undefined;
  if (inlineComplexType) {
    nestedType = { ct: inlineComplexType, schema: elementSchema };
  } else if (typeName) {
    nestedType = findComplexType(typeName, elementSchema);
  }

  // Determine the actual tag name to use
  // Priority: 1. Per-element form attribute, 2. Schema elementFormDefault
  // If tagName already has a prefix (e.g., "asx:abap"), use it directly
  let actualTagName = tagName;
  if (!tagName.includes(':')) {
    // No prefix in tagName - check element form first, then schema default
    let usePrefix: string | undefined;
    if (elementForm === 'unqualified') {
      // Element explicitly marked as unqualified - no prefix
      usePrefix = undefined;
    } else if (elementForm === 'qualified') {
      // Element explicitly marked as qualified - use prefix
      usePrefix = prefix;
    } else {
      // No element-level form - use schema default
      const elementFormDefault = (rootSchema as { elementFormDefault?: string })
        .elementFormDefault;
      usePrefix = elementFormDefault === 'qualified' ? prefix : undefined;
    }
    actualTagName = usePrefix ? `${usePrefix}:${tagName}` : tagName;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const child = doc.createElement(actualTagName);
      if (nestedType) {
        buildElement(
          doc,
          child,
          item as Record<string, unknown>,
          nestedType.ct,
          nestedType.schema,
          rootSchema,
          prefix,
        );
      } else {
        // Only add text node if value is not empty (allows self-closing tags)
        const text = formatValue(item, typeName || 'string');
        if (text) child.appendChild(doc.createTextNode(text));
      }
      parent.appendChild(child);
    }
  } else {
    const child = doc.createElement(actualTagName);
    if (nestedType) {
      buildElement(
        doc,
        child,
        value as Record<string, unknown>,
        nestedType.ct,
        nestedType.schema,
        rootSchema,
        prefix,
      );
    } else {
      // Only add text node if value is not empty (allows self-closing tags)
      const text = formatValue(value, typeName || 'string');
      if (text) child.appendChild(doc.createTextNode(text));
    }
    parent.appendChild(child);
  }
}

/**
 * Find all elements that substitute for a given abstract element name.
 * Searches in the main schema and all $imports.
 */
function findSubstitutes(
  abstractElementName: string,
  schema: SchemaLike,
): Array<{ element: ElementLike; schema: SchemaLike }> {
  const substitutes: Array<{ element: ElementLike; schema: SchemaLike }> = [];

  // Helper to search in a single schema
  const searchSchema = (s: SchemaLike) => {
    const elements = s.element;
    if (!elements) return;

    for (const el of elements) {
      if (el.substitutionGroup) {
        const subGroupName = stripNsPrefix(el.substitutionGroup);
        if (subGroupName === abstractElementName) {
          substitutes.push({ element: el, schema: s });
        }
      }
    }
  };

  // Search in main schema
  searchSchema(schema);

  // Search in $imports
  const imports = schema.$imports as SchemaLike[] | undefined;
  if (imports) {
    for (const imported of imports) {
      searchSchema(imported);
    }
  }

  return substitutes;
}
