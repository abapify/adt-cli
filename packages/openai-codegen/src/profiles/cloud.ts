import type { TargetProfile } from './types';

export const s4CloudProfile: TargetProfile = {
  id: 's4-cloud',
  description:
    'SAP S/4HANA Cloud (Steampunk) — uses if_web_http_client with destination provider and /ui2/cl_json (released for ABAP for Cloud Development per SAP Note 2931335).',
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
    'cl_web_http_utility',
    'cl_system_uuid',
    'cl_abap_char_utilities',
    'cl_abap_conv_codepage',
    'cl_abap_codepage',
    'cl_abap_conv_out_ce',
    'cl_abap_conv_in_ce',
    'cl_abap_typedescr',
    '/ui2/cl_json',
  ]),
};
