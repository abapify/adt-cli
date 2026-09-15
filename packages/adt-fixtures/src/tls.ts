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
import tls from 'node:tls';
import {
  accessSync,
  constants,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
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
  'C:/Program Files/OpenSSL-Win64/bin/openssl.exe',
  'C:/Program Files/Git/usr/bin/openssl.exe',
];

function isExecutable(path: string): boolean {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Directory is not writable by group/other and is owned by the effective
 * user or root — nobody else can plant a shadowing openssl there.
 */
function isTrustedDir(dir: string): boolean {
  try {
    const st = statSync(dir);
    if ((st.mode & 0o022) !== 0) return false;
    const uid = process.getuid?.();
    return uid === undefined || st.uid === uid || st.uid === 0;
  } catch {
    return false;
  }
}

function* opensslCandidates(): Generator<string> {
  const override = process.env.ADT_OPENSSL_BIN;
  if (override) yield override;
  yield* OPENSSL_CANDIDATES;
  // PATH scan covers non-standard installs (e.g. Nix profiles). Directories
  // writable by group/other are skipped — another user could otherwise plant
  // a shadowing openssl there (SonarCloud S4036).
  const ext = process.platform === 'win32' ? '.exe' : '';
  for (const dir of (process.env.PATH ?? '').split(delimiter)) {
    if (dir && isTrustedDir(dir)) yield join(dir, `openssl${ext}`);
  }
}

function resolveOpenssl(): string {
  for (const candidate of opensslCandidates()) {
    if (isExecutable(candidate)) return candidate;
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

const isBun = (globalThis as { Bun?: unknown }).Bun !== undefined;

/**
 * Appends the test certificate to Node's *active* default CA list so
 * `fetch`/`https` verify the test listener — verification stays enabled and
 * system / `NODE_EXTRA_CA_CERTS` roots are preserved. Idempotent.
 *
 * No-op under Bun: its `fetch` does not consult the Node CA store — pass the
 * cert via the per-request `tls.ca` option instead.
 */
export function trustTestCa(cert: string): void {
  if (isBun) return;
  if (typeof tls.setDefaultCACertificates !== 'function') {
    throw new Error(
      'trustTestCa requires Node >= 22.19 / >= 24.5 ' +
        '(tls.setDefaultCACertificates) or Bun',
    );
  }
  const current = tls.getCACertificates('default');
  if (!current.includes(cert)) {
    tls.setDefaultCACertificates([...current, cert]);
  }
}
