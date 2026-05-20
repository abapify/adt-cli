import {
  createPlugin,
  type AdtPlugin,
  type ImportContext,
  type DeleteResult,
} from '@abapify/adt-plugin';
import type { AdtClient } from '@abapify/adk';
import { AbapGitSerializer } from './serializer';
import { getSupportedTypes, isSupported } from './handlers';
import { deserialize } from './deserializer';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  readdirSync,
} from 'fs';
import { join, relative, basename } from 'path';

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

/**
 * Recursively collect all file paths under a directory.
 */
function walkDir(dir: string, results: string[] = []): string[] {
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(full, results);
    } else {
      results.push(full);
    }
  }
  return results;
}

/**
 * Lazy per-srcDir file index.
 *
 * Maps srcDir → (prefix → [absolute file paths]), where prefix is
 * `${name}.${type}.` in lower-case.  Built at most once per srcDir per
 * process, so the O(repo-size) directory walk is amortised across all
 * `format.delete()` calls in a single import run instead of repeated for
 * every deleted object.
 */
const srcDirIndexCache = new Map<string, Map<string, string[]>>();

function getOrBuildSrcIndex(srcDir: string): Map<string, string[]> {
  const cached = srcDirIndexCache.get(srcDir);
  if (cached) return cached;

  const index = new Map<string, string[]>();
  for (const filePath of walkDir(srcDir)) {
    const fname = basename(filePath).toLowerCase();
    // Extract the "<name>.<type>." prefix (first two dot-segments + trailing dot)
    const first = fname.indexOf('.');
    if (first === -1) continue;
    const second = fname.indexOf('.', first + 1);
    if (second === -1) continue;
    const key = fname.substring(0, second + 1); // e.g. "zcl_foo.clas."
    const bucket = index.get(key);
    if (bucket) {
      bucket.push(filePath);
    } else {
      index.set(key, [filePath]);
    }
  }
  srcDirIndexCache.set(srcDir, index);
  return index;
}

/**
 * Find all abapGit files for a given object name and type.
 *
 * abapGit naming convention: `{name}.{type}[.suffix].{ext}`
 * e.g. `zcl_foo.clas.xml`, `zcl_foo.clas.locals_def.abap`
 *
 * Matching is done on the filename base: `{name}.{type}.`.  SAP ABAP object
 * names and types **never contain a dot**, so the prefix is unambiguous —
 * `ztabl_del.tabl.` cannot accidentally match `ztabl_del_ext.tabl.xml`
 * because the separator after `ztabl_del` in the prefix is `.` while the
 * other file has `_ext.`.
 *
 * Uses a lazy per-srcDir index so the directory tree is walked at most once
 * per deletion batch rather than once per object.
 */
function findObjectFiles(srcDir: string, name: string, type: string): string[] {
  const prefix = `${name.toLowerCase()}.${type.toLowerCase()}.`;
  return getOrBuildSrcIndex(srcDir).get(prefix) ?? [];
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

    /**
     * Delete local abapGit files for an object marked for deletion in SAP.
     *
     * Searches the `<targetPath>/src/` directory tree for files matching
     * the abapGit naming pattern `{name}.{type}[.suffix].{ext}` and removes
     * each one.
     *
     * Known limitation: if the object never made it into the repository (e.g.
     * PROG deletions without obj_func=D), no files are present and nothing
     * happens. This is expected behavior.
     */
    async delete(
      objectRef: { pgmid: string; type: string; name: string },
      targetPath: string,
      _context: ImportContext,
    ): Promise<DeleteResult> {
      try {
        const srcDir = join(targetPath, 'src');
        const matchedFiles = findObjectFiles(
          srcDir,
          objectRef.name,
          objectRef.type,
        );

        const filesRemoved: string[] = [];
        const errors: string[] = [];
        for (const filePath of matchedFiles) {
          try {
            unlinkSync(filePath);
            filesRemoved.push(relative(targetPath, filePath));
          } catch (error) {
            const unlinkError = error as NodeJS.ErrnoException;
            if (unlinkError.code === 'ENOENT') {
              // File is already gone, treat as success because the desired end state is reached.
              filesRemoved.push(relative(targetPath, filePath));
              continue;
            }

            errors.push(
              error instanceof Error
                ? `Failed to delete ${relative(targetPath, filePath)}: ${error.message}`
                : `Failed to delete ${relative(targetPath, filePath)}: ${String(error)}`,
            );
          }
        }

        return {
          success: errors.length === 0,
          filesRemoved,
          ...(errors.length > 0 ? { errors } : {}),
        };
      } catch (error) {
        return {
          success: false,
          filesRemoved: [],
          errors: [error instanceof Error ? error.message : String(error)],
        };
      }
    },
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
