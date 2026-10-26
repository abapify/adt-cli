import http from 'node:http';
import {
  createHttpMcpHandler,
  type DestinationContextRegistry,
  type McpInvocationVerifier,
} from '@abapify/adt-mcp';
import { createRestAtcDocumentationCapabilityService } from './atc-documentation-capabilities';
import { createRestSourceCapabilityService } from './source-capabilities';
import { assertSecret } from './sealed-capability';
import { createRestPageCursorService } from './page-cursors';
import {
  type TransportSearchCriteria,
  type TransportSourceManifestInput,
  type AtcRunBody,
} from './rest-schemas';
import {
  createRequestHandler,
  type RawTransportSourceManifest,
  type AtcRunOperationResult,
} from './request-handler';

type AtcRunOperationInput = AtcRunBody & { destination: string };

export interface DestinationSummary {
  key: string;
  displayName: string;
  systemSids: string[];
  authConfigured: boolean;
  version: number;
}

export type FrozenSourceResolution =
  { sourceUri: string } | { sourceCapability: string };

export type ResolveFrozenSource = (input: {
  destination: string;
  systemSid: string;
  sourceRef: string;
}) => Promise<FrozenSourceResolution>;

export type ReadinessFailureReason = 'timeout' | 'probe_failed';

export type ReadinessProbe = (signal: AbortSignal) => Promise<void>;

/**
 * The ADT broker may return a direct adapter URI or a source capability
 * previously issued by this same sidecar REST process. Redeem the latter
 * before the MCP package can acquire a destination context or invoke SAP.
 */
export async function resolveMcpFrozenSource(
  resolveFrozenSource: ResolveFrozenSource,
  sourceCapabilities: ReturnType<typeof createRestSourceCapabilityService>,
  input: Parameters<ResolveFrozenSource>[0],
): Promise<{ sourceUri: string }> {
  const resolved = await resolveFrozenSource(input);
  if ('sourceUri' in resolved) return resolved;
  return sourceCapabilities.resolve({
    sourceCapability: resolved.sourceCapability,
    destination: input.destination,
  });
}

/** The runtime supplies this from ADT's private broker; it never exposes a connection lease. */
export interface AdtServerOperations {
  listDestinations(): Promise<DestinationSummary[]>;
  listTransports(
    destination: string,
    criteria?: TransportSearchCriteria,
  ): Promise<unknown>;
  searchPackages(
    destination: string,
    criteria?: import('./rest-schemas').PackageSearchCriteria,
  ): Promise<unknown>;
  /** Reads a bounded hierarchy below one named package; never a global forest. */
  getPackageTree(destination: string, rootPackage: string): Promise<unknown>;
  searchObjects(
    destination: string,
    criteria?: import('./rest-schemas').ObjectSearchCriteria,
  ): Promise<unknown>;
  listPackageObjects(
    destination: string,
    packageName: string,
  ): Promise<unknown>;
  /** Public canonical metadata projection; raw ADT URIs remain broker-local. */
  getObjectMetadata?(
    destination: string,
    objectType: string,
    objectName: string,
  ): Promise<unknown>;
  /** Unified BAdI read — classic SXSD/SXCI (vit/wb) or ENHO/XHH. */
  getBadi?(
    destination: string,
    badiName: string,
    options?: { includeImplementations?: boolean },
  ): Promise<unknown>;
  /** Public metadata-only history; immutable source locators remain local. */
  getObjectSourceHistory?(
    destination: string,
    objectType: string,
    objectName: string,
  ): Promise<unknown>;
  /** Bounded current/named source selected only by canonical object identity. */
  readObjectSource?(input: {
    destination: string;
    objectType: string;
    objectName: string;
    version?: string;
  }): Promise<{ bytes: number; source: string }>;
  /** Runs ATC from canonical scope selectors; ADT paths remain broker-local. */
  runAtc?(input: AtcRunOperationInput): Promise<AtcRunOperationResult>;
  /** Reads an issued ATC documentation relation under a caller-selected cap. */
  readAtcFindingDocumentation?(input: {
    destination: string;
    documentationUri: string;
    maxBytes: number;
  }): Promise<{ bytes: number; html: string }>;
  /** Public canonical detail; never contains SAP URI fields. */
  getTransportDetail?(destination: string, transport: string): Promise<unknown>;
  /** Public canonical aggregate; never contains SAP URI fields. */
  listTransportObjects?(
    destination: string,
    transport: string,
  ): Promise<unknown>;
  /** Supplied by the broker adapter when immutable-source REST is enabled. */
  buildTransportSourceManifest?(
    destination: string,
    input: TransportSourceManifestInput,
  ): Promise<RawTransportSourceManifest>;
  /** Must enforce the requested byte limit before retaining an upstream body. */
  readImmutableSource?(input: {
    destination: string;
    sourceUri: string;
    maxBytes: number;
  }): Promise<{ bytes: number; source: string }>;
}

