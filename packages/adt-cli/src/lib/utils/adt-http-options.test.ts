import { describe, expect, it } from 'vitest';
import { resolveAdtHeadersTimeoutMs } from './adt-http-options';

describe('resolveAdtHeadersTimeoutMs', () => {
  it('returns the configured positive integer timeout', () => {
    expect(
      resolveAdtHeadersTimeoutMs({ ADT_HEADERS_TIMEOUT_MS: '900000' }),
    ).toBe(900_000);
  });

  it('leaves the native client timeout unchanged when unset', () => {
    expect(resolveAdtHeadersTimeoutMs({})).toBeUndefined();
  });

  it('treats an empty string as unset (equivalent to leaving it unset)', () => {
    expect(
      resolveAdtHeadersTimeoutMs({ ADT_HEADERS_TIMEOUT_MS: '' }),
    ).toBeUndefined();
  });

  it.each(['0', '-1', '1.5', 'invalid'])(
    'rejects invalid timeout %s',
    (value) => {
      expect(() =>
        resolveAdtHeadersTimeoutMs({ ADT_HEADERS_TIMEOUT_MS: value }),
      ).toThrow('ADT_HEADERS_TIMEOUT_MS must be a positive integer');
    },
  );
});
