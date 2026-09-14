/**
 * Test-only TLS material for HTTPS test servers.
 *
 * Generates a short-lived self-signed certificate (CN=localhost, SAN covering
 * 127.0.0.1 and localhost) by shelling out to `openssl`. The result is cached
 * per process so importing suites share a single key pair.
 *
 * `openssl` is resolved from a fixed list of system locations (or the
 * `ADT_OPENSSL_BIN` override) rather than searched on PATH — a writable PATH
 * entry could otherwise shadow the binary (SonarCloud S4036).
 */
import { execFileSync } from 'node:child_process';
import {
  accessSync,
  constants,
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';

export interface TestTlsMaterial {
  /** PEM-encoded self-signed certificate (also usable as the trusted CA). */
  cert: string;
  /** PEM-encoded private key. */
  key: string;
}

const OPENSSL_CANDIDATES = [
  '/usr/bin/openssl',
  '/usr/local/bin/openssl',
  '/opt/homebrew/bin/openssl',
  '/bin/openssl',
  'C:\\Program Files\\OpenSSL-Win64\\bin\\openssl.exe',
  'C:\\Program Files\\Git\\usr\\bin\\openssl.exe',
];

function isExecutable(path: string): boolean {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function resolveOpenssl(): string {
  const override = process.env.ADT_OPENSSL_BIN;
  const candidates = override
    ? [override, ...OPENSSL_CANDIDATES]
    : OPENSSL_CANDIDATES;
  for (const candidate of candidates) {
    if (isExecutable(candidate)) return candidate;
  }
  // Fall back to a PATH scan (e.g. Nix profiles). The resolved absolute
  // path — never a bare command name — is passed to execFileSync.
  const pathExt = process.platform === 'win32' ? ['.exe'] : [''];
  for (const dir of (process.env.PATH ?? '').split(delimiter)) {
    if (!dir) continue;
    for (const ext of pathExt) {
      const candidate = join(dir, `openssl${ext}`);
      if (isExecutable(candidate)) return candidate;
    }
  }
  throw new Error(
    'getTestTlsMaterial: openssl executable not found. Install openssl ' +
      'or point ADT_OPENSSL_BIN at the binary.',
  );
}

let cached: TestTlsMaterial | undefined;

/**
 * Returns a cached self-signed cert/key pair for test HTTPS listeners.
 * Requires `openssl` — available on all CI runners and most dev machines.
 */
export function getTestTlsMaterial(): TestTlsMaterial {
  if (cached) return cached;
  const openssl = resolveOpenssl();
  const directory = mkdtempSync(join(tmpdir(), 'adt-tls-'));
  const keyPath = join(directory, 'key.pem');
  const certPath = join(directory, 'cert.pem');
  try {
    execFileSync(
      openssl,
      [
        'req',
        '-x509',
        '-newkey',
        'ec',
        '-pkeyopt',
        'ec_paramgen_curve:prime256v1',
        '-keyout',
        keyPath,
        '-out',
        certPath,
        '-days',
        '1',
        '-nodes',
        '-subj',
        '/CN=localhost',
        '-addext',
        'subjectAltName=IP:127.0.0.1,DNS:localhost',
      ],
      { stdio: 'ignore' },
    );
    cached = {
      cert: readFileSync(certPath, 'utf8'),
      key: readFileSync(keyPath, 'utf8'),
    };
    return cached;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
