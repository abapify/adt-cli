/**
 * In-memory session registry for the HTTP transport.
 *
 * The registry is intentionally simple: it stores `SapSessionContext`
 * instances keyed by MCP session id, tracks last-used timestamps, and
 * optionally evicts idle sessions after a TTL.
 *
 * Lifetime: a registry instance is process-scoped; it is created by the
 * HTTP bin and passed to `createMcpServer({ registry })`.
 */

import type { SapSessionContext } from './types.js';

export interface SessionRegistry {
  /**
   * Registers a new session. The caller provides everything except the
   * housekeeping fields (`createdAt`, `lastUsedAt`) and the idempotent
   * `close` handler, which is supplied as a separate argument so the
   * registry can wrap it for idempotency.
   */
  create(
    mcpSessionId: string,
    ctx: Omit<
      SapSessionContext,
      'close' | 'createdAt' | 'lastUsedAt' | 'mcpSessionId'
    >,
    close: () => Promise<void>,
  ): SapSessionContext;
  get(mcpSessionId: string): SapSessionContext | undefined;
  touch(mcpSessionId: string): void;
  /** Removes the session and invokes its close handler. */
  delete(mcpSessionId: string): Promise<void>;
  list(): SapSessionContext[];
  /** Closes every session and stops background timers. */
  shutdown(): Promise<void>;
}

export interface SessionRegistryOptions {
  /**
   * Idle TTL in milliseconds. Sessions with `now - lastUsedAt > ttlMs`
   * are evicted by a background sweep. Defaults to 30 minutes.
   * Set to 0 to disable TTL sweeping.
   */
  ttlMs?: number;
  /** Sweep interval in ms. Defaults to `min(ttlMs / 4, 60_000)`. */
  sweepIntervalMs?: number;
}

const DEFAULT_TTL_MS = 30 * 60 * 1000;

export function createSessionRegistry(
  options: SessionRegistryOptions = {},
): SessionRegistry {
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const sessions = new Map<string, SapSessionContext>();
  let sweepTimer: NodeJS.Timeout | undefined;

  const wrapClose = (close: () => Promise<void>): (() => Promise<void>) => {
    let closed = false;
    return async () => {
      if (closed) return;
      closed = true;
      await close();
    };
  };

  const registry: SessionRegistry = {
    create(mcpSessionId, ctx, close) {
      const now = Date.now();
      const session: SapSessionContext = {
        mcpSessionId,
        createdAt: now,
        lastUsedAt: now,
        ...ctx,
        close: wrapClose(close),
      };
      sessions.set(mcpSessionId, session);
      return session;
    },
    get(mcpSessionId) {
      return sessions.get(mcpSessionId);
    },
    touch(mcpSessionId) {
      const s = sessions.get(mcpSessionId);
      if (s) s.lastUsedAt = Date.now();
    },
    async delete(mcpSessionId) {
      const s = sessions.get(mcpSessionId);
      if (!s) return;
      sessions.delete(mcpSessionId);
      try {
        await s.close();
      } catch {
        // best-effort cleanup; registry must not throw on delete
      }
    },
    list() {
      return Array.from(sessions.values());
    },
    async shutdown() {
      if (sweepTimer) {
        clearInterval(sweepTimer);
        sweepTimer = undefined;
      }
      const ids = Array.from(sessions.keys());
      await Promise.allSettled(ids.map((id) => registry.delete(id)));
    },
  };

  if (ttlMs > 0) {
    const interval =
      options.sweepIntervalMs ?? Math.min(Math.floor(ttlMs / 4), 60_000);
    sweepTimer = setInterval(
      () => {
        const cutoff = Date.now() - ttlMs;
        for (const s of sessions.values()) {
          if (s.lastUsedAt < cutoff) {
            void registry.delete(s.mcpSessionId);
          }
        }
      },
      Math.max(1000, interval),
    );
    // Don't hold the event loop open just for the sweeper.
    sweepTimer.unref?.();
  }

  return registry;
}
