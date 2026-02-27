/**
 * DOM Utilities for XML parsing/building
 *
 * Shared utilities for working with xmldom elements.
 * These handle namespace-aware attribute/element access.
 * Uses xmldom's native iterators where possible.
 */

import type { Element, Node } from '@xmldom/xmldom';

/**
 * Type guard to check if a Node is an Element
 */
function isElement(node: Node): node is Element {
  return node.nodeType === 1; // ELEMENT_NODE
}

/**
 * Get attribute value, handling namespaced attributes
 * Tries direct attribute first, then searches by local name
 */
export function getAttributeValue(node: Element, name: string): string | null {
  // Try direct attribute
  if (node.hasAttribute(name)) {
    return node.getAttribute(name);
  }

  // Try with any namespace prefix (search by local name)
  // NamedNodeMap is iterable in xmldom
  for (const attr of node.attributes) {
    const localName = attr.localName || attr.name.split(':').pop();
    if (localName === name) {
      return attr.value;
    }
  }

  return null;
}

/**
 * Get child elements by local name (namespace-agnostic)
 * Uses for...of since NodeList is iterable in xmldom
 */
export function getChildElements(parent: Element, name: string): Element[] {
  const result: Element[] = [];
  // NodeList implements Iterable<Node> in xmldom
  for (const child of parent.childNodes) {
    if (isElement(child)) {
      const localName = child.localName || child.tagName.split(':').pop();
      if (localName === name) {
        result.push(child);
      }
    }
  }
  return result;
}

/**
 * Get all child elements (any name)
 * Uses for...of since NodeList is iterable in xmldom
 */
export function getAllChildElements(parent: Element): Element[] {
  const result: Element[] = [];
  for (const child of parent.childNodes) {
    if (isElement(child)) {
      result.push(child);
    }
  }
  return result;
}

/**
 * Get text content of an element (concatenates all text nodes)
 */
export function getTextContent(node: Element): string {
  let text = '';
  for (const child of node.childNodes) {
    if (child.nodeType === 3) {
      // TEXT_NODE
      text += child.textContent || '';
    }
  }
  return text.trim();
}

/**
 * Get local name of an element (strips namespace prefix)
 */
export function getLocalName(node: Element): string {
  return node.localName || node.tagName.split(':').pop() || node.tagName;
}

/**
 * Check if element has a specific local name (case-insensitive option)
 */
export function hasLocalName(
  node: Element,
  name: string,
  caseInsensitive = false,
): boolean {
  const localName = getLocalName(node);
  if (caseInsensitive) {
    return localName.toLowerCase() === name.toLowerCase();
  }
  return localName === name;
}
