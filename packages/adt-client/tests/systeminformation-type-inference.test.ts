/**
 * System Information Type Inference Test
 *
 * Verifies that the systeminformation contract correctly infers response types
 * This is a COMPILE-TIME test - if it compiles, type inference works correctly
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createAdtClient } from '../src/index';
import type { SystemInformationJson } from '../src/adt/core/http/systeminformation-schema';

describe('System Information Type Inference', () => {
  it('should infer SystemInformationJson response type from contract', async () => {
    const client = createAdtClient({
      baseUrl: 'https://example.com',
      username: 'test',
      password: 'test',
      client: '100',
      language: 'EN',
    });

    // Type test: Extract the return type of getSystemInformation
    type SystemInfoType = Awaited<
      ReturnType<typeof client.core.http.systeminformation.getSystemInformation>
    >;

    // CRITICAL: This must compile without errors
    // If the contract doesn't specify responses: { 200: ... }, this will be 'unknown'
    const assertType: SystemInfoType = {
      systemID: 'NPL',
      client: '001',
      userName: 'DEVELOPER',
      userFullName: 'Test User',
      language: 'EN',
    };

    // Verify the inferred type matches our schema
    const typeCheck: SystemInfoType extends SystemInformationJson
      ? true
      : false = true;
    assert.ok(typeCheck, 'Inferred type must extend SystemInformationJson');

    // Test that all expected fields are accessible with correct types
    assert.strictEqual(typeof assertType.systemID, 'string');
    assert.strictEqual(typeof assertType.client, 'string');
    assert.strictEqual(typeof assertType.userName, 'string');
    assert.strictEqual(typeof assertType.language, 'string');

    // This will fail at runtime (no real server), but MUST compile
    try {
      const sysInfo =
        await client.core.http.systeminformation.getSystemInformation();

      // These property accesses should be type-safe
      const systemId: string | undefined = sysInfo.systemID;
      const client: string | undefined = sysInfo.client;
      const userName: string | undefined = sysInfo.userName;
      const language: string | undefined = sysInfo.language;

      assert.ok(true, 'Types are correct');
    } catch (error) {
      // Expected to fail at runtime - this is a COMPILE-TIME type test
      assert.ok(
        true,
        'Runtime failure expected - validating compile-time types',
      );
    }
  });

  it('should type-check field access on response', async () => {
    const client = createAdtClient({
      baseUrl: 'https://example.com',
      username: 'test',
      password: 'test',
      client: '100',
      language: 'EN',
    });

    try {
      const sysInfo =
        await client.core.http.systeminformation.getSystemInformation();

      // These should all compile - proving the type is inferred correctly
      // If type inference fails, these would be type errors
      const hasSystemId: boolean = 'systemID' in sysInfo;
      const hasClient: boolean = 'client' in sysInfo;
      const hasUserName: boolean = 'userName' in sysInfo;

      assert.ok(hasSystemId || hasClient || hasUserName, 'Type guards work');
    } catch (error) {
      // Expected - compile-time type test
      assert.ok(true, 'Runtime failure expected');
    }
  });
});
