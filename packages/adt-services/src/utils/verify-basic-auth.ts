/**
 * Basic-auth credential verification for `adt auth login`
 *
 * The basic-auth plugin only packages credentials — it never contacts SAP.
 * Without verification, login reports success for wrong passwords, SNC-only
 * systems, locked accounts, or proxies that strip Authorization headers
 * (issue #289). This helper performs one real request against the ADT
 * sessions endpoint so login can fail fast with an actionable message.
 *
 * Service-level helper: no console I/O — callers own user-facing output.
 */

import { createAdtClient } from '@abapify/adt-client';

export interface VerifyBasicAuthInput {
  /** SAP system base URL (e.g., 'https://host:443') */
  url: string;
  /** SAP client (e.g., '100') */
  client?: string;
  username: string;
  password: string;
  /** Skip TLS certificate verification (mirrors `adt auth login --insecure`). */
  insecure?: boolean;
  /**
   * Bound for the verification request (connect + response headers).
   * Default {@link DEFAULT_VERIFY_TIMEOUT_MS}.
   */
  timeoutMs?: number;
}

/**
 * Error thrown when credential verification fails.
 *
 * `status` carries the HTTP status when SAP answered (undefined for
 * network-level failures). `cause` carries the underlying error.
 */
export class BasicAuthVerificationError extends Error {
  readonly status?: number;

  constructor(message: string, options?: { status?: number; cause?: unknown }) {
    super(
      message,
      options?.cause !== undefined ? { cause: options.cause } : undefined,
    );
    this.name = 'BasicAuthVerificationError';
    this.status = options?.status;
  }
}

/** Sessions endpoint used for the credential check. */
const SESSIONS_PATH = '/sap/bc/adt/core/http/sessions';

/** Default bound for the whole verification request. */
const DEFAULT_VERIFY_TIMEOUT_MS = 15_000;

/** AdtError instances expose `status`; it is exported type-only, so duck-type. */
function errorStatus(error: unknown): number | undefined {
  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : undefined;
}

/**
 * URL origin without userinfo, path, or query — safe for error messages.
 * Destination URLs may embed credentials or secret query parameters; only
 * the origin is ever surfaced.
 */
function safeOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return 'the configured URL';
  }
}

/** Undici transport timeouts surface as coded errors (UND_ERR_*_TIMEOUT). */
function isTimeoutError(error: unknown): boolean {
  const coded = error as { code?: unknown } | null;
  return (
    (typeof coded?.code === 'string' && /TIMEOUT/i.test(coded.code)) ||
    (error instanceof Error && /timeout/i.test(error.name))
  );
}

function causeText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Verify basic-auth credentials against the SAP system.
 *
 * Throws {@link BasicAuthVerificationError} when SAP rejects the
 * credentials (401), answers with another HTTP error, redirects to an
 * SSO/SAML login page, or is unreachable. Resolves when the sessions
 * endpoint accepts the credentials.
 */
export async function verifyBasicAuth(
  input: VerifyBasicAuthInput,
): Promise<void> {
  const timeoutMs = input.timeoutMs ?? DEFAULT_VERIFY_TIMEOUT_MS;
  const adtClient = createAdtClient({
    baseUrl: input.url,
    username: input.username,
    password: input.password,
    client: input.client,
    insecure: input.insecure,
    headersTimeoutMs: timeoutMs,
    connectTimeoutMs: timeoutMs,
  });

  try {
    const data = await adtClient.fetch(SESSIONS_PATH, {
      headers: { Accept: 'application/xml' },
    });
    // The adapter throws for non-2xx, but an SSO/SAML system can answer a
    // basic-auth probe with a 200 HTML login page — that is not a sessions
    // response, so the credentials were not actually accepted.
    if (typeof data === 'string' && /<html[\s>]|SAMLRequest/i.test(data)) {
      throw new BasicAuthVerificationError(
        `${safeOrigin(input.url)} answered with an HTML login page instead of an ADT sessions response. ` +
          'The system likely requires SSO/SAML (or SNC) logon and does not accept basic-auth credentials.',
      );
    }
  } catch (error) {
    if (error instanceof BasicAuthVerificationError) {
      throw error;
    }
    const status = errorStatus(error);
    const origin = safeOrigin(input.url);
    const cause = causeText(error);

    if (status === 401) {
      throw new BasicAuthVerificationError(
        'SAP rejected the credentials (HTTP 401). Check the username, password and client — ' +
          'and note that systems configured for SNC/SSO-only logon (or proxies that strip ' +
          'Authorization headers) reject basic auth regardless of correct credentials.',
        { status, cause: error },
      );
    }

    if (status !== undefined) {
      throw new BasicAuthVerificationError(
        `Credential verification failed: HTTP ${status} from ${origin}${SESSIONS_PATH}. Cause: ${cause}`,
        { status, cause: error },
      );
    }

    // The adapter reports a SAML/SSO login page as a generic session-expired
    // error — that is an auth-mode mismatch, not a connectivity problem.
    if (/saml|session expired/i.test(cause)) {
      throw new BasicAuthVerificationError(
        `${origin} redirected to an SSO/SAML login during credential verification. ` +
          'This system likely does not accept basic-auth logins.',
        { cause: error },
      );
    }

    if (isTimeoutError(error)) {
      throw new BasicAuthVerificationError(
        `Credential verification timed out after ${timeoutMs} ms contacting ${origin}. ` +
          'Check the URL, network and VPN.',
        { cause: error },
      );
    }

    throw new BasicAuthVerificationError(
      `Could not reach ${origin} to verify credentials. Check the URL, network and VPN. Cause: ${cause}`,
      { cause: error },
    );
  }
}
