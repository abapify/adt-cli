import { basename } from 'node:path';
import type {
  TransportSourceManifest,
  TransportSourceManifestEntry,
} from '@abapify/adk';
import type { SourceVersionRef } from '@abapify/adt-client';
import type { FormatPlugin, MaterializedFormatFile } from '@abapify/adt-plugin';
import { compareStrings, digest, sha256, stableJson } from './deterministic';
import {
  objectDescriptorPath,
  objectIdentity,
  transportDescriptorPath,
} from './identity';
import { repositoryType } from './adt-client-adapter';
import {
  applyRepositoryPlan,
  planRepositoryChanges,
  readText,
  verifyOwnedHashes,
  walkFiles,
  type DesiredFile,
  type RepositoryPlan,
} from './repository';
import {
  flowConfigSchema,
  objectDescriptorSchema,
  transportDescriptorSchema,
  type ObjectDescriptor,
  type OwnedFile,
  type TransportDescriptor,
} from './schemas';
import { FlowConfig } from '@abapify/adt-config';
import {
  AdtFlowError,
  type FlowCheckoutDependencies,
  type FlowCheckoutInput,
  type FlowCheckoutResult,
  type FlowObjectIdentity,
  type FlowObjectModel,
  type FlowSkippedObject,
} from './types';

const TRANSPORT = /^[A-Z0-9]{10}$/;
const DEFAULT_METADATA_CONCURRENCY = 4;
const DEFAULT_SOURCE_CONCURRENCY = 4;
const DEFAULT_MAX_SOURCE_BYTES = 4 * 1024 * 1024;

type BuildManifestOptions = Parameters<
  FlowCheckoutDependencies['buildManifest']
>[1];

class Limiter {
  private active = 0;
  private readonly waiting: Array<() => void> = [];

  constructor(private readonly maximum: number) {}

  async run<T>(operation: () => Promise<T>): Promise<T> {
    while (this.active >= this.maximum) {
      await new Promise<void>((resolve) => this.waiting.push(resolve));
    }
    this.active += 1;
    try {
      return await operation();
    } finally {
      this.active -= 1;
      this.waiting.shift()?.();
    }
  }
}

function normalizeTransports(values: readonly string[]): string[] {
  const normalized = [
    ...new Set(values.map((value) => value.trim().toUpperCase())),
  ]
    .filter(Boolean)
    .sort();
  if (
    normalized.length === 0 ||
    normalized.some((value) => !TRANSPORT.test(value))
  ) {
    throw new AdtFlowError(
      'configuration_invalid',
      'At least one ten-character transport number is required.',
    );
  }
  return normalized;
}

async function readDescriptor<T>(
  root: string,
  path: string,
  parser: { safeParse(value: unknown): { success: boolean; data?: T } },
): Promise<T | undefined> {
  const content = await readText(root, path);
  if (content === undefined) return undefined;
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    throw new AdtFlowError(
      'configuration_invalid',
      'A flow descriptor is not valid JSON.',
      { path },
    );
  }
  const result = parser.safeParse(value);
  if (!result.success || result.data === undefined) {
    throw new AdtFlowError(
      'configuration_invalid',
      'A flow descriptor uses an unsupported or invalid schema.',
      { path },
    );
  }
  return result.data;
}

function packageMatches(
  packageName: string | undefined,
  configured: readonly string[] | undefined,
): boolean {
  if (!configured || configured.length === 0) return true;
  if (!packageName) return false;
  const candidate = packageName.toUpperCase();
  return configured.some((item) => {
    const root = item.trim().toUpperCase();
    return candidate === root || candidate.startsWith(`${root}_`);
  });
}

function applicationComponentMatches(
  component: string | undefined,
  configured: readonly string[] | undefined,
): boolean {
  if (!configured || configured.length === 0) return true;
  if (!component) return false;
  return configured.some(
    (item) => item.trim().toUpperCase() === component.toUpperCase(),
  );
}

function isApplicationComponentExcluded(
  config: FlowConfig,
  model: FlowObjectModel,
): boolean {
  return !applicationComponentMatches(
    model.applicationComponent,
    config.include?.applicationComponents,
  );
}

function isUnsupportedEntry(entry: TransportSourceManifestEntry): boolean {
  return (
    entry.changeKind === 'unsupported' ||
    entry.diagnostic?.code === 'OBJECT_TYPE_UNSUPPORTED'
  );
}

function materializedObject(entry: TransportSourceManifestEntry) {
  return entry.repositoryObject ?? entry.object;
}

function selectedVersion(
  entry: TransportSourceManifestEntry,
  mode: 'base' | 'head',
): SourceVersionRef | undefined {
  if (!entry.exact) {
    throw new AdtFlowError(
      'manifest_inexact',
      'Source history did not prove an exact transport boundary.',
      {
        object: `${entry.object.type}/${entry.object.name}`,
        component: entry.component.id,
        diagnostic: entry.diagnostic?.code,
      },
    );
  }
  if (mode === 'base') {
    if (
      entry.changeKind !== 'added' &&
      (entry.base === undefined || entry.base.id === undefined)
    ) {
      throw new AdtFlowError(
        'manifest_inexact',
        'Source history is missing the required base boundary version.',
        {
          object: `${entry.object.type}/${entry.object.name}`,
          component: entry.component.id,
          changeKind: entry.changeKind,
        },
      );
    }
    return entry.base;
  }
  if (entry.changeKind === 'deleted') return undefined;
  if (entry.head === undefined || entry.head.id === undefined) {
    throw new AdtFlowError(
      'manifest_inexact',
      'Source history is missing the required head boundary version.',
      {
        object: `${entry.object.type}/${entry.object.name}`,
        component: entry.component.id,
        changeKind: entry.changeKind,
      },
    );
  }
  return entry.head;
}

