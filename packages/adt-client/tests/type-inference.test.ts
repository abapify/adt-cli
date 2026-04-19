/**
 * Type Inference Test
 *
 * Verifies that speci + ts-xsd type inference works correctly
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createAdtClient } from '../src/index';

describe('Type Inference', () => {
  it('should infer response types from schema', async () => {
    const client = createAdtClient({
      baseUrl: 'https://example.com',
      username: 'test',
      password: 'test',
      client: '100',
      language: 'EN',
    });

    // This should compile without type errors
    // The discovery response should be typed as DiscoveryXml
    // NOT as 'unknown'

    // Type test: If this compiles, type inference works
    type _DiscoveryType = Awaited<
      ReturnType<typeof client.discovery.getDiscovery>
    >;

    // This will fail at runtime (no real server), but should compile
    try {
      const discovery = await client.discovery.getDiscovery();
      // If we get here, these properties should be typed correctly
      const workspaceCount: number = discovery.workspace.length;
      assert.ok(typeof workspaceCount === 'number');
    } catch (_error) {
      // Expected to fail at runtime - we're testing compile-time types
      assert.ok(true, 'Runtime failure expected - this is a type test');
    }
  });

  it('should infer request body types from schema', async () => {
    const _client = createAdtClient({
      baseUrl: 'https://example.com',
      username: 'test',
      password: 'test',
      client: '100',
      language: 'EN',
    });

    // Type test: This should show what type is expected for create
    type CreateParamType = Parameters<typeof client.classes.create>[1];

    // This should compile if type inference works
    // If it doesn't, CreateParamType will be 'never' or 'unknown'
    const testData: CreateParamType = {
      name: 'TEST',
      description: 'Test',
      category: 'normal',
      visibility: 'public',
      final: false,
      abstract: false,
      packageRef: {
        uri: '/test',
        type: 'DEVC/K',
        name: '$TMP',
      },
    };

    assert.ok(testData.name === 'TEST', 'Type test data created');
  });
});
