/**
 * abapGit Folder Logic
 *
 * Shared functions for resolving SAP package names from directory paths
 * using abapGit's folder logic (PREFIX/FULL).
 *
 * Used by both the serializer (import: SAP → Git) and deserializer (export: Git → SAP).
 */

export type FolderLogic = 'prefix' | 'full' | 'full-with-root';

export function stripSlashes(s: string): string {
  let start = 0;
  let end = s.length;
  while (start < end && s[start] === '/') start++;
  while (end > start && s[end - 1] === '/') end--;
  return s.slice(start, end);
}

/**
 * Parse FOLDER_LOGIC from .abapgit.xml content
 */
export function parseFolderLogicFromAbapGitXml(
  xmlContent: string,
): FolderLogic | undefined {
  const match = /<FOLDER_LOGIC>([^<]+)<\/FOLDER_LOGIC>/i.exec(xmlContent);
  if (!match) {
    return undefined;
  }

  const normalized = match[1]!.trim().toUpperCase();
  if (normalized === 'PREFIX') {
    return 'prefix';
  }
  if (normalized === 'FULL') {
    return 'full';
  }

  return undefined;
}

/**
 * Parse STARTING_FOLDER from .abapgit.xml content
 */
export function parseStartingFolderFromAbapGitXml(
  xmlContent: string,
): string | undefined {
  const match = /<STARTING_FOLDER>([^<]+)<\/STARTING_FOLDER>/i.exec(xmlContent);
  return match ? match[1]!.trim() : undefined;
}

/**
 * Parse abapGit repository metadata from .abapgit.xml content
 */
export function parseAbapGitMetadata(xmlContent: string): {
  folderLogic: FolderLogic;
  startingFolder: string;
} {
  return {
    folderLogic: parseFolderLogicFromAbapGitXml(xmlContent) ?? 'prefix',
    startingFolder: parseStartingFolderFromAbapGitXml(xmlContent) ?? '/src/',
  };
}

/**
 * Reverse of calculatePackageDir — compute SAP package name from directory path
 *
 * Given a directory path relative to the starting folder, the folder logic,
 * and the root package name, compute the SAP package name.
 *
 * PREFIX mode: root 'ZABAPGIT_EXAMPLES' + dir 'clas' → 'ZABAPGIT_EXAMPLES_CLAS'
 * FULL mode: dir 'zabapgit_examples_clas' → 'ZABAPGIT_EXAMPLES_CLAS'
 *
 * @param dirPath - Directory path relative to starting folder
 * @param folderLogic - Folder logic mode (prefix or full)
 * @param rootPackage - Root SAP package name
 * @returns SAP package name
 */
export function resolvePackageFromDir(
  dirPath: string,
  folderLogic: FolderLogic,
  rootPackage: string,
): string {
  if (!dirPath || dirPath === '.' || dirPath === '/') {
    return rootPackage;
  }

  const normalized = stripSlashes(dirPath);
  if (!normalized) return rootPackage;

  const parts = normalized.split('/').filter(Boolean);
  if (parts.length === 0) return rootPackage;

  switch (folderLogic) {
    case 'prefix': {
      let pkg = rootPackage;
      for (const part of parts) {
        pkg = pkg + '_' + part.toUpperCase();
      }
      return pkg;
    }

    case 'full':
    case 'full-with-root': {
      return parts.at(-1)!.toUpperCase();
    }

    default:
      return rootPackage;
  }
}

/**
 * Reverse of resolvePackageFromDir — given a SAP package name and the
 * relative directory of an object, back-derive the root package.
 *
 * PREFIX mode: sapPackage 'ZABAPGIT_EXAMPLES_FUGR' + dir 'fugr' → 'ZABAPGIT_EXAMPLES'
 * FULL mode: cannot derive root (returns undefined)
 *
 * @param sapPackage - Actual SAP package name (from GET response)
 * @param relDir - Directory path relative to starting folder
 * @param folderLogic - Folder logic mode
 * @returns Root package name, or undefined if it cannot be derived
 */
export function reverseResolveRootPackage(
  sapPackage: string,
  relDir: string,
  folderLogic: FolderLogic,
): string | undefined {
  if (!relDir || relDir === '.' || relDir === '/') {
    return sapPackage; // Object is at root level — its package IS the root
  }

  const normalized = stripSlashes(relDir);
  if (!normalized) return sapPackage;

  const parts = normalized.split('/').filter(Boolean);
  if (parts.length === 0) return sapPackage;

  switch (folderLogic) {
    case 'prefix': {
      // In PREFIX mode: ROOT + _PART1 + _PART2 = sapPackage
      // So ROOT = sapPackage minus the suffix
      const suffix = '_' + parts.map((p) => p.toUpperCase()).join('_');
      if (sapPackage.toUpperCase().endsWith(suffix)) {
        return sapPackage.slice(0, -suffix.length);
      }
      return undefined;
    }

    case 'full':
    case 'full-with-root':
      // In FULL mode, package name IS the last directory segment —
      // cannot reliably derive the root
      return undefined;

    default:
      return undefined;
  }
}

/**
 * Parse folder logic from a string value (CLI option or config)
 */
export function parseFolderLogic(value: unknown): FolderLogic | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (
    normalized === 'prefix' ||
    normalized === 'full' ||
    normalized === 'full-with-root'
  ) {
    return normalized;
  }

  return undefined;
}

/**
 * Calculate package directory based on folder logic (for import/serialization)
 *
 * @param packagePath - Full package hierarchy from root to current
 * @param folderLogic - Folder logic mode
 * @returns Package directory relative to src/
 */
export function calculatePackageDir(
  packagePath: string[],
  folderLogic: FolderLogic,
): string {
  if (packagePath.length === 0) {
    return '';
  }

  switch (folderLogic) {
    case 'prefix': {
      if (packagePath.length === 1) {
        return '';
      }

      const parts: string[] = [];
      for (let i = 1; i < packagePath.length; i++) {
        const fullName = packagePath[i];
        const parentName = packagePath[i - 1];
        const prefix = parentName + '_';
        const relativeName = fullName.startsWith(prefix)
          ? fullName.slice(prefix.length)
          : fullName;
        parts.push(relativeName.toLowerCase());
      }
      return parts.join('/');
    }

    case 'full': {
      return packagePath.map((p) => p.toLowerCase()).join('/');
    }

    case 'full-with-root': {
      return packagePath.map((p) => p.toLowerCase()).join('/');
    }

    default:
      return '';
  }
}

/**
 * Generate .abapgit.xml repository metadata file
 */
export function generateAbapGitXml(folderLogic: FolderLogic): string {
  const abapGitFolderLogic = folderLogic === 'prefix' ? 'PREFIX' : 'FULL';

  return `<?xml version="1.0" encoding="utf-8"?>
<asx:abap xmlns:asx="http://www.sap.com/abapxml" version="1.0">
 <asx:values>
  <DATA>
   <MASTER_LANGUAGE>E</MASTER_LANGUAGE>
   <STARTING_FOLDER>/src/</STARTING_FOLDER>
   <FOLDER_LOGIC>${abapGitFolderLogic}</FOLDER_LOGIC>
  </DATA>
 </asx:values>
</asx:abap>
`;
}
