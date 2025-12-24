/**
 * Discovery Contract Scenarios
 *
 * Two types of tests:
 * 1. Contract Definition Tests - validate method, path, headers, body, responses
 * 2. Client Call Tests - test FULLY TYPED client calls
 *    - Response is typed (no casts)
 *    - Access response.service.workspace etc. with full type safety
 */

import { describe, it, expect } from 'vitest';
import { discovery } from '../../src/schemas';
import {
  ContractScenario,
  runScenario,
  type ContractOperation,
  createClient,
} from './base';
import { discoveryContract } from '../../src/adt/discovery';
import { createMockAdapter } from '../helpers/mock-adapter';

// Mock XML for client call tests
const MOCK_DISCOVERY_XML = `<?xml version="1.0" encoding="UTF-8"?>
<service xmlns="http://www.w3.org/2007/app">
  <workspace>
    <title>ADT Discovery</title>
  </workspace>
</service>`;

class DiscoveryScenario extends ContractScenario {
  readonly name = 'Discovery';

  readonly operations: ContractOperation[] = [
    {
      name: 'get discovery document',
      contract: () => discoveryContract.getDiscovery(),
      method: 'GET',
      path: '/sap/bc/adt/discovery',
      headers: { Accept: 'application/atomsvc+xml' },
      response: {
        status: 200,
        schema: discovery,
        // No fixture yet - discovery responses are large
      },
    },
  ];
}

// =============================================================================
// Client Call Tests - FULLY TYPED response
// =============================================================================

describe('Discovery Client Calls - Typed Response Validation', () => {
  it('GET /discovery returns typed service response', async () => {
    const { adapter } = createMockAdapter({ xml: MOCK_DISCOVERY_XML });
    const client = createClient(discoveryContract, {
      baseUrl: 'https://sap.example.com',
      adapter,
    });

    // Response is FULLY TYPED - no casts needed!
    const response = await client.getDiscovery();

    // TYPE CHECK: These property accesses would fail to compile if type inference breaks!
    // The compiler verifies these properties exist on the response type
    const _typeCheck_service: typeof response.service = response.service;
    const _typeCheck_workspace: typeof response.service.workspace =
      response.service?.workspace;

    // Suppress unused variable warnings
    void _typeCheck_service;
    void _typeCheck_workspace;

    // Runtime assertion
    expect(response).toBeDefined();
  });
});

// =============================================================================
// Run contract definition scenarios
// =============================================================================

runScenario(new DiscoveryScenario());
