/**
 * Smoke test — confirms the real-e2e harness can reach the configured SAP
 * system (`TRL` by default) and that the compiled CLI returns the same
 * identification data via subprocess execution.
 */

import { expect, it } from 'vitest';
import { describeReal, getRealClient, runRealCli, REAL_SID } from './helpers';

describeReal('smoke', () => {
  it(`AdtClient reports systemID = ${REAL_SID}`, async () => {
    const client = await getRealClient();
    const info = await client.adt.core.http.systeminformation.getSystemInfo();
    expect(info.systemID).toBe(REAL_SID);
  });

  it('compiled CLI `adt info` exits 0 and prints System ID', async () => {
    const res = await runRealCli(['info']);
    expect(res.exitCode, res.stderr || res.stdout).toBe(0);
    expect(res.stdout).toMatch(/System ID:/);
    expect(res.stdout).toMatch(new RegExp(`System ID:\\s*${REAL_SID}`));
  }, 120_000);
});
