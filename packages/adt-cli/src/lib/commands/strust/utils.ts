/**
 * Shared helpers for `adt strust` subcommands.
 */

export interface PseEntry {
  id: string;
  title: string;
  uri?: string;
}

/**
 * Extract atom entries from an atomFeed parsed response.
 * Works for PSE lists and per-PSE certificate lists alike —
 * both return the same atom:feed / atom:entry shape.
 */
export function extractAtomEntries(data: unknown): PseEntry[] {
  const feed = data as { feed?: { entry?: unknown } } | undefined;
  const raw = feed?.feed?.entry;
  if (!raw) return [];
  const entries = Array.isArray(raw) ? raw : [raw];
  return entries.map((e) => {
    const entry = e as {
      id?: string;
      title?: string;
      link?: Array<{ href?: string }> | { href?: string };
    };
    let links: Array<{ href?: string }>;
    if (Array.isArray(entry.link)) {
      links = entry.link;
    } else if (entry.link) {
      links = [entry.link];
    } else {
      links = [];
    }
    return {
      id: entry.id ?? '',
      title: entry.title ?? '',
      uri: links[0]?.href,
    };
  });
}
