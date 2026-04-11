/**
 * ADK Fetch Utils Unit Tests
 *
 * Tests for fetch-utils.ts functions that handle fetch response normalization.
 */

import { describe, it, expect } from 'vitest';
import { toText } from '../src/base/fetch-utils';

describe('toText', () => {
  it('should return string as-is', async () => {
    const result = await toText('hello world');
    expect(result).toBe('hello world');
  });

  it('should handle Response-like object with text method', async () => {
    const mockResponse = {
      text: () => Promise.resolve('response text'),
    };
    const result = await toText(mockResponse);
    expect(result).toBe('response text');
  });

  it('should convert null to empty string', async () => {
    const result = await toText(null);
    expect(result).toBe('');
  });

  it('should convert undefined to empty string', async () => {
    const result = await toText(undefined);
    expect(result).toBe('');
  });

  it('should convert number to string', async () => {
    const result = await toText(123);
    expect(result).toBe('123');
  });

  it('should convert object to string', async () => {
    const result = await toText({ key: 'value' });
    expect(result).toBe('[object Object]');
  });

  it('should handle object with text property but not a function', async () => {
    const result = await toText({ text: 'not a function' });
    expect(result).toBe('[object Object]');
  });
});
