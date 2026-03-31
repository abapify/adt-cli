/**
 * FileLockStore unit tests
 *
 * Validates file-based lock persistence:
 * - register/deregister entries
 * - list/clear operations
 * - file creation and permissions
 * - overwrites on re-lock of same URI
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { FileLockStore } from '../src/store';
import type { LockEntry } from '../src/types';

function makeTmpDir(): string {
  const dir = join(
    tmpdir(),
    `adt-locks-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

function makeEntry(overrides: Partial<LockEntry> = {}): LockEntry {
  return {
    objectUri: '/sap/bc/adt/oo/classes/zcl_test',
    objectName: 'ZCL_TEST',
    objectType: 'CLAS/OC',
    lockHandle: 'HANDLE_ABC123',
    lockedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('FileLockStore', () => {
  let dir: string;
  let store: FileLockStore;

  beforeEach(() => {
    dir = makeTmpDir();
    store = new FileLockStore(dir);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  // ── register ────────────────────────────────────────────────────────

  it('register() creates locks.json when it does not exist', () => {
    const entry = makeEntry();
    store.register(entry);

    const filePath = join(dir, 'locks.json');
    expect(existsSync(filePath)).toBe(true);

    const data = JSON.parse(readFileSync(filePath, 'utf8'));
    expect(data).toHaveLength(1);
    expect(data[0].objectUri).toBe(entry.objectUri);
    expect(data[0].lockHandle).toBe(entry.lockHandle);
  });

  it('register() adds multiple entries', () => {
    store.register(
      makeEntry({
        objectUri: '/sap/bc/adt/oo/classes/zcl_a',
        objectName: 'ZCL_A',
      }),
    );
    store.register(
      makeEntry({
        objectUri: '/sap/bc/adt/oo/classes/zcl_b',
        objectName: 'ZCL_B',
      }),
    );

    expect(store.list()).toHaveLength(2);
  });

  it('register() overwrites entry with same objectUri (re-lock)', () => {
    const uri = '/sap/bc/adt/oo/classes/zcl_test';
    store.register(makeEntry({ objectUri: uri, lockHandle: 'OLD_HANDLE' }));
    store.register(makeEntry({ objectUri: uri, lockHandle: 'NEW_HANDLE' }));

    const entries = store.list();
    expect(entries).toHaveLength(1);
    expect(entries[0].lockHandle).toBe('NEW_HANDLE');
  });

  // ── deregister ──────────────────────────────────────────────────────

  it('deregister() removes entry by objectUri', () => {
    const uri = '/sap/bc/adt/oo/classes/zcl_test';
    store.register(makeEntry({ objectUri: uri }));
    expect(store.list()).toHaveLength(1);

    store.deregister(uri);
    expect(store.list()).toHaveLength(0);
  });

  it('deregister() is a no-op for unknown URI', () => {
    store.register(makeEntry());
    store.deregister('/sap/bc/adt/oo/classes/zcl_unknown');
    expect(store.list()).toHaveLength(1);
  });

  it('deregister() only removes the matching entry', () => {
    store.register(makeEntry({ objectUri: '/a', objectName: 'A' }));
    store.register(makeEntry({ objectUri: '/b', objectName: 'B' }));
    store.register(makeEntry({ objectUri: '/c', objectName: 'C' }));

    store.deregister('/b');

    const entries = store.list();
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.objectUri)).toEqual(['/a', '/c']);
  });

  // ── list ────────────────────────────────────────────────────────────

  it('list() returns empty array when file does not exist', () => {
    expect(store.list()).toEqual([]);
  });

  it('list() returns empty array when file is corrupted', () => {
    const filePath = join(dir, 'locks.json');
    require('node:fs').writeFileSync(filePath, 'NOT_JSON');
    expect(store.list()).toEqual([]);
  });

  // ── clear ───────────────────────────────────────────────────────────

  it('clear() removes all entries', () => {
    store.register(makeEntry({ objectUri: '/a', objectName: 'A' }));
    store.register(makeEntry({ objectUri: '/b', objectName: 'B' }));
    expect(store.list()).toHaveLength(2);

    store.clear();
    expect(store.list()).toHaveLength(0);

    // File still exists but contains empty array
    const data = JSON.parse(readFileSync(join(dir, 'locks.json'), 'utf8'));
    expect(data).toEqual([]);
  });

  // ── entry fields ────────────────────────────────────────────────────

  it('persists all LockEntry fields', () => {
    const entry: LockEntry = {
      objectUri: '/sap/bc/adt/oo/classes/zcl_full',
      objectName: 'ZCL_FULL',
      objectType: 'CLAS/OC',
      lockHandle: 'H123',
      transport: 'DEVK900001',
      host: 'https://sap.example.com',
      lockedAt: '2025-01-15T10:30:00.000Z',
    };

    store.register(entry);
    const [stored] = store.list();

    expect(stored).toEqual(entry);
  });

  it('handles entries without optional fields', () => {
    const entry: LockEntry = {
      objectUri: '/sap/bc/adt/ddic/domains/ztest',
      objectName: 'ZTEST',
      lockHandle: 'H456',
      lockedAt: '2025-01-15T10:30:00.000Z',
    };

    store.register(entry);
    const [stored] = store.list();

    expect(stored.objectUri).toBe(entry.objectUri);
    expect(stored.objectType).toBeUndefined();
    expect(stored.transport).toBeUndefined();
    expect(stored.host).toBeUndefined();
  });
});
