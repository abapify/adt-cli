/**
 * HTTP transport for the adt-mcp server.
 *
 * Implements the Streamable HTTP pattern recommended by the MCP SDK:
 *
 *   - POST /mcp with `initialize` and no `Mcp-Session-Id` header
 *       → spin up a new McpServer + StreamableHTTPServerTransport pair,
 *         register them under the generated session id.
 *   - Subsequent POST /mcp / GET /mcp / DELETE /mcp with `Mcp-Session-Id`
 *       → route to the stored transport.
 *
 * A small middleware pipeline (`host validation → auth → route`) is kept
 * simple and composable so that future waves can drop in real auth.
 */

import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpServer } from '../server.js';
import { createSessionRegistry } from '../session/registry.js';
import type { SessionRegistry } from '../session/registry.js';
import {
  loadMultiSystemConfig,
  type MultiSystemConfig,
} from './multi-system.js';

export interface HttpServerOptions {
  /** Port to listen on. Default: `MCP_PORT` env or 3000. */
  port?: number;
  /** Host to bind to. Default: `MCP_HOST` env or `127.0.0.1`. */
  host?: string;
  /** Idle session TTL in ms. Default: 30 minutes. */
  ttlMs?: number;
  /**
   * Extra host names to accept in the `Host` header. The bound host is
   * always accepted; `localhost`, `127.0.0.1`, and `[::1]` are accepted
   * by default.
   */
  allowedHosts?: string[];
  /** Override the multi-system config loader (mainly for tests). */
  multiSystem?: MultiSystemConfig;
  /** Override the session registry (mainly for tests). */
  registry?: SessionRegistry;
  /** Inject a logger that writes to stderr by default. */
  log?: (level: 'info' | 'warn' | 'error', msg: string) => void;
}

export interface RunningHttpServer {
  readonly url: string;
  readonly port: number;
  readonly host: string;
  readonly registry: SessionRegistry;
  close(): Promise<void>;
}

type Middleware = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
) => Promise<boolean> | boolean;

function defaultLog(level: 'info' | 'warn' | 'error', msg: string): void {
  // Write to stderr to avoid polluting any stdout-based transport on the
  // same process.
  const line = `[adt-mcp-http] ${level}: ${msg}\n`;
  process.stderr.write(line);
}

function normaliseHostAllowlist(
  bindHost: string,
  extra?: string[],
): Set<string> {
  const set = new Set<string>(['localhost', '127.0.0.1', '[::1]', '::1']);
  if (bindHost) set.add(bindHost.toLowerCase());
  for (const h of extra ?? []) set.add(h.toLowerCase());
  return set;
}

/**
 * Host-header validation middleware — protects against DNS-rebinding
 * attacks when the server binds to a loopback interface. Returns `true`
 * when the request has been rejected (caller should stop processing).
 */
function makeHostValidator(allowed: Set<string>): Middleware {
  return (req, res) => {
    const hostHeader = req.headers.host ?? '';
    // Strip port.
    const host = hostHeader.replace(/:\d+$/u, '').toLowerCase();
    if (!host || !allowed.has(host)) {
      res.writeHead(421, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: `Host header '${hostHeader}' not allowed`,
          },
          id: null,
        }),
      );
      return true;
    }
    return false;
  };
}

/**
 * Identity auth middleware. A later wave will replace this with a real
 * implementation (e.g. static token or OAuth). Keeping it as a named slot
 * makes the pipeline easy to extend.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const noopAuth: Middleware = (_req, _res) => false;

async function readJsonBody(
  req: http.IncomingMessage,
  limitBytes = 4 * 1024 * 1024,
): Promise<unknown> {
  return await new Promise((resolve, reject) => {
    let total = 0;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > limitBytes) {
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve(undefined);
        return;
      }
      const raw = Buffer.concat(chunks).toString('utf8');
      try {
        resolve(raw.length === 0 ? undefined : JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function isInitializeRequest(body: unknown): boolean {
  if (!body) return false;
  const msgs = Array.isArray(body) ? body : [body];
  return msgs.some(
    (m) =>
      m &&
      typeof m === 'object' &&
      (m as { method?: unknown }).method === 'initialize',
  );
}

function writeJsonError(
  res: http.ServerResponse,
  status: number,
  message: string,
): void {
  if (res.headersSent) {
    try {
      res.end();
    } catch {
      // ignore
    }
    return;
  }
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32000, message },
      id: null,
    }),
  );
}

/**
 * Starts the HTTP transport and returns a handle that can be used to
 * close it (and all active sessions) gracefully.
 */
