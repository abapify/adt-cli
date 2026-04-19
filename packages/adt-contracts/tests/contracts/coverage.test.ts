/**
 * ABAP Coverage contract scenarios
 *
 * Covers the two endpoints used as a follow-up to an AUnit run with
 * coverage enabled:
 *
 *   POST /sap/bc/adt/runtime/traces/coverage/measurements/{id}?withAdditionalTypeInfo=true
 *   GET  /sap/bc/adt/runtime/traces/coverage/results/{id}/statements
 *
 * Fixtures are the real (sanitized) SAP responses from jfilak/sapcli.
 */

import { describe, it, expect } from 'vitest';
import { fixtures } from '@abapify/adt-fixtures';
import { acoverageResult, acoverageStatements } from '../../src/schemas';
import {
  coverageContract,
  measurements,
  statements,
} from '../../src/adt/runtime/traces/coverage';
import { ContractScenario, runScenario, type ContractOperation } from './base';
import { TypedContractScenario, runTypedScenario } from './base/typed-scenario';
import { extractCoverageMeasurementId } from '../../src/adt/aunit/coverage-link';

const SCOV_CONTENT_TYPE = 'application/xml+scov';

// ─────────────────────────────────────────────────────────────
// 1. Structural contract scenario
// ─────────────────────────────────────────────────────────────
class CoverageContractScenario extends ContractScenario {
  readonly name = 'ABAP Coverage – Runtime Traces';

  readonly operations: ContractOperation[] = [
    {
      name: 'post measurements',
      contract: () => coverageContract.measurements.post('ABCDEF123'),
      method: 'POST',
      path: '/sap/bc/adt/runtime/traces/coverage/measurements/ABCDEF123',
      headers: {
        Accept: SCOV_CONTENT_TYPE,
        'Content-Type': SCOV_CONTENT_TYPE,
      },
      query: { withAdditionalTypeInfo: true },
      response: {
        status: 200,
        schema: acoverageResult,
        fixture: fixtures.aunit.coverageMeasurements,
      },
    },
    {
      name: 'get statements',
      contract: () => coverageContract.statements.get('ABCDEF123'),
      method: 'GET',
      path: '/sap/bc/adt/runtime/traces/coverage/results/ABCDEF123/statements',
      headers: { Accept: SCOV_CONTENT_TYPE },
      response: {
        status: 200,
        schema: acoverageStatements,
        fixture: fixtures.aunit.coverageStatements,
      },
    },
  ];
}

runScenario(new CoverageContractScenario());

// ─────────────────────────────────────────────────────────────
// 2. Typed scenario – measurements tree
// ─────────────────────────────────────────────────────────────
class MeasurementsTypedScenario extends TypedContractScenario<
  typeof measurements.post
> {
  readonly name = 'ABAP Coverage – measurements (typed)';
  readonly contract = measurements.post;
  readonly fixture = fixtures.aunit.coverageMeasurements;

  override getContractParams(): Parameters<typeof measurements.post> {
    return ['6D664D9B46CB1FE1859107ADE8729541'];
  }

  override assertResponse(response: unknown): void {
    // Narrow to the parsed shape.
    const r = response as {
      result: {
        name?: string;
        nodes?: {
          node?: Array<{
            objectReference?: { type?: string; name?: string };
            coverages?: { coverage?: Array<{ type?: string }> };
            nodes?: unknown;
          }>;
        };
      };
    };
    expect(r.result.name).toBe('ADT_ROOT_NODE');
    const topNodes = r.result.nodes?.node;
    expect(Array.isArray(topNodes)).toBe(true);
    expect(topNodes?.[0]?.objectReference?.type).toBe('DEVC/K');
    const topCoverages = topNodes?.[0]?.coverages?.coverage ?? [];
    const types = topCoverages
      .map((c) => c.type)
      .sort((a, b) => (a ?? '').localeCompare(b ?? ''));
    expect(types).toEqual(['branch', 'procedure', 'statement']);
  }
}

runTypedScenario(new MeasurementsTypedScenario());

// ─────────────────────────────────────────────────────────────
// 3. Typed scenario – statements bulk response
// ─────────────────────────────────────────────────────────────
class StatementsTypedScenario extends TypedContractScenario<
  typeof statements.get
> {
  readonly name = 'ABAP Coverage – statements (typed)';
  readonly contract = statements.get;
  readonly fixture = fixtures.aunit.coverageStatements;

  override getContractParams(): Parameters<typeof statements.get> {
    return ['A6B627DB009F1EEB8FAA3720D9128253'];
  }

  override assertResponse(response: unknown): void {
    const r = response as {
      statementsBulkResponse: {
        statementsResponse?: Array<{
          name?: string;
          procedure?: unknown;
          statement?: unknown;
        }>;
      };
    };
    const responses = r.statementsBulkResponse.statementsResponse ?? [];
    expect(responses.length).toBeGreaterThanOrEqual(1);
    const first = responses[0];
    expect(first.name).toMatch(/METHOD_[AB]$/);
    expect(first.procedure).toBeDefined();
    expect(first.statement).toBeDefined();
  }
}

runTypedScenario(new StatementsTypedScenario());

// ─────────────────────────────────────────────────────────────
// 4. Coverage link helper
// ─────────────────────────────────────────────────────────────

describe('extractCoverageMeasurementId', () => {
  it('returns undefined when no coverage link is present', () => {
    expect(extractCoverageMeasurementId({})).toBeUndefined();
    expect(extractCoverageMeasurementId(null)).toBeUndefined();
  });

  it('finds the measurement id from a flat link array', () => {
    // Atom link `rel` is an opaque relation-type URI per RFC 5988, not a
    // network URL. Must match SAP wire format byte-for-byte.
    const rel =
      'http://www.sap.com/adt/relations/runtime/traces/coverage/measurements/coveredobjects'; // NOSONAR: link-relation identifier (not a URL)
    const id = extractCoverageMeasurementId({
      link: [
        {
          href: '/sap/bc/adt/runtime/traces/coverage/measurements/6D664D9B46CB1FE1859107ADE8729541/coveredobjects',
          rel,
        },
      ],
    });
    expect(id).toBe('6D664D9B46CB1FE1859107ADE8729541');
  });

  it('finds the measurement id by walking nested nodes', () => {
    const id = extractCoverageMeasurementId({
      program: {
        testClasses: {
          testClass: {
            link: [
              {
                href: '/sap/bc/adt/runtime/traces/coverage/measurements/ABCDEF012345/statements',
              },
            ],
          },
        },
      },
    });
    expect(id).toBe('ABCDEF012345');
  });
});
