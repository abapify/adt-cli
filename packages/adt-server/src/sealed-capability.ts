import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

export function assertSecret(value: string | undefined, name: string): string {
  const secret = value?.trim();
  if (!secret) {
    throw new Error(
      `${name} secret is required and must be a stable, deployment-shared value.`,
    );
  }
  return secret;
}

type SealedCapabilityPayload = {
  v: 1;
  d: string;
  u: string;
  e: number;
};

export interface SealedCapabilityServiceOptions {
  /** A production deployment shares this secret across all replicas. */
  secret: string;
  now?: () => number;
  ttlMs?: number;
  maxTtlMs: number;
  maxCapabilityLength: number;
  namespace: string;
  version: string;
  validateUri: (value: string) => boolean;
  createError: () => Error;
}

export const REST_CAPABILITY_DEFAULT_TTL_MS = 5 * 60_000;
export const REST_CAPABILITY_DEFAULT_MAX_LENGTH = 8 * 1_024;

function isBase64UrlSafe(value: string): boolean {
  return /^[A-Za-z0-9_-]+$/u.test(value);
}

function throwInvalidTtl(maxTtlMs: number): never {
  throw new Error(`Capability TTL must be between 1ms and ${maxTtlMs}ms.`);
}

function isValidCapability(
  payload: SealedCapabilityPayload | undefined,
  destination: string,
  now: number,
): payload is SealedCapabilityPayload {
  if (!payload) return false;
  if (payload.d !== destination) return false;
  if (payload.e <= now) return false;
  return true;
}

export interface RestSealedCapabilityServiceOptions extends Omit<
  SealedCapabilityServiceOptions,
  'maxTtlMs' | 'maxCapabilityLength' | 'version'
> {
  maxTtlMs?: number;
  maxCapabilityLength?: number;
  version?: string;
}

export function createRestSealedCapabilityService(
  options: RestSealedCapabilityServiceOptions,
) {
  return createSealedCapabilityService({
    ...options,
    maxTtlMs: options.maxTtlMs ?? REST_CAPABILITY_DEFAULT_TTL_MS,
    maxCapabilityLength:
      options.maxCapabilityLength ?? REST_CAPABILITY_DEFAULT_MAX_LENGTH,
    version: options.version ?? 'v1',
  });
}

export function createSealedCapabilityService(
  options: SealedCapabilityServiceOptions,
) {
  const secret = assertSecret(options.secret, options.namespace);
  const now = options.now ?? Date.now;
  const ttlMs = options.ttlMs ?? options.maxTtlMs;
  if (!Number.isSafeInteger(ttlMs)) throwInvalidTtl(options.maxTtlMs);
  if (ttlMs < 1 || ttlMs > options.maxTtlMs) throwInvalidTtl(options.maxTtlMs);
  const key = createHash('sha256').update(secret).digest();

  function isSealedCapabilityPayload(
    parsed: Record<string, unknown>,
  ): parsed is Record<string, unknown> & SealedCapabilityPayload {
    if (parsed.v !== 1) return false;
    if (typeof parsed.d !== 'string') return false;
    if (typeof parsed.u !== 'string') return false;
    if (!Number.isSafeInteger(parsed.e)) return false;
    return parsed.d.length > 0 && options.validateUri(parsed.u);
  }

  function parsePayload(value: string): SealedCapabilityPayload | undefined {
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      return undefined;
    }
    if (!parsed || typeof parsed !== 'object') return undefined;
    const record = parsed as Record<string, unknown>;
    if (!isSealedCapabilityPayload(record)) return undefined;
    return record;
  }

  function parseCapabilityParts(capability: string):
    | {
        namespace: string;
        version: string;
        encodedIv: string;
        encodedCiphertext: string;
      }
    | undefined {
    const [namespace, version, encodedIv, encodedCiphertext, extra] =
      capability.split('.');
    if (namespace !== options.namespace) return undefined;
    if (version !== options.version) return undefined;
    if (!encodedIv) return undefined;
    if (!encodedCiphertext) return undefined;
    if (extra !== undefined) return undefined;
    if (!isBase64UrlSafe(encodedIv)) return undefined;
    if (!isBase64UrlSafe(encodedCiphertext)) return undefined;
    return { namespace, version, encodedIv, encodedCiphertext };
  }

  function decryptCiphertext(
    encodedIv: string,
    encodedCiphertext: string,
  ): string | undefined {
    try {
      const initializationVector = Buffer.from(encodedIv, 'base64url');
      const encrypted = Buffer.from(encodedCiphertext, 'base64url');
      if (initializationVector.length !== 12) return undefined;
      if (encrypted.length <= 16) return undefined;
      const decipher = createDecipheriv(
        'aes-256-gcm',
        key,
        initializationVector,
        { authTagLength: 16 },
      );
      decipher.setAuthTag(encrypted.subarray(-16));
      const plaintext = Buffer.concat([
        decipher.update(encrypted.subarray(0, -16)),
        decipher.final(),
      ]);
      return plaintext.toString('utf8');
    } catch {
      return undefined;
    }
  }

  function unseal(capability: string): SealedCapabilityPayload | undefined {
    const parts = parseCapabilityParts(capability);
    if (!parts) return undefined;
    const plaintext = decryptCiphertext(
      parts.encodedIv,
      parts.encodedCiphertext,
    );
    if (!plaintext) return undefined;
    return parsePayload(plaintext);
  }

  return {
    issue(destination: string, uri: string): string {
      if (!destination || !options.validateUri(uri)) {
        throw options.createError();
      }
      const initializationVector = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, initializationVector);
      const ciphertext = Buffer.concat([
        cipher.update(
          JSON.stringify({
            v: 1,
            d: destination,
            u: uri,
            e: now() + ttlMs,
          } satisfies SealedCapabilityPayload),
          'utf8',
        ),
        cipher.final(),
        cipher.getAuthTag(),
      ]);
      const capability = `${options.namespace}.${options.version}.${initializationVector.toString('base64url')}.${ciphertext.toString('base64url')}`;
      if (capability.length > options.maxCapabilityLength) {
        throw options.createError();
      }
      return capability;
    },
    resolve(capability: string, destination: string): string {
      const payload = unseal(capability);
      if (!isValidCapability(payload, destination, now())) {
        throw options.createError();
      }
      return payload.u;
    },
  };
}
