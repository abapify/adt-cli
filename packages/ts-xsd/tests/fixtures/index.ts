/**
 * Test fixtures - W3C XMLSchema.xsd loader
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

const W3C_XMLSCHEMA_URL = 'https://www.w3.org/TR/xmlschema11-1/XMLSchema.xsd';
const CACHE_PATH = join(import.meta.dirname, 'cache/W3C-XMLSchema.xsd');

/**
 * Get W3C XMLSchema.xsd content (cached)
 * Downloads on first use, then uses cached version
 */
export async function getW3CSchema(): Promise<string> {
  if (existsSync(CACHE_PATH)) {
    return readFileSync(CACHE_PATH, 'utf-8');
  }

  console.log(`Downloading W3C XMLSchema.xsd from ${W3C_XMLSCHEMA_URL}...`);
  const response = await fetch(W3C_XMLSCHEMA_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch W3C XMLSchema.xsd: ${response.status}`);
  }

  const content = await response.text();

  // Cache for future runs
  mkdirSync(dirname(CACHE_PATH), { recursive: true });
  writeFileSync(CACHE_PATH, content, 'utf-8');
  console.log(`Cached to ${CACHE_PATH}`);

  return content;
}

/**
 * Get cached schema path (for sync access after download)
 */
export function getW3CSchemaPath(): string {
  return CACHE_PATH;
}

/**
 * Check if schema is cached
 */
export function isW3CSchemaCached(): boolean {
  return existsSync(CACHE_PATH);
}
