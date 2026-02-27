import {
  local,
  remote,
  PackageMapping,
  ImportContext,
  ExportContext,
} from './types';

export class PackageMapper {
  constructor(private mapping: PackageMapping) {}

  /**
   * Convert remote (SAP) package name to local project package name
   */
  toLocal(remotePkg: string, context?: ImportContext): string {
    // 1. Try static mapping first (reverse lookup)
    const staticMatch = Object.entries(this.mapping).find(
      ([localName, remoteName]) =>
        typeof remoteName === 'string' && remoteName === remotePkg,
    );

    if (staticMatch) {
      return staticMatch[0];
    }

    // 2. Use transform function if available
    const transform = this.mapping[local];
    if (transform && typeof transform === 'function') {
      return transform(remotePkg, context);
    }

    // 3. Default fallback - use remote name as-is (lowercase)
    return remotePkg.toLowerCase();
  }

  /**
   * Convert local project package name to remote (SAP) package name
   */
  toRemote(localPkg: string, context?: ExportContext): string {
    // 1. Try static mapping first (direct lookup)
    const staticMapping = this.mapping[localPkg];
    if (typeof staticMapping === 'string') {
      return staticMapping;
    }

    // 2. Use transform function if available
    const transform = this.mapping[remote];
    if (transform && typeof transform === 'function') {
      return transform(localPkg, context);
    }

    // 3. Default fallback - use local name as-is (uppercase)
    return localPkg.toUpperCase();
  }

  /**
   * Get all static package mappings (excludes Symbol-based transforms)
   */
  getStaticMappings(): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(this.mapping)) {
      if (typeof key === 'string' && typeof value === 'string') {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Check if mapping has transform functions defined
   */
  hasTransforms(): { local: boolean; remote: boolean } {
    return {
      local: typeof this.mapping[local] === 'function',
      remote: typeof this.mapping[remote] === 'function',
    };
  }
}
