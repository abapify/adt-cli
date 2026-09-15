import { afterEach, describe, expect, it, vi } from 'vitest';

const agentConstructions = vi.hoisted(
  () => [] as Array<Record<string, unknown>>,
);
const undiciFetch = vi.hoisted(() => vi.fn());

vi.mock('undici', () => ({
  Agent: class {
    constructor(options: Record<string, unknown>) {
      agentConstructions.push(options);
    }
  },
  fetch: undiciFetch,
}));

import { createAdtAdapter, type AdtAdapterConfig } from '../src/adapter';

describe('ADT response header timeout', () => {
  afterEach(() => {
    agentConstructions.length = 0;
    undiciFetch.mockReset();
    vi.unstubAllGlobals();
  });

  it('uses the matching Undici fetch implementation with the configured Agent', async () => {
    undiciFetch.mockResolvedValue(
      new Response('<result />', {
        headers: { 'content-type': 'application/xml' },
      }),
    );
    const nativeFetch = vi.fn();
    vi.stubGlobal('fetch', nativeFetch);
    const config = {
      baseUrl: 'https://sap.example.test',
      username: 'test',
      password: 'test',
      headersTimeoutMs: 900_000,
    } as AdtAdapterConfig & { headersTimeoutMs: number };
    const adapter = createAdtAdapter(config);

    await adapter.request({
      method: 'GET',
      url: '/sap/bc/adt/abapunit/testruns',
    });

    expect(agentConstructions).toEqual([{ headersTimeout: 900_000 }]);
    expect(undiciFetch.mock.calls[0]?.[1]).toMatchObject({
      dispatcher: expect.anything(),
    });
    expect(nativeFetch).not.toHaveBeenCalled();
  });

  it('rejects absolute URLs that target a different origin', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const adapter = createAdtAdapter({
      baseUrl: 'https://sap.example.test',
      username: 'test',
      password: 'test',
    } as AdtAdapterConfig);

    await expect(
      adapter.request({
        method: 'GET',
        url: 'https://evil.example.test/sap/bc/adt/abapunit/testruns',
      }),
    ).rejects.toThrow(/ADT requests must target the configured base origin/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('routes the CSRF handshake through the paired Undici fetch with the configured dispatcher', async () => {
    const nativeFetch = vi.fn();
    vi.stubGlobal('fetch', nativeFetch);

    undiciFetch.mockImplementation(async (_input: unknown, init?: any) => {
      const headers = init?.headers ?? {};
      const secSession = headers['x-sap-security-session'];
      const csrfHeader = headers['x-csrf-token'];
      const method = init?.method ?? 'GET';

      // Step 1: create security session
      if (secSession === 'create') {
        return new Response(
          '<atom:entry xmlns:atom="http://www.w3.org/2005/Atom">' +
            '<atom:link href="/sap/bc/adt/core/http/sessions/TEST123" ' +
            'rel="http://www.sap.com/adt/categories/core/http/sessions/securitysession"/>' +
            '</atom:entry>',
          {
            status: 200,
            headers: {
              'content-type':
                'application/vnd.sap.adt.core.http.session.v3+xml',
            },
          },
        );
      }
      // Step 2: fetch CSRF token
      if (secSession === 'use' && csrfHeader === 'Fetch') {
        return new Response('', {
          status: 200,
          headers: { 'x-csrf-token': 'csrf-token-value' },
        });
      }
      // Step 3: delete security session
      if (method === 'DELETE') {
        return new Response('', { status: 200 });
      }
      // Step 4: the actual POST request
      return new Response('<result />', {
        status: 200,
        headers: { 'content-type': 'application/xml' },
      });
    });

    const adapter = createAdtAdapter({
      baseUrl: 'https://sap.example.test',
      username: 'test',
      password: 'test',
      headersTimeoutMs: 900_000,
    } as AdtAdapterConfig & { headersTimeoutMs: number });

    await adapter.request({
      method: 'POST',
      url: '/sap/bc/adt/abapunit/testruns',
      body: '<test/>',
    });

    // Every undiciFetch call (CSRF handshake + final POST) must carry the dispatcher
    for (const call of undiciFetch.mock.calls) {
      expect(call[1]).toMatchObject({ dispatcher: expect.anything() });
    }
    // At least 4 calls: create, fetch CSRF, delete session, final POST
    expect(undiciFetch.mock.calls.length).toBeGreaterThanOrEqual(4);
    expect(nativeFetch).not.toHaveBeenCalled();
  });
});
