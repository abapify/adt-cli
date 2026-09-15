import { describe, expect, it } from 'vitest';
import { formatFetchFailure } from './fetch';

describe('formatFetchFailure', () => {
  it('reports HTTP status and a bounded, redacted response body', () => {
    const error = Object.assign(
      new Error('HTTP 502: Bad Gateway?access_token=message-secret'),
      {
        status: 502,
        statusText: 'Bad Gateway',
        rawBody:
          '{"message":"upstream unavailable","requestId":"req-123","access_token":"secret-token","password":"secret-password"}',
      },
    );

    const diagnostic = formatFetchFailure(error).join('\n');

    expect(diagnostic).toContain('HTTP status: 502 Bad Gateway');
    expect(diagnostic).toContain('Response body (sanitized');
    expect(diagnostic).toContain('requestId');
    expect(diagnostic).toContain('[REDACTED]');
    expect(diagnostic).not.toContain('secret-token');
    expect(diagnostic).not.toContain('secret-password');
    expect(diagnostic).not.toContain('message-secret');
  });

  it('distinguishes a transport failure from an HTTP response', () => {
    const cause = Object.assign(new Error('socket hang up'), {
      code: 'ECONNRESET',
    });
    const error = new TypeError('fetch failed', { cause });

    const diagnostic = formatFetchFailure(error).join('\n');

    expect(diagnostic).toContain('HTTP response: none received');
    expect(diagnostic).toContain(
      'Transport cause: socket hang up (ECONNRESET)',
    );
  });

  it('redacts API-key headers, Digest auth parameters, and sensitive statusText', () => {
    const error = Object.assign(
      new Error(
        'Authorization: Digest username="u", realm="r", nonce="n"\nX-Api-Key: leaked-key',
      ),
      {
        status: 401,
        statusText: 'Unauthorized?access_token=status-secret',
        rawBody:
          'Authorization: Digest username="u", response="resp"\nX-Api-Key: body-key',
      },
    );

    const diagnostic = formatFetchFailure(error).join('\n');

    expect(diagnostic).not.toContain('leaked-key');
    expect(diagnostic).not.toContain('body-key');
    expect(diagnostic).not.toContain('status-secret');
    expect(diagnostic).not.toContain('response="resp"');
    expect(diagnostic).not.toContain('nonce="n"');
    expect(diagnostic).not.toContain('username="u"');
    expect(diagnostic).toContain('[REDACTED]');
  });

  it('redacts authorization/cookie JSON keys and ADT XML entry attributes', () => {
    const error = Object.assign(new Error('upstream error'), {
      status: 500,
      rawBody:
        '{"authorization":"Bearer abc","cookie":"sid=123","set-cookie":"x=1"}\n' +
        '<entry key="access_token">plain-secret</entry>',
    });

    const diagnostic = formatFetchFailure(error).join('\n');

    expect(diagnostic).not.toContain('Bearer abc');
    expect(diagnostic).not.toContain('sid=123');
    expect(diagnostic).not.toContain('x=1');
    expect(diagnostic).not.toContain('plain-secret');
    expect(diagnostic).toContain('[REDACTED]');
  });

  it('redacts JSON string values containing escaped quotes', () => {
    const error = Object.assign(new Error('err'), {
      status: 500,
      rawBody: '{"password":"abc\\"def","token":"xyz\\"wuv"}',
    });

    const diagnostic = formatFetchFailure(error).join('\n');

    // The old pattern [^"']* stopped at the escaped quote, leaking `def"`
    // and `wuv"`. The escape-aware pattern consumes the full value.
    expect(diagnostic).not.toContain('def');
    expect(diagnostic).not.toContain('wuv');
    expect(diagnostic).toContain('[REDACTED]');
  });

  it('truncates the response body at a code-point boundary (no split surrogates)', () => {
    // Build a body where the 4000th code point is a surrogate pair ('😀').
    // 3999 'a's + '😀' (1 code point, 2 UTF-16 units) + 'b' = 4001 code points.
    // Code-point slicing keeps 3999 'a's + '😀' (valid); naive unit slicing
    // would cut inside the surrogate pair and emit a lone high surrogate.
    const rawBody = 'a'.repeat(3999) + '😀b';
    const error = Object.assign(new Error('err'), {
      status: 500,
      rawBody,
    });

    const diagnostic = formatFetchFailure(error).join('\n');

    expect(diagnostic).toContain('… [truncated]');
    // The truncated body must not contain a lone high surrogate (U+D800–U+DBFF
    // alone renders as U+FFFD). '😀' is preserved intact.
    expect(diagnostic).toContain('😀');
    expect(diagnostic).not.toContain('\uFFFD');
  });
});
