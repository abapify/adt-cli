/**
 * Session types for the HTTP transport of adt-mcp.
 *
 * A `SapSessionContext` represents an active SAP ADT connection bound to a
 * single MCP session (one per HTTP client). It owns the AdtClient and any
 * resources acquired during that session (locks, changeset) and must be
 * closed when the MCP session terminates, otherwise SAP security sessions
 * may be leaked (SAP allows only 1 per user).
 */

import type { AdtClient } from '@abapify/adt-client';

export interface SapSessionContext {
  /** MCP session id (the value of the `Mcp-Session-Id` header). */
  mcpSessionId: string;
  /** Wall-clock timestamp (ms) when the session was created. */
  createdAt: number;
  /** Wall-clock timestamp (ms) of the last observed activity. */
  lastUsedAt: number;
  /** Optional logical system identifier (from multi-system config). */
  systemId?: string;
  /** Authenticated ADT client scoped to this session. */
  client: AdtClient;
  /** Object URIs currently locked by this session. */
  locks: Set<string>;
  /** Reserved for Wave 3 changeset support. */
  changeset?: unknown;
  /**
   * Releases SAP-side resources (locks, security session). Must be
   * idempotent — the registry may call it more than once under races.
   */
  close: () => Promise<void>;
}
