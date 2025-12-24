/**
 * Contract Testing Framework
 *
 * Tests contract definitions: method, path, headers, body, responses.
 * Uses speci's RestEndpointDescriptor - no duplicate types.
 */

import { describe, it, expect } from 'vitest';
import { type FixtureHandle } from 'adt-fixtures';
import type { RestEndpointDescriptor, RestMethod } from 'speci/rest';

/** Contract operation definition for testing */
export interface ContractOperation {
  /** Human-readable name */
  name: string;
  /** Function that returns the speci endpoint descriptor */
  contract: () => RestEndpointDescriptor;
  /** Expected HTTP method */
  method: RestMethod;
  /** Expected path (can be exact or pattern) */
  path: string | RegExp;
  /** Expected headers (partial match) */
  headers?: Record<string, string>;
  /** Expected query params */
  query?: Record<string, unknown>;
  /** Body schema validation */
  body?: {
    schema: unknown;
    /** Fixture to test build/parse round-trip */
    fixture?: FixtureHandle;
  };
  /** Response schema validation */
  response?: {
    status: number;
    schema: unknown;
    /** Fixture to test parse */
    fixture?: FixtureHandle;
  };
}

/**
 * Base class for contract scenarios.
 * Groups related operations for a single API area.
 */
export abstract class ContractScenario {
  /** Scenario name (e.g., 'CTS Transports') */
  abstract readonly name: string;
  /** Operations to test */
  abstract readonly operations: ContractOperation[];
}

/**
 * Run a contract scenario as a standalone test suite.
 * Call this from each *.test.ts file.
 */
export function runScenario(scenario: ContractScenario): void {
  describe(scenario.name, () => {
    for (const op of scenario.operations) {
      describe(op.name, () => {
        const contract = op.contract();

        it('has correct method', () => {
          expect(contract.method).toBe(op.method);
        });

        it('has correct path', () => {
          if (typeof op.path === 'string') {
            expect(contract.path).toBe(op.path);
          } else {
            expect(contract.path).toMatch(op.path);
          }
        });

        // Capture values to avoid non-null assertions in callbacks
        const { headers, query, body, response } = op;

        if (headers) {
          it('has correct headers', () => {
            expect(contract.headers).toMatchObject(headers);
          });
        }

        if (query) {
          it('has correct query params', () => {
            expect(contract.query).toEqual(query);
          });
        }

        if (body) {
          const bodySchema = body.schema as {
            parse: (xml: string) => unknown;
            build?: (data: unknown) => string;
          };
          const bodyFixture = body.fixture;

          it('has body schema', () => {
            expect(contract.body).toBe(body.schema);
          });

          if (bodyFixture) {
            it('body schema parses fixture', async () => {
              const xml = await bodyFixture.load();
              const parsed = bodySchema.parse(xml);
              expect(parsed).toBeDefined();
            });

            it('body schema round-trips', async () => {
              const xml = await bodyFixture.load();
              const parsed = bodySchema.parse(xml);
              if (bodySchema.build) {
                const rebuilt = bodySchema.build(parsed);
                expect(rebuilt).toContain('<?xml');
              }
            });
          }
        }

        if (response) {
          const responseSchema = response.schema as {
            parse: (xml: string) => unknown;
          };
          const responseFixture = response.fixture;
          const responseStatus = response.status;

          it(`has response schema for ${responseStatus}`, () => {
            expect(contract.responses[responseStatus]).toBe(response.schema);
          });

          if (responseFixture) {
            it('response schema parses fixture', async () => {
              const xml = await responseFixture.load();
              const parsed = responseSchema.parse(xml);
              expect(parsed).toBeDefined();
            });
          }
        }
      });
    }
  });
}

/** Re-export FixtureHandle for convenience */
export type { FixtureHandle };

// Re-export speci createClient for use in specific contract tests
export { createClient } from 'speci/rest';

// Re-export mock adapter for client tests
export { createMockAdapter, createSimpleMockAdapter } from './mock-adapter';
export type { MockMatcher, MockResponse } from './mock-adapter';
