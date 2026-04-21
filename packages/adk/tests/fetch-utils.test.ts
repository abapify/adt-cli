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
    expect(await toText(null)).toBe('');
  });

  it('should convert undefined to empty string', async () => {
    expect(await toText(undefined)).toBe('');
  });

  it('should convert number to string', async () => {
    expect(await toText(123)).toBe('123');
  });

  it('should JSON-stringify plain objects', async () => {
    const result = await toText({ key: 'value' });
    expect(result).toBe('{"key":"value"}');
  });

  it('should JSON-stringify objects with non-function text property', async () => {
    // `text` is not a function, so the Response-like branch is skipped and
    // the value falls through to the JSON.stringify path.
    const result = await toText({ text: 'not a function' });
    expect(result).toBe('{"text":"not a function"}');
  });

  it('should fall back to String() when JSON.stringify throws', async () => {
    // JSON.stringify throws on circular references — the catch branch in
    // toText() must return the default string coercion instead of propagating.
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const result = await toText(circular);
    expect(result).toBe('[object Object]');
  });
});
