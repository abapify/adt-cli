import { HTTP_RUNTIME_DECL_ABAP, HTTP_RUNTIME_IMPL_ABAP } from './http.abap.js';
import { URL_RUNTIME_DECL_ABAP, URL_RUNTIME_IMPL_ABAP } from './url.abap.js';
import { JSON_RUNTIME_DECL_ABAP, JSON_RUNTIME_IMPL_ABAP } from './json.abap.js';

export interface CloudRuntime {
  /** ABAP lines for the generated class' PRIVATE SECTION. */
  declarations: string;
  /** ABAP METHOD ... ENDMETHOD blocks for the CLASS ... IMPLEMENTATION block. */
  implementations: string;
  /**
   * Whitelist proof: the set of system classes/interfaces the emitted
   * runtime is permitted to reference. Tests cross-check that the actual
   * ABAP only mentions identifiers from this set.
   */
  allowedClassReferences: readonly string[];
}

const ALLOWED: readonly string[] = [
  'cl_web_http_client_manager',
  'cl_http_destination_provider',
  'if_web_http_client',
  'if_web_http_request',
  'if_web_http_response',
  'cl_http_utility',
  'cl_system_uuid',
  'cl_abap_char_utilities',
  'cl_abap_conv_codepage',
  'cl_abap_codepage',
  'cl_abap_conv_out_ce',
  'cl_abap_conv_in_ce',
] as const;

/**
 * Get the reusable ABAP runtime snippets for the `s4-cloud` target profile.
 *
 * The operation emitter (Wave 3) drops `declarations` into the PRIVATE
 * SECTION of the generated class and `implementations` into the
 * IMPLEMENTATION block. Ordering (HTTP → URL → JSON) is stable so golden
 * snapshots of generated classes don't churn.
 */
export function getCloudRuntime(): CloudRuntime {
  const declarations = [
    HTTP_RUNTIME_DECL_ABAP,
    URL_RUNTIME_DECL_ABAP,
    JSON_RUNTIME_DECL_ABAP,
  ].join('\n');

  const implementations = [
    HTTP_RUNTIME_IMPL_ABAP,
    URL_RUNTIME_IMPL_ABAP,
    JSON_RUNTIME_IMPL_ABAP,
  ].join('\n');

  return {
    declarations,
    implementations,
    allowedClassReferences: ALLOWED,
  };
}
