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

import https from 'node:https';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpServer } from '../server.js';
import { createSessionRegistry } from '../session/registry.js';
import type { SessionRegistry } from '../session/registry.js';
import type {
  DestinationContextRegistry,
  RequestIdentity,
} from '../session/destination-registry.js';
import {
  isMcpDestinationKey,
  isMcpOperationClass,
  type McpDelegatedAccess,
  type McpFrozenSourceAccess,
  type McpScopedAccess,
  type McpRequestAccess,
} from '../tools/scope-catalogue.js';
import {
  loadMultiSystemConfig,
  type MultiSystemConfig,
} from './multi-system.js';
import { createAuthMiddleware, type AuthMode, type UserHint } from './auth.js';
import {
  isMcpInvocationDispatchPolicySupported,
  parseAiReviewFrozenSourcePolicy,
  parseDelegatedAssistantReadPolicy,
  parseFrozenSource,
  parseScopedAdtInvocationPolicy,
  parseSafeExecutePolicy,
} from './invocation.js';
import type {
  McpInvocationVerifier,
  TrustedMcpInvocationClaims,
} from './invocation.js';
import type { OAuthOptions } from './oauth.js';
import { createCorsHandler } from './cors.js';

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
  /**
   * Authentication mode for incoming requests. Defaults to `'none'` when
   * no token / forwarded-auth flag is configured. Misconfiguration (e.g.
   * `bearer` without a token) throws synchronously when the handler is
   * created, including through `startHttpServer`.
   */
  authMode?: AuthMode;
  /** Bearer token (required when `authMode === 'bearer'`). */
  authToken?: string;
  /**
   * Convenience flag — when true, forces `authMode='proxy'` and trusts
   * `x-forwarded-user` from the caller. Intended for deployments behind
   * an authenticating reverse proxy (oauth2-proxy, Cloudflare Access).
   */
  trustForwardedAuth?: boolean;
  /**
   * OAuth / OIDC validation options (required when `authMode === 'oauth'`).
   * Issuer, audience, JWKS, required scopes, user-claim mapping. See
   * `./oauth.ts` for the full option list.
   */
  oauth?: OAuthOptions;
  /**
   * ADT-issued invocation verifier (required when `authMode ===
   * 'invocation'`). Its trusted claims are the only source for identity and
   * scope in destination-aware sidecar mode.
   */
  invocationVerifier?: McpInvocationVerifier;
  /**
   * Internal test hook — called with each successful OAuth `userHint`.
   * Not part of the public API.
   * @internal
   */
  onOAuthUserHint?: (hint: import('./auth.js').UserHint | undefined) => void;
  /**
   * CORS allow-list. Exact-match origins only (plus `'*'` for dev).
   * Undefined or empty = CORS disabled (no headers added).
   */
  allowedOrigins?: string[];
  /** Override the multi-system config loader (mainly for tests). */
  multiSystem?: MultiSystemConfig;
  /** Override the session registry (mainly for tests). */
  registry?: SessionRegistry;
  /** Path to the PEM-encoded TLS certificate; also read from MCP_TLS_CERT. */
  tlsCert?: string;
  /** Path to the PEM-encoded TLS private key; also read from MCP_TLS_KEY. */
  tlsKey?: string;
  /** Inline PEM-encoded TLS certificate (useful for embedders and tests). */
  tlsCertContent?: string;
  /** Inline PEM-encoded TLS private key (useful for embedders and tests). */
  tlsKeyContent?: string;
  /**
   * Enables destination-aware shared-server mode. Access and identity are
   * derived only from the authenticated request's trusted `UserHint` at MCP
   * session initialization, then captured for the life of that session.
   */
  destinationServer?: {
    destinationRegistry: DestinationContextRegistry;
    requestIdentity: (input: {
      userHint?: UserHint;
      invocation?: TrustedMcpInvocationClaims;
    }) => RequestIdentity;
    requestAccess: (input: {
      userHint?: UserHint;
      invocation?: TrustedMcpInvocationClaims;
    }) => McpRequestAccess | undefined;
    resolveFrozenSource?: NonNullable<
      import('../types.js').ToolContext['resolveFrozenSource']
    >;
    consumeExecutionAuthorization?: NonNullable<
      import('../types.js').ToolContext['consumeExecutionAuthorization']
    >;
    reportExecutionOutcome?: NonNullable<
      import('../types.js').ToolContext['reportExecutionOutcome']
    >;
    executeWithDeadline?: NonNullable<
      import('../types.js').ToolContext['executeWithDeadline']
    >;
  };
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

