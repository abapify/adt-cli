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
// New tools – high-priority feature parity (#H1–#H8)
import { registerGrepObjectsTool } from './grep-objects';
import { registerGrepPackagesTool } from './grep-packages';
import { registerGetTableTool } from './get-table';
import { registerGetTableContentsTool } from './get-table-contents';
import { registerRunQueryTool } from './run-query';
import { registerFindDefinitionTool } from './find-definition';
import { registerFindReferencesTool } from './find-references';
import {
  registerGetCallersOfTool,
  registerGetCalleesOfTool,
} from './call-hierarchy';
import { registerCreateObjectTool } from './create-object';
import { registerDeleteObjectTool } from './delete-object';
import { registerActivatePackageTool } from './activate-package';
// Medium-priority feature parity (#M1–#M10)
import {
  registerGetFunctionGroupTool,
  registerGetFunctionTool,
} from './function-tools';
import { registerLockObjectTool } from './lock-object';
import { registerUnlockObjectTool } from './unlock-object';
import { registerGetObjectStructureTool } from './get-object-structure';
import { registerGetTypeHierarchyTool } from './get-type-hierarchy';
import { registerPrettyPrintTool } from './pretty-print';
import { registerCreatePackageTool } from './create-package';
import {
  registerGetInstalledComponentsTool,
  registerGetFeaturesTool,
} from './get-installed-components';
import { registerCloneObjectTool } from './clone-object';
import { registerPublishServiceBindingTool } from './publish-service-binding';
import { registerGetGitTypesTool, registerGitExportTool } from './git-tools';

export function registerTools(server: McpServer, ctx: ToolContext): void {
  // Existing tools
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
  // New tools – feature parity with vibing-steampunk (#H1–#H8)
  registerGrepObjectsTool(server, ctx);
  registerGrepPackagesTool(server, ctx);
  registerGetTableTool(server, ctx);
  registerGetTableContentsTool(server, ctx);
  registerRunQueryTool(server, ctx);
  registerFindDefinitionTool(server, ctx);
  registerFindReferencesTool(server, ctx);
  registerGetCallersOfTool(server, ctx);
  registerGetCalleesOfTool(server, ctx);
  registerCreateObjectTool(server, ctx);
  registerDeleteObjectTool(server, ctx);
  registerActivatePackageTool(server, ctx);
  // Medium-priority tools (#M1–#M10)
  registerGetFunctionGroupTool(server, ctx);
  registerGetFunctionTool(server, ctx);
  registerLockObjectTool(server, ctx);
  registerUnlockObjectTool(server, ctx);
  registerGetObjectStructureTool(server, ctx);
  registerGetTypeHierarchyTool(server, ctx);
  registerPrettyPrintTool(server, ctx);
  registerCreatePackageTool(server, ctx);
  registerGetInstalledComponentsTool(server, ctx);
  registerGetFeaturesTool(server, ctx);
  registerCloneObjectTool(server, ctx);
  registerPublishServiceBindingTool(server, ctx);
  registerGetGitTypesTool(server, ctx);
  registerGitExportTool(server, ctx);
}
