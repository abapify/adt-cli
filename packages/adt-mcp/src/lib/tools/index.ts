/**
 * Tool registry – wires every MCP tool into the server.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { registerDiscoveryTool } from './discovery';
import { registerSystemInfoTool } from './system-info';
import { registerSearchObjectsTool } from './search-objects';
import { registerGetObjectTool } from './get-object';
import { registerCtsListTransportsTool } from './cts-list-transports';
import { registerCtsGetTransportTool } from './cts-get-transport';
import { registerCtsCreateTransportTool } from './cts-create-transport';
import { registerCtsReleaseTransportTool } from './cts-release-transport';
import { registerCtsDeleteTransportTool } from './cts-delete-transport';
import { registerAtcRunTool } from './atc-run';
import { registerGetSourceTool } from './get-source';
import { registerUpdateSourceTool } from './update-source';
import { registerActivateObjectTool } from './activate-object';
import { registerCheckSyntaxTool } from './check-syntax';
import { registerRunUnitTestsTool } from './run-unit-tests';
import { registerGetTestClassesTool } from './get-test-classes';
import { registerListPackageObjectsTool } from './list-package-objects';

export function registerTools(server: McpServer, ctx: ToolContext): void {
  registerDiscoveryTool(server, ctx);
  registerSystemInfoTool(server, ctx);
  registerSearchObjectsTool(server, ctx);
  registerGetObjectTool(server, ctx);
  registerCtsListTransportsTool(server, ctx);
  registerCtsGetTransportTool(server, ctx);
  registerCtsCreateTransportTool(server, ctx);
  registerCtsReleaseTransportTool(server, ctx);
  registerCtsDeleteTransportTool(server, ctx);
  registerAtcRunTool(server, ctx);
  registerGetSourceTool(server, ctx);
  registerUpdateSourceTool(server, ctx);
  registerActivateObjectTool(server, ctx);
  registerCheckSyntaxTool(server, ctx);
  registerRunUnitTestsTool(server, ctx);
  registerGetTestClassesTool(server, ctx);
  registerListPackageObjectsTool(server, ctx);
}
