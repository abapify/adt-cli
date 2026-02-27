import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { AdkObject } from '@abapify/adk';
import { getTypeForKind } from '@abapify/adk';
import { getHandler } from './handlers';

/**
 * Serialize ADK objects to abapGit format
 *
 * This class uses the handler registry to delegate serialization
 * to type-specific handlers.
 */
export class AbapGitSerializer {
  /**
   * Serialize a single object (called by plugin API)
   */
  async serializeObjectPublic(
    obj: AdkObject,
    targetPath: string,
    packageDir: string,
  ): Promise<string[]> {
    const fullPackageDir = join(targetPath, 'src', packageDir);
    mkdirSync(fullPackageDir, { recursive: true });

    // Get object type from ADK kind mapping
    const objectType = getTypeForKind(obj.kind) ?? obj.type;
    const handler = getHandler(objectType);

    if (!handler) {
      throw new Error(
        `No handler available for object type: ${objectType} (kind: ${obj.kind})`,
      );
    }

    // Serialize using handler
    const serializedFiles = await handler.serialize(obj);

    // Write files to disk
    const writtenFiles: string[] = [];
    for (const file of serializedFiles) {
      const filePath = join(fullPackageDir, file.path);
      writeFileSync(filePath, file.content, file.encoding ?? 'utf8');
      writtenFiles.push(filePath);
    }

    return writtenFiles;
  }
}
