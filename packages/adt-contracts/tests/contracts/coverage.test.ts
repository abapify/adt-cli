/**
 * ABAP Coverage contract scenarios
 *
 * Covers the two endpoints used as a follow-up to an AUnit run with
 * coverage enabled:
 *
 *   POST /sap/bc/adt/runtime/traces/coverage/measurements/{id}?withAdditionalTypeInfo=true
 *   POST /sap/bc/adt/runtime/traces/coverage/results/{id}/statements
 *
 * Fixtures are the real (sanitized) SAP responses from jfilak/sapcli.
 */

import { describe, it, expect } from 'vitest';
import { fixtures } from '@abapify/adt-fixtures';
import { acoverageResult, acoverageStatements } from '../../src/schemas';
import {
  buildCoverageQuery,
  buildStatementsBulkRequest,
  coverageContract,
  coverageXmlBody,
  extractCoverageStatementUris,
  measurements,
  statements,
} from '../../src/adt/runtime/traces/coverage';
import { ContractScenario, runScenario, type ContractOperation } from './base';
import { TypedContractScenario, runTypedScenario } from './base/typed-scenario';

const XML_CONTENT_TYPE = 'application/xml';

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
        Accept: XML_CONTENT_TYPE,
        'Content-Type': 'application/xml',
      },
      query: { withAdditionalTypeInfo: true },
      body: { schema: coverageXmlBody },
      response: {
        status: 200,
        schema: acoverageResult,
        fixture: fixtures.aunit.coverageMeasurements,
      },
    },
    {
      name: 'post statements',
      contract: () => coverageContract.statements.post('ABCDEF123'),
      method: 'POST',
      path: '/sap/bc/adt/runtime/traces/coverage/results/ABCDEF123/statements',
      headers: {
        Accept: XML_CONTENT_TYPE,
        'Content-Type': 'application/xml',
      },
      body: { schema: coverageXmlBody },
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
  typeof statements.post
> {
  readonly name = 'ABAP Coverage – statements (typed)';
  readonly contract = statements.post;
  readonly fixture = fixtures.aunit.coverageStatements;

  override getContractParams(): Parameters<typeof statements.post> {
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

describe('ABAP Coverage request bodies', () => {
  it('builds the required cov:query around the tested object URIs', () => {
    expect(buildCoverageQuery(['/sap/bc/adt/oo/classes/zcl_example&variant=1']))
      .toBe(`<?xml version="1.0" encoding="UTF-8"?>
<cov:query xmlns:cov="http://www.sap.com/adt/cov">
<adtcore:objectSets xmlns:adtcore="http://www.sap.com/adt/core">
<objectSet kind="inclusive">
<adtcore:objectReferences>
<adtcore:objectReference adtcore:uri="/sap/bc/adt/oo/classes/zcl_example&amp;variant=1"/>
</adtcore:objectReferences>
</objectSet>
</adtcore:objectSets>
</cov:query>`);
  });

  it('extracts per-object statement links and builds the bulk request', async () => {
    const measurementsXml = await fixtures.aunit.coverageMeasurements.load();
    const parsed = acoverageResult.parse(measurementsXml);
    const statementUris = extractCoverageStatementUris(parsed);

    expect(statementUris.length).toBeGreaterThan(1);
    expect(statementUris.every((uri) => uri.includes('/statements/'))).toBe(
      true,
    );
    expect(buildStatementsBulkRequest(statementUris)).toContain(
      '<cov:statementsBulkRequest xmlns:cov="http://www.sap.com/adt/cov">',
    );
    expect(buildStatementsBulkRequest(statementUris)).toContain(
      `<statementsRequest get="${statementUris[0]}"/>`,
    );
  });
});