function groupEntries(entries: readonly TransportSourceManifestEntry[]): Array<{
  identity: FlowObjectIdentity;
  entries: TransportSourceManifestEntry[];
}> {
  const grouped = new Map<
    string,
    { identity: FlowObjectIdentity; entries: TransportSourceManifestEntry[] }
  >();
  for (const entry of entries) {
    const identity = objectIdentity(materializedObject(entry));
    const group = grouped.get(identity.canonical) ?? { identity, entries: [] };
    group.entries.push(entry);
    grouped.set(identity.canonical, group);
  }
  return [...grouped.values()]
    .map((group) => ({
      ...group,
      entries: group.entries.sort((left, right) =>
        compareStrings(left.component.id, right.component.id),
      ),
    }))
    .sort((left, right) =>
      compareStrings(left.identity.canonical, right.identity.canonical),
    );
}

function descriptorSelectionMatches(
  descriptor: ObjectDescriptor,
  component: string,
  version: SourceVersionRef,
): boolean {
  return descriptor.selections.some(
    (selection) =>
      selection.component === component &&
      selection.versionId === version.id &&
      selection.sourceUri === version.sourceUri,
  );
}

async function cachedSource(
  root: string,
  descriptor: ObjectDescriptor,
  component: string,
): Promise<string | undefined> {
  const owned = descriptor.ownedFiles.find(
    (file) => file.role === 'source' && file.sourceComponent === component,
  );
  if (!owned) return undefined;
  const content = await readText(root, owned.path);
  return content !== undefined && sha256(content) === owned.hash
    ? content
    : undefined;
}

function ownedFile(file: MaterializedFormatFile): OwnedFile {
  if (file.role === 'source') {
    return {
      path: file.path,
      hash: sha256(file.content),
      role: 'source',
      sourceComponent: file.sourceComponent,
    };
  }
  return {
    path: file.path,
    hash: sha256(file.content),
    role: 'metadata',
  };
}

async function exactHeadFastPath(
  root: string,
  transports: readonly string[],
  configDigest: string,
  formatDigest: string,
  format: FormatPlugin,
): Promise<
  | {
      descriptorPaths: string[];
      ownedPaths: string[];
      scopeTransports: string[];
    }
  | undefined
> {
  const requestedPaths = transports.map(transportDescriptorPath);
  const requestedDescriptors = await Promise.all(
    requestedPaths.map((path) =>
      readDescriptor(root, path, transportDescriptorSchema),
    ),
  );
  if (
    requestedDescriptors.some(
      (descriptor) =>
        !descriptor ||
        descriptor.configDigest !== configDigest ||
        descriptor.formatDigest !== formatDigest ||
        descriptor.inventory === undefined ||
        stableJson(descriptor.requestedTransports) !== stableJson(transports),
    )
  ) {
    return undefined;
  }

  const initialDescriptors = requestedDescriptors as TransportDescriptor[];
  const scopeTransports = initialDescriptors[0]?.scopeTransports;
  if (
    !scopeTransports ||
    initialDescriptors.some(
      (descriptor) =>
        stableJson(descriptor.scopeTransports) !==
          stableJson(scopeTransports) ||
        transports.some(
          (transport) => !descriptor.scopeTransports.includes(transport),
        ),
    )
  ) {
    return undefined;
  }
  const transportPaths = scopeTransports.map(transportDescriptorPath);
  const descriptors = await Promise.all(
    transportPaths.map((path) =>
      readDescriptor(root, path, transportDescriptorSchema),
    ),
  );
  if (
    descriptors.some(
      (descriptor, index) =>
        !descriptor ||
        descriptor.incomplete === true ||
        descriptor.configDigest !== configDigest ||
        descriptor.formatDigest !== formatDigest ||
        descriptor.inventory === undefined ||
        stableJson(descriptor.requestedTransports) !== stableJson(transports) ||
        stableJson(descriptor.scopeTransports) !==
          stableJson(scopeTransports) ||
        descriptor.inventory.some(
          (object) => object.sourceTransport !== scopeTransports[index],
        ),
    )
  ) {
    return undefined;
  }
  const validDescriptors = descriptors as TransportDescriptor[];
  const objectPaths = [
    ...new Set(validDescriptors.flatMap((d) => d.objects)),
  ].sort(compareStrings);
  const ownedPaths: string[] = [];
  for (const path of objectPaths) {
    const descriptor = await readDescriptor(root, path, objectDescriptorSchema);
    if (
      !descriptor ||
      descriptor.configDigest !== configDigest ||
      descriptor.formatDigest !== formatDigest
    ) {
      return undefined;
    }
    const expectedPath = objectDescriptorPath(descriptor.identity);
    if (path !== expectedPath) {
      return undefined;
    }
    descriptor.ownedFiles = filterOwnedFiles(
      descriptor.ownedFiles,
      descriptor.identity,
      format,
    );
    if (!(await verifyOwnedHashes(root, descriptor.ownedFiles))) {
      return undefined;
    }
    ownedPaths.push(...descriptor.ownedFiles.map((file) => file.path));
  }
  return {
    descriptorPaths: [...transportPaths, ...objectPaths].sort(compareStrings),
    ownedPaths: ownedPaths.sort(compareStrings),
    scopeTransports,
  };
}

