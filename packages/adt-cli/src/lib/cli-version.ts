import { createRequire } from 'node:module';

/**
 * Resolve the installed CLI version from the package manifest. The
 * '@abapify/adt' standalone bundle package embeds this code under its own
 * name, so the adt-cli self-reference misses there; probe both names.
 */
export function cliVersion(): string {
  const req = createRequire(import.meta.url);
  for (const name of ['@abapify/adt-cli', '@abapify/adt']) {
    try {
      const pkg = req(`${name}/package.json`) as { version?: string };
      if (pkg.version) return pkg.version;
    } catch {
      // try the next package name
    }
  }
  return '0.0.0';
}
