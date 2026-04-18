/**
 * gCTS AdtPlugin.
 *
 * The `FormatPlugin` in `format/gcts-format.ts` provides the declarative
 * contract (used by registry consumers); this `AdtPlugin` provides the
 * behaviour expected by `adt-cli`'s higher-level import/export services.
 *
 * SAP → disk ("import") is fully implemented — this is the primary direction
 * a format plugin needs to support. disk → SAP ("export" in adt-cli's
 * terminology) is deferred: gCTS deserialization requires inverse mappings
 * that still need to be fleshed out per object type. When E08 revisits
 * checkin, the deserializer will slot in as `format.export`.
 */

import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { createPlugin, type AdtPlugin } from '@abapify/adt-plugin';
import { getHandler, getSupportedTypes, isSupported } from './handlers/base';
import './handlers/objects';

export const gctsPlugin: AdtPlugin = createPlugin({
  name: 'gcts',
  version: '0.1.0',
  description: 'gCTS / AFF format plugin — JSON metadata + .abap/.acds sources',

  registry: {
    isSupported,
    getSupportedTypes,
  },

  format: {
    async import(object, targetPath, context) {
      try {
        const isPackage = object.type?.startsWith('DEVC');
        const objPackage = isPackage
          ? object.name
          : (object as any).package || object.name || 'ROOT';
        const packagePath = await context.resolvePackagePath(objPackage);

        // gCTS layout: flat per-package directory under src/<package-path>/.
        // Object files live directly inside their package dir (no extra
        // per-object subdirectory — matches AFF's default "flat" layout).
        const packageDir = packagePath.map((p) => p.toLowerCase()).join('/');

        const handler = getHandler(object.type);
        if (!handler) {
          return {
            success: false,
            filesCreated: [],
            errors: [
              `No gCTS handler registered for object type: ${object.type}`,
            ],
          };
        }

        const files = await handler.serialize(object as unknown as never);
        const baseDir = join(targetPath, 'src', packageDir);
        mkdirSync(baseDir, { recursive: true });

        const written: string[] = [];
        for (const f of files) {
          const full = join(baseDir, f.path);
          mkdirSync(dirname(full), { recursive: true });
          writeFileSync(full, f.content, f.encoding ?? 'utf8');
          written.push(full);
        }

        return { success: true, filesCreated: written };
      } catch (error) {
        return {
          success: false,
          filesCreated: [],
          errors: [error instanceof Error ? error.message : String(error)],
        };
      }
    },

    // format.export (Git → SAP) intentionally omitted for v0.1. Tracked as
    // follow-up in docs/roadmap/epics/e06-gcts-format-plugin.md.
  },
});

export default gctsPlugin;
export { gctsPlugin as GctsPlugin };