function buildObjectFileIndex(
  files: string[],
  format: FormatPlugin,
): Map<string, string[]> {
  const index = new Map<string, string[]>();
  if (!format.parseFilename) return index;
  for (const path of files) {
    const parsed = format.parseFilename?.(basename(path));
    if (!parsed) continue;
    const key = `${parsed.type.toUpperCase()}/${parsed.name.toUpperCase()}`;
    const list = index.get(key);
    if (list) list.push(path);
    else index.set(key, [path]);
  }
  return index;
}

function filterOwnedFiles(
  files: readonly OwnedFile[],
  identity: FlowObjectIdentity,
  format: FormatPlugin,
): OwnedFile[] {
  const parseFilename = format.parseFilename;
  if (!parseFilename) return [...files];
  const expectedType = repositoryType(
    identity.pgmid,
    identity.type,
  ).toUpperCase();
  const expectedName = identity.name.toUpperCase();
  return files.filter((file) => {
    const parsed = parseFilename(basename(file.path));
    return (
      !parsed ||
      (parsed.type.toUpperCase() === expectedType &&
        parsed.name.toUpperCase() === expectedName)
    );
  });
}

function createTombstoneDescriptor(
  identity: FlowObjectIdentity,
  previous: ObjectDescriptor | undefined,
  configDigest: string,
  formatDigest: string,
): ObjectDescriptor {
  return {
    schemaVersion: 1,
    formatVersion: 1,
    identity: {
      canonical: identity.canonical,
      pgmid: identity.pgmid,
      type: identity.type,
      name: identity.name,
    },
    state: 'deleted',
    packagePath: previous?.packagePath ?? [],
    selections: [],
    ownedFiles: [],
    configDigest,
    formatDigest,
  };
}

async function reuseIndexedGroup(
  root: string,
  identity: FlowObjectIdentity,
  descriptorPath: string,
  previous: ObjectDescriptor,
): Promise<DesiredFile[]> {
  const desired: DesiredFile[] = [];
  for (const file of previous.ownedFiles) {
    const content = await readText(root, file.path);
    if (content === undefined) {
      throw new AdtFlowError(
        'working_tree_diverged',
        'An indexed file is missing from the working tree.',
        { object: identity.canonical, path: file.path },
      );
    }
    if (file.role === 'source') {
      desired.push({
        path: file.path,
        content,
        role: 'source',
        sourceComponent: file.sourceComponent,
        owner: identity.canonical,
      });
    } else {
      desired.push({
        path: file.path,
        content,
        role: 'metadata',
        owner: identity.canonical,
      });
    }
  }
  desired.push({
    path: descriptorPath,
    content: stableJson(previous),
    role: 'metadata',
    owner: identity.canonical,
  });
  return desired;
}

interface ProcessGroupContext {
  root: string;
  group: {
    identity: FlowObjectIdentity;
    entries: TransportSourceManifestEntry[];
  };
  mode: 'base' | 'head';
  config: FlowConfig;
  configDigest: string;
  formatDigest: string;
  dependencies: FlowCheckoutDependencies;
  limiters: { metadata: Limiter; source: Limiter };
  maxSourceBytes: number;
  materialize: NonNullable<FormatPlugin['materialize']>;
  pending: { previous?: ObjectDescriptor; ownedPaths: string[] };
  hasApplicationComponentFilter: boolean;
  calls: { manifest: number; metadata: number; source: number };
}

interface GroupResult {
  desired: DesiredFile[];
  descriptorPaths: string[];
  ownedPaths: string[];
  reusedIndexedComponent: boolean;
}

function emptyGroupResult(): GroupResult {
  return {
    desired: [],
    descriptorPaths: [],
    ownedPaths: [],
    reusedIndexedComponent: false,
  };
}

function buildTombstoneResult(
  ctx: ProcessGroupContext,
  identity: FlowObjectIdentity,
  descriptorPath: string,
): GroupResult {
  const { previous, ownedPaths } = ctx.pending;
  const tombstone = createTombstoneDescriptor(
    identity,
    previous,
    ctx.configDigest,
    ctx.formatDigest,
  );
  return {
    desired: [
      {
        path: descriptorPath,
        content: stableJson(tombstone),
        role: 'metadata',
        owner: identity.canonical,
      },
    ],
    descriptorPaths: [descriptorPath],
    ownedPaths,
    reusedIndexedComponent: false,
  };
}

interface GroupSelections {
  presentSelections: {
    entry: TransportSourceManifestEntry;
    version: SourceVersionRef;
  }[];
  exactIndexedSelection: boolean;
  hasDeletions: boolean;
}

function indexedPackageMatches(
  previous: ObjectDescriptor,
  group: ProcessGroupContext['group'],
): boolean {
  const previousPackage = previous.packagePath
    .at(previous.packagePath.length - 1)
    ?.trim()
    .toUpperCase();
  if (!previousPackage) return true;
  return group.entries.every(({ object }) => {
    const packageName = object.packageName?.trim().toUpperCase();
    return !packageName || packageName === previousPackage;
  });
}

