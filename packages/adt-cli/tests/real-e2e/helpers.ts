/**
 * Shared real-SAP end-to-end test harness.
 *
 * Unlike the mock harness in `tests/e2e/harness.ts`, this one:
 *  - Uses a real `AdtClient` built from an on-disk session
 *    (`~/.adt/sessions/<SID>.json` via `getAdtClientV2()`), complete with
 *    OAuth refresh, CSRF session handling and real cookies.
 *  - Spawns the compiled CLI (`packages/adt-cli/dist/bin/adt.mjs`) as a
 *    subprocess, so it exercises the exact binary a user would run.
 *
 * These tests are explicit opt-in — they are NOT part of the default
 * `nx test adt-cli` run. They are only invoked via:
 *
 *     cd packages/adt-cli && npx vitest run tests/real-e2e/
 *
 * or through the `test:real` Nx target.
 *
 * Skipping rules:
 *  - If `ADT_SKIP_REAL_E2E=1` is set → all tests skipped.
 *  - If `~/.adt/sessions/<SID>.json` is missing for the selected SID
 *    (default `TRL`, overridable via `ADT_REAL_SID`) → skipped.
 *
 * Safety rules:
 *  - Tests are READ-ONLY by default.
 *  - Any write-test must use `describeReal.write(...)` and requires
 *    `ADT_REAL_E2E_WRITE=1`. This is enforced by a gating check.
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe } from 'vitest';
import type { AdtClient } from '@abapify/adt-client';
import { getAdtClientV2 } from '../../src/lib/utils/adt-client-v2';

// ────────────────────────────────────────────────────────────────────────────
// Skip gating
// ────────────────────────────────────────────────────────────────────────────

/** The SAP System ID (SID) the real-e2e tests target. */
export const REAL_SID = process.env.ADT_REAL_SID ?? 'TRL';

const sessionPath = join(homedir(), '.adt', 'sessions', `${REAL_SID}.json`);

/**
 * True when a session file is present AND the user has not explicitly opted
 * out via `ADT_SKIP_REAL_E2E=1`. When false, `describeReal` blocks are
 * skipped at the suite level (they do not contribute failures).
 */
export const realE2eEnabled =
  process.env.ADT_SKIP_REAL_E2E !== '1' && existsSync(sessionPath);

/**
 * `describe`-equivalent that auto-skips if the real SAP session is not
 * available. Block-level skip keeps the test output clean and makes it
 * trivial to run the default test suite on any machine.
 */
export const describeReal = ((name: string, fn: () => void) =>
  describe.skipIf(!realE2eEnabled)(`${name} [real-e2e:${REAL_SID}]`, fn)) as {
  (name: string, fn: () => void): void;
  /**
   * Opt-in variant for WRITE tests. These are skipped unless
   * `ADT_REAL_E2E_WRITE=1` is also set, protecting real systems from
   * accidental mutation during a routine test run.
   */
  write: (name: string, fn: () => void) => void;
};

describeReal.write = (name: string, fn: () => void) =>
  describe.skipIf(!realE2eEnabled || process.env.ADT_REAL_E2E_WRITE !== '1')(
    `${name} [real-e2e:${REAL_SID}:WRITE]`,
    fn,
  );

// ────────────────────────────────────────────────────────────────────────────
// Real AdtClient factory
// ────────────────────────────────────────────────────────────────────────────

let cachedClient: AdtClient | null = null;

/**
 * Lazily build (and cache) an authenticated `AdtClient` pointed at the real
 * SAP system identified by `REAL_SID`. Uses the same `getAdtClientV2()`
 * helper that production CLI commands use — so OAuth refresh, cookie /
 * bearer handling and CSRF session setup all match production.
 *
 * One client is shared across all tests in a file; tests should not mutate
 * its internal state.
 */
export async function getRealClient(): Promise<AdtClient> {
  if (cachedClient) return cachedClient;
  cachedClient = await getAdtClientV2({
    sid: REAL_SID,
    // Keep the test output clean — production CLI uses its own logger.
    logger: {
      trace: () => undefined,
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
      fatal: () => undefined,
      child: function () {
        return this;
      },
    },
  });
  return cachedClient;
}

