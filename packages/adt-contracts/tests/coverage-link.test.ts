/**
 * Unit tests for the coverage-link helper.
 *
 * These are parser-only assertions (no HTTP contract), so they live
 * outside tests/contracts/ which is reserved for ContractScenario /
 * ContractOperation definitions.
 */

import { describe, it, expect } from 'vitest';
import { fixtures } from '@abapify/adt-fixtures';
import { aunitResult } from '../src/schemas';
import { extractCoverageMeasurementId } from '../src/adt/aunit/coverage-link';

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

  it('preserves the Atom coverage measurement link from an AUnit result', async () => {
    const xml = await fixtures.aunit.runResultCoverageLink.load();
    const parsed = aunitResult.parse(xml);

    expect(extractCoverageMeasurementId(parsed)).toBe(
      '6D664D9B46CB1FE1859107ADE8729541',
    );
  });

  it('preserves an external coverage URI returned by the system', async () => {
    const xml = await fixtures.aunit.runResultCoverageExternal.load();
    const parsed = aunitResult.parse(xml);

    expect(extractCoverageMeasurementId(parsed)).toBe(
      '06B02025CD671FD1A7B6AB1C7D024677',
    );
  });
});
