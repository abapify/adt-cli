import type { TargetProfile } from './types';

// TODO: flesh out S/4 on-prem modern emitter details (Wave ≥2).
export const s4OnPremModernProfile: TargetProfile = {
  id: 's4-onprem-modern',
  description:
    'TODO: S/4HANA on-prem modern — uses if_web_http_client with destination provider, plus /ui2/cl_json for JSON.',
  http: {
    kind: 'if_web_http_client',
    factoryClass: 'cl_web_http_client_manager',
    destinationProviderClass: 'cl_http_destination_provider',
  },
  json: {
    kind: 'ui2_cl_json',
    helperClass: '/ui2/cl_json',
  },
  allowedClasses: new Set<string>([
    'cl_web_http_client_manager',
    'cl_http_destination_provider',
    'if_web_http_client',
    'if_web_http_request',
    'if_web_http_response',
    'cl_http_utility',
    'cl_system_uuid',
    '/ui2/cl_json',
  ]),
};
