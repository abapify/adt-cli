import assert from 'node:assert/strict';
import { mkdtemp, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AdtClient } from '@abapify/adt-client';
import type { FormatPlugin } from '@abapify/adt-plugin';
import type { ToolContext } from '../src/lib/types.js';
import { registerFlowIndexTrTool } from '../src/lib/tools/flow-index-tr.js';

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

test('flow_index_tr delegates source-free indexing to the shared service', async () => {
  const allowed = await realpath(
    await mkdtemp(join(tmpdir(), 'adt-flow-index-mcp-')),
  );
  const target = new CapturingServer();
  let indexInput: unknown;
  const ctx = {
    getClient: () => ({}) as AdtClient,
    workspaceRoots: [allowed],
    flowConfig: { format: { id: 'abapgit' } },
  } satisfies ToolContext;
  registerFlowIndexTrTool(target as unknown as McpServer, ctx, {
    getFormat: () => format,
    createService: () => ({
      async checkout() {
        throw new Error('checkout must not be called by flow_index_tr');
      },
      async index(input) {
        indexInput = input;
        return {
          mode: 'head',
          requestedTransports: ['DEVK900001'],
          scopeTransports: ['DEVK900001'],
          changed: [],
          moved: [],
          removed: [],
          unchanged: [],
          descriptors: ['.adt/tr/DEVK900001.json'],
          skipped: [],
          sapCalls: { manifest: 1, metadata: 0, source: 0 },
          fastPath: 'none',
        };
      },
    }),
  });

  const result = await target.handler!(
    {
      baseUrl: 'https://example.invalid',
      transports: ['DEVK900001'],
      workspaceRoot: allowed,
    },
    {},
  );

  assert.notStrictEqual(result.isError, true);
  assert.deepEqual(indexInput, {
    root: allowed,
    transports: ['DEVK900001'],
    config: ctx.flowConfig,
  });
  assert.equal(result.structuredContent?.sapCalls.source, 0);
  assert.deepEqual(target.annotations, {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  });
});
