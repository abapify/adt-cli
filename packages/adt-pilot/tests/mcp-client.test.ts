/**
 * MCP client factory tests
 */

import { describe, it, expect, vi } from 'vitest';
import { createMcpToolCaller } from '../src/index';

// ---------------------------------------------------------------------------
// createMcpToolCaller tests
// ---------------------------------------------------------------------------

describe('createMcpToolCaller', () => {
  it('returns parsed JSON from the first text content block', async () => {
    const mockClient = {
      callTool: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"status":"ok","count":3}' }],
        isError: false,
      }),
    };

    const callTool = createMcpToolCaller(mockClient as never);
    const result = await callTool('some_tool', { arg: 'value' });

    expect(result).toEqual({ status: 'ok', count: 3 });
    expect(mockClient.callTool).toHaveBeenCalledWith({
      name: 'some_tool',
      arguments: { arg: 'value' },
    });
  });

  it('throws when the tool responds with isError: true', async () => {
    const mockClient = {
      callTool: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Tool failed: connection refused' }],
        isError: true,
      }),
    };

    const callTool = createMcpToolCaller(mockClient as never);
    await expect(callTool('bad_tool', {})).rejects.toThrow(
      'Tool failed: connection refused',
    );
  });

  it('throws with generic message when isError is true and text is empty', async () => {
    const mockClient = {
      callTool: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: '' }],
        isError: true,
      }),
    };

    const callTool = createMcpToolCaller(mockClient as never);
    await expect(callTool('bad_tool', {})).rejects.toThrow('bad_tool');
  });

  it('returns raw string when content is not valid JSON', async () => {
    const mockClient = {
      callTool: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'plain text response' }],
        isError: false,
      }),
    };

    const callTool = createMcpToolCaller(mockClient as never);
    const result = await callTool('text_tool', {});
    expect(result).toBe('plain text response');
  });

  it('returns empty string when content array is empty', async () => {
    const mockClient = {
      callTool: vi.fn().mockResolvedValue({
        content: [],
        isError: false,
      }),
    };

    const callTool = createMcpToolCaller(mockClient as never);
    const result = await callTool('empty_tool', {});
    expect(result).toBe('');
  });
});
