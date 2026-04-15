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

  // Grep / content search (userannotation=userwhere) – must come before general search
  if (
    m === 'GET' &&
    url.startsWith('/sap/bc/adt/repository/informationsystem/search') &&
    url.includes('userannotation=userwhere')
  ) {
    return {
      status: 200,
      body: JSON.stringify(fixtures.grepResults),
      contentType: 'application/json',
    };
  }

  // Quick search (general – name pattern)
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

  // Usages / find-references
  if (
    m === 'GET' &&
    url.startsWith('/sap/bc/adt/repository/informationsystem/usages')
  ) {
    return {
      status: 200,
      body: JSON.stringify(fixtures.usagesResult),
      contentType: 'application/json',
    };
  }

  // Call hierarchy – callers
  if (
    m === 'GET' &&
    url.startsWith('/sap/bc/adt/repository/informationsystem/callers')
  ) {
    return {
      status: 200,
      body: JSON.stringify(fixtures.callersResult),
      contentType: 'application/json',
    };
  }

  // Call hierarchy – callees
  if (
    m === 'GET' &&
    url.startsWith('/sap/bc/adt/repository/informationsystem/callees')
  ) {
    return {
      status: 200,
      body: JSON.stringify(fixtures.calleesResult),
      contentType: 'application/json',
    };
  }

  // Navigation target – find definition
  if (m === 'GET' && url.startsWith('/sap/bc/adt/navigation/target')) {
    return {
      status: 200,
      body: JSON.stringify(fixtures.navigationTarget),
      contentType: 'application/json',
    };
  }

  // Data preview – get_table_contents and run_query
  if (m === 'POST' && url.startsWith('/sap/bc/adt/datapreview/freestyle')) {
    return {
      status: 200,
      body: JSON.stringify(fixtures.tableContents),
      contentType: 'application/json',
    };
  }

  // DDIC tables – get_table (specific path, before generic DDIC)
  if (m === 'GET' && url.startsWith('/sap/bc/adt/ddic/tables/')) {
    return {
      status: 200,
      body: JSON.stringify(fixtures.tableDefinition),
      contentType: 'application/json',
    };
  }

  // CTS – create transport
  if (
    m === 'POST' &&
    url.startsWith('/sap/bc/adt/cts/transportrequests') &&
    !url.includes('/sap/bc/adt/cts/transportrequests/')
  ) {
    return {
      status: 200,
      body: JSON.stringify(fixtures.transportCreate),
      contentType: 'application/json',
    };
  }

  // CTS – release transport (_action=RELEASE)
  if (
    m === 'POST' &&
    /\/sap\/bc\/adt\/cts\/transportrequests\/\w+/.test(url) &&
    url.includes('_action=RELEASE')
  ) {
    return { status: 200, body: '', contentType: 'text/plain' };
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

  // Inactive objects – GET /sap/bc/adt/activation/inactive_objects
  if (
    m === 'GET' &&
    url.startsWith('/sap/bc/adt/activation/inactive_objects')
  ) {
    return {
      status: 200,
      body: JSON.stringify(fixtures.inactiveObjects),
      contentType: 'application/json',
    };
  }

  // Activation – POST /sap/bc/adt/activation
  if (m === 'POST' && url.startsWith('/sap/bc/adt/activation')) {
    return {
      status: 200,
      body: fixtures.activationResult,
      contentType: 'application/xml',
    };
  }

  // Object create – POST to object-type paths (programs, classes, interfaces, functions, packages)
  if (
    m === 'POST' &&
    (url.startsWith('/sap/bc/adt/programs/programs') ||
      url.startsWith('/sap/bc/adt/oo/classes') ||
      url.startsWith('/sap/bc/adt/oo/interfaces') ||
      url.startsWith('/sap/bc/adt/functions/groups') ||
      url.startsWith('/sap/bc/adt/packages'))
  ) {
    return { status: 200, body: '', contentType: 'text/plain' };
  }

  // Object delete – DELETE to object-type paths
  if (
    m === 'DELETE' &&
    (url.startsWith('/sap/bc/adt/programs/programs/') ||
      url.startsWith('/sap/bc/adt/oo/classes/') ||
      url.startsWith('/sap/bc/adt/oo/interfaces/') ||
      url.startsWith('/sap/bc/adt/functions/groups/') ||
      url.startsWith('/sap/bc/adt/packages/'))
  ) {
    return { status: 204, body: '', contentType: 'text/plain' };
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

  // Function module source – GET .../fmodules/{name}/source/main
  if (
    m === 'GET' &&
    url.includes('/fmodules/') &&
    url.includes('/source/main')
  ) {
    return {
      status: 200,
      body: fixtures.sourceCode,
      contentType: 'text/plain',
    };
  }

  // Function modules metadata – GET /sap/bc/adt/functions/groups/{g}/fmodules/{fm}
  if (m === 'GET' && url.includes('/fmodules/')) {
    return {
      status: 200,
      body: JSON.stringify(fixtures.functionModule),
      contentType: 'application/json',
    };
  }

  // Function group source – GET /sap/bc/adt/functions/groups/{name}/source/main
  if (
    m === 'GET' &&
    url.startsWith('/sap/bc/adt/functions/groups/') &&
    url.includes('/source/main')
  ) {
    return {
      status: 200,
      body: fixtures.sourceCode,
      contentType: 'text/plain',
    };
  }

  // Function group metadata – GET /sap/bc/adt/functions/groups/{name}
  // Must exclude objectstructure, source, and fmodule sub-paths
  if (
    m === 'GET' &&
    url.startsWith('/sap/bc/adt/functions/groups/') &&
    !url.includes('/objectstructure') &&
    !url.includes('/source/') &&
    !url.includes('/fmodules/')
  ) {
    return {
      status: 200,
      body: JSON.stringify(fixtures.functionGroup),
      contentType: 'application/json',
    };
  }

  // Object structure – GET {objectUri}/objectstructure
  if (m === 'GET' && url.includes('/objectstructure')) {
    return {
      status: 200,
      body: JSON.stringify(fixtures.objectStructure),
      contentType: 'application/json',
    };
  }

  // Type hierarchy – GET /sap/bc/adt/oo/typeinfo
  if (m === 'GET' && url.startsWith('/sap/bc/adt/oo/typeinfo')) {
    return {
      status: 200,
      body: JSON.stringify(fixtures.typeHierarchy),
      contentType: 'application/json',
    };
  }

  // Pretty printer – POST /sap/bc/adt/prettyprinter/prettifySource
  if (
    m === 'POST' &&
    url.startsWith('/sap/bc/adt/prettyprinter/prettifySource')
  ) {
    return {
      status: 200,
      body: fixtures.prettySource,
      contentType: 'text/plain',
    };
  }

  // Software components – GET /sap/bc/adt/system/softwarecomponents
  if (m === 'GET' && url.startsWith('/sap/bc/adt/system/softwarecomponents')) {
    return {
      status: 200,
      body: JSON.stringify(fixtures.softwareComponents),
      contentType: 'application/json',
    };
  }

  // Service binding publish – POST/DELETE /sap/bc/adt/businessservices/bindings/{name}/publishedstates
  if (
    (m === 'POST' || m === 'DELETE') &&
    url.includes('/sap/bc/adt/businessservices/bindings/') &&
    url.includes('/publishedstates')
  ) {
    return { status: 200, body: '', contentType: 'text/plain' };
  }

  // abapGit exportable objects – GET /sap/bc/adt/abapgit/objects
  if (m === 'GET' && url.startsWith('/sap/bc/adt/abapgit/objects')) {
    return {
      status: 200,
      body: JSON.stringify(fixtures.gitObjects),
      contentType: 'application/json',
    };
  }

  // abapGit export – GET /sap/bc/adt/abapgit/repos/{name}/export
  if (
    m === 'GET' &&
    url.includes('/sap/bc/adt/abapgit/repos/') &&
    url.includes('/export')
  ) {
    return {
      status: 200,
      body: JSON.stringify(fixtures.gitExport),
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