/**
 * The only MCP configuration accepted by the shared ADT Server listener.
 * The sidecar always creates an invocation-authenticated handler; callers
 * cannot select a weaker HTTP authentication mode here.
 */
export interface AdtServerMcpOptions {
  invocationVerifier: McpInvocationVerifier;
  /** Ownership transfers to the running server, which shuts it down on close. */
  destinationRegistry: DestinationContextRegistry;
  /**
   * Private ADT broker resolver for the opaque, signed source capabilities
   * carried only in an AI Review invocation policy.
   */
  resolveFrozenSource: ResolveFrozenSource;
  /** Deployment-owned atomic authorization hook. */
  consumeExecutionAuthorization?: NonNullable<
    import('@abapify/adt-mcp').ToolContext['consumeExecutionAuthorization']
  >;
  /** Deployment-owned terminal outcome hook. */
  reportExecutionOutcome?: NonNullable<
    import('@abapify/adt-mcp').ToolContext['reportExecutionOutcome']
  >;
  /** Hard-cancellable SAP runtime; safe execution is denied when absent. */
  executeWithDeadline?: NonNullable<
    import('@abapify/adt-mcp').ToolContext['executeWithDeadline']
  >;
  allowedHosts?: string[];
}

/**
 * Authenticates trusted service-to-service callers of the broker-backed REST
 * compatibility API. The broker credential must never be accepted inbound.
 */
export interface RestServiceAuthorizer {
  authorize(request: http.IncomingMessage): boolean | Promise<boolean>;
}

export interface AdtServerOptions {
  operations: AdtServerOperations;
  host?: string;
  port?: number;
  mcp?: AdtServerMcpOptions;
  restAuthorizer?: RestServiceAuthorizer;
  /** Production REST uses a deployment-shared secret; tests may use a local one. */
  sourceCapabilities?: ReturnType<typeof createRestSourceCapabilityService>;
  /** Override the default test secret used to create source capabilities. */
  sourceCapabilitiesSecret?: string;
  /** Shares REST state with source capabilities across sidecar replicas. */
  atcDocumentationCapabilities?: ReturnType<
    typeof createRestAtcDocumentationCapabilityService
  >;
  /** Override the default test secret used to create ATC documentation capabilities. */
  atcDocumentationCapabilitiesSecret?: string;
  pageCursors?: ReturnType<typeof createRestPageCursorService>;
  /** Override the default test secret used to create page cursors. */
  pageCursorSecret?: string;
  /** Optional deployment-owned dependency check for /readyz. */
  readinessProbe?: ReadinessProbe;
  /** Readiness deadline in milliseconds: > 0 and <= 2147483647; defaults to 2000. */
  readinessTimeoutMs?: number;
  /** Deployment-owned diagnostics receive only a safe classification, never probe errors. */
  onReadinessFailure?: (reason: ReadinessFailureReason) => void | Promise<void>;
}

function createBoundedReadinessProbe(options: AdtServerOptions) {
  const timeoutMs = options.readinessTimeoutMs ?? 2_000;
  if (
    !Number.isFinite(timeoutMs) ||
    timeoutMs <= 0 ||
    timeoutMs > 2_147_483_647
  ) {
    throw new Error('readinessTimeoutMs must be > 0 and <= 2147483647');
  }
  const readinessProbe = options.readinessProbe;
  if (!readinessProbe) return undefined;
  let inFlight: Promise<void> | undefined;
  const run = async (): Promise<void> => {
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let reason: ReadinessFailureReason = 'probe_failed';
    try {
      await Promise.race([
        Promise.resolve().then(() => readinessProbe(controller.signal)),
        new Promise<never>((_resolve, reject) => {
          timeout = setTimeout(() => {
            reason = 'timeout';
            reject(new Error('Readiness probe timed out'));
            controller.abort();
          }, timeoutMs);
        }),
      ]);
    } catch {
      try {
        void Promise.resolve(options.onReadinessFailure?.(reason)).catch(
          () => undefined,
        );
      } catch {
        // Diagnostics must not affect readiness or expose arbitrary reporter errors.
      }
      throw new Error('Readiness probe failed');
    } finally {
      clearTimeout(timeout);
    }
  };
  return (): Promise<void> => {
    inFlight ??= run().finally(() => {
      inFlight = undefined;
    });
    return inFlight;
  };
}

