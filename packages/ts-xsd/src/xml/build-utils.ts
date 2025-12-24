/**
 * Shared utilities for XML builders
 */

import type { Document, Element } from '@xmldom/xmldom';
import { DOMImplementation } from '@xmldom/xmldom';
import type { SchemaLike, ComplexTypeLike, ElementLike } from '../infer';
import { findComplexType, stripNsPrefix } from '../walker';

// Re-export xmldom types for use in other modules
export type XmlDocument = Document;
export type XmlElement = Element;

export interface BuildOptions {
  /** Include XML declaration (default: true) */
  xmlDecl?: boolean;
  /** XML encoding (default: utf-8) */
  encoding?: string;
  /** Pretty print with indentation (default: false) */
  pretty?: boolean;
  /** Namespace prefix to use (default: from schema or none) */
  prefix?: string;
  /** Root element name to use (default: auto-detect from data) */
  rootElement?: string;
}

/**
 * Get namespace prefix from schema $xmlns declarations
 */
export function getSchemaPrefix(schema: SchemaLike): string | undefined {
  if (!schema.$xmlns || !schema.targetNamespace) return undefined;

  for (const [prefix, uri] of Object.entries(schema.$xmlns)) {
    if (uri === schema.targetNamespace && prefix) {
      return prefix;
    }
  }
  return undefined;
}

/**
 * Create XML document with namespace
 */
export function createXmlDocument(schema: SchemaLike): XmlDocument {
  const impl = new DOMImplementation();
  const ns = schema.targetNamespace || null;
  return impl.createDocument(ns, '', null);
}

/**
 * Collect all namespace declarations from a schema and its $imports recursively
 */
function collectAllNamespaces(
  schema: SchemaLike,
  collected: Map<string, string> = new Map(),
  visited: Set<unknown> = new Set(),
): Map<string, string> {
  // Prevent infinite recursion
  if (visited.has(schema)) return collected;
  visited.add(schema);

  // Add namespaces from this schema's $xmlns
  if (schema.$xmlns) {
    for (const [pfx, uri] of Object.entries(schema.$xmlns)) {
      if (!collected.has(pfx)) {
        collected.set(pfx, uri as string);
      }
    }
  }

  // Recursively collect from $imports
  const imports = (schema as { $imports?: SchemaLike[] }).$imports;
  if (imports) {
    for (const imported of imports) {
      collectAllNamespaces(imported, collected, visited);
    }
  }

  // Also collect from $includes
  const includes = (schema as { $includes?: SchemaLike[] }).$includes;
  if (includes) {
    for (const included of includes) {
      collectAllNamespaces(included, collected, visited);
    }
  }

  return collected;
}

/**
 * Create root element with namespace declarations
 *
 * When elementFormDefault="unqualified", the root element should NOT have
 * a namespace prefix. This is important for formats like abapGit where
 * the root element (abapGit) is unqualified but child elements may have prefixes.
 */
export function createRootElement(
  doc: XmlDocument,
  elementName: string,
  schema: SchemaLike,
  prefix: string | undefined,
): XmlElement {
  const ns = schema.targetNamespace || null;

  // Check elementFormDefault - when "unqualified", root element should NOT have prefix
  // This follows the abapGit pattern where root is unqualified but xmlns:asx is declared
  const elementFormDefault = (schema as { elementFormDefault?: string })
    .elementFormDefault;
  const usePrefix = elementFormDefault === 'unqualified' ? undefined : prefix;

  const rootTag = usePrefix ? `${usePrefix}:${elementName}` : elementName;
  const root = doc.createElement(rootTag);

  // Add namespace declaration for the prefix (even if root doesn't use it)
  // This allows child elements to use the prefix
  if (ns && prefix) {
    root.setAttribute(`xmlns:${prefix}`, ns);
  } else if (ns && !prefix) {
    root.setAttribute('xmlns', ns);
  }

  // Collect ALL namespace declarations from schema and its $imports recursively
  // This ensures that namespaces used by inherited types are declared
  const allNamespaces = collectAllNamespaces(schema);

  for (const [pfx, uri] of allNamespaces) {
    if (pfx && pfx !== prefix) {
      root.setAttribute(`xmlns:${pfx}`, uri);
    } else if (!pfx) {
      root.setAttribute('xmlns', uri);
    }
  }

  return root;
}

