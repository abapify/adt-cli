/**
 * Shared Zod schemas for connection parameters reused across tools.
 */

import { z } from 'zod';

/**
 * Connection parameters required by every legacy stdio tool that talks
 * to SAP. `baseUrl` is required here because every existing tool calls
 * `ctx.getClient(args)` against a `ConnectionParams` type that requires
 * it; those tools will migrate to the session-aware `resolveClient`
 * helper in a later wave, at which point this shape will be relaxed.
 *
 * HTTP callers that have already run `sap_connect` should target the
 * session-aware tools (future migration) and can omit credentials.
 */
export const connectionShape = {
  baseUrl: z.string().describe('SAP system base URL (e.g. https://host:8000)'),
  client: z.string().optional().describe('SAP client number'),
  username: z.string().optional().describe('Username for basic auth'),
  password: z.string().optional().describe('Password for basic auth'),
};

/**
 * All-optional variant used by new tools (e.g. `sap_connect`) that want
 * to accept either explicit credentials, a logical `systemId`, or
 * nothing at all (resolving against the current MCP session).
 */
export const optionalConnectionShape = {
  baseUrl: z
    .string()
    .optional()
    .describe('SAP system base URL (e.g. https://host:8000)'),
  client: z.string().optional().describe('SAP client number'),
  username: z.string().optional().describe('Username for basic auth'),
  password: z.string().optional().describe('Password for basic auth'),
};

/**
 * Like `connectionShape`, but additionally accepts a logical `systemId`
 * that can be resolved via the multi-system config or the CLI's
 * `~/.adt/sessions/<sid>.json` auth store. Intended for tools that want
 * to support both explicit credentials and session-scoped resolution in
 * a single call (e.g. `sap_connect`).
 */
export const sessionOrConnectionShape = {
  ...optionalConnectionShape,
  systemId: z
    .string()
    .optional()
    .describe(
      'Logical system id (resolved via multi-system config or ~/.adt sessions)',
    ),
};
