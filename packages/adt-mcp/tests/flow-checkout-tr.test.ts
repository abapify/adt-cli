import assert from 'node:assert/strict';
import { mkdtemp, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AdtClient } from '@abapify/adt-client';
import type { FormatPlugin } from '@abapify/adt-plugin';
import type { ToolContext } from '../src/lib/types.js';
import { registerFlowCheckoutTrTool } from '../src/lib/tools/flow-checkout-tr.js';
import { resolveFlowWorkspaceRoot } from '../src/lib/flow-workspace.js';

type ToolResult = {
  isError?: boolean;
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
};

type Handler = (
  args: Record<string, unknown>,
  extra: { sessionId?: string },
) => Promise<ToolResult>;

class CapturingServer {
  handler?: Handler;
  annotations?: Record<string, unknown>;

  tool(...args: unknown[]): void {
    this.annotations = args[3] as Record<string, unknown>;
    this.handler = args.at(-1) as Handler;
  }
}

const format = {
  id: 'abapgit',
  description: 'test',
  supportedTypes: ['CLAS'],
  getHandler: () => undefined,
} satisfies FormatPlugin;

test('flow_checkout_tr delegates to the shared service inside an allowed root', async () => {
  const allowed = await realpath(
    await mkdtemp(join(tmpdir(), 'adt-flow-mcp-')),
  );
  const target = new CapturingServer();
  let checkoutInput: unknown;
  const ctx = {
    getClient: () => ({}) as AdtClient,
    workspaceRoots: [allowed],
    flowConfig: { format: { id: 'abapgit' } },
  } satisfies ToolContext;
  registerFlowCheckoutTrTool(target as unknown as McpServer, ctx, {
    getFormat: () => format,
    createService: () => ({
      async checkout(input) {
        checkoutInput = input;
        return {
          mode: 'base',
          requestedTransports: ['DEVK900001'],
          scopeTransports: ['DEVK900001'],
          changed: ['src/zcl_sample.clas.abap'],
          moved: [],
          removed: [],
          unchanged: [],
          descriptors: ['.adt/objects/CLAS/zcl_sample.clas.adt.json'],
          skipped: [],
          sapCalls: { manifest: 1, metadata: 1, source: 1 },
          fastPath: 'none',
        };
      },
    }),
  });

  const result = await target.handler!(
    {
      baseUrl: 'https://example.invalid',
      transports: ['DEVK900001'],
      base: true,
      verifyInventory: true,
      workspaceRoot: allowed,
    },
    {},
  );

  assert.notStrictEqual(result.isError, true);
  assert.deepEqual(checkoutInput, {
    root: allowed,
    transports: ['DEVK900001'],
    mode: 'base',
    verifyInventory: true,
    config: ctx.flowConfig,
  });
  assert.equal(result.structuredContent?.mode, 'base');
  assert.deepEqual(result.structuredContent?.skipped, []);
  assert.deepEqual(target.annotations, {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  });
});

test('flow workspace confinement rejects a sibling directory', async () => {
  const allowed = await realpath(
    await mkdtemp(join(tmpdir(), 'adt-flow-allowed-')),
  );
  const sibling = await realpath(
    await mkdtemp(join(tmpdir(), 'adt-flow-sibling-')),
  );
  await assert.rejects(
    resolveFlowWorkspaceRoot(sibling, [allowed]),
    /outside the server-owned roots/u,
  );
});