function buildGroupSelections(
  group: ProcessGroupContext['group'],
  mode: 'base' | 'head',
  previous: ObjectDescriptor | undefined,
  configDigest: string,
  formatDigest: string,
): GroupSelections {
  const { entries } = group;
  const selections = entries.map((entry) => ({
    entry,
    version: selectedVersion(entry, mode),
  }));
  const presentSelections = selections.filter(
    (
      selection,
    ): selection is {
      entry: TransportSourceManifestEntry;
      version: SourceVersionRef;
    } => selection.version !== undefined,
  );

  const previousDescriptor = previous;
  const exactIndexedSelection =
    previousDescriptor?.state === 'present' &&
    previousDescriptor.configDigest === configDigest &&
    previousDescriptor.formatDigest === formatDigest &&
    indexedPackageMatches(previousDescriptor, group) &&
    previousDescriptor.selections.length === presentSelections.length &&
    presentSelections.every(({ entry, version }) =>
      descriptorSelectionMatches(
        previousDescriptor,
        entry.component.id,
        version,
      ),
    );

  return {
    presentSelections,
    exactIndexedSelection,
    hasDeletions: entries.some((entry) => entry.changeKind === 'deleted'),
  };
}

async function reuseGroupIfExact(
  ctx: ProcessGroupContext,
  identity: FlowObjectIdentity,
  descriptorPath: string,
): Promise<GroupResult> {
  const { previous, ownedPaths } = ctx.pending;
  if (!previous) {
    throw new AdtFlowError(
      'internal_error',
      'Indexed reuse invoked without a previous descriptor.',
      { object: identity.canonical },
    );
  }
  const desired = await reuseIndexedGroup(
    ctx.root,
    identity,
    descriptorPath,
    previous,
  );
  return {
    desired,
    descriptorPaths: [descriptorPath],
    ownedPaths,
    reusedIndexedComponent: true,
  };
}

interface LoadedSources {
  sources: Record<string, string>;
  reusedIndexedSource: boolean;
}

async function loadObjectSources(
  ctx: ProcessGroupContext,
  presentSelections: GroupSelections['presentSelections'],
): Promise<LoadedSources> {
  const { root, limiters, maxSourceBytes, dependencies, calls, pending } = ctx;
  const { previous } = pending;
  const sources: Record<string, string> = {};
  let reusedIndexedSource = false;
  await Promise.all(
    presentSelections.map(async ({ entry, version }) => {
      if (
        previous &&
        descriptorSelectionMatches(previous, entry.component.id, version)
      ) {
        const cached = await cachedSource(root, previous, entry.component.id);
        if (cached !== undefined) {
          sources[entry.component.id] = cached;
          reusedIndexedSource = true;
          return;
        }
      }
      calls.source += 1;
      sources[entry.component.id] = await limiters.source.run(() =>
        dependencies.readSource(version, maxSourceBytes),
      );
    }),
  );
  return { sources, reusedIndexedSource };
}

interface MaterializedInput {
  model: FlowObjectModel;
  sources: Record<string, string>;
  presentSelections: GroupSelections['presentSelections'];
  reusedIndexedSource: boolean;
}

async function buildMaterializedResult(
  ctx: ProcessGroupContext,
  input: MaterializedInput,
): Promise<GroupResult> {
  const { model, sources, presentSelections, reusedIndexedSource } = input;
  const { group, config, configDigest, formatDigest, pending, materialize } =
    ctx;
  const { identity } = group;
  const descriptorPath = objectDescriptorPath(identity);
  const materialized = await materialize({
    object: model.object,
    objectType: repositoryType(identity.pgmid, identity.type),
    packagePath: model.packagePath,
    sources,
    formatOptions: config.format.options,
  });
  const files = materialized.files.sort((left, right) =>
    compareStrings(left.path, right.path),
  );
  const desired: DesiredFile[] = files.map((file) => ({
    ...file,
    owner: identity.canonical,
  }));
  const ownedFiles = files
    .map(ownedFile)
    .sort((left, right) => compareStrings(left.path, right.path));
  const descriptor: ObjectDescriptor = {
    schemaVersion: 1,
    formatVersion: 1,
    identity: {
      canonical: identity.canonical,
      pgmid: identity.pgmid,
      type: identity.type,
      name: identity.name,
    },
    state: 'present',
    packagePath: model.packagePath,
    selections: presentSelections
      .map(({ entry, version }) => ({
        component: entry.component.id,
        versionId: version.id,
        sourceUri: version.sourceUri,
      }))
      .sort((left, right) => compareStrings(left.component, right.component)),
    ownedFiles,
    configDigest,
    formatDigest,
  };
  desired.push({
    path: descriptorPath,
    content: stableJson(descriptor),
    role: 'metadata',
    owner: identity.canonical,
  });
  return {
    desired,
    descriptorPaths: [descriptorPath],
    ownedPaths: pending.ownedPaths,
    reusedIndexedComponent: reusedIndexedSource,
  };
}

async function maybeSkipByAppComponent(
  ctx: ProcessGroupContext,
): Promise<GroupResult | undefined> {
  if (!ctx.hasApplicationComponentFilter) return undefined;

  const { group, dependencies, limiters, pending, calls } = ctx;
  const model = await limiters.metadata.run(() =>
    dependencies.loadObject(group.identity),
  );
  calls.metadata += model.metadataCalls ?? 1;
  if (isApplicationComponentExcluded(ctx.config, model)) {
    return {
      desired: [],
      descriptorPaths: [],
      ownedPaths: pending.ownedPaths,
      reusedIndexedComponent: false,
    };
  }
  return undefined;
}

