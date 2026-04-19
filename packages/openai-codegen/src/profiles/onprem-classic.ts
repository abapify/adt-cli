import type { TargetProfile } from './types';

// TODO: flesh out on-prem classic emitter details (Wave ≥2).
export const onPremClassicProfile: TargetProfile = {
  id: 'on-prem-classic',
  description:
    'TODO: Classic on-prem NetWeaver — uses if_http_client via cl_http_client and /ui2/cl_json for JSON.',
  http: {
    kind: 'if_http_client',
    factoryClass: 'cl_http_client',
  },
  json: {
    kind: 'ui2_cl_json',
    helperClass: '/ui2/cl_json',
  },
  allowedClasses: new Set<string>([
    'cl_http_client',
    'if_http_client',
    'cl_http_utility',
    'cl_system_uuid',
    '/ui2/cl_json',
  ]),
};
