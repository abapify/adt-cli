/**
 * Registration-time schema guard for the shared ADT Server mode.
 *
 * Tool implementations stay reusable with the legacy CLI/stdio transport:
 * this wrapper changes only their public input contract. The common resolver
 * then turns `destination` into the matching isolated context.
 */

import { z } from 'zod';
import type {
  McpServer,
  RegisteredTool,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types.js';
import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import {
  actionClassesForMcpTool,
  assertMcpToolIsClassified,
  isMcpDestinationAllowed,
  isMcpToolAllowed,
  isMcpToolResourceAllowed,
  isMcpToolListed,
  type McpOperationClass,
  type McpRequestAccess,
} from './scope-catalogue.js';
import { safeExecuteLimitResult, scopeDeniedResult } from './utils.js';

const destination = z
  .string()
  .regex(/^[a-z][a-z0-9-]{1,62}$/u)
  .describe('ADT-managed destination key');

const forbiddenConnectionFields = {
  baseUrl: z.never().optional(),
  client: z.never().optional(),
  username: z.never().optional(),
  password: z.never().optional(),
  systemId: z.never().optional(),
};

function destinationSchema(raw: unknown): Record<string, unknown> {
  const input = raw && typeof raw === 'object' ? raw : {};
  const copy = { ...(input as Record<string, unknown>) };
  // Explicit `never` fields reject rather than silently strip unsafe input.
  const forbiddenKeys = new Set(Object.keys(forbiddenConnectionFields));
  const filtered = Object.fromEntries(
    Object.entries(copy).filter(([key]) => !forbiddenKeys.has(key)),
  );
  return { ...filtered, ...forbiddenConnectionFields, destination };
}

/**
 * `McpServer.tool` accepts only a raw shape and therefore creates a
 * strip-unknown Zod object. Canonical tools have retired raw URI fields that
 * must be both absent from the public schema and rejected if supplied, so they
 * are registered through the strict-schema API below.
 */
const rawUriFieldsByTool = new Map<string, readonly string[]>([
  ['atc_run', ['objectUri']],
  ['find_references', ['objectUri']],
  ['get_callers_of', ['objectUri']],
  ['get_callees_of', ['objectUri']],
  ['get_source_version', ['uri']],
  ['grep_objects', ['objectUris']],
]);

function strictCanonicalDestinationSchema(name: string, raw: unknown) {
  const schema = destinationSchema(raw);
  const rawFields = rawUriFieldsByTool.get(name) ?? [];
  const filtered = Object.fromEntries(
    Object.entries(schema).filter(([key]) => !rawFields.includes(key)),
  );
  return z.object(filtered as z.ZodRawShape).strict();
}

type Handler = (...handlerArgs: unknown[]) => unknown;

export interface DestinationModeOptions {
  /**
   * Resolves trusted access for each dispatch. It receives MCP transport
   * context only; tool arguments cannot select or expand a class.
   */
  requestAccess?: (extra: {
    sessionId?: string;
  }) => McpRequestAccess | undefined;
  consumeExecutionAuthorization?: ToolContext['consumeExecutionAuthorization'];
  reportExecutionOutcome?: ToolContext['reportExecutionOutcome'];
  executeWithDeadline?: ToolContext['executeWithDeadline'];
}

type DestinationToolListEntry = {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
  annotations?: RegisteredTool['annotations'];
};

const destinationToolInventories = new WeakMap<
  McpServer,
  Map<string, DestinationToolListEntry>
>();

function isToolErrorResult(result: unknown): boolean {
  return (
    !!result &&
    typeof result === 'object' &&
    !Array.isArray(result) &&
    (result as { isError?: unknown }).isError === true
  );
}

type DispatchCounter = { admitted: number };

function toolListEntry(
  name: string,
  tool: RegisteredTool,
): DestinationToolListEntry {
  if (!tool.inputSchema) {
    throw new Error(`MCP tool ${name} must declare an input schema`);
  }
  return {
    name,
    ...(tool.description ? { description: tool.description } : {}),
    inputSchema: z.toJSONSchema(tool.inputSchema) as Record<string, unknown>,
    ...(tool.annotations ? { annotations: tool.annotations } : {}),
  };
}

type ActionSchemaProjection = {
  actionClasses: Readonly<Record<string, McpOperationClass>>;
  actionSchema: Record<string, unknown>;
  properties: Record<string, unknown>;
};

/**
 * Validates that a mixed-action tool's public action enum exactly matches the
 * catalogue. This makes an unclassified new action fail closed at startup.
 */
function actionSchemaProjection(
  name: string,
  inputSchema: Record<string, unknown>,
): ActionSchemaProjection | undefined {
  const actionClasses = actionClassesForMcpTool(name);
  if (!actionClasses) return undefined;

  const properties = inputSchema.properties;
  const actionSchema =
    properties && typeof properties === 'object' && !Array.isArray(properties)
      ? (properties as Record<string, unknown>).action
      : undefined;
  const actionEnum =
    actionSchema &&
    typeof actionSchema === 'object' &&
    !Array.isArray(actionSchema)
      ? (actionSchema as Record<string, unknown>).enum
      : undefined;
  const catalogueActions = Object.keys(actionClasses);

  if (
    !Array.isArray(actionEnum) ||
    actionEnum.length !== catalogueActions.length ||
    new Set(actionEnum).size !== actionEnum.length ||
    !actionEnum.every(
      (action) =>
        typeof action === 'string' && Object.hasOwn(actionClasses, action),
    )
  ) {
    throw new Error(
      `MCP tool ${name} action schema does not match its scope catalogue`,
    );
  }

  return {
    actionClasses,
    actionSchema: actionSchema as Record<string, unknown>,
    properties: properties as Record<string, unknown>,
  };
}

function normalizeToolArgs(args: unknown[]): {
  name: string;
  description: string | undefined;
  inputSchema: unknown;
  annotations: RegisteredTool['annotations'] | undefined;
  handler: unknown;
} {
  if (args.length < 3) {
    throw new TypeError('MCP tools must declare an input schema and handler');
  }
  const name = args[0];
  if (typeof name !== 'string') {
    throw new TypeError('MCP tools must declare a string name');
  }
  const handler = args.at(-1);
  const hasDescription = typeof args[1] === 'string' && args.length >= 4;
  const description = hasDescription ? args[1] : undefined;
  const inputSchema = args[hasDescription ? 2 : 1];
  const annotationsIndex = hasDescription ? 3 : 2;
  const annotations =
    args.length > annotationsIndex + 1
      ? (args[annotationsIndex] as RegisteredTool['annotations'])
      : undefined;
  return { name, description, inputSchema, annotations, handler };
}

function transformToolInput(
  name: string,
  inputSchema: unknown,
  target: McpServer,
): {
  transformedInputSchema: unknown;
  strictInputSchema:
    ReturnType<typeof strictCanonicalDestinationSchema> | undefined;
  useRegisterTool: boolean;
} {
  const requiresStrictCanonicalSchema = rawUriFieldsByTool.has(name);
  const supportsStrictCanonicalSchema =
    typeof (target as unknown as { registerTool?: unknown }).registerTool ===
    'function';
  if (requiresStrictCanonicalSchema && supportsStrictCanonicalSchema) {
    return {
      transformedInputSchema: inputSchema,
      strictInputSchema: strictCanonicalDestinationSchema(name, inputSchema),
      useRegisterTool: true,
    };
  }
  return {
    transformedInputSchema: destinationSchema(inputSchema),
    strictInputSchema: undefined,
    useRegisterTool: false,
  };
}

type HandlerArgs = {
  toolArguments: Record<string, unknown>;
  extra: { sessionId?: string };
};

function parseHandlerArgs(handlerArgs: unknown[]): HandlerArgs {
  const toolArguments =
    handlerArgs[0] && typeof handlerArgs[0] === 'object'
      ? (handlerArgs[0] as Record<string, unknown>)
      : {};
  const extra =
    handlerArgs[1] && typeof handlerArgs[1] === 'object'
      ? (handlerArgs[1] as { sessionId?: string })
      : {};
  return { toolArguments, extra };
}

function isScopeAllowed(
  access: McpRequestAccess | undefined,
  name: string,
  toolArguments: Record<string, unknown>,
): boolean {
  return (
    isMcpToolAllowed(access, name, toolArguments) &&
    isMcpToolResourceAllowed(access, name, toolArguments) &&
    isMcpDestinationAllowed(access, toolArguments.destination)
  );
}

function reserveCounter(
  scoped: NonNullable<McpRequestAccess['scoped']>,
  counters: Map<string, DispatchCounter>,
): boolean {
  const existing = counters.get(scoped.executionId);
  const counter = existing ?? { admitted: 0 };
  counter.admitted++;
  if (counter.admitted > scoped.maxToolCalls) {
    counter.admitted--;
    if (counter.admitted <= 0) {
      counters.delete(scoped.executionId);
    } else {
      counters.set(scoped.executionId, counter); // nosemgrep
    }
    return false;
  }
  counters.set(scoped.executionId, counter); // nosemgrep
  return true;
}

function releaseCounter(
  scoped: NonNullable<McpRequestAccess['scoped']>,
  counters: Map<string, DispatchCounter>,
): void {
  const counter = counters.get(scoped.executionId);
  if (!counter) return;
  counter.admitted--;
  if (counter.admitted <= 0) {
    counters.delete(scoped.executionId);
  } else {
    counters.set(scoped.executionId, counter); // nosemgrep
  }
}

async function runSafeExecution(context: {
  handler: Handler;
  handlerArgs: unknown[];
  scoped: NonNullable<McpRequestAccess['scoped']>;
  toolArguments: Record<string, unknown>;
  options: DestinationModeOptions;
  counters: Map<string, DispatchCounter>;
}): Promise<unknown> {
  const { handler, handlerArgs, scoped, toolArguments, options, counters } =
    context;
  const policy = scoped.safeExecutePolicy;
  const { authorizationId, authorizationToken } = scoped;
  const destinationKey = toolArguments.destination;
  const {
    consumeExecutionAuthorization,
    reportExecutionOutcome,
    executeWithDeadline,
  } = options;
  if (
    !policy ||
    !authorizationId ||
    !authorizationToken ||
    typeof destinationKey !== 'string' ||
    !consumeExecutionAuthorization ||
    !reportExecutionOutcome ||
    !executeWithDeadline
  ) {
    return scopeDeniedResult();
  }

  if (!reserveCounter(scoped, counters)) return scopeDeniedResult();

  try {
    const consumed = await consumeExecutionAuthorization({
      authorizationId,
      authorizationToken,
      principal: scoped.principal,
      scopeId: scoped.scopeId,
      executionId: scoped.executionId,
      systemSid: scoped.systemSid,
      resourceKeys: scoped.resourceKeys,
      destination: destinationKey,
      operationId: policy.operationId,
      policy,
    });
    if (!consumed) {
      releaseCounter(scoped, counters);
      return scopeDeniedResult();
    }
  } catch {
    releaseCounter(scoped, counters);
    return scopeDeniedResult();
  }

  let outcome: 'succeeded' | 'failed' | 'outcome_unknown';
  let result: unknown;
  try {
    result = await executeWithDeadline({
      maxDurationMs: policy.maxDurationMs,
      operation: async () => await handler(...handlerArgs),
    });
    if (
      new TextEncoder().encode(JSON.stringify(result)).byteLength >
      policy.maxResultBytes
    ) {
      result = safeExecuteLimitResult('safe_execute_limit_exceeded');
    }
    outcome = isToolErrorResult(result) ? 'failed' : 'succeeded';
  } catch {
    outcome = 'outcome_unknown';
    result = safeExecuteLimitResult('outcome_unknown');
  }

  try {
    const recorded = await reportExecutionOutcome({
      authorizationId,
      authorizationToken,
      outcome,
    });
    if (!recorded) result = safeExecuteLimitResult('outcome_unknown');
  } catch {
    result = safeExecuteLimitResult('outcome_unknown');
  }
  return result;
}

function wrapToolHandler(
  handler: Handler,
  name: string,
  options: DestinationModeOptions,
  counters: Map<string, DispatchCounter>,
): Handler {
  return async (...handlerArgs: unknown[]) => {
    const { toolArguments, extra } = parseHandlerArgs(handlerArgs);
    let access: McpRequestAccess | undefined;
    try {
      access = options.requestAccess?.(extra);
    } catch {
      return scopeDeniedResult();
    }
    if (!isScopeAllowed(access, name, toolArguments)) {
      return scopeDeniedResult();
    }
    const scoped = access?.scoped;
    if (scoped) {
      if (scoped.operationClass === 'safe_execute') {
        return await runSafeExecution({
          handler,
          handlerArgs,
          scoped,
          toolArguments,
          options,
          counters,
        });
      }
      if (!reserveCounter(scoped, counters)) return scopeDeniedResult();
    }
    return await handler(...handlerArgs);
  };
}

function registerDestinationTool(context: {
  target: McpServer;
  name: string;
  description: string | undefined;
  transformedInputSchema: unknown;
  strictInputSchema:
    ReturnType<typeof strictCanonicalDestinationSchema> | undefined;
  wrappedHandler: Handler;
  useRegisterTool: boolean;
  annotations: RegisteredTool['annotations'] | undefined;
}): unknown {
  const {
    target,
    name,
    description,
    transformedInputSchema,
    strictInputSchema,
    wrappedHandler,
    useRegisterTool,
    annotations,
  } = context;
  if (useRegisterTool) {
    return target.registerTool(
      name,
      {
        ...(description !== undefined ? { description } : {}),
        inputSchema: strictInputSchema!,
        ...(annotations ? { annotations } : {}),
      },
      wrappedHandler as never,
    );
  }
  const processedArgs: unknown[] = [name];
  if (description !== undefined) processedArgs.push(description);
  processedArgs.push(transformedInputSchema);
  if (annotations) processedArgs.push(annotations);
  processedArgs.push(wrappedHandler);
  return Reflect.apply(target.tool, target, processedArgs);
}

function toolListEntryForAccess(
  tool: DestinationToolListEntry,
  access: McpRequestAccess | undefined,
): DestinationToolListEntry {
  const projection = actionSchemaProjection(tool.name, tool.inputSchema);
  if (!projection) return tool;

  const visibleActions = Object.entries(projection.actionClasses)
    .filter(([, operationClass]) => access?.classes.includes(operationClass))
    .map(([action]) => action);

  return {
    ...tool,
    inputSchema: {
      ...tool.inputSchema,
      properties: {
        ...projection.properties,
        action: { ...projection.actionSchema, enum: visibleActions },
      },
    },
  };
}

/**
 * View of an MCP server that rewrites every registered ADT tool schema to the
 * safe destination contract. All current registered tools are SAP-facing;
 * infrastructure-only tools must be registered directly on the original
 * server when introduced.
 */
export function destinationModeServer(
  server: McpServer,
  options: DestinationModeOptions = {},
): McpServer {
  const inventory = new Map<string, DestinationToolListEntry>();
  const counters = new Map<string, DispatchCounter>();
  destinationToolInventories.set(server, inventory);
  return new Proxy(server, {
    get(target, property, receiver) {
      if (property !== 'tool') return Reflect.get(target, property, receiver);
      return (...args: unknown[]) => {
        const { name, description, inputSchema, annotations, handler } =
          normalizeToolArgs(args);
        assertMcpToolIsClassified(name);
        if (typeof handler !== 'function') {
          throw new TypeError(`MCP tool ${name} must declare a handler`);
        }
        const { transformedInputSchema, strictInputSchema, useRegisterTool } =
          transformToolInput(name, inputSchema, target);
        const wrappedHandler = wrapToolHandler(
          handler as Handler,
          name,
          options,
          counters,
        );
        const registeredTool = registerDestinationTool({
          target,
          name,
          description,
          transformedInputSchema,
          strictInputSchema,
          wrappedHandler,
          useRegisterTool,
          annotations,
        });
        if (!registeredTool) return registeredTool;
        const entry = toolListEntry(name, registeredTool);
        actionSchemaProjection(name, entry.inputSchema);
        inventory.set(name, entry);
        return registeredTool;
      };
    },
  }) as McpServer;
}

/**
 * Replaces the SDK's all-tools handler after registration with a session-aware
 * view. The authoritative SDK registry is left intact so hidden tools retain
 * their normal handler and can return `mcp_scope_denied` on direct calls.
 */
export function installDestinationModeToolListProjection(
  server: McpServer,
  options: DestinationModeOptions = {},
): void {
  const inventory = destinationToolInventories.get(server);
  if (!inventory) {
    throw new Error('Destination MCP tool inventory is not initialized');
  }
  server.server.setRequestHandler(ListToolsRequestSchema, (_request, extra) => {
    let access: McpRequestAccess | undefined;
    try {
      access = options.requestAccess?.({ sessionId: extra.sessionId });
    } catch {
      access = undefined;
    }
    return {
      tools: Array.from(inventory.values())
        .filter((tool) => {
          if (!isMcpToolListed(access, tool.name)) return false;
          if (access?.scoped?.operationClass === 'safe_execute') {
            return (
              typeof options.consumeExecutionAuthorization === 'function' &&
              typeof options.reportExecutionOutcome === 'function' &&
              typeof options.executeWithDeadline === 'function'
            );
          }
          return true;
        })
        .map((tool) => toolListEntryForAccess(tool, access)),
    };
  });
}
