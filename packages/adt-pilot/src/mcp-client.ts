/**
 * MCP client factory
 *
 * Wraps `@modelcontextprotocol/sdk`'s `Client` in the `McpToolCaller`
 * interface used by `createCodeReviewWorkflow`.
 *
 * In production the client connects to the `adt-mcp` binary via stdio or
 * HTTP. In tests an in-process `InMemoryTransport` is used instead.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { McpToolCaller } from './types.js';

/**
 * Wrap an already-connected MCP SDK `Client` as a `McpToolCaller`.
 *
 * The caller parses the first `text` content item of the tool response as
 * JSON. If the tool returns `isError: true`, an `Error` is thrown.
 *
 * @param client - A connected `@modelcontextprotocol/sdk` `Client`
 */
export function createMcpToolCaller(client: Client): McpToolCaller {
  return async (toolName: string, args: Record<string, unknown>) => {
    const result = await client.callTool({
      name: toolName,
      arguments: args,
    });

    const content = result.content as Array<{ type: string; text: string }>;
    const text = content[0]?.text ?? '';

    // Propagate tool-level errors as thrown exceptions so the workflow can
    // catch them and record error findings.
    if (result.isError) {
      throw new Error(text || `MCP tool "${toolName}" returned an error`);
    }

    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  };
}

/**
 * Connect a Mastra MCP `Client` to the given transport and return a
 * `McpToolCaller` backed by that connection.
 *
 * The caller is responsible for closing the transport when done.
 *
 * @example
 * ```typescript
 * const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
 * await mcpServer.connect(serverTransport);
 * const callTool = await connectMcpClient(clientTransport);
 * ```
 */
export async function connectMcpClient(
  transport: Transport,
): Promise<{ callTool: McpToolCaller; client: Client }> {
  const client = new Client({ name: 'adt-pilot', version: '0.1.0' });
  await client.connect(transport);
  return { callTool: createMcpToolCaller(client), client };
}
