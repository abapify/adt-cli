/**
 * Tool: get_frozen_source — disclose one immutable Review-bound source body.
 *
 * The model supplies an accepted canonical object component, never an ADT URI
 * or an opaque capability. Destination mode checks the signed policy before
 * this handler, then ADT's private broker redeems the hidden capability.
 */

import { Buffer } from 'node:buffer';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AdtResponseTooLargeError } from '@abapify/adt-client';
import type { ToolContext } from '../types.js';
import { resolveClient } from './session-helpers.js';
import { scopeDeniedResult } from './utils.js';

export function registerGetFrozenSourceTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'get_frozen_source',
    'Read one immutable source body from the signed frozen AI Review scope.',
    {
      canonicalKey: z
        .string()
        .regex(/^[A-Z0-9_]+:.+$/u)
        .describe('Canonical object key from the accepted Review scope'),
      componentId: z
        .string()
        .min(1)
        .max(512)
        // eslint-disable-next-line no-control-regex
        .regex(/^[^\s\u0000-\u0008\u000e-\u001f\u007f]+$/u)
        .describe('Immutable source component from the accepted Review scope'),
    },
    async (args, extra) => {
      const access = ctx.requestAccess?.(extra ?? {});
      const frozenSource = access?.frozenSource;
      const destination = (args as { destination?: unknown }).destination;
      const source = frozenSource?.sources.find(
        (candidate) =>
          candidate.canonicalKey === args.canonicalKey &&
          candidate.componentId === args.componentId,
      );
      if (
        !frozenSource ||
        !source ||
        !ctx.resolveFrozenSource ||
        typeof destination !== 'string'
      ) {
        return scopeDeniedResult();
      }

      try {
        // Capability validation is deliberately before destination context
        // acquisition, so a forged/expired reference never reaches SAP.
        const resolved = await ctx.resolveFrozenSource({
          destination,
          systemSid: frozenSource.systemSid,
          sourceRef: source.sourceRef,
        });
        if (
          typeof resolved?.sourceUri !== 'string' ||
          !resolved.sourceUri.startsWith('/sap/bc/adt/') ||
          // eslint-disable-next-line no-control-regex
          /[\s\\\u0000-\u0008\u000e-\u001f\u007f]/u.test(resolved.sourceUri)
        ) {
          return scopeDeniedResult();
        }
        const { client } = await resolveClient(
          ctx,
          { destination },
          extra ?? {},
        );
        let text: string;
        try {
          text = await client.readTextBounded(
            resolved.sourceUri,
            frozenSource.maxSourceBytes,
            { headers: { Accept: 'text/plain' } },
          );
        } catch (error) {
          if (error instanceof AdtResponseTooLargeError) {
            return {
              isError: true,
              content: [
                {
                  type: 'text' as const,
                  text: 'frozen_source_too_large',
                },
              ],
            };
          }
          throw error;
        }
        const bytes = Buffer.byteLength(text, 'utf8');
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                canonicalKey: args.canonicalKey,
                componentId: args.componentId,
                bytes,
                source: text,
              }),
            },
          ],
        };
      } catch {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: 'frozen_source_unavailable',
            },
          ],
        };
      }
    },
  );
}