export async function startHttpServer(
  options: HttpServerOptions = {},
): Promise<RunningHttpServer> {
  const port =
    options.port ??
    (process.env.MCP_PORT ? Number(process.env.MCP_PORT) : 3000);
  const host = options.host ?? process.env.MCP_HOST ?? '127.0.0.1';
  const log = options.log ?? defaultLog;

  const registry =
    options.registry ??
    createSessionRegistry({ ttlMs: options.ttlMs ?? 30 * 60 * 1000 });
  const multiSystem = options.multiSystem ?? loadMultiSystemConfig();

  // One transport per MCP session, plus the paired McpServer that owns it.
  // The SDK expects `server.connect(transport)` to be called once per pair.
  const transports = new Map<string, StreamableHTTPServerTransport>();
  const servers = new Map<string, McpServer>();

  const hostAllow = normaliseHostAllowlist(host, options.allowedHosts);
  const pipeline: Middleware[] = [makeHostValidator(hostAllow), noopAuth];

  const handleMcp = async (
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ): Promise<void> => {
    const sessionHeader = req.headers['mcp-session-id'];
    const sessionId = Array.isArray(sessionHeader)
      ? sessionHeader[0]
      : sessionHeader;

    if (req.method === 'POST') {
      // Body must be parsed up-front to decide whether this is an
      // `initialize` request that should spawn a new transport.
      let body: unknown;
      try {
        body = await readJsonBody(req);
      } catch (err) {
        writeJsonError(
          res,
          400,
          `Invalid JSON body: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
        return;
      }

      if (sessionId && transports.has(sessionId)) {
        const transport = transports.get(sessionId)!;
        await transport.handleRequest(req, res, body);
        return;
      }

      if (!sessionId && isInitializeRequest(body)) {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (id) => {
            transports.set(id, transport);
            log('info', `session initialized: ${id}`);
          },
          onsessionclosed: async (id) => {
            log('info', `session closed by client: ${id}`);
            transports.delete(id);
            await registry.delete(id);
            const s = servers.get(id);
            servers.delete(id);
            try {
              await s?.close();
            } catch {
              // ignore
            }
          },
        });

        transport.onclose = () => {
          const id = transport.sessionId;
          if (!id) return;
          transports.delete(id);
          const s = servers.get(id);
          servers.delete(id);
          // Fire-and-forget — registry.delete swallows errors internally.
          void registry.delete(id);
          try {
            void s?.close();
          } catch {
            // ignore
          }
        };

        const mcp = createMcpServer({
          registry,
          resolveSystem: (id) => multiSystem.resolve(id),
        });
        await mcp.connect(transport);
        // Store under the generated session id as soon as it exists.
        // `onsessioninitialized` also stores it, but we want the mapping
        // available for any in-flight follow-up immediately.
        if (transport.sessionId) {
          transports.set(transport.sessionId, transport);
          servers.set(transport.sessionId, mcp);
        }
        await transport.handleRequest(req, res, body);
        if (transport.sessionId && !servers.has(transport.sessionId)) {
          servers.set(transport.sessionId, mcp);
        }
        return;
      }

      writeJsonError(
        res,
        400,
        sessionId
          ? `Unknown Mcp-Session-Id: ${sessionId}`
          : 'Missing Mcp-Session-Id header (non-initialize request)',
      );
      return;
    }

    if (req.method === 'GET' || req.method === 'DELETE') {
      if (!sessionId || !transports.has(sessionId)) {
        writeJsonError(res, 400, 'Missing or unknown Mcp-Session-Id header');
        return;
      }
      registry.touch(sessionId);
      const transport = transports.get(sessionId)!;
      await transport.handleRequest(req, res);
      return;
    }

    res.writeHead(405, { Allow: 'POST, GET, DELETE' });
    res.end();
  };

  const server = http.createServer(async (req, res) => {
    try {
      for (const mw of pipeline) {
        const handled = await mw(req, res);
        if (handled) return;
      }

      const url = req.url ?? '/';
      // Accept /mcp and /mcp/ — ignore query string.
      const pathOnly = url.split('?')[0];
      if (pathOnly === '/mcp' || pathOnly === '/mcp/') {
        await handleMcp(req, res);
        return;
      }
      if (pathOnly === '/healthz' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            status: 'ok',
            sessions: registry.list().length,
          }),
        );
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    } catch (err) {
      log(
        'error',
        `unhandled error: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`,
      );
      writeJsonError(res, 500, 'Internal server error');
    }
  });

  await new Promise<void>((resolve, reject) => {
    const onError = (err: Error) => reject(err);
    server.once('error', onError);
    server.listen(port, host, () => {
      server.removeListener('error', onError);
      resolve();
    });
  });

  const boundPort = (server.address() as { port: number } | null)?.port ?? port;
  log('info', `listening on http://${host}:${boundPort}/mcp`);

  let closed = false;
  const close = async (): Promise<void> => {
    if (closed) return;
    closed = true;
    log('info', 'shutting down');
    await registry.shutdown();
    // Close each outstanding transport + server pair.
    const pairs = Array.from(transports.entries());
    transports.clear();
    await Promise.allSettled(
      pairs.map(async ([, t]) => {
        try {
          await t.close();
        } catch {
          // ignore
        }
      }),
    );
    const srvs = Array.from(servers.values());
    servers.clear();
    await Promise.allSettled(
      srvs.map(async (s) => {
        try {
          await s.close();
        } catch {
          // ignore
        }
      }),
    );
    await new Promise<void>((resolve) => server.close(() => resolve()));
  };

  return {
    url: `http://${host}:${boundPort}/mcp`,
    port: boundPort,
    host,
    registry,
    close,
  };
}
