/**
 * MCP client factory
 *
 * Wraps `@modelcontextprotocol/sdk`'s `Client` in the {@link McpToolCaller}
 * interface used by the Code Review workflow.
 *
 * In production a process-spawning transport (stdio) or HTTP transport
 * connects to the `adt-mcp` binary. In tests the
 * `InMemoryTransport.createLinkedPair()` pattern lets you wire an
 * in-process `adt-mcp` server directly to the client — see
 * `tests/workflow.test.ts` for the canonical example.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { McpToolCaller } from './types.js';

interface TextContentBlock {
  type: 'text';
  text: string;
}

/**
 * Wrap an already-connected MCP SDK `Client` as a {@link McpToolCaller}.
 *
 * The wrapper:
 * - Reads the first `text` content item of the tool response.
 * - Throws an `Error` (with the response text as message) when the tool
 *   sets `isError: true`, so the workflow's per-object error path can
 *   record it as a synthetic `priority: 'error'` finding.
 * - Returns the parsed JSON object when the response body is valid JSON.
 * - Returns the raw string otherwise (including when the response body
 *   is empty).
 *
 * @param client A connected `@modelcontextprotocol/sdk` `Client`.
 */
export function createMcpToolCaller(client: Client): McpToolCaller {
  return async (toolName: string, args: Record<string, unknown>) => {
    const result = await client.callTool({
      name: toolName,
      arguments: args,
    });

    const text = extractFirstTextBlock(result.content);

    if (result.isError) {
      throw new Error(text || `MCP tool "${toolName}" returned an error`);
    }

    return tryParseJson(text);
  };
}

/**
 * Connect a fresh `@modelcontextprotocol/sdk` `Client` to the given
 * transport and return both the resulting {@link McpToolCaller} and the
 * underlying client. The caller is responsible for closing the client
 * (and transport) when finished.
 *
 * @example
 * ```ts
 * const [clientTransport, serverTransport] =
 *   InMemoryTransport.createLinkedPair();
 * await mcpServer.connect(serverTransport);
 *
 * const { callTool, client } = await connectMcpClient(clientTransport);
 * try {
 *   await callTool('list_package_objects', { packageName: 'ZPACKAGE', ... });
 * } finally {
 *   await client.close();
 * }
 * ```
 */
export async function connectMcpClient(
  transport: Transport,
  clientInfo: { name?: string; version?: string } = {},
): Promise<{ callTool: McpToolCaller; client: Client }> {
  const client = new Client({
    name: clientInfo.name ?? 'adt-pilot',
    version: clientInfo.version ?? '0.1.0',
  });
  await client.connect(transport);
  return { callTool: createMcpToolCaller(client), client };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractFirstTextBlock(content: unknown): string {
  if (!Array.isArray(content)) return '';
  for (const block of content) {
    if (
      block &&
      typeof block === 'object' &&
      (block as TextContentBlock).type === 'text' &&
      typeof (block as TextContentBlock).text === 'string'
    ) {
      return (block as TextContentBlock).text;
    }
  }
  return '';
}

function tryParseJson(text: string): unknown {
  if (text === '') return '';
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}
