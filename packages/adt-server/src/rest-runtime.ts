import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createRestPageCursorService } from './page-cursors.js';
import { loadOptionalRestBearerAuthorizer } from './rest-auth.js';
import { createRestAtcDocumentationCapabilityService } from './atc-documentation-capabilities.js';
import { createRestSourceCapabilityService } from './source-capabilities.js';
import type { AdtServerOptions } from './server.js';

export interface RestRuntimeSecurityOptions {
  tokenFile?: string;
  sourceSecretFile?: string;
  pageCursorSecretFile?: string;
}

export type RestRuntimeSecurity = Pick<
  AdtServerOptions,
  | 'restAuthorizer'
  | 'sourceCapabilities'
  | 'atcDocumentationCapabilities'
  | 'pageCursors'
>;

async function readOptionalMountedSecret(
  secretFile: string | undefined,
): Promise<string | undefined> {
  if (!secretFile) return undefined;
  const resolved = path.resolve(secretFile);
  const secret = (await readFile(resolved, 'utf8')).trim();
  return secret || undefined;
}

/**
 * REST remains disabled without a bearer secret. Once it is explicitly
 * enabled, its signed state must come from two independent mounted files so
 * source capabilities and page cursors survive a replica or process restart.
 */
export async function loadRestRuntimeSecurity(
  options: RestRuntimeSecurityOptions,
): Promise<RestRuntimeSecurity> {
  const restAuthorizer = await loadOptionalRestBearerAuthorizer(
    options.tokenFile,
  );
  if (!restAuthorizer) {
    return {
      restAuthorizer: undefined,
      sourceCapabilities: undefined,
      atcDocumentationCapabilities: undefined,
      pageCursors: undefined,
    };
  }
  const [sourceSecret, pageCursorSecret] = await Promise.all([
    readOptionalMountedSecret(options.sourceSecretFile),
    readOptionalMountedSecret(options.pageCursorSecretFile),
  ]);
  if (!sourceSecret || !pageCursorSecret) {
    throw new Error(
      'REST state secret files are required when REST bearer authentication is enabled.',
    );
  }
  return {
    restAuthorizer,
    sourceCapabilities: createRestSourceCapabilityService({
      secret: sourceSecret,
    }),
    atcDocumentationCapabilities: createRestAtcDocumentationCapabilityService({
      secret: sourceSecret,
    }),
    pageCursors: createRestPageCursorService({ secret: pageCursorSecret }),
  };
}
