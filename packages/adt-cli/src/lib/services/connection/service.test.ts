import { describe, it, expect } from 'vitest';
import { resolveConnectionClient } from './service';

describe('resolveConnectionClient', () => {
  it('prefers explicit baseUrl', async () => {
    const result = await resolveConnectionClient(
      {
        baseUrl: 'https://sap.example',
        client: '100',
        username: 'u',
        password: 'p',
        systemId: 'DEV',
      },
      {
        createClient: (params) => ({ kind: 'explicit', params }),
      },
    );

    expect(result.source).toBe('explicit');
    expect(result.systemId).toBe('DEV');
  });

  it('falls back to multi-system resolution', async () => {
    const result = await resolveConnectionClient(
      { systemId: 'DEV', username: 'u', password: 'p' },
      {
        createClient: (params) => ({ kind: 'multi', params }),
        resolveSystem: (id) =>
          id === 'DEV'
            ? { baseUrl: 'https://sap.dev', client: '100' }
            : undefined,
      },
    );

    expect(result.source).toBe('multi-system');
    expect(result.systemId).toBe('DEV');
  });

  it('falls back to auth store when multi-system misses', async () => {
    const result = await resolveConnectionClient(
      { systemId: 'DEV' },
      {
        createClient: (params) => ({ kind: 'unused', params }),
        resolveSystem: () => undefined,
        resolveFromAuthStore: async () => ({ kind: 'auth-store' }),
      },
    );

    expect(result.source).toBe('adt-cli-auth-store');
    expect(result.systemId).toBe('DEV');
  });
});
