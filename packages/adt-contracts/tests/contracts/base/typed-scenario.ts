/**
 * Typed Contract Scenario Framework
 *
 * Abstract base class with generic type parameter from contract.
 * Provides fully-typed assertRequest/assertResponse methods.
 *
 * @example
 * ```typescript
 * class AtcWorklistScenario extends TypedContractScenario<typeof worklistsContract.get> {
 *   readonly contract = worklistsContract.get;
 *   readonly fixture = fixtures.atc.worklist;
 *
 *   assertRequest(req) {
 *     // req.query is fully typed!
 *     expect(req.query?.timestamp).toBeDefined();
 *   }
 *
 *   assertResponse(res) {
 *     // res is fully typed from schema!
 *     expect(res.worklist.objectSet[0].finding[0].messageId).toBe('...');
 *   }
 * }
 * ```
 */

import { describe, it, expect } from 'vitest';
import type { FixtureHandle } from 'adt-fixtures';
import type {
  RestEndpointDescriptor,
  InferSuccessResponse,
  InferSchema,
} from 'speci/rest';
import { createMockAdapter } from './mock-adapter';
import { createClient } from 'speci/rest';

/**
 * Extract the descriptor type from a contract operation function
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExtractDescriptor<T> = T extends (...args: any[]) => infer D ? D : never;

/**
 * Extract request type from a contract operation
 * Includes: method, path, headers, query, body
 */
type ExtractRequest<T> =
  ExtractDescriptor<T> extends RestEndpointDescriptor<
    infer TMethod,
    infer TPath,
    infer TBody,
    infer _TResponses
  >
    ? {
        method: TMethod;
        path: TPath;
        headers?: Record<string, string>;
        query?: ExtractDescriptor<T> extends { query?: infer Q }
          ? Q
          : undefined;
        body?: InferSchema<TBody>;
      }
    : never;

/**
 * Extract response type from a contract operation (200 response)
 */
type ExtractResponse<T> =
  ExtractDescriptor<T> extends RestEndpointDescriptor
    ? InferSuccessResponse<ExtractDescriptor<T>>
    : never;

/**
 * Extract body type from a contract operation (for POST/PUT)
 * Uses InferSchema to get the typed body from the body schema
 */
type ExtractBody<T> =
  ExtractDescriptor<T> extends RestEndpointDescriptor<
    infer _TMethod,
    infer _TPath,
    infer TBody,
    infer _TResponses
  >
    ? InferSchema<TBody>
    : never;

/**
 * Abstract base class for typed contract scenarios.
 *
 * Generic parameter TContract is the contract operation function type.
 * This flows through to provide full typing for request/response assertions.
 *
 * @template TContract - The contract operation function type (e.g., typeof worklistsContract.get)
 */
export abstract class TypedContractScenario<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TContract extends (...args: any[]) => RestEndpointDescriptor,
> {
  /** Human-readable scenario name */
  abstract readonly name: string;

  /** The contract operation function */
  abstract readonly contract: TContract;

  /** Fixture for response data */
  abstract readonly fixture: FixtureHandle;

  /** Parameters to pass to the contract function */
  getContractParams(): Parameters<TContract> {
    return [] as unknown as Parameters<TContract>;
  }

  /**
   * Assert request properties.
   * Override to add custom request assertions.
   *
   * @param request - Fully typed request object
   */
  assertRequest(_request: ExtractRequest<TContract>): void {
    // Default: no assertions, override in subclass
  }

  /**
   * Assert response properties.
   * Override to add custom response assertions.
   *
   * @param response - Fully typed response object (parsed from fixture)
   */
  assertResponse(_response: ExtractResponse<TContract>): void {
    // Default: no assertions, override in subclass
  }

  /**
   * Get the contract descriptor for this scenario
   */
  getDescriptor(): ExtractDescriptor<TContract> {
    return this.contract(
      ...this.getContractParams(),
    ) as ExtractDescriptor<TContract>;
  }
}

/**
 * Run a typed contract scenario.
 * Executes request/response assertions with full type safety.
 */
 
export function runTypedScenario<
  T extends (...args: any[]) => RestEndpointDescriptor,
>(scenario: TypedContractScenario<T>): void {
  describe(scenario.name, () => {
    const descriptor = scenario.getDescriptor();

    describe('request', () => {
      it('has valid contract descriptor', () => {
        expect(descriptor).toBeDefined();
        expect(descriptor.method).toBeDefined();
        expect(descriptor.path).toBeDefined();
      });

      it('passes request assertions', () => {
        const request = {
          method: descriptor.method,
          path: descriptor.path,
          headers: descriptor.headers,
          query: descriptor.query,
          body: descriptor.body,
        } as ExtractRequest<T>;

        scenario.assertRequest(request);
      });
    });

    describe('response', () => {
      it('parses fixture and passes response assertions', async () => {
        // Create mock adapter that returns fixture
        const adapter = createMockAdapter([
          {
            response: { status: 200, body: scenario.fixture },
          },
        ]);

        // Create client with mock adapter
        const client = createClient(
          { operation: scenario.contract },
          {
            baseUrl: '',
            adapter,
          },
        );

        // Call the operation
        const response = await (
          client.operation as unknown as (
            ...args: unknown[]
          ) => Promise<unknown>
        )(...scenario.getContractParams());

        // Run typed assertions
        scenario.assertResponse(response as ExtractResponse<T>);
      });
    });
  });
}

// Re-export expect for use in scenarios
export { expect };

// Export type helpers for use in scenarios
export type { ExtractRequest, ExtractResponse, ExtractBody };
