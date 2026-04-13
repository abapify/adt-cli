/**
 * Tool: get_installed_components – list installed SAP software components
 *
 * Returns the list of software components installed on the SAP system
 * together with their versions and release information.
 *
 * ADT endpoint: GET /sap/bc/adt/system/softwarecomponents
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';

export function registerGetInstalledComponentsTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'get_installed_components',
    'List all software components installed on the SAP system with their version and release information.',
    {
      ...connectionShape,
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);

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
      ...connectionShape,
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);

        // Fetch the discovery document to understand available services
        const discovery = (await client.fetch('/sap/bc/adt/discovery', {
          method: 'GET',
          headers: { Accept: 'application/json' },
        })) as {
          workspaces?: Array<{
            title: string;
            collections?: Array<{ href: string; title: string }>;
          }>;
        };

        // Extract all service paths from the discovery document
        const services = new Set<string>();
        if (discovery?.workspaces) {
          for (const ws of discovery.workspaces) {
            for (const col of ws.collections ?? []) {
              services.add(col.href);
            }
          }
        }

        // Feature detection heuristics based on known ADT paths
        const features: Record<string, boolean> = {
          atc:
            services.has('/sap/bc/adt/atc') ||
            [...services].some((s) => s.includes('/atc')),
          cts: [...services].some((s) => s.includes('/cts')),
          aunit: [...services].some(
            (s) => s.includes('/abapunit') || s.includes('/aunit'),
          ),
          abapgit: [...services].some((s) => s.includes('/abapgit')),
          rap: [...services].some(
            (s) => s.includes('/businessservices') || s.includes('/rap'),
          ),
          ui5: [...services].some(
            (s) => s.includes('/ui5') || s.includes('/bsp'),
          ),
          classicBadi: [...services].some((s) => s.includes('/enhancements')),
          prettyPrinter: [...services].some((s) =>
            s.includes('/prettyprinter'),
          ),
          dataPreview: [...services].some((s) => s.includes('/datapreview')),
          navigation: [...services].some((s) => s.includes('/navigation')),
        };

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { features, discoveryServices: [...services].sort() },
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
