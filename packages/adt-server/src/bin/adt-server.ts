import {
  createHttpBrokerOperations,
  createHttpBrokerReadinessProbe,
} from '../broker.js';
import {
  createAdtServerMcpOptions,
  executeWithDeadlineAndAbort,
} from '../mcp-runtime.js';
import { loadRestRuntimeSecurity } from '../rest-runtime.js';
import { startAdtServer } from '../server.js';

const baseUrl = process.env.ADT_BROKER_BASE_URL;
const tokenFile = process.env.ADT_SERVER_BROKER_TOKEN_FILE;
if (!baseUrl || !tokenFile)
  throw new Error(
    'ADT_BROKER_BASE_URL and ADT_SERVER_BROKER_TOKEN_FILE are required',
  );
const brokerOptions = { baseUrl, tokenFile };
const restTokenFile = process.env.ADT_SERVER_REST_TOKEN_FILE;
const restSourceSecretFile =
  process.env.ADT_SERVER_REST_SOURCE_CAPABILITY_SECRET_FILE;
const restPageCursorSecretFile =
  process.env.ADT_SERVER_REST_PAGE_CURSOR_SECRET_FILE;

async function main(): Promise<void> {
  const [mcp, restSecurity] = await Promise.all([
    createAdtServerMcpOptions({
      env: process.env,
      brokerOptions,
      executeWithDeadline: executeWithDeadlineAndAbort,
    }),
    loadRestRuntimeSecurity({
      tokenFile: restTokenFile,
      sourceSecretFile: restSourceSecretFile,
      pageCursorSecretFile: restPageCursorSecretFile,
    }),
  ]);
  await startAdtServer({
    operations: createHttpBrokerOperations(brokerOptions),
    readinessProbe: createHttpBrokerReadinessProbe(brokerOptions),
    host: process.env.ADT_SERVER_HOST,
    port: Number(process.env.ADT_SERVER_PORT ?? '3002'),
    mcp,
    ...restSecurity,
  });
}

await main();
