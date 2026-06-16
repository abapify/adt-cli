/**
 * ADT Proxy Server - Content Conversion
 *
 * Handles JSON↔XML conversion using schema parse/build methods.
 * This is the core of the proxy's content negotiation.
 */

import type { Serializable } from '@abapify/speci/rest';

/**
 * Convert a JSON string to XML using a schema's build method.
 */
export function jsonToXml(json: string, schema: Serializable): string {
  try {
    const data = JSON.parse(json);
    if (typeof schema.build === 'function') {
      return schema.build(data);
    }
    return json;
  } catch {
    return json;
  }
}

/**
 * Convert an XML string to JSON using a schema's parse method.
 */
export function xmlToJson(xml: string, schema: Serializable): string {
  try {
    const data = schema.parse(xml);
    return JSON.stringify(data);
  } catch {
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
  if (contentType) {
    const ct = contentType.toLowerCase();
    if (ct.includes('json')) return 'json';
    if (ct.includes('xml')) return 'xml';
    if (ct.includes('text')) return 'text';
    return 'binary';
  }

  const trimmed = content.trimStart();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
  if (trimmed.startsWith('<?xml') || trimmed.startsWith('<')) return 'xml';
  return 'text';
}

/**
 * Check if a content type indicates JSON (case-insensitive).
 */
export function isJsonContentType(contentType: string): boolean {
  const ct = contentType.toLowerCase();
  return ct.includes('json') || ct.endsWith('+json');
}

/**
 * Check if a content type indicates XML (case-insensitive).
 */
export function isXmlContentType(contentType: string): boolean {
  const ct = contentType.toLowerCase();
  return ct.includes('xml') || ct.endsWith('+xml');
}
