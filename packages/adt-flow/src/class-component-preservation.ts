import { basename, dirname, posix } from 'node:path';
import type { FormatPlugin, MaterializedFormatFile } from '@abapify/adt-plugin';
import type { ObjectDescriptor } from './schemas';
import { readText } from './repository';
import { AdtFlowError, type FlowObjectIdentity } from './types';

interface PreservationInput {
  root: string;
  identity: FlowObjectIdentity;
  format: FormatPlugin;
  selectedComponents: ReadonlySet<string>;
  existingPaths: readonly string[];
  files: readonly MaterializedFormatFile[];
  previous?: ObjectDescriptor;
}

function classFilename(input: PreservationInput, path: string) {
  const parsed = input.format.parseFilename?.(basename(path));
  if (parsed?.type.toUpperCase() !== 'CLAS') return undefined;
  return parsed.name.toUpperCase() === input.identity.name.toUpperCase()
    ? parsed
    : undefined;
}

function unselectedComponent(input: PreservationInput, path: string) {
  const parsed = classFilename(input, path);
  if (parsed?.extension !== 'abap') return undefined;
  const sourceKeys = input.format.getHandler('CLAS')?.suffixToSourceKey;
  const component = parsed.suffix
    ? (sourceKeys?.[parsed.suffix] ?? parsed.suffix)
    : 'main';
  return input.selectedComponents.has(component) ? undefined : component;
}

async function retainedSource(
  input: PreservationInput,
  path: string,
  targetPath: string,
  component: string,
): Promise<MaterializedFormatFile> {
  const content = await readText(input.root, path);
  if (content === undefined) {
    throw new AdtFlowError(
      'working_tree_diverged',
      'An unselected class component disappeared before preservation.',
      { object: input.identity.canonical, path },
    );
  }
  return {
    path: targetPath,
    content,
    role: 'source',
    sourceComponent: component,
  };
}

/** Keep baseline class parts which this transport did not select or delete. */
export async function preserveUnselectedClassComponents(
  input: PreservationInput,
): Promise<{
  files: MaterializedFormatFile[];
  selections: ObjectDescriptor['selections'];
}> {
  const files = [...input.files];
  if (input.identity.type !== 'CLAS') return { files, selections: [] };
  const anchor = files.find((file) => classFilename(input, file.path));
  if (!anchor) return { files, selections: [] };
  const targetDirectory = dirname(anchor.path);
  const materializedPaths = new Set(files.map((file) => file.path));
  const retainedPaths = new Set<string>();
  const retainedComponents = new Set<string>();
  for (const path of input.existingPaths) {
    const component = unselectedComponent(input, path);
    if (component === undefined) continue;
    const targetPath = posix.join(targetDirectory, basename(path));
    if (materializedPaths.has(targetPath)) continue;
    if (retainedPaths.has(targetPath)) {
      throw new AdtFlowError(
        'path_collision',
        'Legacy class components have an ambiguous destination.',
        { object: input.identity.canonical, path: targetPath },
      );
    }
    files.push(await retainedSource(input, path, targetPath, component));
    retainedPaths.add(targetPath);
    retainedComponents.add(component);
  }
  // A preserved legacy file has no invented SAP version. Previously indexed
  // components keep their original selection, never the selected main version.
  const selections = (input.previous?.selections ?? []).filter((selection) =>
    retainedComponents.has(selection.component),
  );
  return { files, selections };
}
