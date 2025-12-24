/**
 * ATC Worklist - Typed Contract Scenario Example
 *
 * Demonstrates fully-typed assertRequest/assertResponse/assertBody methods.
 * If this file compiles, type inference is working correctly!
 */

import { fixtures } from 'adt-fixtures';
import {
  TypedContractScenario,
  runTypedScenario,
  expect,
  type ExtractRequest,
} from './base/typed-scenario';
import { worklistsContract } from '../../src/generated/adt/sap/bc/adt/atc/worklists';
import { atcworklist } from '../../src/schemas';
import type { InferTypedSchema } from '../../src/helpers/speci-schema';

// Infer types from the contract - no manual type definitions needed!
type WorklistGetContract = typeof worklistsContract.get;
type WorklistRequest = ExtractRequest<WorklistGetContract>;

// Infer response type from the schema using InferTypedSchema
// This extracts the full type: { worklist: {...} } | { worklistRun: {...} }
type WorklistResponse = InferTypedSchema<typeof atcworklist>;

/**
 * ATC Worklist GET Scenario
 *
 * Shows how to:
 * 1. Extend TypedContractScenario with contract type
 * 2. Override assertRequest with fully typed request (inferred from contract)
 * 3. Override assertResponse with fully typed response (from schema)
 *
 * The types are AUTOMATICALLY INFERRED from the contract definition!
 * - WorklistRequest is inferred from worklistsContract.get descriptor
 * - WorklistResponse is the AtcworklistSchema type
 */
class AtcWorklistGetScenario extends TypedContractScenario<WorklistGetContract> {
  readonly name = 'ATC Worklist GET - Typed';
  readonly contract = worklistsContract.get;
  readonly fixture = fixtures.atc.worklist;

  // Provide parameters for the contract call
  override getContractParams(): Parameters<WorklistGetContract> {
    return ['WL123', { timestamp: '2024-01-01' }];
  }

  /**
   * Assert request properties - fully typed!
   *
   * req.method, req.path, req.query are all typed from the contract.
   * TypeScript validates that these properties exist!
   */
  override assertRequest(req: WorklistRequest): void {
    // ✅ TYPE CHECK: method is typed as 'GET'
    expect(req.method).toBe('GET');

    // ✅ TYPE CHECK: path is typed as template string
    expect(req.path).toContain('/sap/bc/adt/atc/worklists/');

    // ✅ TYPE CHECK: query params are typed from contract definition
    // req.query?.timestamp - TypeScript knows this property exists!
    if (req.query) {
      expect(req.query).toBeDefined();
    }
  }

  /**
   * Assert response properties - FULLY TYPED from schema!
   *
   * res is the parsed XML, typed from AtcworklistSchema.
   * You can access nested properties with full autocomplete and type checking.
   */
  override assertResponse(res: WorklistResponse): void {
    // ✅ TYPE CHECK: response is typed from atcworklist schema
    expect(res).toBeDefined();

    // Verify it's a parsed object, not raw XML string
    expect(typeof res).toBe('object');

    // ✅ FULLY TYPED: Access deep nested properties with type safety!
    // AtcworklistSchema is a union: { worklist: {...} } | { worklistRun: {...} }
    if ('worklist' in res) {
      // TypeScript narrows to { worklist: {...} } branch
      const worklist = res.worklist;

      // ✅ TYPE CHECK: worklist.id is typed as string
      expect(worklist.id).toBeDefined();
      expect(typeof worklist.id).toBe('string');

      // ✅ TYPE CHECK: worklist.timestamp is typed as string
      expect(worklist.timestamp).toBeDefined();

      // ✅ TYPE CHECK: Deep nested access - objects.object[].findings.finding[].messageId
      if (worklist.objects.object && worklist.objects.object.length > 0) {
        const firstObject = worklist.objects.object[0];
        expect(firstObject.uri).toBeDefined();
        expect(firstObject.type).toBeDefined();

        // ✅ TYPE CHECK: findings.finding[].messageId
        if (
          firstObject.findings.finding &&
          firstObject.findings.finding.length > 0
        ) {
          const firstFinding = firstObject.findings.finding[0];
          // All these properties are fully typed!
          expect(firstFinding.messageId).toBeDefined();
          expect(firstFinding.checkId).toBeDefined();
          expect(firstFinding.priority).toBeDefined();
        }
      }
    } else if ('worklistRun' in res) {
      // TypeScript narrows to { worklistRun: {...} } branch
      const worklistRun = res.worklistRun;
      expect(worklistRun.worklistId).toBeDefined();
      expect(worklistRun.worklistTimestamp).toBeDefined();
    }
  }
}

// Run the typed scenario
runTypedScenario(new AtcWorklistGetScenario());
