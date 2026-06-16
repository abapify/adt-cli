/**
 * ADT Proxy Server - Content Conversion
 *
 * Handles JSON↔XML conversion using schema parse/build methods.
 * This is the core of the proxy's content negotiation.
 */

import type { Serializable } from '@abapify/speci/rest';

/**
 * Convert a JSON string to XML using a schema's build method.
 *
 * @param json - The JSON string to convert
 * @param schema - The schema with a build() method
 * @returns The XML string, or the original JSON if conversion fails
 */
export function jsonToXml(json: string, schema: Serializable): string {
  try {
    const data = JSON.parse(json);
    if (typeof schema.build === 'function') {
      return schema.build(data);
    }
    // No build method - return as-is
    return json;
  } catch {
    // If parsing fails, return the original string
    return json;
  }
}

/**
 * Convert an XML string to JSON using a schema's parse method.
 *
 * @param xml - The XML string to convert
 * @param schema - The schema with a parse() method
 * @returns The JSON string, or the original XML if conversion fails
 */
export function xmlToJson(xml: string, schema: Serializable): string {
  try {
    const data = schema.parse(xml);
    return JSON.stringify(data);
  } catch {
    // If parsing fails, return the original string
    return xml;
  }
}

/**
 * Detect content type from a string or content-type header.
 */
export function detectContentType(
  content: string,
  contentType?: string,
): 'json' | 'xml' | 'text' | 'binary' {
  // Check explicit content-type header first
  if (contentType) {
    if (contentType.includes('json')) return 'json';
    if (contentType.includes('xml')) return 'xml';
    if (contentType.includes('text')) return 'text';
    return 'binary';
  }

  // Heuristic detection
  const trimmed = content.trimStart();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
  if (trimmed.startsWith('<?xml') || trimmed.startsWith('<')) return 'xml';
  return 'text';
}

/**
 * Check if a content type indicates JSON.
 */
export function isJsonContentType(contentType: string): boolean {
  return contentType.includes('json') || contentType.endsWith('+json');
}

/**
 * Check if a content type indicates XML.
 */
export function isXmlContentType(contentType: string): boolean {
  return contentType.includes('xml') || contentType.endsWith('+xml');
}
