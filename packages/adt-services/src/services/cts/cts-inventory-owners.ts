import {
  resolveClassComponentOwnerName,
  type TransportObjectInventoryEntry,
} from '@abapify/adk';

export interface CtsInventoryOwnerGroup {
  /** The representative owner entry, with its original spelling preserved. */
  owner: TransportObjectInventoryEntry;
  /** Every entry folding into this owner, in input order (provenance). */
  leaves: TransportObjectInventoryEntry[];
  /** True when no R3TR owner exists for this group in the given inventory. */
  unresolved: boolean;
}

interface IndexedEntry {
  entry: TransportObjectInventoryEntry;
  index: number;
}

interface GroupBuilder {
  owner: TransportObjectInventoryEntry | undefined;
  leaves: IndexedEntry[];
}

function canonicalKey(entry: TransportObjectInventoryEntry): string {
  return [
    entry.pgmid.trim().toUpperCase(),
    entry.type.trim().toUpperCase(),
    entry.name.trim().toUpperCase(),
  ].join('/');
}

function isR3tr(entry: TransportObjectInventoryEntry): boolean {
  return entry.pgmid.trim().toUpperCase() === 'R3TR';
}

/**
 * Derive the repository owner key for a component leaf. Class components
 * resolve through the shared ADK owner rule (the WB type describes the
 * component subtype; the owner name comes from the ADT URI or the padded
 * transport name). A FUNC leaf folds into the FUGR owner named by its WB
 * type.
 */
function componentOwnerKey(
  entry: TransportObjectInventoryEntry,
): string | undefined {
  const classOwner = resolveClassComponentOwnerName({
    pgmid: entry.pgmid,
    type: entry.type,
    name: entry.name,
    wbtype: entry.wbtype,
    uri: entry.uri,
  });
  if (classOwner) {
    return `R3TR/CLAS/${classOwner}`;
  }
  const wbtype = entry.wbtype?.trim().toUpperCase();
  if (wbtype?.startsWith('FUGR/') && wbtype.length > 'FUGR/'.length) {
    return `R3TR/${wbtype}`;
  }
  return undefined;
}

function collectGroups(
  entries: ReadonlyArray<TransportObjectInventoryEntry>,
): Map<string, GroupBuilder> {
  const groups = new Map<string, GroupBuilder>();
  entries.forEach((entry, index) => {
    const key = canonicalKey(entry);
    let group = groups.get(key);
    if (!group) {
      group = { owner: undefined, leaves: [] };
      groups.set(key, group);
    }
    group.leaves.push({ entry, index });
    if (isR3tr(entry) && (group.owner === undefined || !isR3tr(group.owner))) {
      group.owner = entry;
    }
  });
  return groups;
}

/**
 * Fold component groups into the owner group referenced by any of their
 * leaves. Ownerless groups keep their identity.
 */
function foldComponentGroups(groups: Map<string, GroupBuilder>): void {
  for (const [key, group] of [...groups.entries()]) {
    if (group.owner !== undefined) {
      continue;
    }
    const byIndex = [...group.leaves].sort((a, b) => a.index - b.index);
    const target = byIndex
      .map(({ entry }) => componentOwnerKey(entry))
      .find((candidate) => candidate !== undefined && candidate !== key);
    if (!target || !groups.has(target)) {
      continue;
    }
    const ownerGroup = groups.get(target);
    if (!ownerGroup) {
      continue;
    }
    ownerGroup.leaves.push(...group.leaves);
    groups.delete(key);
  }
}

/**
 * Deduplicate raw CTS inventory entries to their repository owners.
 * Pure: padded or case-different spellings of the same object merge into one
 * group, LIMU component leaves fold into the R3TR owner resolved through the
 * shared ADK owner rule, namespaced names stay distinct identities, and
 * ownerless entries are retained as unresolved groups with provenance. The
 * caller's input is never mutated.
 */
export function dedupeCtsInventoryToOwners(
  entries: ReadonlyArray<TransportObjectInventoryEntry>,
): CtsInventoryOwnerGroup[] {
  const groups = collectGroups(entries);
  foldComponentGroups(groups);
  return [...groups.values()].map((group) => ({
    owner:
      group.owner ??
      [...group.leaves].sort((a, b) => a.index - b.index)[0].entry,
    leaves: [...group.leaves]
      .sort((a, b) => a.index - b.index)
      .map(({ entry }) => entry),
    unresolved: group.owner === undefined,
  }));
}
