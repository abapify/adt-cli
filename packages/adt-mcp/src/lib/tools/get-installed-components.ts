/**
 * Tool: get_installed_components – list installed SAP software components
 *
 * Returns the list of software components installed on the SAP system
 * together with their versions and release information.
 *
 * ADT endpoint: GET /sap/bc/adt/system/softwarecomponents
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';
import { extractDiscoveryWorkspaces } from './utils';

export function registerGetInstalledComponentsTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'get_installed_components',
    'List all software components installed on the SAP system with their version and release information.',
    {
      ...sessionOrConnectionShape,
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});

        const result = await client.fetch(
          '/sap/bc/adt/system/softwarecomponents',
          {
            method: 'GET',
            headers: { Accept: 'application/json' },
          },
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Get installed components failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}

/**
 * Tool: get_features – probe the SAP system for available ADT features
 *
 * Checks the discovery endpoint and probes system-specific endpoints to
 * determine which features are available: abapGit, RAP, AMDP, UI5, ATC, etc.
 *
 * ADT endpoint: GET /sap/bc/adt/discovery (augmented with feature probing)
 */
export function registerGetFeaturesTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'get_features',
    'Probe the SAP system for available ADT features (abapGit, RAP, AMDP, UI5, ATC, CTS, etc.).',
    {
      ...sessionOrConnectionShape,
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});
        const discovery = await client.adt.discovery.getDiscovery();
        const workspaces = extractDiscoveryWorkspaces(discovery);

        // Extract all service paths from the discovery document
        const services = new Set<string>();
        for (const workspace of workspaces) {
          for (const collection of workspace.collections) {
            services.add(collection.href);
          }
        }

        // Feature detection heuristics based on known ADT paths
        const serviceList = [...services];
        const features: Record<string, boolean> = {
          atc:
            services.has('/sap/bc/adt/atc') ||
            serviceList.some((s) => s.includes('/atc')),
          cts: serviceList.some((s) => s.includes('/cts')),
          aunit: serviceList.some(
            (s) => s.includes('/abapunit') || s.includes('/aunit'),
          ),
          abapgit: serviceList.some((s) => s.includes('/abapgit')),
          rap: serviceList.some(
            (s) => s.includes('/businessservices') || s.includes('/rap'),
          ),
          ui5: serviceList.some(
            (s) => s.includes('/ui5') || s.includes('/bsp'),
          ),
          classicBadi: serviceList.some((s) => s.includes('/enhancements')),
          prettyPrinter: serviceList.some((s) => s.includes('/prettyprinter')),
          dataPreview: serviceList.some((s) => s.includes('/datapreview')),
          navigation: serviceList.some((s) => s.includes('/navigation')),
        };

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  features,
                  discoveryServices: [...services].sort((a, b) =>
                    a.localeCompare(b),
                  ),
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
              text: `Get features failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
