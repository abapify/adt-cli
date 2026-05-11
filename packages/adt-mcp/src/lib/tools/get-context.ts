import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  extractDependencies,
  stripToPublicApi,
  type StripResult,
} from '@abapify/adt-lint';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';
import { extractObjectReferences, resolveObjectUri } from './utils';

interface DependencyContext {
  name: string;
  type?: string;
  uri?: string;
  source: string;
  fallback: boolean;
}

export function registerGetContextTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'get_context',
    'Fetch compressed dependency context for an ABAP object by stripping dependencies to their public API surface.',
    {
      ...sessionOrConnectionShape,
      objectName: z.string().describe('ABAP object name'),
      objectType: z
        .string()
        .optional()
        .describe('Object type (CLAS, INTF, PROG, DDLS, FUNC)'),
      depth: z
        .number()
        .int()
        .min(1)
        .max(3)
        .optional()
        .default(1)
        .describe('Dependency traversal depth (1..3)'),
      maxDeps: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .default(20)
        .describe('Maximum dependencies to include'),
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});

        const rootUri = await resolveObjectUri(
          client,
          args.objectName,
          args.objectType,
        );
        if (!rootUri) {
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

        const rootSourceRaw = await client.fetch(`${rootUri}/source/main`, {
          method: 'GET',
          headers: { Accept: 'text/plain' },
        });
        const rootSource = String(rootSourceRaw);

        const queue: Array<{ name: string; level: number }> =
          extractDependencies(rootSource).map((name) => ({ name, level: 1 }));

        const seen = new Set<string>();
        const dependencies: DependencyContext[] = [];

        while (queue.length > 0 && dependencies.length < args.maxDeps) {
          const current = queue.shift();
          if (!current) break;
          if (seen.has(current.name)) continue;
          seen.add(current.name);

          const searchResult =
            await client.adt.repository.informationsystem.search.quickSearch({
              query: current.name,
              maxResults: 10,
            });
          const upperName = current.name.toUpperCase();
          const object = extractObjectReferences(searchResult).find(
            (candidate) =>
              String(candidate.name ?? '').toUpperCase() === upperName,
          );

          const depUri = object?.uri;
          if (!depUri) {
            continue;
          }

          const depSourceRaw = await client.fetch(`${depUri}/source/main`, {
            method: 'GET',
            headers: { Accept: 'text/plain' },
          });
          const depSource = String(depSourceRaw);
          const stripped: StripResult = stripToPublicApi(
            depSource,
            object?.type ?? 'CLAS',
          );

          dependencies.push({
            name: current.name,
            type: object?.type,
            uri: depUri,
            source: stripped.source,
            fallback: stripped.fallback,
          });

          if (current.level < args.depth) {
            const nextDeps = extractDependencies(depSource);
            for (const next of nextDeps) {
              if (!seen.has(next)) {
                queue.push({ name: next, level: current.level + 1 });
              }
            }
          }
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  object: {
                    name: args.objectName,
                    type: args.objectType,
                    uri: rootUri,
                  },
                  settings: {
                    depth: args.depth,
                    maxDeps: args.maxDeps,
                    truncated: dependencies.length >= args.maxDeps,
                  },
                  dependencies,
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
              text: `Get context failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
