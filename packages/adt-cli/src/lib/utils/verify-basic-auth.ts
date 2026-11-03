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

/** AdtError instances expose `status`; it is exported type-only, so duck-type. */
function errorStatus(error: unknown): number | undefined {
  if (
    error instanceof Error &&
    typeof (error as { status?: unknown }).status === 'number'
  ) {
    return (error as { status: number }).status;
  }
  return undefined;
}

/**
 * Verify basic-auth credentials against the SAP system.
 *
 * Throws {@link BasicAuthVerificationError} when SAP rejects the
 * credentials (401), answers with another HTTP error, or is unreachable.
 * Resolves when the sessions endpoint accepts the credentials.
 */
export async function verifyBasicAuth(
  input: VerifyBasicAuthInput,
): Promise<void> {
  const adtClient = createAdtClient({
    baseUrl: input.url,
    username: input.username,
    password: input.password,
    client: input.client,
  });

  try {
    await adtClient.fetch(SESSIONS_PATH, {
      headers: { Accept: 'application/xml' },
    });
  } catch (error) {
    const status = errorStatus(error);

    if (status === 401) {
      throw new BasicAuthVerificationError(
        'SAP rejected the credentials (HTTP 401). Check the username, password and client — ' +
          'and note that systems configured for SNC/SSO-only logon (or proxies that strip ' +
          'Authorization headers) reject basic auth regardless of correct credentials.',
        { status },
      );
    }

    if (status !== undefined) {
      throw new BasicAuthVerificationError(
        `Credential verification failed: HTTP ${status} from ${input.url}${SESSIONS_PATH}`,
        { status, cause: error },
      );
    }

    throw new BasicAuthVerificationError(
      `Could not reach ${input.url} to verify credentials. Check the URL, network and VPN.`,
      { cause: error },
    );
  }
}
