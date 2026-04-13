/**
 * Tool: run_unit_tests – run ABAP Unit tests on an object or package
 *
 * CLI equivalent: `adt aunit` (from @abapify/adt-aunit plugin)
 *
 * Reuses the AUnit contract from adt-contracts via client.adt.aunit.testruns.post().
 * Follows the same body-typing pattern as packages/adt-aunit (local interface that
 * includes objectReferences, which the auto-generated AunitRunSchema omits because it
 * references the adtcoreObjectSets XSD externally).
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types.js';
import { connectionShape } from './shared-schemas.js';
import { resolveObjectUri } from './utils.js';
import type { InferTypedSchema } from '@abapify/adt-schemas';
import { aunitResult } from '@abapify/adt-schemas';

type AunitResultData = InferTypedSchema<typeof aunitResult>;
type AunitProgram = NonNullable<
  AunitResultData['runResult']['program']
>[number];

/**
 * Full run-configuration body type including objectReferences.
 *
 * The auto-generated AunitRunSchema omits `objectReferences` inside `objectSet`
 * because the XSD references it from a separate adtcoreObjectSets schema.  The
 * schema's build() method handles it correctly at runtime.  This interface
 * mirrors the same workaround used in packages/adt-aunit/src/commands/aunit.ts.
 */
interface RunConfigurationBody {
  runConfiguration: {
    external?: { coverage?: { active?: string } };
    options?: {
      uriType?: { value?: string };
      testDeterminationStrategy?: {
        sameProgram?: string;
        assignedTests?: string;
        appendAssignedTestsPreview?: string;
      };
      testRiskLevels?: {
        harmless?: string;
        dangerous?: string;
        critical?: string;
      };
      testDurations?: { short?: string; medium?: string; long?: string };
      withNavigationUri?: { enabled?: string };
    };
    objectSets: {
      objectSet: Array<{
        kind: string;
        objectReferences?: {
          objectReference: Array<{ uri: string }>;
        };
      }>;
    };
  };
}

function buildRunConfiguration(
  targetUris: string[],
  withCoverage = false,
): RunConfigurationBody {
  return {
    runConfiguration: {
      external: { coverage: { active: withCoverage ? 'true' : 'false' } },
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

/** Normalize AUnit response into a simple summary using proper schema types */
function normalizeResult(response: AunitResultData): {
  totalTests: number;
  passCount: number;
  failCount: number;
  errorCount: number;
  programs: AunitProgram[];
} {
  const programs = response.runResult.program ?? [];
  let totalTests = 0;
  let passCount = 0;
  let failCount = 0;
  let errorCount = 0;

  for (const prog of programs) {
    const testClasses = prog.testClasses?.testClass ?? [];
    for (const tc of Array.isArray(testClasses) ? testClasses : [testClasses]) {
      const methods = tc?.testMethods?.testMethod ?? [];
      for (const tm of Array.isArray(methods) ? methods : [methods]) {
        totalTests++;
        const alerts = tm?.alerts?.alert ?? [];
        const alertArr = Array.isArray(alerts) ? alerts : [alerts];
        if (alertArr.length === 0) {
          passCount++;
        } else {
          const hasFail = alertArr.some(
            (a) => a?.kind === 'failedAssertion' || a?.severity === 'critical',
          );
          const hasError = alertArr.some(
            (a) => a?.kind === 'error' || a?.severity === 'fatal',
          );
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

        const objectUri = await resolveObjectUri(
          client,
          args.objectName,
          args.objectType,
        );
        if (!objectUri) {
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

        const body = buildRunConfiguration(
          [objectUri],
          args.withCoverage ?? false,
        );

        // Use the typed AUnit contract – adapter calls aunitRun.build(body) for the request
        // and aunitResult.parse(responseXml) for the response automatically.
        // Body is typed via RunConfigurationBody (see comment above buildRunConfiguration).
        const response = await client.adt.aunit.testruns.post(
          body as Parameters<typeof client.adt.aunit.testruns.post>[0],
        );
        const result = normalizeResult(response as AunitResultData);

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
