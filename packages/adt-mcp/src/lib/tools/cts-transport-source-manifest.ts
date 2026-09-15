/**
 * Tool: cts_transport_source_manifest — build a component-granular, metadata-
 * only source manifest for one or more CTS transports.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ExactSourceHistoryService } from '@abapify/adt-cli';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';

const selectorValue = z.union([
  z.string().trim().min(1),
  z.array(z.string().trim().min(1)).min(1),
]);

type SourceCapabilityRegistry = NonNullable<ToolContext['sourceCapabilities']>;

type SourceVersionWithUri = {
  sourceUri: string;
  [key: string]: unknown;
};

type SourceManifestEntry = {
  component: {
    sourceUri?: string;
    versionsUri?: string;
    [key: string]: unknown;
  };
  base?: SourceVersionWithUri;
  head?: SourceVersionWithUri;
  [key: string]: unknown;
};

type SourceManifestWithUris = {
  requestedTransports: unknown;
  scopeTransports: unknown;
  inventory: ReadonlyArray<{ uri?: string; [key: string]: unknown }>;
  entries: readonly SourceManifestEntry[];
};

function toMcpSourceVersion(
  version: SourceVersionWithUri,
  capabilities: SourceCapabilityRegistry,
  binding: { sessionId?: string; destination?: string },
) {
  const { sourceUri, ...metadata } = version;
  return {
    ...metadata,
    sourceCapability: capabilities.issue({
      ...binding,
      sourceUri,
    }),
  };
}

/** Remove every SAP URI before a transport manifest crosses the MCP boundary. */
export function toMcpTransportSourceManifest(
  manifest: SourceManifestWithUris,
  capabilities: SourceCapabilityRegistry,
  binding: { sessionId?: string; destination?: string },
) {
  return {
    requestedTransports: manifest.requestedTransports,
    scopeTransports: manifest.scopeTransports,
    inventory: manifest.inventory.map(({ uri: _uri, ...entry }) => entry),
    entries: manifest.entries.map((entry) => {
      const {
        component: {
          sourceUri: _sourceUri,
          versionsUri: _versionsUri,
          ...component
        },
        base,
        head,
        ...metadata
      } = entry;
      return {
        ...metadata,
        component,
        ...(base
          ? { base: toMcpSourceVersion(base, capabilities, binding) }
          : {}),
        ...(head
          ? { head: toMcpSourceVersion(head, capabilities, binding) }
          : {}),
      };
    }),
  };
}

export function registerCtsTransportSourceManifestTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'cts_transport_source_manifest',
    'Build an exactness-gated, component-granular source manifest for one or more CTS transports. Returns metadata and opaque immutable source capabilities only.',
    {
      ...sessionOrConnectionShape,
      transports: z
        .array(z.string().trim().min(1))
        .min(1)
        .describe('Non-empty ordered list of CTS request or task numbers'),
      selector: z
        .object({
          objFunc: selectorValue
            .optional()
            .describe('CTS object-function filter'),
          pgmid: selectorValue.optional().describe('CTS program-id filter'),
          type: selectorValue.optional().describe('ABAP object-type filter'),
        })
        .strict()
        .optional()
        .describe('Optional CTS object selector; dimensions are ANDed'),
      concurrency: z
        .number()
        .int()
        .positive()
        .max(32)
        .optional()
        .describe('Maximum concurrent metadata/feed requests (hard cap 32)'),
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});
        const service = new ExactSourceHistoryService(client);
        const manifest = await service.buildTransportManifest({
          transports: args.transports,
          selector: args.selector,
          concurrency: args.concurrency,
        });
        const destination = (args as { destination?: string }).destination;
        if (!ctx.sourceCapabilities)
          throw new Error('Source capabilities are unavailable.');

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                toMcpTransportSourceManifest(
                  manifest as SourceManifestWithUris,
                  ctx.sourceCapabilities,
                  {
                    sessionId: extra?.sessionId,
                    ...(destination !== undefined ? { destination } : {}),
                  },
                ),
                null,
                2,
              ),
            },
          ],
        };
      } catch {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  error: {
                    code: 'TRANSPORT_SOURCE_MANIFEST_FAILED',
                    message:
                      'Could not build the requested transport source manifest.',
                  },
                },
                null,
                2,
              ),
            },
          ],
        };
      }
    },
  );
}