function canReuseIncrementalBase(
  previous: ObjectDescriptor,
  ctx: ProcessGroupContext,
): boolean {
  if (previous.state !== 'present') return false;
  if (previous.configDigest !== ctx.configDigest) return false;
  if (previous.formatDigest !== ctx.formatDigest) return false;
  return indexedPackageMatches(previous, ctx.group);
}

async function handleBaseEmptyGroup(
  ctx: ProcessGroupContext,
  identity: FlowObjectIdentity,
  descriptorPath: string,
): Promise<GroupResult> {
  const previous = ctx.pending.previous!;
  if (canReuseIncrementalBase(previous, ctx)) {
    return await reuseGroupIfExact(ctx, identity, descriptorPath);
  }
  return buildTombstoneResult(ctx, identity, descriptorPath);
}

async function resolveEmptyGroup(
  ctx: ProcessGroupContext,
  identity: FlowObjectIdentity,
  descriptorPath: string,
  hasDeletions: boolean,
): Promise<GroupResult> {
  const { mode, pending } = ctx;
  if (mode === 'head' && hasDeletions) {
    return buildTombstoneResult(ctx, identity, descriptorPath);
  }
  if (mode === 'base' && pending.previous) {
    return handleBaseEmptyGroup(ctx, identity, descriptorPath);
  }
  return emptyGroupResult();
}

async function handleEmptyGroup(
  ctx: ProcessGroupContext,
  descriptorPath: string,
  hasDeletions: boolean,
): Promise<GroupResult> {
  const appComponentResult = await maybeSkipByAppComponent(ctx);
  if (appComponentResult) return appComponentResult;

  return resolveEmptyGroup(
    ctx,
    ctx.group.identity,
    descriptorPath,
    hasDeletions,
  );
}

async function processGroup(ctx: ProcessGroupContext): Promise<GroupResult> {
  const { group, mode, dependencies, limiters, pending, calls } = ctx;
  const { identity } = group;
  const descriptorPath = objectDescriptorPath(identity);

  const { presentSelections, exactIndexedSelection, hasDeletions } =
    buildGroupSelections(
      group,
      mode,
      pending.previous,
      ctx.configDigest,
      ctx.formatDigest,
    );

  if (presentSelections.length === 0) {
    return handleEmptyGroup(ctx, descriptorPath, hasDeletions);
  }

  const canReuseIndexed =
    exactIndexedSelection && pending.previous !== undefined;

  if (canReuseIndexed && !ctx.hasApplicationComponentFilter) {
    return reuseGroupIfExact(ctx, identity, descriptorPath);
  }

  const model = await limiters.metadata.run(() =>
    dependencies.loadObject(identity),
  );
  calls.metadata += model.metadataCalls ?? 1;

  if (isApplicationComponentExcluded(ctx.config, model)) {
    return emptyGroupResult();
  }

  if (canReuseIndexed) {
    return reuseGroupIfExact(ctx, identity, descriptorPath);
  }

  const { sources, reusedIndexedSource } = await loadObjectSources(
    ctx,
    presentSelections,
  );

  return buildMaterializedResult(ctx, {
    model,
    sources,
    presentSelections,
    reusedIndexedSource,
  });
}

export interface AdtFlowService {
  checkout(input: FlowCheckoutInput): Promise<FlowCheckoutResult>;
}

interface CheckoutContext {
  root: string;
  mode: 'base' | 'head';
  partial: boolean;
  requested: string[];
  config: FlowConfig;
  configDigest: string;
  formatDigest: string;
  dependencies: FlowCheckoutDependencies;
  materialize: NonNullable<FormatPlugin['materialize']>;
  calls: { manifest: number; metadata: number; source: number };
}

function createCheckoutContext(
  input: FlowCheckoutInput,
  dependencies: FlowCheckoutDependencies,
): CheckoutContext {
  const parsed = flowConfigSchema.safeParse(input.config);
  if (!parsed.success) {
    throw new AdtFlowError(
      'configuration_invalid',
      'adt.config.ts contains an invalid flow section.',
    );
  }
  const config = parsed.data;
  const materialize = dependencies.format.materialize?.bind(
    dependencies.format,
  );
  if (config.format.id !== dependencies.format.id || !materialize) {
    throw new AdtFlowError(
      'format_unsupported',
      'The selected format does not support flow materialization.',
    );
  }
  return {
    root: input.root,
    mode: input.mode ?? 'head',
    partial: input.partial === true,
    requested: normalizeTransports(input.transports),
    config,
    configDigest: digest(config),
    formatDigest: digest({
      id: dependencies.format.id,
      options: config.format.options ?? {},
      supportedTypes: [...dependencies.format.supportedTypes].sort(),
    }),
    dependencies,
    materialize,
    calls: { manifest: 0, metadata: 0, source: 0 },
  };
}

async function tryExactHeadFastPath(
  ctx: CheckoutContext,
): Promise<FlowCheckoutResult | undefined> {
  if (ctx.mode !== 'head') return undefined;
  // Partial checkouts must rebuild the manifest to know which objects
  // were skipped; the fast path returns an empty skipped list and would
  // omit gaps from the partial report.
  if (ctx.partial) return undefined;
  const fast = await exactHeadFastPath(
    ctx.root,
    ctx.requested,
    ctx.configDigest,
    ctx.formatDigest,
    ctx.dependencies.format,
  );
  if (!fast) return undefined;
  return {
    mode: ctx.mode,
    requestedTransports: ctx.requested,
    scopeTransports: fast.scopeTransports,
    changed: [],
    moved: [],
    removed: [],
    unchanged: fast.ownedPaths,
    descriptors: fast.descriptorPaths,
    skipped: [],
    sapCalls: ctx.calls,
    fastPath: 'exact-head',
  };
}

