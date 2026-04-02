import {
  createPlugin,
  type AdtPlugin,
  type ImportContext,
} from '@abapify/adt-plugin';
import type { AdtClient } from '@abapify/adk';
import { AbapGitSerializer } from './serializer';
import { getSupportedTypes, isSupported } from './handlers';
import { deserialize } from './deserializer';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import {
  type FolderLogic,
  parseFolderLogic,
  parseFolderLogicFromAbapGitXml,
  calculatePackageDir,
  generateAbapGitXml,
  resolvePackageFromDir,
  parseAbapGitMetadata,
} from './folder-logic';

const serializer = new AbapGitSerializer();

// Store folder logic for afterImport hook (set during import, read in afterImport)
let currentFolderLogic: FolderLogic = 'prefix';

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
    export: (fileTree, client, options?) =>
      deserialize(fileTree, client as AdtClient, options),
  },

  // Lifecycle hooks
  hooks: {
    async afterImport(targetPath) {
      // Ensure target directory exists before writing metadata
      mkdirSync(targetPath, { recursive: true });
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
  resolvePackageFromDir,
  parseAbapGitMetadata,
};

// Export for named imports
export { abapGitPlugin as AbapGitPlugin };

// Export for default import (dynamic loading)
export default abapGitPlugin;
