/**
 * Tool: check_syntax – run ADT syntax check on ABAP objects
 *
 * CLI equivalent: `adt check <objectName>`
 *
 * Uses the /sap/bc/adt/checkruns endpoint to perform syntax checking.
 * Reuses the same HTTP pattern as packages/adt-cli/src/lib/commands/check.ts.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types.js';
import { connectionShape } from './shared-schemas.js';
import { resolveObjectUri, type SourceObjectType } from './utils.js';
import { XMLParser } from 'fast-xml-parser';

/** Build the checkObjectList XML for the checkruns endpoint */
function buildCheckObjectListXml(
  objects: Array<{ uri: string }>,
  version = 'new',
): string {
  const checkObjects = objects
    .map(
      (o) =>
        `  <chkrun:checkObject adtcore:uri="${o.uri}" chkrun:version="${version}"/>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun" xmlns:adtcore="http://www.sap.com/adt/core">
${checkObjects}
</chkrun:checkObjectList>`;
}

interface CheckMessage {
  uri?: string;
  type?: string;
  shortText?: string;
  category?: string;
  code?: string;
}

interface CheckReport {
  reporter?: string;
  triggeringUri?: string;
  status?: string;
  statusText?: string;
  checkMessageList?: {
    checkMessage?: CheckMessage | CheckMessage[];
  };
}

function parseCheckRunResponse(response: unknown): {
  reports: CheckReport[];
  hasErrors: boolean;
  hasWarnings: boolean;
} {
  let data: Record<string, unknown>;

  if (typeof response === 'string') {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      removeNSPrefix: true,
    });
    data = parser.parse(response) as Record<string, unknown>;
  } else {
    data = response as Record<string, unknown>;
  }

  const reports: CheckReport[] = [];
  let hasErrors = false;
  let hasWarnings = false;

  const reportsRoot = (data.checkRunReports ?? data) as Record<string, unknown>;
  const rawReports = reportsRoot.checkReport;

  if (rawReports) {
    const arr = Array.isArray(rawReports) ? rawReports : [rawReports];
    for (const r of arr as Record<string, unknown>[]) {
      const report: CheckReport = {
        reporter: r['reporter'] as string | undefined,
        triggeringUri: r['triggeringUri'] as string | undefined,
        status: r['status'] as string | undefined,
        statusText: r['statusText'] as string | undefined,
        checkMessageList: r['checkMessageList'] as
          | CheckReport['checkMessageList']
          | undefined,
      };
      reports.push(report);

      const msgs = report.checkMessageList?.checkMessage;
      if (msgs) {
        const messages = Array.isArray(msgs) ? msgs : [msgs];
        for (const msg of messages) {
          const sev = msg.type ?? msg.category;
          if (sev === 'E' || sev === 'A') hasErrors = true;
          if (sev === 'W') hasWarnings = true;
        }
      }
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
    'Run ADT syntax check (checkruns) on an ABAP object',
    {
      ...connectionShape,
      objectName: z.string().describe('ABAP object name to check'),
      objectType: z
        .enum(['CLAS', 'INTF', 'PROG', 'FUGR'])
        .describe('ABAP object type'),
      version: z
        .enum(['active', 'inactive', 'new'])
        .optional()
        .describe('Version to check (default: new)'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        const version = args.version ?? 'new';

        const uri = resolveObjectUri(
          args.objectName,
          args.objectType as SourceObjectType,
        );
        const xml = buildCheckObjectListXml([{ uri }], version);

        const response = await client.fetch('/sap/bc/adt/checkruns', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/vnd.sap.adt.checkobjects+xml',
            Accept: 'application/vnd.sap.adt.checkmessages+xml',
          },
          body: xml,
        });

        const { reports, hasErrors, hasWarnings } =
          parseCheckRunResponse(response);

        const messages = reports.flatMap((report) => {
          const msgList = report.checkMessageList?.checkMessage;
          if (!msgList) return [];
          const arr = Array.isArray(msgList) ? msgList : [msgList];
          return arr.map((msg) => ({
            objectName: report.triggeringUri?.split('/').pop() ?? '',
            severity: msg.type ?? msg.category ?? 'I',
            text: msg.shortText ?? msg.code ?? '',
            uri: msg.uri,
          }));
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  objectName: args.objectName,
                  objectType: args.objectType,
                  hasErrors,
                  hasWarnings,
                  messageCount: messages.length,
                  messages,
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
              text: `Syntax check failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