interface ManifestContext {
  manifest: TransportSourceManifest;
  entries: TransportSourceManifestEntry[];
  skipped: FlowCheckoutResult['skipped'];
  metadataLimiter: Limiter;
  sourceLimiter: Limiter;
  maxSourceBytes: number;
  hasApplicationComponentFilter: boolean;
  groups: ReturnType<typeof groupEntries>;
  srcFilesByObject: Map<string, string[]>;
}

function buildManifestRequestOptions(
  config: CheckoutContext['config'],
): BuildManifestOptions {
  const options: BuildManifestOptions = {
    concurrency: config.concurrency?.metadata ?? DEFAULT_METADATA_CONCURRENCY,
  };
  if (config.include?.objectTypes?.length) {
    options.objectTypes = config.include.objectTypes.map((type) =>
      type.toUpperCase(),
    );
  }
  return options;
}

function prepareGroups(
  entries: TransportSourceManifestEntry[],
  mode: 'base' | 'head',
): ReturnType<typeof groupEntries> {
  const groups = groupEntries(entries);
  for (const group of groups) {
    for (const entry of group.entries) selectedVersion(entry, mode);
  }
  return groups;
}

function inexactEntries(
  entries: readonly TransportSourceManifestEntry[],
  partial: boolean,
): TransportSourceManifestEntry[] {
  const inexact = entries.filter(
    (entry) => !entry.exact && !isUnsupportedEntry(entry),
  );
  if (inexact.length > 0 && !partial) {
    // Preserve the original all-or-nothing safety contract for every caller
    // which has not explicitly elected to publish an incomplete boundary.
    selectedVersion(inexact[0]!, 'head');
  }
  return inexact;
}

async function filterSkippedByApplicationComponent(
  entries: readonly TransportSourceManifestEntry[],
  ctx: CheckoutContext,
  limiter: Limiter,
  toSkipped: (entry: TransportSourceManifestEntry) => FlowSkippedObject,
): Promise<FlowCheckoutResult['skipped']> {
  const byIdentity = new Map<
    string,
    { identity: FlowObjectIdentity; entries: TransportSourceManifestEntry[] }
  >();
  for (const entry of entries) {
    const identity = objectIdentity(materializedObject(entry));
    const existing = byIdentity.get(identity.canonical);
    if (existing) {
      existing.entries.push(entry);
    } else {
      byIdentity.set(identity.canonical, { identity, entries: [entry] });
    }
  }

  const skipped: FlowCheckoutResult['skipped'] = [];
  const pushSkipped = (identityEntries: TransportSourceManifestEntry[]) => {
    for (const entry of identityEntries) {
      skipped.push(toSkipped(entry));
    }
  };

  await Promise.all(
    [...byIdentity.values()].map(
      async ({ identity, entries: identityEntries }) => {
        if (
          identityEntries.some(
            (entry) => entry.diagnostic?.code === 'OBJECT_METADATA_LOAD_FAILED',
          )
        ) {
          pushSkipped(identityEntries);
          return;
        }

        try {
          const model = await limiter.run(() =>
            ctx.dependencies.loadObject(identity),
          );
          ctx.calls.metadata += model.metadataCalls ?? 1;
          if (isApplicationComponentExcluded(ctx.config, model)) return;
          pushSkipped(identityEntries);
        } catch (error) {
          if (error instanceof AdtFlowError) {
            pushSkipped(identityEntries);
            return;
          }
          throw error;
        }
      },
    ),
  );
  return skipped;
}

async function skippedInexactEntries(
  entries: readonly TransportSourceManifestEntry[],
  ctx: CheckoutContext,
  limiter: Limiter,
  hasApplicationComponentFilter: boolean,
): Promise<FlowCheckoutResult['skipped']> {
  const toSkipped = (
    entry: TransportSourceManifestEntry,
  ): FlowSkippedObject => ({
    object: `${entry.object.type}/${entry.object.name}`,
    component: entry.component.id,
    diagnostic: entry.diagnostic?.code ?? 'MANIFEST_INEXACT',
    ...(entry.sourceTransport
      ? { sourceTransport: entry.sourceTransport }
      : {}),
  });
  if (!hasApplicationComponentFilter) {
    return entries.map(toSkipped);
  }
  return filterSkippedByApplicationComponent(entries, ctx, limiter, toSkipped);
}

async function unsupportedEntries(
  entries: readonly TransportSourceManifestEntry[],
  ctx: CheckoutContext,
  limiter: Limiter,
  hasApplicationComponentFilter: boolean,
): Promise<FlowCheckoutResult['skipped']> {
  const unsupported = entries.filter(isUnsupportedEntry);
  const toSkipped = (
    entry: TransportSourceManifestEntry,
  ): FlowSkippedObject => ({
    object: `${entry.object.type}/${entry.object.name}`,
    component: entry.component.id,
    diagnostic: entry.diagnostic?.code ?? 'UNSUPPORTED',
    ...(entry.sourceTransport
      ? { sourceTransport: entry.sourceTransport }
      : {}),
  });
  if (!hasApplicationComponentFilter) {
    return unsupported.map(toSkipped);
  }
  return filterSkippedByApplicationComponent(
    unsupported,
    ctx,
    limiter,
    toSkipped,
  );
}

