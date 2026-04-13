/**
 * Tool registry – wires every MCP tool into the server.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types.js';
import { registerDiscoveryTool } from './discovery.js';
import { registerSystemInfoTool } from './system-info.js';
import { registerSearchObjectsTool } from './search-objects.js';
import { registerGetObjectTool } from './get-object.js';
import { registerCtsListTransportsTool } from './cts-list-transports.js';
import { registerCtsGetTransportTool } from './cts-get-transport.js';
import { registerCtsCreateTransportTool } from './cts-create-transport.js';
import { registerCtsReleaseTransportTool } from './cts-release-transport.js';
import { registerCtsDeleteTransportTool } from './cts-delete-transport.js';
import { registerAtcRunTool } from './atc-run.js';
import { registerGetSourceTool } from './get-source.js';
import { registerUpdateSourceTool } from './update-source.js';
import { registerActivateObjectTool } from './activate-object.js';
import { registerCheckSyntaxTool } from './check-syntax.js';
import { registerRunUnitTestsTool } from './run-unit-tests.js';
import { registerGetTestClassesTool } from './get-test-classes.js';
import { registerListPackageObjectsTool } from './list-package-objects.js';

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
