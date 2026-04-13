/**
 * Tool: run_unit_tests – run ABAP Unit tests on an object or package
 *
 * CLI equivalent: `adt aunit` (from @abapify/adt-aunit plugin)
 *
 * Reuses the AUnit contract from adt-contracts via client.adt.aunit.testruns.post().
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types.js';
import { connectionShape } from './shared-schemas.js';
import { extractObjectReferences, resolveObjectUriFromType } from './utils.js';

/** Minimal run configuration for AUnit testruns */
function buildRunConfiguration(targetUris: string[], withCoverage = false) {
  return {
    runConfiguration: {
      external: {
        coverage: { active: withCoverage ? 'true' : 'false' },
      },
      options: {
        uriType: { value: 'semantic' },
        testDeterminationStrategy: {
          sameProgram: 'true',
          assignedTests: 'false',
          appendAssignedTestsPreview: 'true',
        },
        testRiskLevels: {
          harmless: 'true',
          dangerous: 'true',
          critical: 'true',
        },
        testDurations: { short: 'true', medium: 'true', long: 'true' },
        withNavigationUri: { enabled: 'false' },
      },
      objectSets: {
        objectSet: [
          {
            kind: 'inclusive',
            objectReferences: {
              objectReference: targetUris.map((uri) => ({ uri })),
            },
          },
        ],
      },
    },
  };
}

/** Normalize AUnit response into a simple summary */
function normalizeResult(response: unknown): {
  totalTests: number;
  passCount: number;
  failCount: number;
  errorCount: number;
  programs: unknown[];
} {
  const runResult =
    (response as Record<string, unknown>).runResult ??
    (response as Record<string, unknown>);
  const programs = Array.isArray((runResult as Record<string, unknown>).program)
    ? ((runResult as Record<string, unknown>).program as unknown[])
    : [];

  let totalTests = 0;
  let passCount = 0;
  let failCount = 0;
  let errorCount = 0;

  for (const prog of programs) {
    const p = prog as Record<string, unknown>;
    const testClasses = ((p.testClasses as Record<string, unknown>)
      ?.testClass ?? []) as unknown[];
    for (const tc of Array.isArray(testClasses) ? testClasses : [testClasses]) {
      const t = tc as Record<string, unknown>;
      const methods = ((t.testMethods as Record<string, unknown>)?.testMethod ??
        []) as unknown[];
      for (const tm of Array.isArray(methods) ? methods : [methods]) {
        const m = tm as Record<string, unknown>;
        totalTests++;
        const alerts = Array.isArray(
          (m.alerts as Record<string, unknown>)?.alert,
        )
          ? ((m.alerts as Record<string, unknown>).alert as unknown[])
          : [];
        if (alerts.length === 0) {
          passCount++;
        } else {
          const hasFail = alerts.some((a) => {
            const al = a as Record<string, unknown>;
            return al.kind === 'failedAssertion' || al.severity === 'critical';
          });
          const hasError = alerts.some((a) => {
            const al = a as Record<string, unknown>;
            return al.kind === 'error' || al.severity === 'fatal';
          });
          if (hasError) errorCount++;
          else if (hasFail) failCount++;
          else passCount++;
        }
      }
    }
  }

  return { totalTests, passCount, failCount, errorCount, programs };
}

export function registerRunUnitTestsTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'run_unit_tests',
    'Run ABAP Unit tests on an object or package and return pass/fail counts per method',
    {
      ...connectionShape,
      objectName: z
        .string()
        .describe('ABAP object name (class, program, or package)'),
      objectType: z
        .string()
        .optional()
        .describe(
          'Object type (e.g. CLAS, PROG, DEVC). Speeds up URI resolution.',
        ),
      withCoverage: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to collect code coverage data'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);

        let objectUri: string | undefined = args.objectType
          ? resolveObjectUriFromType(args.objectType, args.objectName)
          : undefined;

        if (!objectUri) {
          const searchResult =
            await client.adt.repository.informationsystem.search.quickSearch({
              query: args.objectName,
              maxResults: 10,
            });
          const objects = extractObjectReferences(searchResult);
          const match = objects.find(
            (o) =>
              String(o.name ?? '').toUpperCase() ===
              args.objectName.toUpperCase(),
          );
          if (!match?.uri) {
            return {
              isError: true,
              content: [
                {
                  type: 'text' as const,
                  text: `Object '${args.objectName}' not found`,
                },
              ],
            };
          }
          objectUri = match.uri;
        }

        const body = buildRunConfiguration(
          [objectUri],
          args.withCoverage ?? false,
        );

        // Use the typed AUnit contract from adt-client
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await (client.adt.aunit.testruns.post as any)(body);
        const result = normalizeResult(response);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Run unit tests failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