async function buildManifestAndGroups(
  ctx: CheckoutContext,
): Promise<ManifestContext> {
  ctx.calls.manifest += 1;
  const manifest = await ctx.dependencies.buildManifest(
    ctx.requested,
    buildManifestRequestOptions(ctx.config),
  );
  const scopedEntries = manifest.entries.filter((entry) =>
    packageMatches(entry.object.packageName, ctx.config.include?.packages),
  );
  const metadataLimiter = new Limiter(
    ctx.config.concurrency?.metadata ?? DEFAULT_METADATA_CONCURRENCY,
  );
  const hasApplicationComponentFilter =
    (ctx.config.include?.applicationComponents?.length ?? 0) > 0;
  const skipped = await unsupportedEntries(
    scopedEntries,
    ctx,
    metadataLimiter,
    hasApplicationComponentFilter,
  );
  const inexact = inexactEntries(scopedEntries, ctx.partial);
  skipped.push(
    ...(await skippedInexactEntries(
      inexact,
      ctx,
      metadataLimiter,
      hasApplicationComponentFilter,
    )),
  );
  const entries = scopedEntries.filter(
    (entry) => !isUnsupportedEntry(entry) && !inexact.includes(entry),
  );
  const sourceLimiter = new Limiter(
    ctx.config.concurrency?.sources ?? DEFAULT_SOURCE_CONCURRENCY,
  );
  const maxSourceBytes = ctx.config.maxSourceBytes ?? DEFAULT_MAX_SOURCE_BYTES;

  const allSrcFiles = await walkFiles(ctx.root, 'src');
  const srcFilesByObject = buildObjectFileIndex(
    allSrcFiles,
    ctx.dependencies.format,
  );
  const groups = prepareGroups(entries, ctx.mode);

  return {
    manifest,
    entries,
    skipped,
    metadataLimiter,
    sourceLimiter,
    maxSourceBytes,
    hasApplicationComponentFilter,
    groups,
    srcFilesByObject,
  };
}

type PendingOwnership = Map<
  string,
  { previous?: ObjectDescriptor; ownedPaths: string[] }
>;

async function buildPendingOwnership(
  ctx: CheckoutContext,
  groups: ManifestContext['groups'],
  srcFilesByObject: Map<string, string[]>,
): Promise<PendingOwnership> {
  const pendingOwnership: PendingOwnership = new Map();
  await Promise.all(
    groups.map(async ({ identity }) => {
      const descriptorPath = objectDescriptorPath(identity);
      const previous = await readDescriptor(
        ctx.root,
        descriptorPath,
        objectDescriptorSchema,
      );
      if (previous && previous.identity.canonical !== identity.canonical) {
        throw new AdtFlowError(
          'working_tree_diverged',
          'An indexed descriptor identity does not match the expected object.',
          { object: identity.canonical },
        );
      }
      const owned: string[] = [];
      if (previous) {
        previous.ownedFiles = filterOwnedFiles(
          previous.ownedFiles,
          identity,
          ctx.dependencies.format,
        );
        if (!(await verifyOwnedHashes(ctx.root, previous.ownedFiles))) {
          throw new AdtFlowError(
            'working_tree_diverged',
            'An indexed file differs from its recorded content hash.',
            { object: identity.canonical },
          );
        }
        for (const file of previous.ownedFiles) owned.push(file.path);
        owned.push(descriptorPath);
      } else {
        const key = `${repositoryType(identity.pgmid, identity.type)}/${identity.name}`;
        const files = srcFilesByObject.get(key) ?? [];
        for (const path of files) owned.push(path);
      }
      pendingOwnership.set(identity.canonical, {
        previous,
        ownedPaths: owned,
      });
    }),
  );
  return pendingOwnership;
}

interface CheckoutAccumulator {
  desired: DesiredFile[];
  descriptorPaths: string[];
  ownedPaths: Set<string>;
  ownedOwners: Map<string, string>;
}

type ProcessedGroups = CheckoutAccumulator & {
  reusedIndexedComponent: boolean;
};

async function processAllGroups(
  ctx: CheckoutContext,
  manifestContext: ManifestContext,
  pendingOwnership: PendingOwnership,
): Promise<ProcessedGroups> {
  const {
    metadataLimiter,
    sourceLimiter,
    maxSourceBytes,
    hasApplicationComponentFilter,
    groups,
  } = manifestContext;
  const desired: DesiredFile[] = [];
  const ownedPaths = new Set<string>();
  const ownedOwners = new Map<string, string>();
  const descriptorPaths: string[] = [];
  let reusedIndexedComponent = false;
  await Promise.all(
    groups.map(async (group) => {
      const pending = pendingOwnership.get(group.identity.canonical);
      if (!pending) {
        throw new AdtFlowError(
          'configuration_invalid',
          'Object ownership state is missing for a group.',
          { object: group.identity.canonical },
        );
      }
      const result = await processGroup({
        root: ctx.root,
        group,
        mode: ctx.mode,
        config: ctx.config,
        configDigest: ctx.configDigest,
        formatDigest: ctx.formatDigest,
        dependencies: ctx.dependencies,
        limiters: { metadata: metadataLimiter, source: sourceLimiter },
        maxSourceBytes,
        materialize: ctx.materialize,
        pending,
        hasApplicationComponentFilter,
        calls: ctx.calls,
      });
      for (const file of result.desired) desired.push(file);
      for (const path of result.descriptorPaths) descriptorPaths.push(path);
      for (const path of result.ownedPaths) {
        ownedPaths.add(path);
        ownedOwners.set(path, group.identity.canonical);
      }
      if (result.reusedIndexedComponent) reusedIndexedComponent = true;
    }),
  );
  return {
    desired,
    descriptorPaths,
    ownedPaths,
    ownedOwners,
    reusedIndexedComponent,
  };
}

