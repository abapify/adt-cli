import { timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type http from 'node:http';

function tokensMatch(expected: string, actual: string): boolean {
  const expectedBytes = Buffer.from(expected, 'utf8');
  const actualBytes = Buffer.from(actual, 'utf8');
  return (
    expectedBytes.length === actualBytes.length &&
    timingSafeEqual(expectedBytes, actualBytes)
  );
}

/**
 * Local-development REST auth. Production mesh authentication is supplied at
 * the deployment boundary; a sidecar never falls back to its broker token.
 */
export function createRestBearerAuthorizer(token: string): {
  authorize(request: http.IncomingMessage): boolean;
} {
  const expected = token.trim();
  if (!expected) throw new Error('REST bearer token must not be empty');
  return {
    authorize(request) {
      const authorization = request.headers.authorization;
      if (!authorization?.startsWith('Bearer ')) return false;
      return tokensMatch(expected, authorization.slice('Bearer '.length));
    },
  };
}

/** An empty optional Compose secret keeps the REST surface fail-closed. */
export async function loadOptionalRestBearerAuthorizer(
  tokenFile: string | undefined,
): Promise<ReturnType<typeof createRestBearerAuthorizer> | undefined> {
  if (!tokenFile) return undefined;
  const baseDir = path.parse(process.cwd()).root;
  const resolved = path.resolve(baseDir, tokenFile);
  if (!resolved.startsWith(baseDir)) {
    throw new Error(
      'REST bearer token file path must not contain path traversal segments',
    );
  }
  const token = (await readFile(resolved, 'utf8')).trim();
  return token ? createRestBearerAuthorizer(token) : undefined;
}