export interface RunningAdtServer {
  url: string;
  close(): Promise<void>;
}

function createServerSourceCapabilities(options: AdtServerOptions) {
  const mcpEnabled = !!options.mcp;
  const restEnabled = !!options.restAuthorizer;
  if (options.sourceCapabilities) return options.sourceCapabilities;
  if (!mcpEnabled && !restEnabled) return undefined;
  return createRestSourceCapabilityService({
    secret: assertSecret(
      options.sourceCapabilitiesSecret,
      'sourceCapabilitiesSecret',
    ),
  });
}

function createServerAtcDocumentationCapabilities(options: AdtServerOptions) {
  if (options.atcDocumentationCapabilities)
    return options.atcDocumentationCapabilities;
  if (!options.restAuthorizer) return undefined;
  return createRestAtcDocumentationCapabilityService({
    secret: assertSecret(
      options.atcDocumentationCapabilitiesSecret,
      'atcDocumentationCapabilitiesSecret',
    ),
  });
}

function createServerPageCursors(options: AdtServerOptions) {
  if (options.pageCursors) return options.pageCursors;
  if (!options.restAuthorizer) return undefined;
  return createRestPageCursorService({
    secret: assertSecret(options.pageCursorSecret, 'pageCursorSecret'),
  });
}

function createServerMcpHandler(
  options: AdtServerOptions,
  host: string,
  sourceCapabilities:
    ReturnType<typeof createRestSourceCapabilityService> | undefined,
) {
  if (!options.mcp) return undefined;
  const mcpOptions = options.mcp;
  return createHttpMcpHandler({
    host,
    allowedHosts: mcpOptions.allowedHosts,
    authMode: 'invocation',
    invocationVerifier: mcpOptions.invocationVerifier,
    destinationServer: {
      destinationRegistry: mcpOptions.destinationRegistry,
      requestIdentity: ({ invocation }) => {
        if (!invocation) {
          throw new Error('ADT Server MCP invocation is missing');
        }
        return {
          principal: invocation.principal,
          agentId: invocation.agentId,
        };
      },
      requestAccess: ({ invocation }) =>
        invocation
          ? {
              classes: invocation.classes,
              destinationKeys: invocation.destinationKeys,
            }
          : undefined,
      resolveFrozenSource: async (input) => {
        if (!sourceCapabilities) {
          throw new Error(
            'Source capabilities are required for frozen source resolution',
          );
        }
        return resolveMcpFrozenSource(
          mcpOptions.resolveFrozenSource,
          sourceCapabilities,
          input,
        );
      },
      ...(mcpOptions.consumeExecutionAuthorization
        ? {
            consumeExecutionAuthorization:
              mcpOptions.consumeExecutionAuthorization,
          }
        : {}),
      ...(mcpOptions.reportExecutionOutcome
        ? {
            reportExecutionOutcome: mcpOptions.reportExecutionOutcome,
          }
        : {}),
      ...(mcpOptions.executeWithDeadline
        ? { executeWithDeadline: mcpOptions.executeWithDeadline }
        : {}),
    },
  });
}

export async function startAdtServer(
  options: AdtServerOptions,
): Promise<RunningAdtServer> {
  const readinessProbe = createBoundedReadinessProbe(options);
  const host = options.host ?? '127.0.0.1';
  const sourceCapabilities = createServerSourceCapabilities(options);
  const atcDocumentationCapabilities =
    createServerAtcDocumentationCapabilities(options);
  const pageCursors = createServerPageCursors(options);
  const mcpHandler = createServerMcpHandler(options, host, sourceCapabilities);

  const server = http.createServer(
    createRequestHandler({
      options,
      readinessProbe,
      mcpHandler,
      sourceCapabilities,
      atcDocumentationCapabilities,
      pageCursors,
    }),
  );
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port ?? 3002, host, () => resolve());
  });

  const address = server.address() as { port: number };
  let closed = false;
  return {
    url: `http://${host}:${address.port}`,
    close: async () => {
      if (closed) return;
      closed = true;
      const listenerClosed = new Promise<void>((resolve) =>
        server.close(() => resolve()),
      );
      try {
        await mcpHandler?.close();
        await options.mcp?.destinationRegistry.shutdown();
      } finally {
        server.closeAllConnections();
        await listenerClosed;
      }
    },
  };
}