async function addTransportDescriptors(
  ctx: CheckoutContext,
  manifest: TransportSourceManifest,
  accum: CheckoutAccumulator,
  incomplete: boolean,
): Promise<void> {
  const { descriptorPaths, desired, ownedPaths, ownedOwners } = accum;
  const relevantObjectDescriptors = [...new Set(descriptorPaths)].sort(
    compareStrings,
  );
  for (const transport of manifest.scopeTransports) {
    const path = transportDescriptorPath(transport);
    let existing: TransportDescriptor | undefined;
    try {
      existing = await readDescriptor(
        ctx.root,
        path,
        transportDescriptorSchema,
      );
    } catch {
      existing = undefined;
    }
    const matchesCurrentCheckout =
      existing !== undefined &&
      stableJson(existing.requestedTransports) === stableJson(ctx.requested) &&
      stableJson(existing.scopeTransports) ===
        stableJson(manifest.scopeTransports);
    const isPreviousSelfDescriptor =
      existing?.requestedTransports.includes(transport) === true &&
      existing.scopeTransports.includes(transport);
    if (
      existing?.scopeTransports.includes(transport) &&
      (matchesCurrentCheckout || isPreviousSelfDescriptor)
    ) {
      ownedPaths.add(path);
      ownedOwners.set(path, 'flow-index');
    }
    if (ctx.mode === 'head') {
      const descriptor: TransportDescriptor = {
        schemaVersion: 1,
        requestedTransports: ctx.requested,
        scopeTransports: manifest.scopeTransports,
        inventory: (manifest.inventory ?? []).filter(
          (object) => object.sourceTransport === transport,
        ),
        objects: relevantObjectDescriptors,
        configDigest: ctx.configDigest,
        formatDigest: ctx.formatDigest,
        ...(incomplete ? { incomplete: true } : {}),
      };
      desired.push({
        path,
        content: stableJson(descriptor),
        role: 'metadata',
        owner: 'flow-index',
      });
      descriptorPaths.push(path);
    }
  }
}

function buildCheckoutResult(
  ctx: CheckoutContext,
  manifest: TransportSourceManifest,
  skipped: FlowCheckoutResult['skipped'],
  plan: RepositoryPlan,
  processed: ProcessedGroups,
): FlowCheckoutResult {
  const { descriptorPaths, reusedIndexedComponent } = processed;
  const descriptorSet = new Set(descriptorPaths);
  const sourceMoves = plan.moved.filter(
    ({ from, to }) => !from.startsWith('.adt/') && !to.startsWith('.adt/'),
  );
  const movedFrom = new Set(sourceMoves.map(({ from }) => from));
  const movedTo = new Set(sourceMoves.map(({ to }) => to));
  return {
    mode: ctx.mode,
    requestedTransports: manifest.requestedTransports,
    scopeTransports: manifest.scopeTransports,
    changed: [...plan.writes.keys()]
      .filter((path) => !descriptorSet.has(path) && !movedTo.has(path))
      .sort(),
    moved: sourceMoves,
    removed: plan.removes
      .filter((path) => !path.startsWith('.adt/') && !movedFrom.has(path))
      .sort(),
    unchanged: plan.unchanged.filter((path) => !descriptorSet.has(path)),
    descriptors: [...descriptorSet].sort(),
    skipped,
    sapCalls: ctx.calls,
    fastPath: reusedIndexedComponent ? 'indexed-components' : 'none',
  };
}

async function checkoutFlow(
  input: FlowCheckoutInput,
  dependencies: FlowCheckoutDependencies,
): Promise<FlowCheckoutResult> {
  const ctx = createCheckoutContext(input, dependencies);
  const fast = await tryExactHeadFastPath(ctx);
  if (fast) return fast;

  const manifestContext = await buildManifestAndGroups(ctx);
  const pendingOwnership = await buildPendingOwnership(
    ctx,
    manifestContext.groups,
    manifestContext.srcFilesByObject,
  );
  const processed = await processAllGroups(
    ctx,
    manifestContext,
    pendingOwnership,
  );
  await addTransportDescriptors(
    ctx,
    manifestContext.manifest,
    processed,
    manifestContext.skipped.length > 0 && ctx.partial,
  );
  processed.desired.sort((left, right) =>
    compareStrings(left.path, right.path),
  );
  const plan = await planRepositoryChanges(
    ctx.root,
    processed.desired,
    processed.ownedPaths,
    processed.ownedOwners,
  );
  await applyRepositoryPlan(ctx.root, plan);
  return buildCheckoutResult(
    ctx,
    manifestContext.manifest,
    manifestContext.skipped,
    plan,
    processed,
  );
}

export function createAdtFlowService(
  dependencies: FlowCheckoutDependencies,
): AdtFlowService {
  return {
    async checkout(input): Promise<FlowCheckoutResult> {
      return checkoutFlow(input, dependencies);
    },
  };
}
