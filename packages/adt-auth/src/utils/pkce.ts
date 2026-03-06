import { createHash, randomBytes } from 'crypto';

/**
 * Generates a cryptographically secure code verifier for PKCE flow
 */
export function generateCodeVerifier(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Generates a code challenge from the verifier using SHA256
 */
export function generateCodeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

/**
 * Generates a random state parameter for OAuth flow
 */
export function generateState(): string {
  return randomBytes(16).toString('hex');
}
