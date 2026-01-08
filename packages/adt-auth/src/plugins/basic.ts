/**
 * Built-in Basic Auth Plugin
 *
 * Simple username/password authentication
 * No external dependencies
 */

import type { AuthPlugin, AuthPluginOptions, BasicAuthResult } from '../types';

export interface BasicAuthOptions extends AuthPluginOptions {
  username: string;
  password: string;
}

/**
 * Basic auth plugin - uses provided credentials
 */
const authPlugin: AuthPlugin = {
  async authenticate(options: BasicAuthOptions): Promise<BasicAuthResult> {
    const { username, password } = options;

    if (!username || !password) {
      throw new Error('Basic auth requires username and password');
    }

    return {
      method: 'basic',
      credentials: {
        username,
        password,
      },
    };
  },
};

export default authPlugin;
