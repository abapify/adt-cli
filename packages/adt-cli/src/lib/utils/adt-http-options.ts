const HEADERS_TIMEOUT_ENV = 'ADT_HEADERS_TIMEOUT_MS';

export function resolveAdtHeadersTimeoutMs(
  env: Readonly<Record<string, string | undefined>> = process.env,
): number | undefined {
  const raw = env[HEADERS_TIMEOUT_ENV];
  if (raw === undefined || raw === '') return undefined;
  if (!/^\d+$/.test(raw)) {
    throw new RangeError(`${HEADERS_TIMEOUT_ENV} must be a positive integer`);
  }

  const timeoutMs = Number(raw);
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    throw new RangeError(`${HEADERS_TIMEOUT_ENV} must be a positive integer`);
  }
  return timeoutMs;
}
