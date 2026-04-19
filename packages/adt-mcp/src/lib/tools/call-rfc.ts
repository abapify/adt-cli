/**
 * MCP tool: `call_rfc` — invoke a classic RFC function module via
 * SAP's SOAP-over-HTTP wrapper (`/sap/bc/soap/rfc`).
 *
 * CLI equivalent: `adt rfc <FM> --param KEY=VALUE ...`.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  createRfcClient,
  RfcSoapFault,
  RfcTransportUnavailable,
  type RfcParams,
} from '@abapify/adt-rfc';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';

export function registerCallRfcTool(server: McpServer, ctx: ToolContext): void {
  server.tool(
    'call_rfc',
    'Invoke a classic RFC function module on the SAP system via SOAP-over-HTTP (/sap/bc/soap/rfc). Use this for BAPIs, STFC_CONNECTION, custom RFC FMs, etc.',
    {
      ...connectionShape,
      functionModule: z
        .string()
        .describe(
          'RFC function module name (case-insensitive, e.g. "STFC_CONNECTION")',
        ),
      parameters: z
        .record(z.unknown())
        .optional()
        .describe(
          'Flat key/value map of RFC parameters. Scalars as strings; structures as objects; tables as arrays of objects.',
        ),
      client: z
        .string()
        .optional()
        .describe('Override sap-client query parameter'),
    },
    async (args) => {
      try {
        const adtClient = ctx.getClient(args);
        const rfc = createRfcClient({
          fetch: (url, opts) => adtClient.fetch(url, opts) as Promise<unknown>,
          client: args.client,
        });

        const params = (args.parameters ?? {}) as RfcParams;
        const response = await rfc.call(args.functionModule, params);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      } catch (error) {
        if (error instanceof RfcSoapFault) {
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    error: 'SOAP_FAULT',
                    faultcode: error.faultcode,
                    faultstring: error.faultstring,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }
        if (error instanceof RfcTransportUnavailable) {
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    error: 'TRANSPORT_UNAVAILABLE',
                    status: error.status,
                    message: error.message,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `call_rfc failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
