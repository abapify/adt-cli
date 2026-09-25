import {
  AdtFlowError,
  createAdtFlowDependencies,
  createAdtFlowService,
  flowConfigSchema,
  type AdtFlowService,
  type FlowCheckoutResult,
  type FlowIndexInput,
} from '@abapify/adt-flow';
import { loadConfig, type FlowConfig } from '@abapify/adt-config';
import { getFormatPlugin, type FormatPlugin } from '@abapify/adt-plugin';
import type { AdtClient } from '@abapify/adt-client';
import type { ToolContext } from '../types';
import { resolveClient } from './session-helpers';
import { resolveFlowWorkspaceRoot } from '../flow-workspace';

export interface FlowMcpDependencies {
  loadFlowConfig(root: string, context: ToolContext): Promise<FlowConfig>;
  getFormat(id: string): FormatPlugin | undefined;
  createService(client: AdtClient, format: FormatPlugin): AdtFlowService;
}

export const DEFAULT_FLOW_MCP_DEPENDENCIES: FlowMcpDependencies = {
  async loadFlowConfig(root, context) {
    if (context.flowConfig) return context.flowConfig;
    const loaded = await loadConfig({ cwd: root });
    const flowValue = loaded.raw.flow;
    if (flowValue === undefined) {
      throw new AdtFlowError(
        'configuration_invalid',
        'Flow configuration is unavailable in this context.',
      );
    }
    try {
      return flowConfigSchema.parse(flowValue);
    } catch (error) {
      throw new AdtFlowError(
        'configuration_invalid',
        'Flow configuration is invalid.',
        { cause: String(error) },
      );
    }
  },
  getFormat: getFormatPlugin,
  createService: (client, format) =>
    createAdtFlowService(createAdtFlowDependencies(client, format)),
};

type FlowToolArgs = {
  transports: string[];
  workspaceRoot: string;
};

type FlowToolResult = {
  isError?: boolean;
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
};

function safeFlowErrorDetails(
  error: AdtFlowError,
): Record<string, unknown> | undefined {
  if (!error.details) return undefined;
  const details = Object.fromEntries(
    Object.entries(error.details).filter(
      ([key]) => key !== 'cause' && key !== 'rollback',
    ),
  );
  return Object.keys(details).length > 0 ? details : undefined;
}

interface FlowTransportToolRequest {
  ctx: ToolContext;
  dependencies: FlowMcpDependencies;
  args: FlowToolArgs;
  extra: { sessionId?: string };
  options: {
    rootChangedMessage: string;
    failureCode: string;
    failureMessage: string;
    run(
      service: AdtFlowService,
      input: FlowIndexInput,
    ): Promise<FlowCheckoutResult>;
  };
}

export async function runFlowTransportTool({
  ctx,
  dependencies,
  args,
  extra,
  options,
}: FlowTransportToolRequest): Promise<FlowToolResult> {
  try {
    const root = await resolveFlowWorkspaceRoot(
      args.workspaceRoot,
      ctx.workspaceRoots,
    );
    const config = await dependencies.loadFlowConfig(root, ctx);
    const format = dependencies.getFormat(config.format.id);
    if (!format) {
      throw new AdtFlowError(
        'format_unsupported',
        'Configured format is not registered.',
      );
    }
    const revalidatedRoot = await resolveFlowWorkspaceRoot(
      args.workspaceRoot,
      ctx.workspaceRoots,
    );
    if (revalidatedRoot !== root) {
      throw new AdtFlowError(
        'workspace_root_changed',
        options.rootChangedMessage,
      );
    }
    const { client } = await resolveClient(ctx, args, extra);
    const result = await options.run(
      dependencies.createService(client, format),
      {
        root,
        transports: args.transports,
        config,
      },
    );
    return {
      content: [
        { type: 'text' as const, text: JSON.stringify(result, null, 2) },
      ],
      structuredContent: result as unknown as Record<string, unknown>,
    };
  } catch (error) {
    const isFlowError = error instanceof AdtFlowError;
    const code = isFlowError ? error.code : options.failureCode;
    const message = isFlowError ? error.message : options.failureMessage;
    const details = isFlowError ? safeFlowErrorDetails(error) : undefined;
    return {
      isError: true,
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            error: {
              code,
              message,
              ...(details ? { details } : {}),
            },
          }),
        },
      ],
    };
  }
}
