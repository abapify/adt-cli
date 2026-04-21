/**
 * CLI state storage for `adt changeset …`.
 *
 * Because the CLI is stateless across invocations, an open changeset is
 * persisted to `~/.adt/changesets/<systemId>/<id>.json`. The first
 * command (begin) prints the id; subsequent commands (add/commit/
 * rollback) take `--changeset <id>`.
 *
 * This mirrors how `adt cts tr …` keeps transport state side by side.
 * The on-disk format is an internal implementation detail of the CLI —
 * MCP tools never see it (they store the changeset in-memory on the
 * session context).
 */

import { mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Changeset } from '../../services/changeset';

const ROOT = join(homedir(), '.adt', 'changesets');

function dirFor(systemId: string): string {
  return join(ROOT, systemId || 'default');
}

function pathFor(systemId: string, id: string): string {
  return join(dirFor(systemId), `${id}.json`);
}

export function saveChangeset(systemId: string, cs: Changeset): void {
  mkdirSync(dirFor(systemId), { recursive: true });
  writeFileSync(pathFor(systemId, cs.id), JSON.stringify(cs, null, 2), 'utf-8');
}

export function loadChangeset(systemId: string, id: string): Changeset {
  const raw = readFileSync(pathFor(systemId, id), 'utf-8');
  return JSON.parse(raw) as Changeset;
}

export function deleteChangeset(systemId: string, id: string): void {
  try {
    unlinkSync(pathFor(systemId, id));
  } catch {
    /* ignore — best-effort cleanup */
  }
}
