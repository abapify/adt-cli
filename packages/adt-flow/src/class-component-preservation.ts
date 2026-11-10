import { basename, dirname, posix } from 'node:path';
import type { FormatPlugin, MaterializedFormatFile } from '@abapify/adt-plugin';
import type { ObjectDescriptor } from './schemas';
import { readRegularText } from './repository';
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
  const suffix = parsed.suffix?.toLowerCase();
  const component = suffix ? (sourceKeys?.[suffix] ?? suffix) : 'main';
  return input.selectedComponents.has(component) ? undefined : component;
}

async function retainedSource(
  input: PreservationInput,
  path: string,
  targetPath: string,
  component: string,
): Promise<MaterializedFormatFile> {
  const content = await readRegularText(input.root, path);
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

function retainedSelections(
  input: PreservationInput,
  components: ReadonlySet<string>,
) {
  // Legacy files have no invented SAP version. Indexed parts keep their own version.
  return (input.previous?.selections ?? []).filter((selection) =>
    components.has(selection.component),
  );
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
  const existingAnchor = input.existingPaths.find((path) =>
    classFilename(input, path),
  );
  const targetDirectory = anchor
    ? dirname(anchor.path)
    : existingAnchor
      ? dirname(existingAnchor)
      : undefined;
  if (!targetDirectory) return { files, selections: [] };

  const materializedPaths = new Set(files.map((file) => file.path));
  const retainedPaths = new Set<string>();
  const retainedComponents = new Set<string>();
  const retained: Array<{
    path: string;
    targetPath: string;
    component: string;
  }> = [];
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
    retained.push({ path, targetPath, component });
    retainedPaths.add(targetPath);
    retainedComponents.add(component);
  }
  files.push(
    ...(await Promise.all(
      retained.map((entry) =>
        retainedSource(input, entry.path, entry.targetPath, entry.component),
      ),
    )),
  );
  return { files, selections: retainedSelections(input, retainedComponents) };
}
