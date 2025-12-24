/**
 * Discovery XML Parser
 *
 * Parses SAP ADT discovery XML and extracts collection metadata
 * for contract generation.
 */

import { XMLParser } from 'fast-xml-parser';

export interface CollectionData {
  href: string;
  title: string;
  accepts: string[];
  category: { term: string; scheme: string };
  templateLinks: Array<{ rel: string; template: string }>;
}

export interface WorkspaceData {
  title: string;
  collections: CollectionData[];
}

export interface DiscoveryData {
  workspaces: WorkspaceData[];
}

/**
 * Parse discovery XML into structured data
 */
export function parseDiscoveryXml(xml: string): DiscoveryData {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    removeNSPrefix: false,
  });

  const parsed = parser.parse(xml);
  const service = parsed['app:service'];

  if (!service) {
    throw new Error('Invalid discovery XML: missing app:service element');
  }

  const workspacesRaw = service['app:workspace'];
  const workspacesArray = Array.isArray(workspacesRaw)
    ? workspacesRaw
    : [workspacesRaw];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workspaces: WorkspaceData[] = workspacesArray.map(
    (ws: Record<string, any>) => {
      const collectionsRaw = ws['app:collection'];
      const collectionsArray = collectionsRaw
        ? Array.isArray(collectionsRaw)
          ? collectionsRaw
          : [collectionsRaw]
        : [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const collections: CollectionData[] = collectionsArray.map(
        (coll: Record<string, any>) => {
          // Parse accepts
          const acceptsRaw = coll['app:accept'];
          const accepts = acceptsRaw
            ? Array.isArray(acceptsRaw)
              ? acceptsRaw
              : [acceptsRaw]
            : [];

          // Parse category
          const categoryRaw = coll['atom:category'];
          const category = categoryRaw
            ? {
                term: categoryRaw['@_term'] || '',
                scheme: categoryRaw['@_scheme'] || '',
              }
            : { term: '', scheme: '' };

          // Parse template links
          const templateLinksContainer = coll['adtcomp:templateLinks'];
          const templateLinksRaw =
            templateLinksContainer?.['adtcomp:templateLink'];
          const templateLinks = templateLinksRaw
            ? (Array.isArray(templateLinksRaw)
                ? templateLinksRaw
                : [templateLinksRaw]
              )
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map((tl: Record<string, any>) => ({
                  rel: tl['@_rel'] || '',
                  template: tl['@_template'] || '',
                }))
            : [];

          return {
            href: cleanUrl(coll['@_href'] || ''),
            title: coll['atom:title'] || '',
            accepts,
            category,
            templateLinks,
          };
        },
      );

      return {
        title: ws['atom:title'] || '',
        collections,
      };
    },
  );

  return { workspaces };
}

/**
 * Remove protocol and host from URL, keeping only the path
 */
function cleanUrl(url: string): string {
  if (!url) return url;
  return url.replace(/^https?:\/\/[^/]+/, '');
}

/**
 * Flatten all collections from all workspaces
 */
export function getAllCollections(discovery: DiscoveryData): CollectionData[] {
  return discovery.workspaces.flatMap((ws) => ws.collections);
}
