/**
 * Tool: atc_run – run ABAP Test Cockpit checks
 *
 * CLI equivalent: `adt atc run`
 *
 * Invokes ATC analysis and returns structured findings.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';

export function registerAtcRunTool(server: McpServer, ctx: ToolContext): void {
  server.tool(
    'atc_run',
    'Run ABAP Test Cockpit (ATC) checks on an object or package',
    {
      ...connectionShape,
      objectUri: z
        .string()
        .describe(
          'ADT URI of the object or package to check (e.g. /sap/bc/adt/packages/ZPACKAGE)',
        ),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);

        // ATC run: POST to /sap/bc/adt/atc/runs with the target object,
        // then fetch the resulting worklist.
        // Note: speci contracts accept (queryParams, body) even when the TS
        // signature only declares query params – mirrors the CLI ATC flow.
        const atcRun = {
          objectUri: args.objectUri,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const runResult = (await (client.adt.atc.runs.post as any)(
          {},
          atcRun,
        )) as Record<string, unknown>;

        const rawId = runResult['worklistId'] ?? runResult['id'];
        const worklistId =
          typeof rawId === 'string' || typeof rawId === 'number'
            ? String(rawId)
            : '';

        if (!worklistId) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  { status: 'completed', findings: [], raw: runResult },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        const worklist = await client.adt.atc.worklists.get(worklistId);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ status: 'completed', worklist }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `ATC run failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
