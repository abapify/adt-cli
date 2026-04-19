/**
 * Mock ADT HTTP server — shared by MCP and CLI e2e tests.
 *
 * Fixtures are sourced from `@abapify/adt-fixtures` (no inline strings).
 * Routes are declared in `./routes.ts`. Lock/unlock state is tracked in
 * `./lock-registry.ts`. CSRF handling lives in `./csrf.ts`.
 *
 * Usage:
 *   const mock = createMockAdtServer();
 *   const { port } = await mock.start();
 *   // ... run tests against http://localhost:${port}
 *   await mock.stop();
 */

import {
  createServer,
  type Server,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import { loadRouteFixtures, matchRoute } from './routes';
import { LockRegistry } from './lock-registry';
import { applyCsrfHeaders, createCsrfState, type CsrfOptions } from './csrf';

export type MockAdtServerOptions = CsrfOptions;

export interface MockAdtServer {
  start(): Promise<{ port: number }>;
  stop(): Promise<void>;
  /** Access the lock registry (for test assertions). */
  readonly locks: LockRegistry;
}

export function createMockAdtServer(
  options: MockAdtServerOptions = {},
): MockAdtServer {
  let server: Server | undefined;
  const locks = new LockRegistry();
  const csrf = createCsrfState({ strictSession: options.strictSession });

  return {
    locks,
    async start() {
      const fixtures = await loadRouteFixtures();

      return new Promise<{ port: number }>((resolve, reject) => {
        server = createServer((req: IncomingMessage, res: ServerResponse) => {
          const method = req.method ?? 'GET';
          const url = req.url ?? '/';

          const csrfHeaders = applyCsrfHeaders(csrf, {
            method,
            url,
            headers: req.headers as Record<
              string,
              string | string[] | undefined
            >,
          });

          const route = matchRoute(
            method,
            url,
            fixtures,
            locks,
            csrf.sessionId,
          );
          if (route) {
            res.writeHead(route.status, {
              'Content-Type': route.contentType,
              ...csrfHeaders,
              ...(route.headers ?? {}),
            });
            res.end(route.body);
            return;
          }

          res.writeHead(404, {
            'Content-Type': 'text/plain',
            ...csrfHeaders,
          });
          res.end('Not Found');
        });

        server.listen(0, '127.0.0.1', () => {
          const addr = server?.address();
          if (!addr || typeof addr !== 'object') {
            reject(new Error('Failed to get server address'));
            return;
          }
          resolve({ port: addr.port });
        });

        server.on('error', reject);
      });
    },

    async stop() {
      locks.clear();
      return new Promise<void>((resolve, reject) => {
        if (!server) return resolve();
        server.close((err) => (err ? reject(err) : resolve()));
      });
    },
  };
}

// Re-exports for users that want to extend the mock.
export { LockRegistry } from './lock-registry';
export type { LockEntry } from './lock-registry';
export { matchRoute, loadRouteFixtures } from './routes';
export type { RouteResult, LoadedFixtures } from './routes';
