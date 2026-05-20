/**
 * Tool: cts_transport_objects — list/filter objects in a transport request.
 *
 * CLI equivalent: `adt cts tr objects <transport>`
 *
 * Supports optional filters:
 * - obj_func (e.g. 'D' for deletions)
 * - pgmid    (e.g. 'R3TR')
 * - type     (e.g. 'CLAS,TABL')
 * - alsoTransports (additional TR numbers to merge)
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';
import { initializeAdk, resolveTransportObjects } from '@abapify/adk';
import type { TransportObjectSelector } from '@abapify/adk';
import { FileLockStore } from '@abapify/adt-locks';

export function registerCtsTransportObjectsTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'cts_transport_objects',
    'List objects in a transport request with optional obj_func / pgmid / type filters. Mirrors `adt cts tr objects`.',
    {
      ...sessionOrConnectionShape,
      transport: z.string().describe('Transport number (e.g. DEVK900001)'),
      objFunc: z
        .string()
        .optional()
        .describe(
          "Filter by object function code (comma-separated). 'D' = deletions only, '*' = any non-empty.",
        ),
      pgmid: z
        .string()
        .optional()
        .describe(
          "Filter by program ID (comma-separated, e.g. 'R3TR' or 'R3TR,LIMU'). '*' = any.",
        ),
      type: z
        .string()
        .optional()
        .describe(
          "Filter by object type (comma-separated, e.g. 'CLAS,TABL'). '*' = any.",
        ),
      alsoTransports: z
        .array(z.string())
        .optional()
        .describe(
          'Additional transport numbers to merge (deduplicated by pgmid/type/name)',
        ),
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});
        initializeAdk(client, { lockStore: new FileLockStore() });

        const allTransportNumbers = [
          args.transport,
          ...(args.alsoTransports ?? []),
        ];

        // Build selector
        const selector: TransportObjectSelector = {};

        if (args.objFunc) {
          const parts = args.objFunc
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean);
          selector.objFunc = parts.length === 1 ? parts[0] : parts;
        }

        if (args.pgmid) {
          const parts = args.pgmid
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean);
          selector.pgmid = parts.length === 1 ? parts[0] : parts;
        }

        if (args.type) {
          const parts = args.type
            .split(',')
            .map((s: string) => s.trim().toUpperCase())
            .filter(Boolean);
          selector.type = parts.length === 1 ? parts[0] : parts;
        }

        const { objects, sourceTransportMap } = await resolveTransportObjects(
          allTransportNumbers,
          selector,
        );

        const output = {
          transports: allTransportNumbers,
          filter: {
            obj_func: selector.objFunc ?? '*',
            pgmid: selector.pgmid ?? '*',
            type: selector.type ?? '*',
          },
          objects: objects.map((obj) => ({
            pgmid: obj.pgmid,
            type: obj.type,
            name: obj.name,
            obj_func: obj.objFunc,
            source_transport: sourceTransportMap.get(obj.key) ?? args.transport,
          })),
        };

        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(output, null, 2) },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `cts_transport_objects failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
