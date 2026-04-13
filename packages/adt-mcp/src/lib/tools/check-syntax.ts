/**
 * Tool: check_syntax – run ABAP syntax check on an object
 *
 * CLI equivalent: `adt check <objectName>`
 *
 * Posts a checkObjectList to /sap/bc/adt/checkruns and returns structured messages.
 */

import { z } from 'zod';
import { XMLParser } from 'fast-xml-parser';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types.js';
import { connectionShape } from './shared-schemas.js';
import { extractObjectReferences, resolveObjectUriFromType } from './utils.js';

type CheckMessage = {
  uri?: string;
  type?: string;
  shortText?: string;
  category?: string;
  code?: string;
};

type CheckReport = {
  checkMessageList?: { checkMessage?: CheckMessage | CheckMessage[] };
  reporter?: string;
  triggeringUri?: string;
  status?: string;
};

function buildCheckObjectListXml(
  objects: Array<{ uri: string }>,
  version = 'active',
): string {
  const items = objects
    .map(
      (o) =>
        `  <chkrun:checkObject adtcore:uri="${o.uri}" chkrun:version="${version}"/>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun" xmlns:adtcore="http://www.sap.com/adt/core">
${items}
</chkrun:checkObjectList>`;
}

function parseCheckRunXml(xmlOrParsed: unknown): {
  reports: CheckReport[];
  hasErrors: boolean;
  hasWarnings: boolean;
} {
  let data: Record<string, unknown>;

  if (typeof xmlOrParsed === 'string') {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      removeNSPrefix: true,
    });
    data = parser.parse(xmlOrParsed) as Record<string, unknown>;
  } else {
    data = xmlOrParsed as Record<string, unknown>;
  }

  let reports: CheckReport[] = [];
  let hasErrors = false;
  let hasWarnings = false;

  const reportsRoot = (data.checkRunReports ?? data) as Record<string, unknown>;
  const rawReports = reportsRoot.checkReport;
  if (rawReports) {
    const arr = Array.isArray(rawReports) ? rawReports : [rawReports];
    reports = arr.map((r: Record<string, unknown>) => ({
      reporter: r.reporter as string | undefined,
      triggeringUri: r.triggeringUri as string | undefined,
      status: r.status as string | undefined,
      checkMessageList: r.checkMessageList as CheckReport['checkMessageList'],
    }));
  }

  for (const report of reports) {
    const msgList = report.checkMessageList;
    if (!msgList?.checkMessage) continue;
    const messages = Array.isArray(msgList.checkMessage)
      ? msgList.checkMessage
      : [msgList.checkMessage];
    for (const msg of messages) {
      const sev = msg.type ?? msg.category;
      if (sev === 'E' || sev === 'A') hasErrors = true;
      if (sev === 'W') hasWarnings = true;
    }
  }

  return { reports, hasErrors, hasWarnings };
}

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

        const xml = buildCheckObjectListXml(
          [{ uri: objectUri }],
          args.version ?? 'active',
        );

        const response = await client.fetch('/sap/bc/adt/checkruns', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/vnd.sap.adt.checkobjects+xml',
            Accept: 'application/vnd.sap.adt.checkmessages+xml',
          },
          body: xml,
        });

        const { reports, hasErrors, hasWarnings } = parseCheckRunXml(response);

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
