/**
 * Lock Store — persistence layer for ADT lock handles
 *
 * Provides an interface for registering/deregistering lock entries
 * and a file-based implementation that persists to `~/.adt/locks.json`.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import type { LockEntry } from './types';

/**
 * Lock store interface — opt-in persistence for ADT lock handles.
 *
 * Implementations can be file-based, in-memory, or backed by any storage.
 */
export interface LockStore {
  /** Persist a lock entry after successful LOCK */
  register(entry: LockEntry): void;
  /** Remove a lock entry after successful UNLOCK */
  deregister(objectUri: string): void;
  /** List all persisted lock entries */
  list(): LockEntry[];
  /** Remove all entries */
  clear(): void;
}

/**
 * File-based lock store.
 *
 * Persists lock entries to a JSON file (default: `~/.adt/locks.json`).
 * Each entry is keyed by objectUri — re-locking the same URI overwrites.
 * File permissions are 0o600 (owner read/write only).
 */
export class FileLockStore implements LockStore {
  private readonly filePath: string;

  constructor(baseDir?: string) {
    const dir = baseDir ?? join(homedir(), '.adt');
    this.filePath = join(dir, 'locks.json');
  }

  register(entry: LockEntry): void {
    const entries = this.load();
    const idx = entries.findIndex((e) => e.objectUri === entry.objectUri);
    if (idx >= 0) entries[idx] = entry;
    else entries.push(entry);
    this.save(entries);
  }

  deregister(objectUri: string): void {
    const entries = this.load();
    const filtered = entries.filter((e) => e.objectUri !== objectUri);
    if (filtered.length !== entries.length) {
      this.save(filtered);
    }
  }

  list(): LockEntry[] {
    return this.load();
  }

  clear(): void {
    this.save([]);
  }

  private load(): LockEntry[] {
    if (!existsSync(this.filePath)) return [];
    try {
      return JSON.parse(readFileSync(this.filePath, 'utf8')) as LockEntry[];
    } catch {
      return [];
    }
  }

  private save(entries: LockEntry[]): void {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(entries, null, 2), {
      mode: 0o600,
    });
  }
}
