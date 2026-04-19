export { getCloudRuntime } from './s4-cloud/index.js';
export type { CloudRuntime } from './s4-cloud/index.js';

/**
 * Placeholder for the on-prem classic (cl_http_client / /ui2/cl_json) runtime.
 * Intentionally unimplemented in v1; only s4-cloud is supported.
 */
export function getClassicRuntime(): never {
  throw new Error(
    'getClassicRuntime: not implemented in v1; only s4-cloud is supported',
  );
}

/**
 * Placeholder for the on-prem modern (if_web_http_client + /ui2/cl_json) runtime.
 * Intentionally unimplemented in v1; only s4-cloud is supported.
 */
export function getModernRuntime(): never {
  throw new Error(
    'getModernRuntime: not implemented in v1; only s4-cloud is supported',
  );
}
