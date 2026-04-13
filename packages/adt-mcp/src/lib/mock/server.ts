/**
 * Mock ADT backend – lightweight HTTP server that returns fixture data
 * for all ADT endpoints exercised by the MCP tools.
 *
 * Usage (inside tests):
 *   const mock = createMockAdtServer();
 *   const { port } = await mock.start();
 *   // ... run MCP tests against http://localhost:${port}
 *   await mock.stop();
 */

import {
  createServer,
  type Server,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import { randomBytes } from 'node:crypto';
import { fixtures } from './fixtures';

export interface MockAdtServer {
  start: () => Promise<{ port: number }>;
  stop: () => Promise<void>;
}

function matchRoute(
  method: string,
  url: string,
): { status: number; body: string; contentType: string } | undefined {
  const m = method.toUpperCase();

  // Discovery
  if (m === 'GET' && url.startsWith('/sap/bc/adt/discovery')) {
    return {
      status: 200,
      body: JSON.stringify(fixtures.discovery),
      contentType: 'application/json',
    };
  }

  // Session info
  if (m === 'GET' && url.startsWith('/sap/bc/adt/core/http/sessions')) {
    return {
      status: 200,
      body: JSON.stringify(fixtures.session),
      contentType: 'application/json',
    };
  }

  // System info
  if (
    m === 'GET' &&
    url.startsWith('/sap/bc/adt/core/http/systeminformation')
  ) {
    return {
      status: 200,
      body: JSON.stringify(fixtures.systemInfo),
      contentType: 'application/json',
    };
  }

  // Quick search
  if (
    m === 'GET' &&
    url.startsWith('/sap/bc/adt/repository/informationsystem/search')
  ) {
    return {
      status: 200,
      body: JSON.stringify(fixtures.searchResults),
      contentType: 'application/json',
    };
  }

  // CTS – list transports
  if (
    m === 'GET' &&
    url.startsWith('/sap/bc/adt/cts/transportrequests') &&
    !url.includes('/sap/bc/adt/cts/transportrequests/')
  ) {
    return {
      status: 200,
      body: JSON.stringify(fixtures.transportList),
      contentType: 'application/json',
    };
  }

  // CTS – get single transport
  if (m === 'GET' && /\/sap\/bc\/adt\/cts\/transportrequests\/\w+/.test(url)) {
    return {
      status: 200,
      body: JSON.stringify(fixtures.transportGet),
      contentType: 'application/json',
    };
  }

  // CTS – delete transport
  if (
    m === 'DELETE' &&
    /\/sap\/bc\/adt\/cts\/transportrequests\/\w+/.test(url)
  ) {
    return { status: 204, body: '', contentType: 'text/plain' };
  }

  // ATC – create run
  if (m === 'POST' && url.startsWith('/sap/bc/adt/atc/runs')) {
    return {
      status: 200,
      body: JSON.stringify(fixtures.atcRun),
      contentType: 'application/json',
    };
  }

  // ATC – get worklist
  if (m === 'GET' && url.startsWith('/sap/bc/adt/atc/worklists')) {
    return {
      status: 200,
      body: JSON.stringify(fixtures.atcWorklist),
      contentType: 'application/json',
    };
  }

  // Source read – GET .../source/main (programs, classes, interfaces, functions)
  if (
    m === 'GET' &&
    url.includes('/source/main') &&
    !url.includes('informationsystem')
  ) {
    return {
      status: 200,
      body: fixtures.sourceCode,
      contentType: 'text/plain',
    };
  }

  // Test classes include – GET .../includes/testclasses
  if (m === 'GET' && url.includes('/includes/testclasses')) {
    return {
      status: 200,
      body: fixtures.testClassesSource,
      contentType: 'text/plain',
    };
  }

  // Lock – POST ?_action=LOCK
  if (m === 'POST' && url.includes('_action=LOCK')) {
    return {
      status: 200,
      body: fixtures.lockResponse,
      contentType: 'application/xml',
    };
  }

  // Unlock – POST ?_action=UNLOCK
  if (m === 'POST' && url.includes('_action=UNLOCK')) {
    return { status: 200, body: '', contentType: 'text/plain' };
  }

  // Source write – PUT .../source/main
  if (m === 'PUT' && url.includes('/source/main')) {
    return { status: 200, body: '', contentType: 'text/plain' };
  }

  // Activation – POST /sap/bc/adt/activation
  if (m === 'POST' && url.startsWith('/sap/bc/adt/activation')) {
    return {
      status: 200,
      body: fixtures.activationResult,
      contentType: 'application/xml',
    };
  }

  // Syntax check – POST /sap/bc/adt/checkruns
  if (m === 'POST' && url.startsWith('/sap/bc/adt/checkruns')) {
    return {
      status: 200,
      body: fixtures.checkRunsResult,
      contentType: 'application/xml',
    };
  }

  // AUnit test run – POST /sap/bc/adt/abapunit/testruns
  if (m === 'POST' && url.startsWith('/sap/bc/adt/abapunit/testruns')) {
    return {
      status: 200,
      body: JSON.stringify(fixtures.aunitResult),
      contentType: 'application/json',
    };
  }

  // CSRF token fetch (used by write operations)
  if (m === 'HEAD') {
    return {
      status: 200,
      body: '',
      contentType: 'text/plain',
    };
  }

  return undefined;
}

export function createMockAdtServer(): MockAdtServer {
  let server: Server | undefined;

  // Generate a random CSRF token per server instance (avoids hardcoded credentials)
  const csrfToken = randomBytes(16).toString('hex');

  return {
    async start() {
      return new Promise<{ port: number }>((resolve, reject) => {
        server = createServer((req: IncomingMessage, res: ServerResponse) => {
          const route = matchRoute(req.method ?? 'GET', req.url ?? '/');
          if (route) {
            res.writeHead(route.status, {
              'Content-Type': route.contentType,
              'x-csrf-token': csrfToken,
            });
            res.end(route.body);
          } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
          }
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
      return new Promise<void>((resolve, reject) => {
        if (!server) return resolve();
        server.close((err) => (err ? reject(err) : resolve()));
      });
    },
  };
}
