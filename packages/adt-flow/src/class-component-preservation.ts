import { basename, dirname, posix } from 'node:path';
import type { FormatPlugin, MaterializedFormatFile } from '@abapify/adt-plugin';
import type { ObjectDescriptor } from './schemas';
import { readText } from './repository';
import { AdtFlowError, type FlowObjectIdentity } from './types';

/** Keep baseline class parts which this transport did not select or delete. */
export async function preserveUnselectedClassComponents(input: {
  root: string;
  identity: FlowObjectIdentity;
  format: FormatPlugin;
  selectedComponents: ReadonlySet<string>;
  existingPaths: readonly string[];
  files: readonly MaterializedFormatFile[];
  previous?: ObjectDescriptor;
}): Promise<{
  files: MaterializedFormatFile[];
  selections: ObjectDescriptor['selections'];
}> {
  const { root, identity, format, selectedComponents, existingPaths } = input;
  const files = [...input.files];
  const selections: ObjectDescriptor['selections'] = [];
  if (identity.type !== 'CLAS' || !format.parseFilename || files.length === 0) {
    return { files, selections };
  }
  const parse = format.parseFilename;
  const belongsToClass = (path: string) => {
    const parsed = parse(basename(path));
    return parsed?.type.toUpperCase() === 'CLAS' &&
      parsed.name.toUpperCase() === identity.name.toUpperCase()
      ? parsed
      : undefined;
  };
  const anchor = files.find((file) => belongsToClass(file.path));
  if (!anchor) return { files, selections };
  const targetDirectory = dirname(anchor.path);
  const materializedPaths = new Set(files.map((file) => file.path));
  const selectedPaths = new Set(materializedPaths);
  const sourceKeys = format.getHandler('CLAS')?.suffixToSourceKey;
  const retainedComponents = new Set<string>();
  for (const path of existingPaths) {
    const parsed = belongsToClass(path);
    if (!parsed || parsed.extension !== 'abap') continue;
    const component = parsed.suffix
      ? (sourceKeys?.[parsed.suffix] ?? parsed.suffix)
      : 'main';
    if (selectedComponents.has(component)) continue;
    const targetPath = posix.join(targetDirectory, basename(path));
    if (materializedPaths.has(targetPath)) continue;
    if (selectedPaths.has(targetPath)) {
      throw new AdtFlowError(
        'path_collision',
        'Legacy class components have an ambiguous destination.',
        { object: identity.canonical, path: targetPath },
      );
    }
    const content = await readText(root, path);
    if (content === undefined) {
      throw new AdtFlowError(
        'working_tree_diverged',
        'An unselected class component disappeared before preservation.',
        { object: identity.canonical, path },
      );
    }
    files.push({
      path: targetPath,
      content,
      role: 'source',
      sourceComponent: component,
    });
    selectedPaths.add(targetPath);
    retainedComponents.add(component);
  }
  // A preserved legacy file has no invented SAP version. Previously indexed
  // components keep their original selection, never the selected main version.
  selections.push(
    ...(input.previous?.selections ?? []).filter((selection) =>
      retainedComponents.has(selection.component),
    ),
  );
  return { files, selections };
}
