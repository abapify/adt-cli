/**
 * Locks Command
 *
 * List and clean up persisted ADT lock handles.
 *
 * Lock entries are written to ~/.adt/locks.json whenever ADK acquires
 * a lock via `_action=LOCK`. On normal unlock the entry is removed.
 * If the process crashes before unlocking, entries survive and can be
 * used to recover:
 *
 *   adt locks              # list persisted locks
 *   adt locks cleanup      # try to UNLOCK every persisted entry
 *   adt locks clear        # wipe the registry without unlocking
 */

import { Command } from 'commander';
import {
  FileLockStore,
  createLockService,
  type LockEntry,
} from '@abapify/adt-locks';
import { getAdtClientV2 } from '../utils/adt-client-v2';

const store = new FileLockStore();

// ── helpers ──────────────────────────────────────────────────────────

function formatAge(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ${min % 60}m ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function printEntry(e: LockEntry, idx: number): void {
  console.log(
    `  ${idx + 1}. ${e.objectName}` +
      (e.objectType ? ` (${e.objectType})` : '') +
      `  ${formatAge(e.lockedAt)}`,
  );
  console.log(`     uri:    ${e.objectUri}`);
  console.log(`     handle: ${e.lockHandle}`);
  if (e.transport) console.log(`     transport: ${e.transport}`);
}

// ── sub-commands ─────────────────────────────────────────────────────

const listAction = () => {
  const entries = store.list();
  if (entries.length === 0) {
    console.log('No persisted locks.');
    return;
  }
  console.log(`📋 ${entries.length} persisted lock(s):\n`);
  entries.forEach(printEntry);
};

const cleanupAction = async () => {
  const entries = store.list();
  if (entries.length === 0) {
    console.log('No persisted locks to clean up.');
    return;
  }

  console.log(`🔓 Attempting to unlock ${entries.length} object(s)...\n`);
  const client = await getAdtClientV2();
  const locks = createLockService(client, { store });
  const { ok, failed } = await locks.cleanup();

  // Print individual results
  const remaining = store.list();
  const unlocked = entries.filter(
    (e) => !remaining.some((r) => r.objectUri === e.objectUri),
  );
  for (const e of unlocked) {
    console.log(`  ✅ ${e.objectName}`);
  }
  for (const e of remaining) {
    console.log(`  ❌ ${e.objectName}`);
  }

  console.log(`\nDone: ${ok} unlocked` + (failed ? `, ${failed} failed` : ''));
};

const clearAction = () => {
  const count = store.list().length;
  store.clear();
  console.log(
    count > 0
      ? `🗑️  Cleared ${count} lock entry(ies) from registry.`
      : 'Registry already empty.',
  );
};

// ── command tree ─────────────────────────────────────────────────────

export const locksCommand = new Command('locks')
  .description('List and manage persisted ADT lock handles')
  .action(listAction);

locksCommand
  .command('list')
  .description('List all persisted lock entries')
  .action(listAction);

locksCommand
  .command('cleanup')
  .description('Try to UNLOCK every persisted entry on the SAP system')
  .action(cleanupAction);

locksCommand
  .command('clear')
  .description('Remove all entries from the registry (does NOT unlock on SAP)')
  .action(clearAction);
