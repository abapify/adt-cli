import type { AuthPlugin, AuthPluginOptions, CookieAuthResult } from '../types';
import {
  ServiceKeyParser,
  type ServiceKeyPluginOptions,
} from '../types/service-key';

async function fetchOAuthToken(
  uaaUrl: string,
  clientId: string,
  clientSecret: string,
): Promise<{ access_token: string; expires_in: number }> {
  const tokenUrl = `${uaaUrl}/oauth/token`;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    'base64',
  );

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OAuth token request failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  if (!data.access_token) {
    throw new Error('OAuth token response missing access_token');
  }

  return data;
}

const authPlugin: AuthPlugin = {
  async authenticate(options: AuthPluginOptions): Promise<CookieAuthResult> {
    const { serviceKey } = options as ServiceKeyPluginOptions;

    if (!serviceKey) {
      throw new Error('service-key plugin requires a serviceKey option');
    }

    const parsed = ServiceKeyParser.parse(serviceKey);

    const { clientid, clientsecret, url: uaaUrl } = parsed.uaa;

    const { access_token, expires_in } = await fetchOAuthToken(
      uaaUrl,
      clientid,
      clientsecret,
    );

    const expiresAt = new Date(Date.now() + expires_in * 1000);

    return {
      method: 'cookie',
      credentials: {
        cookies: `Authorization: Bearer ${access_token}`,
        expiresAt,
      },
    };
  },
};

export default authPlugin;
