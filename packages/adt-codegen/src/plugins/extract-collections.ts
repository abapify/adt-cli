/**
 * Extract Collections Plugin
 *
 * Extracts collection metadata and writes to JSON files
 */

import { definePlugin } from '../plugin';
import type { CodegenPlugin } from '../types';

/**
 * Remove protocol and host from URL, keeping only the path
 */
function cleanUrl(url: string): string {
  if (!url) return url;
  // Remove protocol and host if present (e.g., https://host:443/path -> /path)
  return url.replace(/^https?:\/\/[^/]+/, '');
}

/**
 * Sanitize a path component for use in file system
 */
function sanitizePath(path: string): string {
  // First clean the URL
  const cleanPath = cleanUrl(path);

  return cleanPath
    .replace(/^\/+/, '') // Remove leading slashes
    .replace(/\/+$/, '') // Remove trailing slashes
    .replace(/[<>:"|?*]/g, '-') // Replace invalid chars
    .replace(/\s+/g, '-'); // Replace spaces with dashes
}

export interface CollectionData {
  href: string;
  title: string;
  accepts: string[];
  category: { term: string; scheme: string };
  templateLinks: any[];
}

export interface ExtractCollectionsOptions {
  /**
   * Output path template for collection files
   *
   * Can be:
   * - String with placeholders: `'collections/{href}/{title}.json'`
   * - Function: `(collection) => \`collections/\${collection.href}/\${collection.category.term}.json\``
   *
   * @default 'collections.json' (single file per workspace)
   */
  output?: string | ((collection: CollectionData) => string);

  /**
   * If true, assert that each output path is unique (no overwrites)
   * Throws error if duplicate paths are detected
   *
   * @default false
   */
  unique?: boolean;
}

/**
 * Factory function to create extract collections plugin
 */
export function extractCollections(
  options: ExtractCollectionsOptions = {}
): CodegenPlugin {
  const { output = 'collections.json', unique = false } = options;

  return definePlugin({
    name: 'extract-collections',

    hooks: {
      workspace(ws) {
        // Collections are extracted by framework, store in workspace data
        const collections = ws.xml['app:collection'];
        if (!collections) {
          ws.data.collections = [];
          return;
        }

        const collectionsArray = Array.isArray(collections)
          ? collections
          : [collections];

        ws.data.collections = collectionsArray.map((coll: any) => ({
          href: coll['@_href'],
          title: coll['atom:title'],
          category: coll['atom:category']?.['@_term'] || '',
        }));
      },

      async collection(coll) {
        // Store collection info in workspace data
        if (!coll.workspace.data.collectionDetails) {
          coll.workspace.data.collectionDetails = [];
        }

        coll.workspace.data.collectionDetails.push({
          href: cleanUrl(coll.href),
          title: coll.title,
          accepts: coll.accepts,
          category: coll.category,
          templateLinks: coll.templateLinks,
        });
      },

      async finalize(ctx) {
        const isFunction = typeof output === 'function';
        const isTemplate = typeof output === 'string' && output.includes('{');

        if (isFunction || isTemplate) {
          // Track file paths for uniqueness check
          const seenPaths = new Set<string>();

          // Write individual files per collection
          for (const ws of ctx.workspaces) {
            if (ws.data.collectionDetails) {
              for (const coll of ws.data.collectionDetails) {
                let filePath: string;

                if (isFunction) {
                  // Call function with collection data
                  filePath = output(coll);
                } else {
                  // Replace placeholders
                  filePath = output
                    .replace(/{href}/g, sanitizePath(coll.href || 'unknown'))
                    .replace(/{title}/g, sanitizePath(coll.title || 'unknown'))
                    .replace(
                      /{category}/g,
                      sanitizePath(coll.category?.term || 'unknown')
                    );
                }

                // Check uniqueness if enabled
                if (unique) {
                  if (seenPaths.has(filePath)) {
                    throw new Error(
                      `Duplicate output path detected: "${filePath}"\n` +
                        `Collection: ${coll.title} (${coll.href})\n` +
                        `Enable unique: true requires each collection to have a unique output path.`
                    );
                  }
                  seenPaths.add(filePath);
                }

                await ws.writeFile(filePath, JSON.stringify(coll, null, 2));
              }

              ctx.logger.success(
                `Wrote ${ws.data.collectionDetails.length} collection files for ${ws.folderName}`
              );
            }
          }
        } else {
          // Write single collections.json per workspace
          for (const ws of ctx.workspaces) {
            if (ws.data.collectionDetails) {
              await ws.writeFile(
                output as string,
                JSON.stringify(ws.data.collectionDetails, null, 2)
              );

              ctx.logger.success(
                `Wrote ${ws.folderName}/${output} (${ws.data.collectionDetails.length} collections)`
              );
            }
          }
        }
      },
    },
  });
}

/**
 * Default plugin instance for backward compatibility
 */
export const extractCollectionsPlugin = extractCollections();
