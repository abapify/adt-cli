import { readFileSync, existsSync } from 'fs';
import type { Destination } from '../auth-manager';
import { ServiceKeyParser, type BTPServiceKey } from '../types/service-key';

/**
 * Read a BTP service key from a file path.
 *
 * @param filePath - Path to a JSON file containing the BTP service key
 * @returns Parsed and validated `BTPServiceKey`
 * @throws Error if the input looks like raw JSON (a file path is required)
 * @throws Error if the file does not exist
 */
export function readServiceKey(filePath: string): BTPServiceKey {
  const trimmed = filePath.trim();

  if (trimmed.startsWith('{')) {
    throw new Error(
      'Expected a path to a JSON file, but received a raw JSON string.\n' +
        'Write the service key JSON to a file and pass the file path instead.\n' +
        'Example: /path/to/service-key.json',
    );
  }

  if (!existsSync(trimmed)) {
    throw new Error(`Service key file not found: ${trimmed}`);
  }

  const raw = readFileSync(trimmed, 'utf-8');
  return ServiceKeyParser.parse(raw);
}

/**
 * Resolves a service key destination from the `ADT_SERVICE_KEY` environment
 * variable.
 *
 * The value can be a path to a JSON file or a raw JSON string (for backward
 * compatibility with CI pipelines that store the key as a secret JSON value).
 *
 * @returns A `Destination` object for the service-key plugin, or `null` if
 *   `ADT_SERVICE_KEY` is not set.
 */
export function resolveServiceKeyFromEnv(): Destination | null {
  const raw = process.env['ADT_SERVICE_KEY'];

  if (!raw) {
    return null;
  }

  const trimmed = raw.trim();

  // Accept both a raw JSON string and a file path so that CI environments that
  // store the key as a secret JSON value continue to work without changes.
  let serviceKey: BTPServiceKey;
  if (trimmed.startsWith('{')) {
    serviceKey = ServiceKeyParser.parse(trimmed);
  } else {
    serviceKey = readServiceKey(trimmed);
  }

  return {
    type: '@abapify/adt-auth/plugins/service-key',
    options: {
      url: serviceKey.url,
      serviceKey,
    },
  };
}
