import {
  buildTransportSourceManifest,
  listObjectSourceVersions,
  type BuildTransportSourceManifestOptions,
  type ObjectSourceVersionsResult,
  type TransportObjectSelector,
  type TransportSourceManifest,
} from '@abapify/adk';
import type { AdtClient, SourceVersionRef } from '@abapify/adt-client';

export interface ListObjectVersionsInput {
  objectName: string;
  objectType: string;
  component?: string;
}

export type ListObjectVersionsResult = ObjectSourceVersionsResult;

export interface GetVersionSourceInput {
  uri: string;
}

export interface BuildTransportManifestInput {
  transports: string[];
  selector?: TransportObjectSelector;
  concurrency?: number;
}

export type BuildTransportManifestResult = TransportSourceManifest;

export type ExactSourceHistoryServiceErrorCode =
  | 'SOURCE_VERSION_LIST_FAILED'
  | 'SOURCE_VERSION_READ_FAILED'
  | 'TRANSPORT_SOURCE_MANIFEST_FAILED';

/**
 * Safe delivery-layer failure that deliberately excludes adapter response
 * bodies, credentials, and ABAP source text.
 */
export class ExactSourceHistoryServiceError extends Error {
  constructor(
    readonly code: ExactSourceHistoryServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ExactSourceHistoryServiceError';
  }
}

export interface ExactSourceHistoryOperations {
  listObjectSourceVersions: typeof listObjectSourceVersions;
  buildTransportSourceManifest: typeof buildTransportSourceManifest;
}

const DEFAULT_OPERATIONS: ExactSourceHistoryOperations = {
  listObjectSourceVersions,
  buildTransportSourceManifest,
};

function isSafeSourceHistoryError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = (error as Error & { code?: unknown }).code;
  return (
    typeof code === 'string' &&
    (error.name === 'SourceHistoryProtocolError' ||
      error.name === 'ObjectSourceHistoryError')
  );
}

/**
 * Shared source-history delivery service used by CLI and MCP.
 *
 * The class is deliberately free of Commander, stdout, file-system, and
 * process-exit concerns. It returns ADK/client domain values directly so both
 * delivery surfaces expose the same normalized records.
 */
/**
 * Strip server-relative source locators from a listing so that only object
 * identity, component ids, and transport provenance remain.
 */
export function toMetadataOnlySourceVersionListing(
  result: ListObjectVersionsResult,
): unknown {
  return {
    object: result.object,
    components: result.components.map((component) => ({
      id: component.id,
      ...('versions' in component &&
      Array.isArray((component as { versions?: unknown }).versions)
        ? {
            versions: (
              component as { versions: SourceVersionRef[] }
            ).versions.map(({ sourceUri: _sourceUri, ...version }) => version),
          }
        : {}),
      ...('diagnostic' in component &&
      (component as { diagnostic?: unknown }).diagnostic !== undefined
        ? { diagnostic: (component as { diagnostic?: unknown }).diagnostic }
        : {}),
    })),
  };
}

/**
 * Strip source locators from a transport manifest so that only object
 * identity, change metadata, and transport provenance remain.
 */
export function toMetadataOnlyTransportSourceManifest(
  manifest: BuildTransportManifestResult,
): unknown {
  return {
    requestedTransports: manifest.requestedTransports,
    scopeTransports: manifest.scopeTransports,
    inventory: manifest.inventory.map(({ uri: _uri, ...entry }) => entry),
    entries: manifest.entries.map((entry) => {
      const { sourceUri: _s, versionsUri: _v, ...component } = entry.component;
      const stripSourceUri = (
        ref: SourceVersionRef,
      ): Omit<SourceVersionRef, 'sourceUri'> => {
        const { sourceUri: _, ...rest } = ref;
        return rest as Omit<SourceVersionRef, 'sourceUri'>;
      };
      return {
        ...entry,
        component,
        ...(entry.base !== undefined
          ? { base: stripSourceUri(entry.base) }
          : {}),
        ...(entry.head !== undefined
          ? { head: stripSourceUri(entry.head) }
          : {}),
      };
    }),
  };
}

export class ExactSourceHistoryService {
  constructor(
    private readonly client: AdtClient,
    private readonly operations: ExactSourceHistoryOperations = DEFAULT_OPERATIONS,
  ) {}

  async listObjectVersions(
    input: ListObjectVersionsInput,
  ): Promise<ListObjectVersionsResult> {
    try {
      return await this.operations.listObjectSourceVersions(
        input.objectName,
        input.objectType,
        input.component !== undefined ? { component: input.component } : {},
        { client: this.client },
      );
    } catch (error) {
      if (isSafeSourceHistoryError(error)) throw error;
      throw new ExactSourceHistoryServiceError(
        'SOURCE_VERSION_LIST_FAILED',
        'SAP ADT source-version metadata retrieval failed.',
      );
    }
  }

  async getVersionSource(input: GetVersionSourceInput): Promise<string> {
    try {
      return await this.client.services.sourceHistory.readVersionSource(
        input.uri,
      );
    } catch (error) {
      if (isSafeSourceHistoryError(error)) throw error;
      throw new ExactSourceHistoryServiceError(
        'SOURCE_VERSION_READ_FAILED',
        'SAP ADT immutable source retrieval failed.',
      );
    }
  }

  async buildTransportManifest(
    input: BuildTransportManifestInput,
  ): Promise<BuildTransportManifestResult> {
    const options: BuildTransportSourceManifestOptions = {
      ...(input.selector ? { selector: input.selector } : {}),
      ...(input.concurrency !== undefined
        ? { concurrency: input.concurrency }
        : {}),
    };

    try {
      return await this.operations.buildTransportSourceManifest(
        input.transports,
        options,
        { client: this.client },
      );
    } catch {
      throw new ExactSourceHistoryServiceError(
        'TRANSPORT_SOURCE_MANIFEST_FAILED',
        'SAP ADT transport source-manifest construction failed.',
      );
    }
  }
}
