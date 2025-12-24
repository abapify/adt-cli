import { createPlugin, type AdtPlugin } from '@abapify/adt-plugin';
import type { AdtClient } from '@abapify/adk';
import { AbapGitSerializer } from './serializer';
import { getSupportedTypes, isSupported } from './handlers';
import { deserialize } from './deserializer';
import { writeFileSync } from 'fs';
import { join } from 'path';

const serializer = new AbapGitSerializer();

/**
 * Generate .abapgit.xml repository metadata file
 */
function generateAbapGitXml(): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<asx:abap xmlns:asx="http://www.sap.com/abapxml" version="1.0">
 <asx:values>
  <DATA>
   <MASTER_LANGUAGE>E</MASTER_LANGUAGE>
   <STARTING_FOLDER>/src/</STARTING_FOLDER>
   <FOLDER_LOGIC>PREFIX</FOLDER_LOGIC>
  </DATA>
 </asx:values>
</asx:abap>
`;
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

        // abapGit PREFIX folder logic:
        // - Root package (1 element in path): no subfolder, files go directly in src/
        // - Child packages: use name with parent prefix stripped
        //   Example: $PARENT_CHILD → strip $PARENT_ → child/

        let packageDir: string;

        if (packagePath.length === 1) {
          // Root package: serialize directly to src/ (no subfolder)
          packageDir = '';
        } else {
          // Child package: strip parent prefix from name
          const fullName = packagePath.at(-1)!;
          const parentName = packagePath.at(-2)!;

          // Strip parent prefix and underscore (e.g., $PARENT_CHILD → CHILD → child)
          const prefix = parentName + '_';
          const relativeName = fullName.startsWith(prefix)
            ? fullName.slice(prefix.length)
            : fullName;

          packageDir = relativeName.toLowerCase();
        }

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
      const abapgitXmlContent = generateAbapGitXml();
      writeFileSync(abapgitXmlPath, abapgitXmlContent, 'utf-8');
    },
  },
});

// Export for named imports
export { abapGitPlugin as AbapGitPlugin };

// Export for default import (dynamic loading)
export default abapGitPlugin;