// ────────────────────────────────────────────────────────────────────────────
// CLI subprocess runner
// ────────────────────────────────────────────────────────────────────────────

export interface RealCliRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

const thisDir = dirname(fileURLToPath(import.meta.url));
// packages/adt-cli/tests/real-e2e → packages/adt-cli
const PACKAGE_ROOT = resolve(thisDir, '..', '..');
const CLI_BIN = join(PACKAGE_ROOT, 'dist', 'bin', 'adt.mjs');

/**
 * Run the compiled `adt` binary against the real SAP system as a
 * subprocess. Captures stdout / stderr / exit code. Inherits the user's
 * `~/.adt` session store so credentials and CSRF state are shared with
 * manual CLI runs.
 *
 * @param argv - CLI arguments AFTER the `adt` command name
 * @param opts.timeoutMs - Kill the process after this many milliseconds.
 *                        Default 120_000.
 */
export async function runRealCli(
  argv: string[],
  opts: { timeoutMs?: number } = {},
): Promise<RealCliRunResult> {
  if (!existsSync(CLI_BIN)) {
    throw new Error(
      `CLI binary not found at ${CLI_BIN}. Run \`bunx nx build adt-cli\` first.`,
    );
  }

  const timeoutMs = opts.timeoutMs ?? 120_000;

  return await new Promise<RealCliRunResult>((resolvePromise, reject) => {
    const child = spawn(process.execPath, [CLI_BIN, ...argv], {
      cwd: PACKAGE_ROOT,
      env: {
        ...process.env,
        // Force a stable SID so `getAdtClientV2()` picks the same session.
        ADT_SID: process.env.ADT_SID ?? REAL_SID,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout?.on('data', (c: Buffer) => stdoutChunks.push(c));
    child.stderr?.on('data', (c: Buffer) => stderrChunks.push(c));

    const killer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(
        new Error(
          `runRealCli: timeout after ${timeoutMs}ms for \`adt ${argv.join(' ')}\``,
        ),
      );
    }, timeoutMs);

    child.on('error', (err) => {
      clearTimeout(killer);
      reject(err);
    });

    child.on('close', (code) => {
      clearTimeout(killer);
      resolvePromise({
        stdout: Buffer.concat(stdoutChunks).toString('utf8'),
        stderr: Buffer.concat(stderrChunks).toString('utf8'),
        exitCode: code ?? 0,
      });
    });
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Fixture capture helper
// ────────────────────────────────────────────────────────────────────────────

const FIXTURES_ROOT = resolve(
  PACKAGE_ROOT,
  '..',
  'adt-fixtures',
  'src',
  'fixtures',
);

/**
 * Persist a real SAP response to the `@abapify/adt-fixtures` tree,
 * annotated with a capture header so future readers can trace provenance.
 *
 * - XML / text → prepend an XML comment with SID + ISO date.
 * - JSON objects → add a `_captured` field.
 *
 * @param response - The raw response (string or serialisable object).
 * @param relativePath - Path under `packages/adt-fixtures/src/fixtures/`,
 *                       e.g. `oo/badi/impl-list.xml`.
 * @returns Absolute path of the written file.
 */
export function captureFixture(
  response: string | Record<string, unknown>,
  relativePath: string,
): string {
  const targetPath = join(FIXTURES_ROOT, relativePath);
  mkdirSync(dirname(targetPath), { recursive: true });
  const today = new Date().toISOString().slice(0, 10);

  if (typeof response === 'string') {
    const header = `<!-- captured from real SAP ${REAL_SID} on ${today} -->\n`;
    writeFileSync(
      targetPath,
      response.startsWith('<?xml')
        ? response.replace(/\?>\s*/, `?>\n${header}`)
        : header + response,
      'utf8',
    );
  } else {
    const payload = {
      ...response,
      _captured: { sid: REAL_SID, date: today },
    };
    writeFileSync(targetPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  }
  return targetPath;
}
