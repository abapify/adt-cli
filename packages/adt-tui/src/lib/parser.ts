/**
 * XML Response Parser
 *
 * Parses ADT XML responses and extracts hypermedia links.
 */

import { XMLParser } from 'fast-xml-parser';
import type { ParsedResponse, HypermediaLink } from './types';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: false,
  parseAttributeValue: true,
  trimValues: true,
});

/**
 * Extract all atom:link elements from parsed XML object
 */
function extractLinks(
  obj: unknown,
  links: HypermediaLink[] = [],
): HypermediaLink[] {
  if (!obj || typeof obj !== 'object') return links;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      extractLinks(item, links);
    }
  } else {
    const record = obj as Record<string, unknown>;

    const linkKey = Object.keys(record).find(
      (k) => k === 'atom:link' || k === 'link' || k.endsWith(':link'),
    );

    if (linkKey) {
      const linkData = record[linkKey];
      const linkArray = Array.isArray(linkData) ? linkData : [linkData];

      for (const link of linkArray) {
        if (link && typeof link === 'object') {
          const linkObj = link as Record<string, unknown>;
          const href = linkObj['@_href'] as string;
          const rel = linkObj['@_rel'] as string;

          if (href && rel) {
            links.push({
              href,
              rel,
              type: linkObj['@_type'] as string | undefined,
              title: linkObj['@_title'] as string | undefined,
            });
          }
        }
      }
    }

    for (const key of Object.keys(record)) {
      if (key !== linkKey) {
        extractLinks(record[key], links);
      }
    }
  }

  return links;
}

/**
 * Detect root element and namespace from parsed XML
 */
function detectRootInfo(data: Record<string, unknown>): {
  namespace?: string;
  rootElement?: string;
} {
  const keys = Object.keys(data).filter((k) => k !== '?xml');
  if (keys.length === 0) return {};

  const rootKey = keys[0];
  const colonIndex = rootKey.indexOf(':');

  if (colonIndex > 0) {
    return {
      namespace: rootKey.substring(0, colonIndex),
      rootElement: rootKey.substring(colonIndex + 1),
    };
  }

  return { rootElement: rootKey };
}

/**
 * Parse ADT XML response
 */
export function parseResponse(xml: string): ParsedResponse {
  const data = parser.parse(xml) as Record<string, unknown>;
  const links = extractLinks(data);
  const { namespace, rootElement } = detectRootInfo(data);

  return {
    raw: xml,
    data,
    links,
    namespace,
    rootElement,
  };
}

/**
 * Get action name from relation URL
 */
export function getActionName(rel: string): string {
  const lastSlash = rel.lastIndexOf('/');
  return lastSlash >= 0 ? rel.substring(lastSlash + 1) : rel;
}

/**
 * Categorize links by type
 */
export function categorizeLinks(links: HypermediaLink[]): {
  navigation: HypermediaLink[];
  actions: HypermediaLink[];
  self: HypermediaLink[];
} {
  const navigation: HypermediaLink[] = [];
  const actions: HypermediaLink[] = [];
  const self: HypermediaLink[] = [];

  for (const link of links) {
    if (link.rel === 'self') {
      self.push(link);
    } else if (
      link.rel.includes('/relations/') ||
      link.rel.includes('adturi')
    ) {
      actions.push(link);
    } else {
      navigation.push(link);
    }
  }

  return { navigation, actions, self };
}
