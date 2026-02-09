import {
  createPlugin,
  type AdtPlugin,
  type ImportContext,
} from '@abapify/adt-plugin';
import type { AdtClient } from '@abapify/adk';
import { AbapGitSerializer } from './serializer';
import { getSupportedTypes, isSupported } from './handlers';
import { deserialize } from './deserializer';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const serializer = new AbapGitSerializer();

// Store folder logic for afterImport hook (set during import, read in afterImport)
let currentFolderLogic: FolderLogic = 'prefix';

type FolderLogic = 'prefix' | 'full' | 'full-with-root';

function parseFolderLogic(value: unknown): FolderLogic | undefined {
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

function parseFolderLogicFromAbapGitXml(
  xmlContent: string,
): FolderLogic | undefined {
  const match = xmlContent.match(
    /<FOLDER_LOGIC>\s*([^<]+)\s*<\/FOLDER_LOGIC>/i,
  );
  if (!match) {
    return undefined;
  }

  const normalized = match[1].trim().toUpperCase();
  if (normalized === 'PREFIX') {
    return 'prefix';
  }
  if (normalized === 'FULL') {
    return 'full';
  }

  return undefined;
}

function readFolderLogicFromExistingRepo(
  targetPath: string,
): FolderLogic | undefined {
  const abapgitXmlPath = join(targetPath, '.abapgit.xml');
  if (!existsSync(abapgitXmlPath)) {
    return undefined;
  }

  try {
    const xmlContent = readFileSync(abapgitXmlPath, 'utf-8');
    return parseFolderLogicFromAbapGitXml(xmlContent);
  } catch {
    return undefined;
  }
}

function resolveFolderLogic(
  context: ImportContext,
  targetPath: string,
): FolderLogic {
  const cliFolderLogic = parseFolderLogic(context.formatOptions?.folderLogic);
  if (cliFolderLogic) {
    return cliFolderLogic;
  }

  const existingRepoFolderLogic = readFolderLogicFromExistingRepo(targetPath);
  if (existingRepoFolderLogic) {
    return existingRepoFolderLogic;
  }

  const configuredFolderLogic = parseFolderLogic(
    context.configFormatOptions?.folderLogic,
  );
  if (configuredFolderLogic) {
    return configuredFolderLogic;
  }

  return 'prefix';
}

/**
 * Generate .abapgit.xml repository metadata file
 */
function generateAbapGitXml(folderLogic: FolderLogic): string {
  // Map our folder logic to abapGit folder logic
  // Note: 'full-with-root' is our custom mode, not standard abapGit
  // We use FULL in .abapgit.xml for both 'full' and 'full-with-root'
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

/**
 * Calculate package directory based on folder logic
 *
 * @param packagePath - Full package hierarchy from root to current (e.g., ['ZROOT', 'ZROOT_CHILD'])
 * @param folderLogic - Folder logic mode
 * @returns Package directory relative to src/ (e.g., 'child' for prefix, 'zroot_child' for full)
 */
function calculatePackageDir(
  packagePath: string[],
  folderLogic: FolderLogic,
): string {
  if (packagePath.length === 0) {
    return '';
  }

  switch (folderLogic) {
    case 'prefix': {
      // PREFIX mode: root → src/, children strip parent prefix
      // Example: ['ZTEST', 'ZTEST_EXAMPLES'] → 'examples'
      if (packagePath.length === 1) {
        return ''; // Root package goes directly to src/
      }

      // For each level, strip the parent prefix
      // Build path by processing each child package
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
      // FULL mode: root → src/, children use full name as folder
      // Example: ['ZTEST', 'ZTEST_EXAMPLES'] → 'ztest_examples'
      if (packagePath.length === 1) {
        return ''; // Root package goes directly to src/
      }

      // Child packages get full name as folder (excluding root)
      return packagePath
        .slice(1)
        .map((p) => p.toLowerCase())
        .join('/');
    }

    case 'full-with-root': {
      // FULL-WITH-ROOT mode: all packages including root become folders
      // Example: ['ZTEST', 'ZTEST_EXAMPLES'] → 'ztest/ztest_examples'
      return packagePath.map((p) => p.toLowerCase()).join('/');
    }

    default:
      return '';
  }
}

/**
 * abapGit Plugin
 *
 * Provides import/export of ADK objects to abapGit repository format.
 */
export const abapGitPlugin: AdtPlugin = createPlugin({
  name: 'abapGit',
  version: '1.0.0',
  description: 'abapGit format plugin for ADK objects',

  // Registry service
  registry: {
    isSupported,
    getSupportedTypes,
  },

  // Format service
  format: {
    async import(object, targetPath, context) {
      try {
        // Get the object's package - for DEVC objects, use name; for others, use package property
        // Note: object.type might be 'DEVC/K' not just 'DEVC'
        const isPackage = object.type?.startsWith('DEVC');
        const objPackage = isPackage
          ? object.name
          : (object as any).package || object.name || 'ROOT';

        // Resolve full package path from SAP (root → ... → current)
        // This uses ADK to load package hierarchy via super package references
        const packagePath = await context.resolvePackagePath(objPackage);

        // Resolve folder logic with precedence:
        // 1) CLI format options
        // 2) Existing .abapgit.xml in target repository
        // 3) adt.config.ts format options
        // 4) Plugin default
        const folderLogic = resolveFolderLogic(context, targetPath);

        // Store for afterImport hook
        currentFolderLogic = folderLogic;

        // Calculate package directory based on folder logic
        const packageDir = calculatePackageDir(packagePath, folderLogic);

        // Delegate to serializer which handles lazy loading
        const files = await serializer.serializeObjectPublic(
          object,
          targetPath,
          packageDir,
        );

        return {
          success: true,
          filesCreated: files,
        };
      } catch (error) {
        return {
          success: false,
          filesCreated: [],
          errors: [error instanceof Error ? error.message : String(error)],
        };
      }
    },

    /**
     * Export abapGit files to SAP
     *
     * Reads abapGit format files from FileTree and yields AdkObject instances.
     * True generator - streams objects one at a time for memory efficiency.
     *
     * @param fileTree - Virtual file system abstraction
     * @param client - ADT client for creating ADK objects
     */
    export: (fileTree, client) => deserialize(fileTree, client as AdtClient),
  },

  // Lifecycle hooks
  hooks: {
    async afterImport(targetPath) {
      // Generate .abapgit.xml metadata file after import completes
      const abapgitXmlPath = join(targetPath, '.abapgit.xml');
      const abapgitXmlContent = generateAbapGitXml(currentFolderLogic);
      writeFileSync(abapgitXmlPath, abapgitXmlContent, 'utf-8');
    },
  },
});

export const __testing = {
  calculatePackageDir,
  generateAbapGitXml,
  parseFolderLogic,
  parseFolderLogicFromAbapGitXml,
  readFolderLogicFromExistingRepo,
  resolveFolderLogic,
};

// Export for named imports
export { abapGitPlugin as AbapGitPlugin };

// Export for default import (dynamic loading)
export default abapGitPlugin;
