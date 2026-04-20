/**
 * Format plugins barrel.
 *
 * Exposes per-format writers and a {@link writeLayout} dispatch helper that
 * selects the writer from an {@link OutputFormat} string. A
 * {@link writeClientBundle} helper writes the full four-artifact client
 * (types interface, operations interface, exception class, implementation
 * class) in one shot.
 */

import { writeAbapgitInterface, writeAbapgitLayout } from './abapgit';
import { writeGctsInterface, writeGctsLayout } from './gcts';
import type {
  ClassArtifact,
  InterfaceArtifact,
  OutputFormat,
  WriteResult,
} from './types';

export { writeAbapgitInterface, writeAbapgitLayout } from './abapgit';
export { writeGctsInterface, writeGctsLayout } from './gcts';
export type {
  ArtifactKind,
  ClassArtifact,
  InterfaceArtifact,
  OutputFormat,
  WriteResult,
} from './types';

function isInterfaceArtifact(
  artifact: ClassArtifact | InterfaceArtifact,
): artifact is InterfaceArtifact {
  return (
    typeof (artifact as InterfaceArtifact).name === 'string' &&
    typeof (artifact as InterfaceArtifact).source === 'string'
  );
}

export function writeLayout(
  artifact: ClassArtifact | InterfaceArtifact,
  format: OutputFormat,
  outDir: string,
): Promise<WriteResult> {
  if (isInterfaceArtifact(artifact)) {
    switch (format) {
      case 'abapgit':
        return writeAbapgitInterface(artifact, outDir);
      case 'gcts':
        return writeGctsInterface(artifact, outDir);
      default: {
        const exhaustive: never = format;
        throw new Error(`Unknown output format: ${String(exhaustive)}`);
      }
    }
  }

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

export interface ClientBundle {
  types: InterfaceArtifact;
  operations: InterfaceArtifact;
  exception: ClassArtifact;
  implementation: ClassArtifact;
}

export async function writeClientBundle(
  artifacts: ClientBundle,
  format: OutputFormat,
  outDir: string,
): Promise<WriteResult> {
  const all = new Set<string>();
  for (const artifact of [
    artifacts.types,
    artifacts.operations,
    artifacts.exception,
    artifacts.implementation,
  ] as const) {
    const r = await writeLayout(artifact, format, outDir);
    for (const f of r.files) {
      all.add(f);
    }
  }
  return { files: [...all].sort() };
}
