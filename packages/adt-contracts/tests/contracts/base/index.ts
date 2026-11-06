/**
 * Contract Testing Framework
 *
 * Tests contract definitions: method, path, headers, body, responses.
 * Uses speci's RestEndpointDescriptor - no duplicate types.
 */

import { describe, it, expect } from 'vitest';
import { type FixtureHandle } from '@abapify/adt-fixtures';
import type { RestEndpointDescriptor, RestMethod } from '@abapify/speci/rest';

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

/** Body schema shape exercised by contract checks (parse + optional build) */
type BodySchema = {
  parse: (xml: string) => unknown;
  build?: (data: unknown) => string;
};

/** Response schema shape exercised by contract checks */
type ResponseSchema = {
  parse: (xml: string) => unknown;
};

function checkMethod(
  expected: RestMethod,
  contract: RestEndpointDescriptor,
): void {
  expect(contract.method).toBe(expected);
}

function checkPath(
  expected: string | RegExp,
  contract: RestEndpointDescriptor,
): void {
  if (typeof expected === 'string') {
    expect(contract.path).toBe(expected);
  } else {
    expect(contract.path).toMatch(expected);
  }
}

function checkHeaders(
  headers: Record<string, string>,
  contract: RestEndpointDescriptor,
): void {
  expect(contract.headers).toMatchObject(headers);
}

function checkQuery(
  query: Record<string, unknown>,
  contract: RestEndpointDescriptor,
): void {
  expect(contract.query).toEqual(query);
}

function checkBodySchema(
  schema: unknown,
  contract: RestEndpointDescriptor,
): void {
  expect(contract.body).toBe(schema);
}

async function checkBodyFixtureParses(
  schema: BodySchema,
  fixture: FixtureHandle,
): Promise<void> {
  const xml = await fixture.load();
  const parsed = schema.parse(xml);
  expect(parsed).toBeDefined();
}

async function checkBodyFixtureRoundTrips(
  schema: BodySchema,
  fixture: FixtureHandle,
): Promise<void> {
  const xml = await fixture.load();
  const parsed = schema.parse(xml);
  if (schema.build) {
    const rebuilt = schema.build(parsed);
    expect(rebuilt).toContain('<?xml');
  }
}

function checkResponseSchema(
  response: NonNullable<ContractOperation['response']>,
  contract: RestEndpointDescriptor,
): void {
  expect(contract.responses[response.status]).toBe(response.schema);
}

async function checkResponseFixtureParses(
  schema: ResponseSchema,
  fixture: FixtureHandle,
): Promise<void> {
  const xml = await fixture.load();
  const parsed = schema.parse(xml);
  expect(parsed).toBeDefined();
}

/**
 * Check a single contract operation: method, path, headers, query, body
 * schema (parse + round-trip) and response schema.
 *
 * This runs exactly the assertions `runScenario` applies to one operation.
 * Test files can declare their own `it()` cases around it, which keeps the
 * test declarations statically visible to test discovery tooling.
 */
export async function checkContractOperation(
  op: ContractOperation,
): Promise<void> {
  const contract = op.contract();

  checkMethod(op.method, contract);
  checkPath(op.path, contract);

  // Capture values to avoid non-null assertions in callbacks
  const { headers, query, body, response } = op;

  if (headers) {
    checkHeaders(headers, contract);
  }

  if (query) {
    checkQuery(query, contract);
  }

  if (body) {
    const bodySchema = body.schema as BodySchema;
    const bodyFixture = body.fixture;

    checkBodySchema(body.schema, contract);

    if (bodyFixture) {
      await checkBodyFixtureParses(bodySchema, bodyFixture);
      await checkBodyFixtureRoundTrips(bodySchema, bodyFixture);
    }
  }

  if (response) {
    const responseSchema = response.schema as ResponseSchema;
    const responseFixture = response.fixture;

    checkResponseSchema(response, contract);

    if (responseFixture) {
      await checkResponseFixtureParses(responseSchema, responseFixture);
    }
  }
}

/** Register the `it()` for the optional `headers` check. */
function registerHeaderCheck(
  op: ContractOperation,
  contract: RestEndpointDescriptor,
): void {
  const { headers } = op;
  if (!headers) return;

  it('has correct headers', () => {
    checkHeaders(headers, contract);
  });
}

/** Register the `it()` for the optional `query` check. */
function registerQueryCheck(
  op: ContractOperation,
  contract: RestEndpointDescriptor,
): void {
  const { query } = op;
  if (!query) return;

  it('has correct query params', () => {
    checkQuery(query, contract);
  });
}

/** Register the `it()` cases for the optional `body` checks. */
function registerBodyChecks(
  op: ContractOperation,
  contract: RestEndpointDescriptor,
): void {
  const { body } = op;
  if (!body) return;

  it('has body schema', () => {
    checkBodySchema(body.schema, contract);
  });

  const bodyFixture = body.fixture;
  if (!bodyFixture) return;

  it('body schema parses fixture', async () => {
    await checkBodyFixtureParses(body.schema as BodySchema, bodyFixture);
  });

  it('body schema round-trips', async () => {
    await checkBodyFixtureRoundTrips(body.schema as BodySchema, bodyFixture);
  });
}

/** Register the `it()` cases for the optional `response` checks. */
function registerResponseChecks(
  op: ContractOperation,
  contract: RestEndpointDescriptor,
): void {
  const { response } = op;
  if (!response) return;

  const responseStatus = response.status;
  it(`has response schema for ${responseStatus}`, () => {
    checkResponseSchema(response, contract);
  });

  const responseFixture = response.fixture;
  if (!responseFixture) return;

  it('response schema parses fixture', async () => {
    await checkResponseFixtureParses(
      response.schema as ResponseSchema,
      responseFixture,
    );
  });
}

/** Register the `it()` cases for one operation, in `checkContractOperation` order. */
function registerOperationTests(op: ContractOperation): void {
  describe(op.name, () => {
    const contract = op.contract();

    it('has correct method', () => {
      checkMethod(op.method, contract);
    });

    it('has correct path', () => {
      checkPath(op.path, contract);
    });

    registerHeaderCheck(op, contract);
    registerQueryCheck(op, contract);
    registerBodyChecks(op, contract);
    registerResponseChecks(op, contract);
  });
}

/**
 * Run a contract scenario as a standalone test suite.
 * Call this from each *.test.ts file.
 */
export function runScenario(scenario: ContractScenario): void {
  describe(scenario.name, () => {
    for (const op of scenario.operations) {
      registerOperationTests(op);
    }
  });
}

/** Re-export FixtureHandle for convenience */
// Re-export speci createClient for use in specific contract tests
export { createClient } from '@abapify/speci/rest';

// Re-export mock adapter for client tests
export { createMockAdapter, createSimpleMockAdapter } from './mock-adapter';
export type { MockMatcher, MockResponse } from './mock-adapter';
export type { FixtureHandle } from '@abapify/adt-fixtures';
