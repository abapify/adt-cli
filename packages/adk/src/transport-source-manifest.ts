import { assertAdtUri, type SourceVersionRef } from '@abapify/adt-client';
import type { AdkContext } from './base/context';
import { getGlobalContext } from './base/global-context';
import { getEndpointForType, normalizeObjectName } from './base/registry';
import { createAdkFactory } from './factory';
import { AdkFunctionModule } from './objects/repository/fugr';
import {
  resolveTransportObjects,
  type ResolvedTransportObjects,
  type TransportObjectSelector,
} from './objects/cts';

export type TransportSourceChangeKind =
  'added' | 'modified' | 'deleted' | 'ambiguous' | 'unsupported' | 'failed';

export type SourceHistoryDiagnosticCode =
  | 'DELETED_SOURCE_BASE_UNAVAILABLE'
  | 'OBJECT_METADATA_LOAD_FAILED'
  | 'OBJECT_METADATA_UNAVAILABLE'
  | 'OBJECT_TYPE_UNSUPPORTED'
  | 'SOURCE_COMPONENT_NOT_FOUND'
  | 'SOURCE_COMPONENTS_UNAVAILABLE'
  | 'SOURCE_COMPONENT_URI_UNSAFE'
  | 'SOURCE_COMPONENT_VERSIONS_UNAVAILABLE'
  | 'SOURCE_HISTORY_INTERVENING_VERSION'
  | 'SOURCE_HISTORY_ORDER_INVALID'
  | 'SOURCE_HISTORY_PROVENANCE_MISSING'
  | 'SOURCE_HISTORY_RETRIEVAL_FAILED'
  | 'SOURCE_HISTORY_SCOPE_VERSION_MISSING';

export interface SourceHistoryDiagnostic {
  code: SourceHistoryDiagnosticCode;
  message: string;
}

export type TransportSourceDiagnostic = SourceHistoryDiagnostic;

export interface ObjectSourceHistoryIdentity {
  name: string;
  type: string;
  packageName?: string;
}

export interface ListObjectSourceVersionsOptions {
  component?: string;
}

export type ObjectSourceVersionsComponent =
  | (TransportSourceManifestComponent & {
      versions: SourceVersionRef[];
      diagnostic?: never;
    })
  | (TransportSourceManifestComponent & {
      versions?: never;
      diagnostic: SourceHistoryDiagnostic;
    });

export interface ObjectSourceVersionsResult {
  object: ObjectSourceHistoryIdentity;
  components: ObjectSourceVersionsComponent[];
}

export type ObjectSourceHistoryErrorCode =
  | 'OBJECT_METADATA_LOAD_FAILED'
  | 'OBJECT_METADATA_UNAVAILABLE'
  | 'OBJECT_TYPE_UNSUPPORTED'
  | 'SOURCE_COMPONENT_NOT_FOUND'
  | 'SOURCE_COMPONENTS_UNAVAILABLE';

/** Stable public failure for errors that occur before a component result exists. */
export class ObjectSourceHistoryError extends Error {
  override readonly name = 'ObjectSourceHistoryError';

  constructor(
    readonly code: ObjectSourceHistoryErrorCode,
    message: string,
    readonly object: ObjectSourceHistoryIdentity,
  ) {
    super(message);
  }
}

export interface TransportSourceVersionSelection {
  changeKind: TransportSourceChangeKind;
  exact: boolean;
  base?: SourceVersionRef;
  head?: SourceVersionRef;
  diagnostic?: TransportSourceDiagnostic;
}

export interface TransportSourceManifestObject {
  pgmid: string;
  type: string;
  name: string;
  packageName?: string;
}

export interface TransportSourceManifestComponent {
  id: string;
  sourceUri?: string;
  versionsUri?: string;
}

export interface TransportSourceManifestEntry extends TransportSourceVersionSelection {
  object: TransportSourceManifestObject;
  repositoryObject?: TransportSourceManifestObject;
  component: TransportSourceManifestComponent;
  sourceTransport: string;
}

export interface TransportObjectInventoryEntry {
  pgmid: string;
  type: string;
  name: string;
  wbtype?: string;
  uri?: string;
  objFunc: string;
  sourceTransport: string;
}

export interface TransportSourceManifest {
  requestedTransports: string[];
  scopeTransports: string[];
  inventory: TransportObjectInventoryEntry[];
  entries: TransportSourceManifestEntry[];
}

export interface BuildTransportSourceManifestOptions {
  selector?: TransportObjectSelector;
  concurrency?: number;
}

interface RuntimeLink {
  href?: unknown;
  rel?: unknown;
}

