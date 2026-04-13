/**
 * Tool: run_unit_tests – run ABAP Unit tests for an object
 *
 * CLI equivalent: `adt aunit run` (from @abapify/adt-aunit)
 *
 * Executes ABAP Unit tests via the /sap/bc/adt/abapunit/testruns endpoint.
 * Reuses the request/response structure from @abapify/adt-aunit (no duplication).
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types.js';
import { connectionShape } from './shared-schemas.js';
import { resolveObjectUri, type SourceObjectType } from './utils.js';

/** Build an ABAP Unit test run request body (mirrors adt-aunit's buildRunConfiguration) */
function buildRunBody(objectUri: string) {
  return {
    runConfiguration: {
      external: { coverage: { active: 'false' } },
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
            objectReferences: { objectReference: [{ uri: objectUri }] },
          },
        ],
      },
    },
  };
}

export function registerRunUnitTestsTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'run_unit_tests',
    'Run ABAP Unit tests for an object and return pass/fail results per test method',
    {
      ...connectionShape,
      objectName: z.string().describe('ABAP object name'),
      objectType: z
        .enum(['CLAS', 'INTF', 'PROG', 'FUGR'])
        .optional()
        .default('CLAS')
        .describe('ABAP object type (default: CLAS)'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);

        const objectUri = resolveObjectUri(
          args.objectName,
          (args.objectType ?? 'CLAS') as SourceObjectType,
        );

        const body = buildRunBody(objectUri);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (await (client.adt.aunit.testruns.post as any)(
          body,
        )) as Record<string, unknown>;

        // Summarise results
        const programs = ((result as { runResult?: { program?: unknown[] } })
          .runResult?.program ?? []) as Array<Record<string, unknown>>;

        let totalTests = 0;
        let passCount = 0;
        let failCount = 0;
        let errorCount = 0;

        const summary: Array<{
          program: string;
          testClass: string;
          method: string;
          status: string;
          alerts: string[];
        }> = [];

        for (const prog of programs) {
          const progName = String(prog['name'] ?? '');
          const testClasses = ((
            prog['testClasses'] as { testClass?: unknown[] } | undefined
          )?.testClass ?? []) as Array<Record<string, unknown>>;

          for (const tc of testClasses) {
            const tcName = String(tc['name'] ?? '');
            const methods = ((
              tc['testMethods'] as { testMethod?: unknown[] } | undefined
            )?.testMethod ?? []) as Array<Record<string, unknown>>;

            for (const tm of methods) {
              totalTests++;
              const alerts = ((
                tm['alerts'] as { alert?: unknown[] } | undefined
              )?.alert ?? []) as Array<{
                severity?: string;
                kind?: string;
                title?: string;
              }>;

              let status = 'pass';
              const alertTexts: string[] = [];

              for (const alert of alerts) {
                alertTexts.push(alert.title ?? '');
                if (
                  alert.severity === 'critical' ||
                  alert.kind === 'failedAssertion'
                ) {
                  status = 'fail';
                } else if (
                  alert.severity === 'fatal' ||
                  alert.kind === 'error'
                ) {
                  status = 'error';
                }
              }

              if (status === 'pass') passCount++;
              else if (status === 'fail') failCount++;
              else errorCount++;

              summary.push({
                program: progName,
                testClass: tcName,
                method: String(tm['name'] ?? ''),
                status,
                alerts: alertTexts,
              });
            }
          }
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  objectName: args.objectName,
                  objectType: args.objectType,
                  totalTests,
                  passCount,
                  failCount,
                  errorCount,
                  passed: failCount === 0 && errorCount === 0,
                  results: summary,
                },
                null,
                2,
              ),
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
