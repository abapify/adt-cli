/**
 * Tests for `getAdtClientV2Safe` — the exit-free variant used by
 * long-running processes (adt-mcp, daemons).
 *
 * The key guarantee we validate here: when the on-disk session store has
 * no entry for the requested SID, the function THROWS `AdtAuthError`
 * rather than calling `process.exit(1)`.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getAdtClientV2Safe, AdtAuthError } from './adt-client-v2';

describe('getAdtClientV2Safe', () => {
  const originalExit = process.exit;
  let exitCalled = false;

  beforeEach(() => {
    exitCalled = false;
    // Fail the test loudly if process.exit is ever reached.
    process.exit = ((_code?: number) => {
      exitCalled = true;
      throw new Error(
        'process.exit was called — getAdtClientV2Safe must throw instead',
      );
    }) as typeof process.exit;
  });

  afterEach(() => {
    process.exit = originalExit;
  });

  it('throws AdtAuthError (not process.exit) when SID has no session on disk', async () => {
    const bogusSid = `NONEXISTENT_TEST_SID_${Date.now()}`;

    await expect(getAdtClientV2Safe({ sid: bogusSid })).rejects.toSatisfy(
      (err: unknown) => {
        if (!(err instanceof AdtAuthError)) return false;
        if (err.code !== 'NO_SESSION') return false;
        if (err.systemId !== bogusSid) return false;
        return true;
      },
    );

    expect(exitCalled).toBe(false);
  });

  it('AdtAuthError preserves name, code, and systemId fields', () => {
    const err = new AdtAuthError('REFRESH_FAILED', 'boom', 'X01');
    expect(err.name).toBe('AdtAuthError');
    expect(err.code).toBe('REFRESH_FAILED');
    expect(err.systemId).toBe('X01');
    expect(err.message).toBe('boom');
    expect(err).toBeInstanceOf(Error);
  });
});