interface DiscoveredComponent extends TransportSourceManifestComponent {
  diagnostic?: TransportSourceDiagnostic;
}

const VERSIONS_RELATION = 'http://www.sap.com/adt/relations/versions';
const DEFAULT_CONCURRENCY = 4;
const MAX_CONCURRENCY = 32;
const RELATIVE_URI_TRAVERSAL = /(?:^|\/)(?:\.{1,2}|%2e(?:%2e)?)(?:\/|$)/i;
const NON_SOURCE_CTS_OBJECT_KEYS = new Set(['R3TR/SUSK']);

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : undefined;
}

function asArray(value: unknown): unknown[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function uniqueStable(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = value.trim().toUpperCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

/**
 * Some CTS entries represent SAP-maintained configuration rather than
 * repository source. They have neither an ADK source model nor an abapGit
 * representation, so they must not participate in a source-boundary manifest.
 */
function isNonSourceCtsObject(reference: {
  pgmid: string;
  type: string;
}): boolean {
  return NON_SOURCE_CTS_OBJECT_KEYS.has(
    `${reference.pgmid.trim().toUpperCase()}/${reference.type.trim().toUpperCase()}`,
  );
}

function isUnsafeRelativeHref(href: string): boolean {
  return (
    href.startsWith('//') ||
    href.includes('\\') ||
    href.includes(':') ||
    RELATIVE_URI_TRAVERSAL.test(href)
  );
}

function resolveAdtRelativeUri(
  href: string,
  objectUri: string,
): string | undefined {
  try {
    const safeObjectUri = assertAdtUri(objectUri);
    if (href.startsWith('/')) return assertAdtUri(href);
    if (isUnsafeRelativeHref(href)) return undefined;

    const directoryBase = safeObjectUri.endsWith('/')
      ? safeObjectUri
      : `${safeObjectUri}/`;
    const resolved = new URL(href, `https://adt.invalid${directoryBase}`);
    return assertAdtUri(
      `${resolved.pathname}${resolved.search}${resolved.hash}`,
    );
  } catch {
    return undefined;
  }
}

function runtimeLinks(value: Record<string, unknown>): RuntimeLink[] {
  return [...asArray(value['link']), ...asArray(value['links'])]
    .map(asRecord)
    .filter((link): link is Record<string, unknown> => Boolean(link));
}

function discoverComponent(
  value: Record<string, unknown>,
  id: string,
  objectUri: string,
): DiscoveredComponent | undefined {
  const sourceHref = nonEmptyString(value['sourceUri']);
  if (!sourceHref) return undefined;

  const sourceUri = resolveAdtRelativeUri(sourceHref, objectUri);
  const versionsHref = runtimeLinks(value)
    .filter((link) => link.rel === VERSIONS_RELATION)
    .map((link) => nonEmptyString(link.href))
    .find((href): href is string => Boolean(href));
  const versionsUri = versionsHref
    ? resolveAdtRelativeUri(versionsHref, objectUri)
    : undefined;

  if (!sourceUri) {
    return {
      id,
      diagnostic: {
        code: 'SOURCE_COMPONENT_URI_UNSAFE',
        message: 'The source component exposes an unsafe ADT URI.',
      },
    };
  }
  if (versionsHref && !versionsUri) {
    return {
      id,
      diagnostic: {
        code: 'SOURCE_COMPONENT_URI_UNSAFE',
        message: 'The source component exposes an unsafe ADT URI.',
      },
    };
  }

  return {
    id,
    sourceUri,
    ...(versionsUri ? { versionsUri } : {}),
  };
}

function discoverSourceComponents(
  metadata: Record<string, unknown>,
  objectUri: string,
): DiscoveredComponent[] {
  const candidates: DiscoveredComponent[] = [];
  const root = discoverComponent(metadata, 'main', objectUri);
  if (root) candidates.push(root);

  for (const [index, rawInclude] of asArray(metadata['include']).entries()) {
    const include = asRecord(rawInclude);
    if (!include) continue;
    const id =
      nonEmptyString(include['includeType']) ??
      nonEmptyString(include['name']) ??
      `include-${index + 1}`;
    const component = discoverComponent(include, id, objectUri);
    if (component) candidates.push(component);
  }

  candidates.sort(
    (left, right) =>
      compareText(left.id, right.id) ||
      compareText(left.sourceUri ?? '', right.sourceUri ?? '') ||
      compareText(left.versionsUri ?? '', right.versionsUri ?? ''),
  );

  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = `${candidate.sourceUri ?? ''}\u0000${candidate.versionsUri ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function loadedMetadata(loaded: unknown): Record<string, unknown> | undefined {
  const object = asRecord(loaded);
  if (!object) return undefined;
  const dataSync = asRecord(object['dataSync']);
  if (dataSync) return dataSync;
  return asRecord(object['data']);
}

function packageNameFrom(
  metadata: Record<string, unknown>,
): string | undefined {
  const packageRef = asRecord(metadata['packageRef']);
  return (
    nonEmptyString(packageRef?.['name']) ??
    nonEmptyString(metadata['packageName'])
  );
}

function normalizeSourceHistoryIdentity(
  objectName: string,
  objectType: string,
): ObjectSourceHistoryIdentity {
  const type = objectType.trim().toUpperCase();
  const requestedName = objectName.trim().toUpperCase();
  const name = normalizeObjectName(requestedName, type)[0] ?? requestedName;
  return { name, type };
}

interface ObjectSourceDiscovery {
  object: ObjectSourceHistoryIdentity;
  components: DiscoveredComponent[];
}

function ensureObjectLoadable(
  modelRecord: Record<string, unknown> | undefined,
  object: ObjectSourceHistoryIdentity,
): () => unknown {
  const load = modelRecord?.['load'];
  if (typeof load !== 'function') {
    throw new ObjectSourceHistoryError(
      'OBJECT_TYPE_UNSUPPORTED',
      'The repository object type has no loadable ADK model.',
      object,
    );
  }
  return load as () => unknown;
}

async function loadObjectModel(
  model: unknown,
  load: () => unknown,
  object: ObjectSourceHistoryIdentity,
): Promise<void> {
  try {
    await load.call(model);
  } catch {
    throw new ObjectSourceHistoryError(
      'OBJECT_METADATA_LOAD_FAILED',
      'SAP ADT rejected repository object metadata retrieval.',
      object,
    );
  }
}

function ensureObjectMetadata(
  model: unknown,
  object: ObjectSourceHistoryIdentity,
): { metadata: Record<string, unknown>; objectUri: string } {
  const modelRecord = asRecord(model);
  const metadata = loadedMetadata(model);
  if (!metadata) {
    throw new ObjectSourceHistoryError(
      'OBJECT_METADATA_UNAVAILABLE',
      'The loaded object has no usable ADT metadata identity.',
      object,
    );
  }
  const objectUri = nonEmptyString(modelRecord?.['objectUri']);
  if (!objectUri) {
    throw new ObjectSourceHistoryError(
      'OBJECT_METADATA_UNAVAILABLE',
      'The loaded object has no usable ADT metadata identity.',
      object,
    );
  }
  if (!resolveAdtRelativeUri('', objectUri)) {
    throw new ObjectSourceHistoryError(
      'OBJECT_METADATA_UNAVAILABLE',
      'The loaded object has no usable ADT metadata identity.',
      object,
    );
  }
  return { metadata, objectUri };
}

async function discoverObjectSourceHistory(
  objectName: string,
  objectType: string,
  ctx: AdkContext,
  normalizeIdentity = true,
  functionGroupName?: string,
): Promise<ObjectSourceDiscovery> {
  const object = normalizeIdentity
    ? normalizeSourceHistoryIdentity(objectName, objectType)
    : { name: objectName, type: objectType };
  let model: unknown;
  if (object.type === 'FUGR/FF' && functionGroupName) {
    try {
      model = await AdkFunctionModule.get(functionGroupName, object.name, ctx);
    } catch {
      throw new ObjectSourceHistoryError(
        'OBJECT_METADATA_LOAD_FAILED',
        'SAP ADT rejected repository object metadata retrieval.',
        object,
      );
    }
  } else {
    model = createAdkFactory(ctx).get(object.name, object.type);
    const load = ensureObjectLoadable(asRecord(model), object);
    await loadObjectModel(model, load, object);
  }

  const { metadata, objectUri } = ensureObjectMetadata(model, object);

  let packageName = packageNameFrom(metadata);
  // Function-module metadata has no top-level packageRef; inherit the
  // owning function group's package so the manifest entry stays scoped.
  if (!packageName && functionGroupName) {
    const fugrModel = createAdkFactory(ctx).get(functionGroupName, 'FUGR');
    const fugrLoad = ensureObjectLoadable(asRecord(fugrModel), {
      name: functionGroupName,
      type: 'FUGR',
    });
    await loadObjectModel(fugrModel, fugrLoad, {
      name: functionGroupName,
      type: 'FUGR',
    });
    const fugrMetadata = loadedMetadata(fugrModel);
    if (fugrMetadata) {
      packageName = packageNameFrom(fugrMetadata);
    }
  }
  const normalizedObject = {
    ...object,
    ...(packageName ? { packageName } : {}),
  };
  const components = discoverSourceComponents(metadata, objectUri);
  if (components.length === 0) {
    throw new ObjectSourceHistoryError(
      'SOURCE_COMPONENTS_UNAVAILABLE',
      'The object metadata exposes no source component.',
      normalizedObject,
    );
  }

  return { object: normalizedObject, components };
}

function normalizeConcurrency(value: number | undefined): number {
  if (value === undefined) return DEFAULT_CONCURRENCY;
  if (!Number.isFinite(value)) return DEFAULT_CONCURRENCY;
  return Math.max(1, Math.min(MAX_CONCURRENCY, Math.floor(value)));
}

async function mapOrdered<T, R>(
  values: readonly T[],
  concurrency: number,
  worker: (value: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, values.length) },
    async () => {
      while (nextIndex < values.length) {
        const index = nextIndex;
        nextIndex += 1;
        const value = values[index];
        if (value !== undefined) results[index] = await worker(value);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

function unavailableEntry(
  object: TransportSourceManifestObject,
  component: TransportSourceManifestComponent,
  sourceTransport: string,
  changeKind: 'unsupported' | 'failed',
  diagnostic: TransportSourceDiagnostic,
): TransportSourceManifestEntry {
  return {
    object,
    component,
    sourceTransport,
    changeKind,
    exact: false,
    diagnostic,
  };
}

function selectedRangeDiagnostic(
  ordered: readonly SourceVersionRef[],
  newestIndex: number,
  oldestIndex: number,
  scope: ReadonlySet<string>,
): TransportSourceDiagnostic | undefined {
  for (const candidate of ordered.slice(newestIndex, oldestIndex + 1)) {
    if (
      candidate.transports.some((transport) =>
        scope.has(transport.toUpperCase()),
      )
    ) {
      continue;
    }

    return candidate.transports.length === 0
      ? {
          code: 'SOURCE_HISTORY_PROVENANCE_MISSING',
          message:
            'A source version in the selected history range has no transport provenance.',
        }
      : {
          code: 'SOURCE_HISTORY_INTERVENING_VERSION',
          message:
            'An unrelated source version occurs between in-scope versions.',
        };
  }

  return undefined;
}

/**
 * Select immutable before/after references using SAP's observed feed ordinal.
 */
export function selectTransportSourceVersions( // NOSONAR - SAP feed-order selection is inherently branch-heavy; will be refactored in follow-up
  versions: readonly SourceVersionRef[],
  scopeTransportNumbers: readonly string[],
  deleted = false,
): TransportSourceVersionSelection {
  const scope = new Set(
    scopeTransportNumbers.map((transport) => transport.toUpperCase()),
  );
  const ordinals = versions.map((version) => version.ordinal);
  if (
    ordinals.some((ordinal) => !Number.isSafeInteger(ordinal) || ordinal < 0) ||
    new Set(ordinals).size !== ordinals.length
  ) {
    return {
      changeKind: 'ambiguous',
      exact: false,
      diagnostic: {
        code: 'SOURCE_HISTORY_ORDER_INVALID',
        message: 'Source version ordinals do not define a unique feed order.',
      },
    };
  }

  const ordered = [...versions].sort(
    (left, right) => left.ordinal - right.ordinal,
  );
  const inScope = ordered
    .map((candidate, index) => ({ candidate, index }))
    .filter(({ candidate }) =>
      candidate.transports.some((transport) =>
        scope.has(transport.toUpperCase()),
      ),
    );

  if (deleted) {
    if (ordered.length === 0) {
      return {
        changeKind: 'unsupported',
        exact: false,
        diagnostic: {
          code: 'DELETED_SOURCE_BASE_UNAVAILABLE',
          message:
            'The deleted component has no recoverable historical source.',
        },
      };
    }
    const oldestInScope = inScope.at(-1);
    if (!oldestInScope) {
      return {
        changeKind: 'ambiguous',
        exact: false,
        diagnostic: {
          code: 'SOURCE_HISTORY_SCOPE_VERSION_MISSING',
          message:
            'No source version is attributed to the requested transport scope.',
        },
      };
    }
    const base = ordered[oldestInScope.index + 1];
    const rangeDiagnostic = selectedRangeDiagnostic(
      ordered,
      inScope[0]!.index,
      oldestInScope.index,
      scope,
    );
    if (rangeDiagnostic) {
      return {
        changeKind: 'ambiguous',
        exact: false,
        ...(base ? { base } : {}),
        diagnostic: rangeDiagnostic,
      };
    }
    return base
      ? { changeKind: 'deleted', exact: true, base }
      : {
          changeKind: 'unsupported',
          exact: false,
          diagnostic: {
            code: 'DELETED_SOURCE_BASE_UNAVAILABLE',
            message:
              'The deleted component has no recoverable historical source.',
          },
        };
  }

  if (inScope.length === 0) {
    return {
      changeKind: 'ambiguous',
      exact: false,
      diagnostic: {
        code: 'SOURCE_HISTORY_SCOPE_VERSION_MISSING',
        message:
          'No source version is attributed to the requested transport scope.',
      },
    };
  }

  const newest = inScope[0];
  const oldest = inScope.at(-1);
  if (!newest || !oldest) {
    throw new Error('Unreachable source-history selection state.');
  }

  const head = newest.candidate;
  const base = ordered[oldest.index + 1];
  const rangeDiagnostic = selectedRangeDiagnostic(
    ordered,
    newest.index,
    oldest.index,
    scope,
  );
  if (rangeDiagnostic) {
    return {
      changeKind: 'ambiguous',
      exact: false,
      ...(base ? { base } : {}),
      head,
      diagnostic: rangeDiagnostic,
    };
  }

  return base
    ? { changeKind: 'modified', exact: true, base, head }
    : { changeKind: 'added', exact: true, head };
}

type TransportObjectReference = ResolvedTransportObjects['objects'][number];

interface RepositoryObjectReference {
  pgmid: string;
  type: string;
  name: string;
  isDeleted: boolean;
  functionGroupName?: string;
}

function repositoryNameFromUri(
  uri: string | undefined,
  type: string,
): string | undefined {
  if (!uri) return undefined;
  const endpoint = getEndpointForType(type);
  if (!endpoint) return undefined;
  const prefix = `/sap/bc/adt/${endpoint}/`;
  if (!uri.startsWith(prefix)) return undefined;
  const encodedName = uri.slice(prefix.length).split('/')[0];
  if (!encodedName) return undefined;
  try {
    const name = decodeURIComponent(encodedName).trim().toUpperCase();
    return name || undefined;
  } catch {
    return undefined;
  }
}

// Some SAP releases expose a function-module change as R3TR/FUNC rather
// than LIMU/FUNC. Function-module source history belongs to its function
// group, whose identity is supplied by the ADT URI.
function resolveFuncGroupReference(
  reference: TransportObjectReference,
  rawType: string,
): RepositoryObjectReference | undefined {
  if (rawType !== 'FUNC') return undefined;
  const ownerName = repositoryNameFromUri(reference.uri, 'FUGR');
  if (!ownerName) return undefined;
  return {
    pgmid: 'R3TR',
    type: 'FUGR',
    name: ownerName,
    isDeleted: false,
  };
}

async function resolveFuncGroupBySearch(
  reference: TransportObjectReference,
  context: AdkContext,
): Promise<RepositoryObjectReference | undefined> {
  if (
    reference.pgmid.trim().toUpperCase() !== 'LIMU' ||
    reference.type.trim().toUpperCase() !== 'FUNC' ||
    reference.wbtype?.trim().toUpperCase().split('/')[0] !== 'FUGR'
  )
    return undefined;
  try {
    const result =
      (await context.client.adt.repository.informationsystem.search.quickSearch(
        { query: reference.name, maxResults: 10 },
      )) as Record<string, unknown>;
    // The quick-search response may nest references under
    // `objectReferences` or `mainObject`, or expose a top-level
    // `objectReference`. Accept all three shapes.
    const container =
      asRecord(result['objectReferences']) ?? asRecord(result['mainObject']);
    const raw = container?.['objectReference'] ?? result['objectReference'];
    const matches = (Array.isArray(raw) ? raw : [raw])
      .map(asRecord)
      .filter((item): item is Record<string, unknown> => Boolean(item));
    // Match by exact function-module name, then pick the first result
    // whose URI resolves to a FUGR owner. This avoids a same-named
    // non-FUGR object (e.g. FUGR/F) masking the valid function-group
    // result when it appears earlier in the response.
    const ownerName = matches
      .filter(
        (item) =>
          nonEmptyString(item['name'])?.toUpperCase() ===
          reference.name.trim().toUpperCase(),
      )
      .map((item) => repositoryNameFromUri(nonEmptyString(item['uri']), 'FUGR'))
      .find((name): name is string => Boolean(name));
    return ownerName
      ? {
          pgmid: 'R3TR',
          type: 'FUGR/FF',
          name: reference.name.trim().toUpperCase(),
          functionGroupName: ownerName,
          isDeleted: reference.isDeleted,
        }
      : undefined;
  } catch {
    return undefined;
  }
}

function resolveLimuReference(
  reference: TransportObjectReference,
  pgmid: string,
  rawType: string,
): RepositoryObjectReference | undefined {
  if (pgmid !== 'LIMU') return undefined;
  const ownerType = reference.wbtype?.trim().toUpperCase();
  const ownerName = ownerType
    ? repositoryNameFromUri(reference.uri, ownerType)
    : undefined;
  if (ownerType && ownerName) {
    return {
      pgmid: 'R3TR',
      type: ownerType,
      name: ownerName,
      // A deleted leaf changes its owner. Only REPS preserves the legacy
      // whole-program deletion behavior when no R3TR parent is present.
      isDeleted: rawType === 'REPS' && reference.isDeleted,
    };
  }
  if (rawType === 'REPS') {
    return {
      pgmid: 'R3TR',
      type: 'PROG',
      name: reference.name.trim().toUpperCase(),
      isDeleted: reference.isDeleted,
    };
  }
  return undefined;
}

function fallbackReference(
  reference: TransportObjectReference,
  pgmid: string,
  rawTypeFull: string,
): RepositoryObjectReference {
  return {
    pgmid,
    type: rawTypeFull,
    name: reference.name.trim().toUpperCase(),
    isDeleted: reference.isDeleted,
  };
}

/** Resolve a CTS object to the repository object that owns its source. */
async function repositoryObjectReference(
  reference: TransportObjectReference,
  context: AdkContext,
): Promise<RepositoryObjectReference> {
  const pgmid = reference.pgmid.trim().toUpperCase();
  const rawTypeFull = reference.type.trim().toUpperCase();
  const rawType = rawTypeFull.split('/')[0] ?? '';
  return (
    resolveFuncGroupReference(reference, rawType) ??
    (await resolveFuncGroupBySearch(reference, context)) ??
    resolveLimuReference(reference, pgmid, rawType) ??
    fallbackReference(reference, pgmid, rawTypeFull)
  );
}

function selectorValues(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return (Array.isArray(value) ? value : [value]).map((item) =>
    item.trim().toUpperCase(),
  );
}

function selectorDimensionMatches(
  candidates: readonly string[],
  expected: string | string[] | undefined,
): boolean {
  const values = selectorValues(expected);
  if (values.length === 0) return true;
  return values.some((value) => value === '*' || candidates.includes(value));
}

function manifestSelectorMatches(
  original: TransportObjectReference,
  repository: RepositoryObjectReference,
  selector: TransportObjectSelector | undefined,
): boolean {
  if (!selector) return true;
  const repositoryType = repository.type.trim().toUpperCase();
  const repositoryMainType = repositoryType.split('/')[0] ?? '';
  return (
    selectorDimensionMatches(
      [original.objFunc.trim().toUpperCase()],
      selector.objFunc,
    ) &&
    selectorDimensionMatches(
      [original.pgmid.trim().toUpperCase(), repository.pgmid],
      selector.pgmid,
    ) &&
    selectorDimensionMatches(
      [
        original.type.trim().toUpperCase(),
        repositoryType,
        ...(repositoryMainType && repositoryMainType !== repositoryType
          ? [repositoryMainType]
          : []),
      ],
      selector.type,
    )
  );
}

function inventoryEntry(
  reference: TransportObjectReference,
  sourceTransport: string,
): TransportObjectInventoryEntry {
  const wbtype = reference.wbtype?.trim().toUpperCase();
  const uri = reference.uri?.trim();
  return {
    pgmid: reference.pgmid.trim().toUpperCase(),
    type: reference.type.trim().toUpperCase(),
    name: reference.name.trim().toUpperCase(),
    ...(wbtype ? { wbtype } : {}),
    ...(uri ? { uri } : {}),
    objFunc: reference.objFunc.trim().toUpperCase(),
    sourceTransport,
  };
}

/**
 * CTS exposes a program's main source as the LIMU/REPS sub-object, while ADT
 * exposes the same source history through the repository PROG resource. Keep
 * the CTS key in the public manifest, but use the ADT model identity for
 * metadata and immutable-version discovery.
 */
function sourceHistoryDiscoveryType(
  reference: RepositoryObjectReference,
): string {
  const pgmid = reference.pgmid.trim().toUpperCase();
  const type = reference.type.trim().toUpperCase().split('/')[0];
  return pgmid === 'LIMU' && type === 'REPS' ? 'PROG' : reference.type;
}

async function buildObjectEntries( // NOSONAR - SAP object manifest construction is branch-heavy; will be refactored in follow-up
  original: TransportObjectReference,
  repository: RepositoryObjectReference,
  sourceTransport: string,
  scopeTransportNumbers: readonly string[],
  ctx: AdkContext,
): Promise<TransportSourceManifestEntry[]> {
  const baseIdentity: TransportSourceManifestObject = {
    pgmid: original.pgmid,
    type: original.type,
    name: original.name,
  };
  const hasRepositoryOwner =
    repository.pgmid !== baseIdentity.pgmid ||
    repository.type !== baseIdentity.type ||
    repository.name !== baseIdentity.name;
  const withRepositoryOwner = (
    entry: TransportSourceManifestEntry,
    packageName?: string,
  ): TransportSourceManifestEntry =>
    hasRepositoryOwner
      ? {
          ...entry,
          repositoryObject: {
            pgmid: repository.pgmid,
            type: repository.functionGroupName ? 'FUGR' : repository.type,
            name: repository.functionGroupName ?? repository.name,
            ...(packageName ? { packageName } : {}),
          },
        }
      : entry;
  let discovery: ObjectSourceDiscovery;
  try {
    discovery = await discoverObjectSourceHistory(
      repository.name,
      sourceHistoryDiscoveryType(repository),
      ctx,
      false,
      repository.functionGroupName,
    );
  } catch (error) {
    if (!(error instanceof ObjectSourceHistoryError)) throw error;
    const failureIdentity: TransportSourceManifestObject = {
      ...baseIdentity,
      ...(error.object.packageName
        ? { packageName: error.object.packageName }
        : {}),
    };
    return [
      withRepositoryOwner(
        unavailableEntry(
          failureIdentity,
          { id: 'object' },
          sourceTransport,
          'unsupported',
          {
            code: error.code,
            message: error.message,
          },
        ),
      ),
    ];
  }

  const identity: TransportSourceManifestObject = {
    ...baseIdentity,
    ...(discovery.object.packageName
      ? { packageName: discovery.object.packageName }
      : {}),
  };

  // A function module is a child of its function group. The generic
  // root-source id is only unique within one object, so use the FM name
  // as the source-map key. This rename is scoped to the transport
  // manifest (the flow source map) so the public
  // listObjectSourceVersions API keeps returning the real root id.
  const manifestComponents =
    repository.type === 'FUGR/FF'
      ? discovery.components.map((component) =>
          component.id === 'main'
            ? { ...component, id: repository.name.toLowerCase() }
            : component,
        )
      : discovery.components;

  const entries: TransportSourceManifestEntry[] = [];
  for (const component of manifestComponents) {
    const publicComponent: TransportSourceManifestComponent = {
      id: component.id,
      ...(component.sourceUri ? { sourceUri: component.sourceUri } : {}),
      ...(component.versionsUri ? { versionsUri: component.versionsUri } : {}),
    };

    if (component.diagnostic) {
      entries.push(
        withRepositoryOwner(
          unavailableEntry(
            identity,
            publicComponent,
            sourceTransport,
            'unsupported',
            component.diagnostic,
          ),
          discovery.object.packageName,
        ),
      );
      continue;
    }

    if (!component.versionsUri) {
      entries.push(
        withRepositoryOwner(
          unavailableEntry(
            identity,
            publicComponent,
            sourceTransport,
            'unsupported',
            {
              code: 'SOURCE_COMPONENT_VERSIONS_UNAVAILABLE',
              message: 'The source component has no exact versions relation.',
            },
          ),
          discovery.object.packageName,
        ),
      );
      continue;
    }

    let versions: SourceVersionRef[];
    try {
      versions = await ctx.client.services.sourceHistory.listVersions(
        component.versionsUri,
      );
    } catch {
      entries.push(
        withRepositoryOwner(
          unavailableEntry(
            identity,
            publicComponent,
            sourceTransport,
            'failed',
            {
              code: 'SOURCE_HISTORY_RETRIEVAL_FAILED',
              message: 'SAP ADT rejected source-history metadata retrieval.',
            },
          ),
          discovery.object.packageName,
        ),
      );
      continue;
    }

    const selection = selectTransportSourceVersions(
      versions,
      scopeTransportNumbers,
      repository.isDeleted,
    );
    entries.push(
      withRepositoryOwner(
        {
          object: identity,
          component: publicComponent,
          sourceTransport,
          ...selection,
        },
        discovery.object.packageName,
      ),
    );
  }

  return entries;
}

/**
 * List immutable source-version metadata for every discovered object component.
 * Source bodies remain lazy and are never read by this operation.
 */
export async function listObjectSourceVersions(
  objectName: string,
  objectType: string,
  options: ListObjectSourceVersionsOptions = {},
  ctx?: AdkContext,
): Promise<ObjectSourceVersionsResult> {
  const context = ctx ?? getGlobalContext();
  const discovery = await discoverObjectSourceHistory(
    objectName,
    objectType,
    context,
  );
  const requestedComponent = options.component?.trim().toUpperCase();
  const components =
    options.component !== undefined
      ? discovery.components.filter(
          (component) => component.id.toUpperCase() === requestedComponent,
        )
      : discovery.components;
  if (components.length === 0) {
    throw new ObjectSourceHistoryError(
      'SOURCE_COMPONENT_NOT_FOUND',
      'The requested source component was not exposed by object metadata.',
      discovery.object,
    );
  }

  const results: ObjectSourceVersionsComponent[] = [];
  for (const component of components) {
    const publicComponent: TransportSourceManifestComponent = {
      id: component.id,
      ...(component.sourceUri ? { sourceUri: component.sourceUri } : {}),
      ...(component.versionsUri ? { versionsUri: component.versionsUri } : {}),
    };
    if (component.diagnostic) {
      results.push({ ...publicComponent, diagnostic: component.diagnostic });
      continue;
    }
    if (!component.versionsUri) {
      results.push({
        ...publicComponent,
        diagnostic: {
          code: 'SOURCE_COMPONENT_VERSIONS_UNAVAILABLE',
          message: 'The source component has no exact versions relation.',
        },
      });
      continue;
    }
    try {
      const versions = await context.client.services.sourceHistory.listVersions(
        component.versionsUri,
      );
      results.push({ ...publicComponent, versions });
    } catch {
      results.push({
        ...publicComponent,
        diagnostic: {
          code: 'SOURCE_HISTORY_RETRIEVAL_FAILED',
          message: 'SAP ADT rejected source-history metadata retrieval.',
        },
      });
    }
  }

  return { object: discovery.object, components: results };
}

/**
 * Resolve transport objects and produce immutable source-history references.
 * Source bodies remain lazy and are never read while building the manifest.
 */
export async function buildTransportSourceManifest(
  requestedTransports: string[],
  options: BuildTransportSourceManifestOptions = {},
  ctx?: AdkContext,
): Promise<TransportSourceManifest> {
  const context = ctx ?? getGlobalContext();
  const requested = uniqueStable(requestedTransports);
  const resolved = await resolveTransportObjects(requested, {}, context);
  const scopeTransports = uniqueStable([
    ...requested,
    ...resolved.scopeTransportNumbers,
  ]);
  const inventory = resolved.objects
    .map((reference) =>
      inventoryEntry(
        reference,
        resolved.sourceTransportMap.get(reference.key) ?? requested[0] ?? '',
      ),
    )
    .sort(
      (left, right) =>
        compareText(left.sourceTransport, right.sourceTransport) ||
        compareText(left.pgmid, right.pgmid) ||
        compareText(left.type, right.type) ||
        compareText(left.name, right.name),
    );
  const seenRepositoryObjects = new Set<string>();
  const objects = (
    await mapOrdered(
      resolved.objects.filter((reference) => !isNonSourceCtsObject(reference)),
      normalizeConcurrency(options.concurrency),
      async (original) => ({
        original,
        repository: await repositoryObjectReference(original, context),
        sourceTransport:
          resolved.sourceTransportMap.get(original.key) ?? requested[0] ?? '',
      }),
    )
  )
    .filter(({ original, repository }) =>
      manifestSelectorMatches(original, repository, options.selector),
    )
    .filter(({ repository }) => {
      const key = `${repository.pgmid}/${repository.type}/${repository.name}`;
      if (seenRepositoryObjects.has(key)) return false;
      seenRepositoryObjects.add(key);
      return true;
    })
    .sort(
      (left, right) =>
        compareText(left.repository.pgmid, right.repository.pgmid) ||
        compareText(left.repository.type, right.repository.type) ||
        compareText(left.repository.name, right.repository.name),
    );

  const perObjectEntries = await mapOrdered(
    objects,
    normalizeConcurrency(options.concurrency),
    ({ original, repository, sourceTransport }) =>
      buildObjectEntries(
        original,
        repository,
        sourceTransport,
        scopeTransports,
        context,
      ),
  );

  return {
    requestedTransports: requested,
    scopeTransports,
    inventory,
    entries: perObjectEntries.flat(),
  };
}
