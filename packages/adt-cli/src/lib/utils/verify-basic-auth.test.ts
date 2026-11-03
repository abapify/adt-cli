import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  BasicAuthVerificationError,
  verifyBasicAuth,
} from './verify-basic-auth';

const VALID_PASSWORD = 'secretP@ss!';
let server: http.Server;
let baseUrl: string;

type Responder = (req: http.IncomingMessage, res: http.ServerResponse) => void;

let respond: Responder = (_req, res) => {
  res.writeHead(200, { 'content-type': 'application/xml' });
  res.end('<sessions/>');
};

beforeAll(async () => {
  server = http.createServer((req, res) => {
    respond(req, res);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('verifyBasicAuth', () => {
  it('resolves and sends the correct Basic header and sap-client on 200', async () => {
    let seenAuth: string | undefined;
    let seenUrl: string | undefined;
    respond = (req, res) => {
      seenAuth = req.headers.authorization;
      seenUrl = req.url;
      res.writeHead(200, { 'content-type': 'application/xml' });
      res.end('<sessions/>');
    };

    await expect(
      verifyBasicAuth({
        url: baseUrl,
        client: '100',
        username: 'sapuser1',
        password: VALID_PASSWORD,
      }),
    ).resolves.toBeUndefined();

    expect(seenAuth).toBe(
      `Basic ${Buffer.from(`sapuser1:${VALID_PASSWORD}`).toString('base64')}`,
    );
    expect(seenUrl).toContain('/sap/bc/adt/core/http/sessions');
    expect(seenUrl).toContain('sap-client=100');
  });

  it('throws a 401 verification error when SAP rejects the credentials', async () => {
    respond = (_req, res) => {
      res.writeHead(401, { 'content-type': 'text/plain' });
      res.end('Unauthorized');
    };

    const error = await verifyBasicAuth({
      url: baseUrl,
      username: 'sapuser1',
      password: 'wrong',
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BasicAuthVerificationError);
    const verificationError = error as BasicAuthVerificationError;
    expect(verificationError.status).toBe(401);
    expect(verificationError.message).toContain('401');
    expect(verificationError.message).toContain('username');
  });

  it('throws a verification error (with status) on unexpected HTTP errors', async () => {
    respond = (_req, res) => {
      res.writeHead(503, { 'content-type': 'text/plain' });
      res.end('Service Unavailable');
    };

    const error = await verifyBasicAuth({
      url: baseUrl,
      username: 'sapuser1',
      password: VALID_PASSWORD,
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BasicAuthVerificationError);
    const verificationError = error as BasicAuthVerificationError;
    expect(verificationError.status).toBe(503);
    expect(verificationError.message).toContain('503');
  });

  it('wraps network failures with the underlying cause', async () => {
    const error = await verifyBasicAuth({
      url: 'http://127.0.0.1:1', // nothing listens here
      username: 'sapuser1',
      password: VALID_PASSWORD,
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BasicAuthVerificationError);
    const verificationError = error as BasicAuthVerificationError;
    expect(verificationError.status).toBeUndefined();
    expect(verificationError.cause).toBeDefined();
    expect(verificationError.message).toMatch(/reach|connect/i);
  });
});
