// Standalone auth utilities for ADT CLI
// Based on @abapify/btp-service-key-parser

export interface UAACredentials {
  tenantmode: string;
  sburl: string;
  subaccountid: string;
  'credential-type': string;
  clientid: string;
  xsappname: string;
  clientsecret: string;
  serviceInstanceId: string;
  url: string;
  uaadomain: string;
  verificationkey: string;
  apiurl: string;
  identityzone: string;
  identityzoneid: string;
  tenantid: string;
  zoneid: string;
}

export interface Catalog {
  path: string;
  type: string;
}

export interface Binding {
  env: string;
  version: string;
  type: string;
  id: string;
}

export interface BTPServiceKey {
  uaa: UAACredentials;
  url: string;
  'sap.cloud.service': string;
  systemid: string;
  endpoints: Record<string, string>;
  catalogs: Record<string, Catalog>;
  binding: Binding;
  preserve_host_header: boolean;
}

export interface OAuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token?: string;
  expires_at: Date;
}

export class ServiceKeyParser {
  static parse(serviceKeyJson: string | object): BTPServiceKey {
    let parsed: unknown;

    if (typeof serviceKeyJson === 'string') {
      try {
        parsed = JSON.parse(serviceKeyJson);
      } catch (error) {
        throw new Error('Invalid JSON format in service key', { cause: error });
      }
    } else {
      parsed = serviceKeyJson;
    }

    // Basic validation
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid service key format');
    }

    const serviceKey = parsed as any;

    if (!serviceKey.uaa || !serviceKey.url || !serviceKey.systemid) {
      throw new Error('Missing required fields in service key');
    }

    return serviceKey as BTPServiceKey;
  }
}
