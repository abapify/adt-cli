export type TargetProfileId =
  | 'on-prem-classic'
  | 's4-onprem-modern'
  | 's4-cloud';

export interface HttpClientStrategy {
  kind: 'if_http_client' | 'if_web_http_client';
  factoryClass: string;
  destinationProviderClass?: string;
}

export interface JsonStrategy {
  kind: 'ui2_cl_json' | 'inline';
  helperClass?: string;
}

export interface TargetProfile {
  id: TargetProfileId;
  description: string;
  http: HttpClientStrategy;
  json: JsonStrategy;
  /** Whitelist of system classes/interfaces the emitter may reference.
   *  Uppercase, no leading 'if_'/'cl_' stripping. Tested case-insensitively. */
  allowedClasses: ReadonlySet<string>;
}
