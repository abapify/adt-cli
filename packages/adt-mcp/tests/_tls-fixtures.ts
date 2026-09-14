import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export interface TestTlsMaterial {
  cert: string;
  key: string;
}

let cached: TestTlsMaterial | undefined;

export function getTestTlsMaterial(): TestTlsMaterial {
  if (cached) return cached;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  const directory = mkdtempSync(join(tmpdir(), 'adt-mcp-tls-'));
  const keyPath = join(directory, 'key.pem');
  const certPath = join(directory, 'cert.pem');
  try {
    execFileSync(
      'openssl',
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