/**
 * Find element declaration by name or auto-detect from data
 */
export function findElementDeclaration(
  schema: SchemaLike,
  rootElement?: string,
  _data?: Record<string, unknown>,
): ElementLike {
  if (rootElement) {
    const elementDecl = schema.element?.find((e) => e.name === rootElement);
    if (!elementDecl) {
      throw new Error(`Element '${rootElement}' not found in schema`);
    }
    return elementDecl;
  }

  // Auto-detect from data
  const elements = schema.element;
  if (!elements || elements.length === 0) {
    throw new Error('Schema has no element declarations');
  }

  if (elements.length === 1) {
    return elements[0];
  }

  // Multiple elements - find best match (caller should provide findMatchingElement)
  return elements[0];
}

/**
 * Get complexType for an element declaration
 */
export function getElementComplexType(
  elementDecl: ElementLike,
  schema: SchemaLike,
): { type: ComplexTypeLike; schema: SchemaLike } {
  if (elementDecl.complexType) {
    return { type: elementDecl.complexType as ComplexTypeLike, schema };
  }

  if (elementDecl.type) {
    const typeName = stripNsPrefix(elementDecl.type);
    const typeEntry = findComplexType(typeName, schema);
    if (!typeEntry) {
      throw new Error(`Schema missing complexType for: ${typeName}`);
    }
    return { type: typeEntry.ct, schema: typeEntry.schema };
  }

  throw new Error(
    `Element ${elementDecl.name} has no type or inline complexType`,
  );
}

/**
 * Format value for XML output
 */
export function formatValue(value: unknown, type: string): string {
  if (value instanceof Date) {
    const localType = stripNsPrefix(type);
    return localType === 'date'
      ? value.toISOString().split('T')[0]
      : value.toISOString();
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  return String(value);
}

/**
 * Simple XML formatter (basic indentation)
 *
 * Keeps text content inline: <tag>text</tag>
 * Only adds newlines for nested elements
 */
export function formatXml(xml: string): string {
  let formatted = '';
  let indent = 0;
  const parts = xml.split(/(<[^>]+>)/g).filter(Boolean);
  let lastWasText = false;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const nextPart = parts[i + 1];

    if (part.startsWith('<?')) {
      formatted += part + '\n';
      lastWasText = false;
    } else if (part.startsWith('</')) {
      indent = Math.max(0, indent - 1);
      if (lastWasText) {
        // Text content before closing tag - keep inline
        formatted += part + '\n';
      } else {
        formatted += '  '.repeat(indent) + part + '\n';
      }
      lastWasText = false;
    } else if (part.startsWith('<') && part.endsWith('/>')) {
      formatted += '  '.repeat(indent) + part + '\n';
      lastWasText = false;
    } else if (part.startsWith('<')) {
      formatted += '  '.repeat(indent) + part;
      if (!part.includes('</')) {
        indent++;
      }
      // Check if next part is text content (not a tag)
      if (nextPart && !nextPart.startsWith('<')) {
        // Don't add newline - text content follows
      } else {
        formatted += '\n';
      }
      lastWasText = false;
    } else {
      // Text content - keep inline with opening tag
      const trimmed = part.trim();
      if (trimmed) {
        formatted += trimmed;
        lastWasText = true;
      }
    }
  }

  return formatted.trim();
}

/**
 * Add XML declaration to string
 */
export function addXmlDeclaration(xml: string, encoding: string): string {
  return `<?xml version="1.0" encoding="${encoding}"?>\n${xml}`;
}
