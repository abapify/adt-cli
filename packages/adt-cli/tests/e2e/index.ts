/**
 * Public surface of the CLI + MCP e2e harness.
 * Import from `../tests/e2e` in parity test files.
 */
export {
  startAdtHarness,
  runCliCommand,
  callMcpTool,
  assertParity,
  type AdtHarness,
  type CliRunResult,
  type McpCallResult,
  type HarnessConnectionArgs,
  type ParityOptions,
} from './harness';
