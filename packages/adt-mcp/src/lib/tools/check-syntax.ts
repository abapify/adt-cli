/**
 * Tool: check_syntax – run ABAP syntax check on an object
 *
 * CLI equivalent: `adt check <objectName>`
 *
 * Posts a checkObjectList to /sap/bc/adt/checkruns via the typed contract and
 * returns structured messages. Uses the `checkrun` schema (from adt-schemas /
 * adt-contracts) for both request serialisation and response parsing – no
 * manual XML building and no third-party XML parser.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types.js';
import { connectionShape } from './shared-schemas.js';
import { extractObjectReferences, resolveObjectUriFromType } from './utils.js';
import type { InferTypedSchema } from '@abapify/adt-schemas';
import { checkrun } from '@abapify/adt-schemas';

type CheckrunData = InferTypedSchema<typeof checkrun>;

/** Extract the checkRunReports variant from the discriminated union */
type CheckRunReports = Extract<CheckrunData, { checkRunReports: unknown }>;

type CheckReport = NonNullable<
  CheckRunReports['checkRunReports']['checkReport']
>[number];

type CheckMessage = NonNullable<
  NonNullable<CheckReport['checkMessageList']>['checkMessage']
>[number];

export function registerCheckSyntaxTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'check_syntax',
    'Run ABAP syntax check (checkruns) on an object and return structured messages',
    {
      ...connectionShape,
      objectName: z.string().describe('ABAP object name to check'),
      objectType: z
        .string()
        .optional()
        .describe(
          'Object type hint (e.g. CLAS, PROG). Speeds up URI resolution.',
        ),
      version: z
        .enum(['active', 'inactive', 'new'])
        .optional()
        .default('active')
        .describe(
          'Version to check: active, inactive, or new (default: active)',
        ),
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

        // Build typed request body – schema.build() (called by the adapter) serialises this to XML
        const body: CheckrunData = {
          checkObjectList: {
            checkObject: [
              { uri: objectUri, version: args.version ?? 'active' },
            ],
          },
        };

        // Use the typed contract – the adapter calls checkrun.build(body) for the request
        // and checkrun.parse(responseXml) for the response automatically
        const response = await client.adt.checkruns.checkObjects.post(body);

        // Parse the discriminated union: response is checkRunReports
        const reports: CheckReport[] = [];
        let hasErrors = false;
        let hasWarnings = false;

        if ('checkRunReports' in response) {
          const raw = response.checkRunReports.checkReport ?? [];
          reports.push(...raw);

          for (const report of raw) {
            const msgs = report.checkMessageList?.checkMessage ?? [];
            const arr = Array.isArray(msgs) ? msgs : [msgs as CheckMessage];
            for (const msg of arr) {
              const sev = msg.type ?? msg.category;
              if (sev === 'E' || sev === 'A') hasErrors = true;
              if (sev === 'W') hasWarnings = true;
            }
          }
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { hasErrors, hasWarnings, reports },
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
              text: `Syntax check failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}

