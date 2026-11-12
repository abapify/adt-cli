import type { TransportObjectInventoryEntry } from '@abapify/adk';

export interface CtsInventoryOwnerGroup {
  /** The representative owner entry, with its original spelling preserved. */
  owner: TransportObjectInventoryEntry;
  /** Every entry folding into this owner, in input order (provenance). */
  leaves: TransportObjectInventoryEntry[];
}

function canonicalKey(entry: TransportObjectInventoryEntry): string {
  return [
    entry.pgmid.trim().toUpperCase(),
    entry.type.trim().toUpperCase(),
    entry.name.trim().toUpperCase(),
  ].join('/');
}

function ownerKeyOf(entry: TransportObjectInventoryEntry): string | undefined {
  const wbtype = entry.wbtype?.trim().toUpperCase();
  if (!wbtype) return undefined;
  const separator = wbtype.indexOf('/');
  if (separator <= 0 || separator === wbtype.length - 1) return undefined;
  const ownerType = wbtype.slice(0, separator);
  const ownerName = wbtype.slice(separator + 1);
  if (!ownerName) return undefined;
  return `R3TR/${ownerType}/${ownerName}`;
}

/**
 * Deduplicate raw CTS inventory entries to their repository owners.
 * Pure: padded or case-different spellings of the same object merge into one
 * group, LIMU component leaves fold into the R3TR owner referenced by their
 * `wbtype` (mirroring the ADK manifest's FUNC-to-FUGR ownership rule), and
 * namespaced names stay distinct identities. Every leaf keeps its original
 * entry as provenance; entries without a matching owner form their own group
 * instead of being discarded. The caller's input is never mutated.
 */
export function dedupeCtsInventoryToOwners(
  entries: ReadonlyArray<TransportObjectInventoryEntry>,
): CtsInventoryOwnerGroup[] {
  const groups = new Map<string, CtsInventoryOwnerGroup>();
  for (const entry of entries) {
    const key = canonicalKey(entry);
    let group = groups.get(key);
    if (!group) {
      group = { owner: entry, leaves: [] };
      groups.set(key, group);
    }
    group.leaves.push(entry);
    if (
      entry.pgmid.trim().toUpperCase() === 'R3TR' &&
      group.owner.pgmid.trim().toUpperCase() !== 'R3TR'
    ) {
      group.owner = entry;
    }
  }
  // Fold component groups into the owner group their wbtype references.
  for (const [key, group] of [...groups.entries()]) {
    if (group.owner.pgmid.trim().toUpperCase() === 'R3TR') {
      continue;
    }
    const target = ownerKeyOf(group.owner);
    if (!target || target === key || !groups.has(target)) {
      continue;
    }
    const ownerGroup = groups.get(target);
    if (!ownerGroup) {
      continue;
    }
    ownerGroup.leaves.push(...group.leaves);
    groups.delete(key);
  }
  return [...groups.values()];
}
