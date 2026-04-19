/**
 * Format plugins barrel.
 *
 * Exposes per-format writers and a {@link writeLayout} dispatch helper that
 * selects the writer from an {@link OutputFormat} string.
 */

import { writeAbapgitLayout } from './abapgit';
import { writeGctsLayout } from './gcts';
import type { ClassArtifact, OutputFormat, WriteResult } from './types';

export { writeAbapgitLayout } from './abapgit';
export { writeGctsLayout } from './gcts';
export type { ClassArtifact, OutputFormat, WriteResult } from './types';

export function writeLayout(
  artifact: ClassArtifact,
  format: OutputFormat,
  outDir: string,
): Promise<WriteResult> {
  switch (format) {
    case 'abapgit':
      return writeAbapgitLayout(artifact, outDir);
    case 'gcts':
      return writeGctsLayout(artifact, outDir);
    default: {
      const exhaustive: never = format;
      throw new Error(`Unknown output format: ${String(exhaustive)}`);
    }
  }
}