/**
 * A reusable Streamable HTTP MCP request handler.
 *
 * The embedding application owns its Node listener and delegates only the
 * requests routed to MCP to `handle`. Calling `close` releases MCP sessions
 * and transports, but deliberately never closes that listener.
 */
export interface HttpMcpHandler {
  readonly registry: SessionRegistry;
  handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void>;
  close(): Promise<void>;
}

type Middleware = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
) => Promise<boolean> | boolean;

/**
 * Captures trusted access at initialization so a provider cannot change a
 * session's authorization by mutating the object it returned later.
 */
function snapshotRequestAccess(
  access: McpRequestAccess | undefined,
): McpRequestAccess | undefined {
  if (!access) return undefined;

  const classes = access.classes;
  const destinationKeys = access.destinationKeys;
  if (!Array.isArray(classes) || !Array.isArray(destinationKeys)) {
    return undefined;
  }

  if (
    !classes.every(isMcpOperationClass) ||
    !destinationKeys.every(isMcpDestinationKey)
  ) {
    return undefined;
  }

  const frozenSource = snapshotFrozenSourceAccess(access.frozenSource);
  if (access.frozenSource && !frozenSource) return undefined;
  const scoped = snapshotScopedAccess(access.scoped);
  if (access.scoped && !scoped) return undefined;
  const delegated = snapshotDelegatedAccess(access.delegated);
  if (access.delegated && !delegated) return undefined;
  if (
    scoped &&
    (classes.length !== 2 ||
      classes[0] !== 'server' ||
      classes[1] !== scoped.operationClass)
  ) {
    return undefined;
  }

  return Object.freeze({
    classes: Object.freeze([...classes]),
    destinationKeys: Object.freeze([...destinationKeys]),
    ...(frozenSource ? { frozenSource } : {}),
    ...(scoped ? { scoped } : {}),
    ...(delegated ? { delegated } : {}),
  });
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const OBJECT_KEY_REGEX = /^[A-Z0-9_]{2,30}:[A-Z0-9_/$-]{1,128}$/u;
const READ_SCOPED_TOOLS = new Set(['get_object', 'get_object_structure']);
const SYSTEM_SID_REGEX = /^[A-Za-z0-9_-]{1,16}$/u;
const AUTHORIZATION_TOKEN_REGEX =
  /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u;

function normalizeAndValidateStrings(values: unknown[]): string[] | undefined {
  if (!Array.isArray(values)) return undefined;
  const result: string[] = [];
  for (const value of values) {
    if (typeof value !== 'string' || !value) return undefined;
    result.push(value);
  }
  return result;
}

function isSortedUniqueStrings(values: string[]): boolean {
  const sorted = [...values].sort((left, right) => left.localeCompare(right));
  return (
    new Set(values).size === values.length &&
    values.every((value, index) => value === sorted[index])
  );
}

function validateCommonScopedFields(
  access: McpScopedAccess,
): { resourceKeys: string[]; toolNames: string[] } | undefined {
  if (typeof access.tokenId !== 'string' || !access.tokenId) return undefined;
  if (typeof access.principal !== 'string' || !access.principal)
    return undefined;
  if (typeof access.correlationId !== 'string' || !access.correlationId)
    return undefined;
  if (typeof access.scopeId !== 'string' || !UUID_REGEX.test(access.scopeId)) {
    return undefined;
  }
  if (
    typeof access.executionId !== 'string' ||
    !UUID_REGEX.test(access.executionId)
  ) {
    return undefined;
  }
  if (
    typeof access.systemSid !== 'string' ||
    !SYSTEM_SID_REGEX.test(access.systemSid)
  ) {
    return undefined;
  }
  if (
    !Number.isSafeInteger(access.maxToolCalls) ||
    access.maxToolCalls < 1 ||
    access.maxToolCalls > 12
  ) {
    return undefined;
  }

  const resourceKeys = normalizeAndValidateStrings(access.resourceKeys);
  const toolNames = normalizeAndValidateStrings(access.toolNames);
  if (
    !resourceKeys ||
    resourceKeys.length > 100 ||
    resourceKeys.some((key) => !OBJECT_KEY_REGEX.test(key)) ||
    !isSortedUniqueStrings(resourceKeys) ||
    !toolNames ||
    toolNames.length === 0 ||
    !isSortedUniqueStrings(toolNames)
  ) {
    return undefined;
  }

  return { resourceKeys, toolNames };
}

function buildScopedAccess(
  access: McpScopedAccess,
  resourceKeys: string[],
  toolNames: string[],
  overrides: Record<string, unknown> = {},
): McpScopedAccess {
  return Object.freeze({
    ...access,
    resourceKeys: Object.freeze(resourceKeys),
    toolNames: Object.freeze(toolNames),
    ...overrides,
  }) as McpScopedAccess;
}

function snapshotReadScope(
  access: McpScopedAccess,
  resourceKeys: string[],
  toolNames: string[],
): McpScopedAccess | undefined {
  if (
    resourceKeys.length === 0 ||
    toolNames.some((name) => !READ_SCOPED_TOOLS.has(name)) ||
    access.safeExecutePolicy !== undefined ||
    access.authorizationId !== undefined ||
    access.authorizationToken !== undefined
  ) {
    return undefined;
  }
  return buildScopedAccess(access, resourceKeys, toolNames);
}

function snapshotSafeExecuteScope(
  access: McpScopedAccess,
  resourceKeys: string[],
  toolNames: string[],
): McpScopedAccess | undefined {
  const safeExecutePolicy = parseSafeExecutePolicy(access.safeExecutePolicy);
  if (
    !safeExecutePolicy ||
    resourceKeys.length === 0 ||
    toolNames.length !== 1 ||
    toolNames[0] !== safeExecutePolicy.operationId ||
    typeof access.authorizationId !== 'string' ||
    !UUID_REGEX.test(access.authorizationId) ||
    typeof access.authorizationToken !== 'string' ||
    access.authorizationToken.length > 16 * 1024 ||
    !AUTHORIZATION_TOKEN_REGEX.test(access.authorizationToken)
  ) {
    return undefined;
  }
  return buildScopedAccess(access, resourceKeys, toolNames, {
    safeExecutePolicy,
  });
}

function snapshotScopedAccess(
  access: McpScopedAccess | undefined,
): McpScopedAccess | undefined {
  if (!access) return undefined;
  const validated = validateCommonScopedFields(access);
  if (!validated) return undefined;
  const { resourceKeys, toolNames } = validated;

  if (access.operationClass === 'read') {
    return snapshotReadScope(access, resourceKeys, toolNames);
  }
  if (access.operationClass === 'safe_execute') {
    return snapshotSafeExecuteScope(access, resourceKeys, toolNames);
  }
  return undefined;
}

function snapshotDelegatedAccess(
  access: McpDelegatedAccess | undefined,
): McpDelegatedAccess | undefined {
  if (!access) return undefined;
  if (
    typeof access.threadId !== 'string' ||
    !UUID_REGEX.test(access.threadId) ||
    typeof access.executionId !== 'string' ||
    !UUID_REGEX.test(access.executionId) ||
    typeof access.systemSid !== 'string' ||
    access.systemSid.length === 0 ||
    access.systemSid.length > 16
  ) {
    return undefined;
  }
  return Object.freeze({
    threadId: access.threadId,
    executionId: access.executionId,
    systemSid: access.systemSid,
  });
}

function snapshotFrozenSourceAccess(
  access: McpFrozenSourceAccess | undefined,
): McpFrozenSourceAccess | undefined {
  if (!access) return undefined;
  if (
    typeof access.systemSid !== 'string' ||
    access.systemSid.length === 0 ||
    access.systemSid.length > 16 ||
    !Number.isSafeInteger(access.maxSourceBytes) ||
    access.maxSourceBytes < 1 ||
    access.maxSourceBytes > 2 * 1024 * 1024 ||
    !Array.isArray(access.sources) ||
    access.sources.length === 0 ||
    access.sources.length > 500
  ) {
    return undefined;
  }
  const sourceKeys = new Set<string>();
  const sourceRefs = new Set<string>();
  const sources: {
    canonicalKey: string;
    componentId: string;
    sourceRef: string;
  }[] = [];
  for (const source of access.sources) {
    const parsed = parseFrozenSource(source, sourceKeys, sourceRefs);
    if (!parsed) return undefined;
    sources.push(parsed);
  }
  return Object.freeze({
    systemSid: access.systemSid,
    sources: Object.freeze(sources),
    maxSourceBytes: access.maxSourceBytes,
  });
}

/** A deterministic, non-secret value used only for session affinity checks. */
function sessionIdentityBinding(
  identity: RequestIdentity,
  invocationTokenId?: string,
): string {
  if (!identity.principal || typeof identity.principal !== 'string') {
    throw new Error('Trusted request identity is missing a principal');
  }
  if (identity.agentId !== undefined && typeof identity.agentId !== 'string') {
    throw new Error('Trusted request identity has an invalid agent id');
  }
  return JSON.stringify([
    identity.principal,
    identity.agentId ?? null,
    invocationTokenId ?? null,
  ]);
}

function invocationRequestIdentity(
  invocation: TrustedMcpInvocationClaims | undefined,
): RequestIdentity {
  if (!invocation) {
    throw new Error('Trusted MCP invocation identity is missing');
  }
  return {
    principal: invocation.principal,
    agentId: invocation.agentId,
  };
}

function invocationRequestAccess(
  invocation: TrustedMcpInvocationClaims | undefined,
): McpRequestAccess | undefined {
  if (!invocation || !isMcpInvocationDispatchPolicySupported(invocation)) {
    return undefined;
  }
  const frozenSource = parseAiReviewFrozenSourcePolicy(invocation);
  const scopedPolicy = parseScopedAdtInvocationPolicy(invocation);
  const delegated = parseDelegatedAssistantReadPolicy(invocation);
  return snapshotRequestAccess({
    classes: invocation.classes,
    destinationKeys: invocation.destinationKeys,
    ...(frozenSource ? { frozenSource } : {}),
    ...(scopedPolicy
      ? {
          scoped: {
            tokenId: invocation.tokenId,
            principal: invocation.principal,
            correlationId: invocation.correlationId,
            ...scopedPolicy,
          },
        }
      : {}),
    ...(delegated ? { delegated } : {}),
  });
}

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
      res.writeHead(403, { 'Content-Type': 'application/json' });
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
 * Creates a reusable MCP HTTP handler without binding a Node listener.
 */
export function createHttpMcpHandler(
  options: HttpServerOptions = {},
): HttpMcpHandler {
  const host = options.host ?? process.env.MCP_HOST ?? '127.0.0.1';
  const log = options.log ?? defaultLog;

  const registry =
    options.registry ??
    createSessionRegistry({ ttlMs: options.ttlMs ?? 30 * 60 * 1000 });
  const multiSystem = options.multiSystem ?? loadMultiSystemConfig();
  const destinationServer = options.destinationServer;

  // One transport per MCP session, plus the paired McpServer that owns it.
  // The SDK expects `server.connect(transport)` to be called once per pair.
  const transports = new Map<string, StreamableHTTPServerTransport>();
  const servers = new Map<string, McpServer>();
  const sessionIdentityBindings = new Map<string, string>();

  async function releaseSessionResources(sessionId: string): Promise<void> {
    const server = servers.get(sessionId);
    transports.delete(sessionId);
    sessionIdentityBindings.delete(sessionId);
    servers.delete(sessionId);
    await registry.delete(sessionId);
    await destinationServer?.destinationRegistry.releaseAll(sessionId);
    try {
      await server?.close();
    } catch {
      // ignore
    }
  }

  const hostAllow = normaliseHostAllowlist(host, options.allowedHosts);
  const hostValidator = makeHostValidator(hostAllow);

  // Resolve auth mode. `trustForwardedAuth` is a convenience alias for
  // `authMode='proxy'` and may only promote an *unset* auth mode to
  // 'proxy'. It must NOT silently downgrade an explicit authMode (e.g.
  // 'oauth'), or the JWT validation layer would be bypassed.
  let authMode: AuthMode =
    options.authMode ?? (options.authToken ? 'bearer' : 'none');
  if (options.trustForwardedAuth && authMode === 'none') authMode = 'proxy';
  if (authMode === 'oauth' && !options.oauth) {
    throw new Error(
      'startHttpServer: authMode=oauth requires `oauth` options (issuer at minimum)',
    );
  }
  if (authMode === 'invocation' && !options.invocationVerifier) {
    throw new Error(
      'createHttpMcpHandler: authMode=invocation requires an invocation verifier',
    );
  }
  if (authMode === 'invocation' && !destinationServer) {
    throw new Error(
      'createHttpMcpHandler: authMode=invocation requires destinationServer scope enforcement',
    );
  }
  const authMw = createAuthMiddleware({
    mode: authMode,
    token: options.authToken,
    oauth: options.oauth,
    invocationVerifier: options.invocationVerifier,
    onUserHint: options.onOAuthUserHint,
  });
  const cors = createCorsHandler({ allowedOrigins: options.allowedOrigins });

  const sessionMatchesAuthenticatedIdentity = (
    sessionId: string,
    userHint: UserHint | undefined,
    invocation: TrustedMcpInvocationClaims | undefined,
    res: http.ServerResponse,
  ): boolean => {
    if (!destinationServer) return true;
    const expected = sessionIdentityBindings.get(sessionId);
    if (!expected) {
      writeJsonError(res, 403, 'mcp_session_identity_mismatch');
      return false;
    }
    try {
      const identity =
        authMode === 'invocation'
          ? invocationRequestIdentity(invocation)
          : destinationServer.requestIdentity({ userHint, invocation });
      const actual = sessionIdentityBinding(identity, invocation?.tokenId);
      if (actual === expected) return true;
    } catch {
      // Treat a failed or malformed trusted identity derivation exactly like
      // a mismatch. Never fall back to a client field or session contents.
    }
    writeJsonError(res, 403, 'mcp_session_identity_mismatch');
    return false;
  };

  const handleMcp = async (
    req: http.IncomingMessage,
    res: http.ServerResponse,
    userHint: UserHint | undefined,
    invocation: TrustedMcpInvocationClaims | undefined,
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
        if (
          !sessionMatchesAuthenticatedIdentity(
            sessionId,
            userHint,
            invocation,
            res,
          )
        ) {
          return;
        }
        // Refresh the session's last-used timestamp so the TTL sweep
        // doesn't evict an actively-used session between tool calls.
        registry.touch(sessionId);
        const transport = transports.get(sessionId)!;
        await transport.handleRequest(req, res, body);
        return;
      }

      if (!sessionId && isInitializeRequest(body)) {
        let initializedSessionBinding: string | undefined;
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (id) => {
            transports.set(id, transport);
            if (initializedSessionBinding) {
              sessionIdentityBindings.set(id, initializedSessionBinding);
            }
            log('info', `session initialized: ${id}`);
          },
          onsessionclosed: async (id) => {
            log('info', `session closed by client: ${id}`);
            await releaseSessionResources(id);
          },
        });

        transport.onclose = () => {
          const id = transport.sessionId;
          if (!id) return;
          void releaseSessionResources(id);
        };

        let sessionIdentity: RequestIdentity | undefined;
        let sessionAccess: McpRequestAccess | undefined;
        if (destinationServer) {
          let identityDerivationFailed = false;
          try {
            sessionIdentity =
              authMode === 'invocation'
                ? invocationRequestIdentity(invocation)
                : destinationServer.requestIdentity({ userHint, invocation });
            initializedSessionBinding = sessionIdentityBinding(
              sessionIdentity,
              invocation?.tokenId,
            );
          } catch {
            // A failed identity derivation must not turn into caller-selected
            // identity material. The fallback is audit-safe and fail-closed
            // once the lease provider applies its ordinary authorization.
            sessionIdentity = { principal: 'unknown' };
            identityDerivationFailed = true;
          }
          if (!identityDerivationFailed) {
            try {
              sessionAccess =
                authMode === 'invocation'
                  ? invocationRequestAccess(invocation)
                  : snapshotRequestAccess(
                      destinationServer.requestAccess({ userHint, invocation }),
                    );
            } catch {
              // Missing or failed trusted access derivation is intentionally
              // indistinguishable from no access at dispatch time.
              sessionAccess = undefined;
            }
          }
        }

        const mcp = createMcpServer({
          registry,
          resolveSystem: (id) => multiSystem.resolve(id),
          ...(destinationServer
            ? {
                destinationRegistry: destinationServer.destinationRegistry,
                requestIdentity: () =>
                  sessionIdentity ?? { principal: 'unknown' },
                requestAccess: () => sessionAccess,
                ...(destinationServer.resolveFrozenSource
                  ? {
                      resolveFrozenSource:
                        destinationServer.resolveFrozenSource,
                    }
                  : {}),
                ...(destinationServer.consumeExecutionAuthorization
                  ? {
                      consumeExecutionAuthorization:
                        destinationServer.consumeExecutionAuthorization,
                    }
                  : {}),
                ...(destinationServer.reportExecutionOutcome
                  ? {
                      reportExecutionOutcome:
                        destinationServer.reportExecutionOutcome,
                    }
                  : {}),
                ...(destinationServer.executeWithDeadline
                  ? {
                      executeWithDeadline:
                        destinationServer.executeWithDeadline,
                    }
                  : {}),
              }
            : {}),
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
      if (
        !sessionMatchesAuthenticatedIdentity(
          sessionId,
          userHint,
          invocation,
          res,
        )
      ) {
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

  const handle = async (
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ): Promise<void> => {
    try {
      // Pipeline order (security-critical):
      //   1. CORS — handles preflight short-circuit.
      //   2. Host-header validation — DNS-rebind protection.
      //   3. /healthz — NOT behind auth so monitoring probes work.
      //   4. Auth — bearer / proxy / none.
      //   5. Route to /mcp.
      if (cors.handle(req, res)) return;
      if (hostValidator(req, res)) return;

      const url = req.url ?? '/';
      const pathOnly = url.split('?')[0];

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

      const authResult = await authMw(req, res);
      if (!authResult.allowed) return;
      // Accept /mcp and /mcp/ — ignore query string.
      if (pathOnly === '/mcp' || pathOnly === '/mcp/') {
        await handleMcp(req, res, authResult.userHint, authResult.invocation);
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
  };

  let closed = false;
  const close = async (): Promise<void> => {
    if (closed) return;
    closed = true;
    log('info', 'shutting down');
    await registry.shutdown();
    // Close each outstanding transport + server pair.
    const pairs = Array.from(transports.entries());
    transports.clear();
    for (const [sessionId] of pairs) sessionIdentityBindings.delete(sessionId);
    if (destinationServer) {
      await Promise.allSettled(
        pairs.map(
          async ([sessionId]) =>
            await destinationServer.destinationRegistry.releaseAll(sessionId),
        ),
      );
    }
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
  };

  return {
    registry,
    handle,
    close,
  };
}

/**
 * Starts the HTTP transport and returns a handle that can be used to close
 * both the listener and all active MCP sessions gracefully.
 *
 * This is a backwards-compatible listener adapter around
 * `createHttpMcpHandler` for standalone deployments.
 */
export async function startHttpServer(
  options: HttpServerOptions = {},
): Promise<RunningHttpServer> {
  const port =
    options.port ??
    (process.env.MCP_PORT ? Number(process.env.MCP_PORT) : 3000);
  const host = options.host ?? process.env.MCP_HOST ?? '127.0.0.1';
  const log = options.log ?? defaultLog;
  // Resolve and validate TLS material before allocating the handler — a
  // missing or malformed certificate must not leak the session registry.
  const certPath = options.tlsCert ?? process.env.MCP_TLS_CERT;
  const keyPath = options.tlsKey ?? process.env.MCP_TLS_KEY;
  const cert =
    options.tlsCertContent ??
    (certPath ? await readFile(certPath, 'utf8') : undefined);
  const key =
    options.tlsKeyContent ??
    (keyPath ? await readFile(keyPath, 'utf8') : undefined);

  if (!cert || !key) {
    throw new Error(
      'startHttpServer: TLS certificate and key are required. Provide tlsCert/tlsKey, ' +
        'tlsCertContent/tlsKeyContent, or MCP_TLS_CERT/MCP_TLS_KEY.',
    );
  }
  if (
    !cert.includes('-----BEGIN CERTIFICATE-----') ||
    !cert.includes('-----END CERTIFICATE-----')
  ) {
    throw new Error(
      'startHttpServer: TLS certificate is not valid PEM — expected a ' +
        '"-----BEGIN CERTIFICATE-----" block' +
        (certPath ? ` in ${certPath}` : ' in tlsCertContent') +
        '.',
    );
  }
  if (!key.includes('PRIVATE KEY-----')) {
    throw new Error(
      'startHttpServer: TLS private key is not valid PEM — expected a ' +
        '"-----BEGIN ... PRIVATE KEY-----" block' +
        (keyPath ? ` in ${keyPath}` : ' in tlsKeyContent') +
        '.',
    );
  }

  const handler = createHttpMcpHandler(options);
  let server: https.Server;
  try {
    server = https.createServer({ cert, key }, (req, res) => {
      void handler.handle(req, res);
    });
    await new Promise<void>((resolve, reject) => {
      const onError = (err: Error) => reject(err);
      server.once('error', onError);
      server.listen(port, host, () => {
        server.removeListener('error', onError);
        resolve();
      });
    });
  } catch (err) {
    await handler.close().catch(() => undefined);
    throw err;
  }

  const boundPort = (server.address() as { port: number } | null)?.port ?? port;
  log('info', `listening on https://${host}:${boundPort}/mcp`);

  let closed = false;
  const close = async (): Promise<void> => {
    if (closed) return;
    closed = true;
    await handler.close();
    // `server.close()` stops accepting new requests but can otherwise wait
    // indefinitely for a keep-alive socket which never created an MCP
    // transport (for example, a rejected bearer credential). Handler-owned
    // MCP transports have already been closed above, so force remaining HTTP
    // sockets closed before awaiting the listener callback.
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  };

  return {
    url: `https://${host}:${boundPort}/mcp`,
    port: boundPort,
    host,
    registry: handler.registry,
    close,
  };
}
