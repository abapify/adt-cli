/**
 * Test fixture auth plugin for AuthManager tests.
 *
 * Behavior is controlled via `globalThis.__FAKE_PLUGIN` so tests can
 * simulate success, refresh support, and failure paths.
 */
import type {
  AuthPlugin,
  AuthPluginOptions,
  AuthPluginResult,
  AuthSession,
} from '../../src/types';

interface FakePluginState {
  authenticateCalls: number;
  refreshCalls: number;
  authenticateResult?: AuthPluginResult;
  refreshResult?: AuthPluginResult | null;
  hasRefresh?: boolean;
}

declare global {
  var __FAKE_PLUGIN: FakePluginState | undefined;
}

function state(): FakePluginState {
  globalThis.__FAKE_PLUGIN ??= {
    authenticateCalls: 0,
    refreshCalls: 0,
    hasRefresh: true,
  };
  return globalThis.__FAKE_PLUGIN;
}

const plugin: AuthPlugin = {
  async authenticate(_options: AuthPluginOptions): Promise<AuthPluginResult> {
    const s = state();
    s.authenticateCalls++;
    if (s.authenticateResult) return s.authenticateResult;
    return {
      method: 'cookie',
      credentials: {
        cookies: `SAP_SESSIONID=fake-${s.authenticateCalls}`,
        expiresAt: new Date(Date.now() + 3_600_000),
      },
    };
  },
};

// Attach `refresh` via a getter so its presence follows the test flag.
Object.defineProperty(plugin, 'refresh', {
  configurable: true,
  get() {
    const s = state();
    if (!s.hasRefresh) return undefined;
    return async (_session: AuthSession): Promise<AuthPluginResult | null> => {
      s.refreshCalls++;
      if (s.refreshResult !== undefined) return s.refreshResult;
      return {
        method: 'cookie',
        credentials: {
          cookies: `SAP_SESSIONID=refreshed-${s.refreshCalls}`,
          expiresAt: new Date(Date.now() + 3_600_000),
        },
      };
    };
  },
});

export default plugin;
