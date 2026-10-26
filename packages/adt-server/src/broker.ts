import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { request as httpsRequest } from 'node:https';
import {
  AdtResponseTooLargeError,
  assertAdtUri,
  createAdtClient,
  SourceVersionTooLargeError,
  type AdtClient,
} from '@abapify/adt-client';
import { ExactSourceHistoryService, BadiService } from '@abapify/adt-services';
import {
  fetchCheckCategoryIndex,
  enrichFindingsWithCategories,
  resolveCategoriesViaDocumentation,
} from '@abapify/adt-atc';
import type {
  DestinationContextFactory,
  DestinationLeaseProvider,
} from '@abapify/adt-mcp';
import { resolveObjectUri } from '@abapify/adt-mcp';
import type {
  DestinationSummary,
  AdtServerOperations,
  ReadinessProbe,
} from './server.js';
import {
  MAX_PACKAGE_SEARCH_RESULTS,
  MAX_SOURCE_BYTES,
  type AtcRunBody,
  type ObjectSearchCriteria,
  type PackageSearchCriteria,
  type TransportSearchCriteria,
} from './rest-schemas.js';

export interface HttpBrokerOptions {
  baseUrl: string;
  tokenFile: string;
  fetch?: typeof globalThis.fetch;
  /** Test seam; production derives the client from broker credentials. */
  createClient?: (connection: BrokerConnection) => Promise<AdtClient>;
  /**
   * Optional allow-list of UAA hosts (exact hostnames, no scheme/port) for
   * BTP service-key OAuth token endpoints. When provided, `uaa.url` must match
   * one of the listed hosts.
   */
  allowedUaaHosts?: string[];
}
interface BrokerConnection {
  baseUrl: string;
  sapClient: string | null;
  authMethod: 'basic' | 'btp_service_key';
  authConfig: Record<string, unknown>;
}
interface BrokerLease {
  leaseId: string;
  destination: string;
  version: number;
  expiresAt: string;
  connection: BrokerConnection;
}

function isBrokerLease(value: unknown): value is BrokerLease {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { leaseId?: unknown }).leaseId === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      (value as { leaseId: string }).leaseId,
    )
  );
}

interface CtsRequestHeader {
  TRKORR: string;
  TRFUNCTION?: string;
  TRSTATUS?: string;
  TARSYSTEM?: string;
  AS4USER?: string;
  AS4DATE?: string;
  AS4TIME?: string;
  AS4TEXT?: string;
  CLIENT?: string;
}

interface TransportSummary {
  trkorr: string;
  owner: string;
  description: string;
  status: string;
  statusRaw?: string;
  trFunction?: string;
  target?: string;
  client?: string;
  changedAt?: string;
}

interface CanonicalObjectReference {
  canonicalKey: string;
  objectType: string;
  objectName: string;
  pgmid?: string;
  objInfo?: string;
  objDesc?: string;
  lockStatus?: string;
}

interface CanonicalRepositoryObject extends CanonicalObjectReference {
  packageName?: string;
  description?: string;
}

type ObjectMetadataCapability =
  | 'source'
  | 'versions'
  | 'structure'
  | 'text_elements'
  | 'enhancement_implementations'
  | 'enhancement_options'
  | 'syntax';

interface CanonicalObjectMetadata {
  object: CanonicalRepositoryObject;
  metadata: {
    adtObjectType?: string;
    description?: string;
    packageName?: string;
  };
  facets: Array<{
    facet?: string;
    name?: string;
    displayName?: string;
    text?: string;
    version?: string;
    hasChildrenOfSameFacet?: boolean;
  }>;
  /** Relation metadata only: the resolved ADT target never leaves this broker. */
  capabilities: Array<{
    relation: string;
    capability: ObjectMetadataCapability;
    title?: string;
    mediaType?: string;
    etag?: string;
  }>;
}

type TrustedObjectMetadataCapability =
  CanonicalObjectMetadata['capabilities'][number] & { href: string };

interface TransportTaskDetail extends TransportSummary {
  parentTrkorr: string;
  objects: CanonicalObjectReference[];
}

interface TransportDetail extends TransportSummary {
  tasks: TransportTaskDetail[];
  objects: CanonicalObjectReference[];
}

type CanonicalAtcFinding = {
  checkId: string;
  checkTitle: string;
  /**
   * Check category name (e.g., 'CI_PERFORMANCE') from the run's check
   * variant form template. Absent when enrichment is unavailable.
   */
  checkCategory?: string;
  messageText: string;
  priority: number;
  objectType: string;
  objectName: string;
  lineStart?: number;
  lineEnd?: number;
  messageId?: string;
  packageName?: string;
  objectDescription?: string;
  contactPerson?: string;
  processor?: string;
  lastChangedBy?: string;
  exemptionKind?: string;
  exemptionApproval?: string;
  noExemption?: boolean;
  quickfixInfo?: string;
  quickfixes?: { manual?: boolean; automatic?: boolean; pseudo?: boolean };
  checksum?: string;
  /** Broker-local until the server seals it into a destination capability. */
  documentationUri?: string;
};

type CanonicalAtcRunResult = {
  checkVariant: string;
  findings: CanonicalAtcFinding[];
};

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord | undefined {
  return value !== null && typeof value === 'object'
    ? (value as UnknownRecord)
    : undefined;
}

function records(value: unknown): UnknownRecord[] {
  return (Array.isArray(value) ? value : [value]).flatMap((entry) => {
    const parsed = record(entry);
    return parsed ? [parsed] : [];
  });
}

function stringField(value: UnknownRecord, key: string): string | undefined {
  const field = value[key];
  return typeof field === 'string' && field.trim() ? field.trim() : undefined;
}

function booleanField(value: UnknownRecord, key: string): boolean | undefined {
  const field = value[key];
  return typeof field === 'boolean' ? field : undefined;
}

function optionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function optionalAtcBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

function atcLineFromLocation(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined;
  const match = /(?:^|[?&])start=(\d+)(?:&|$)/u.exec(value);
  if (!match) return undefined;
  const line = Number.parseInt(match[1]!, 10);
  return Number.isSafeInteger(line) && line > 0 ? line : undefined;
}

const ATC_DOCUMENTATION_URI =
  /^\/sap\/bc\/adt\/documentation\/atc\/documents\/itemid\/[A-Za-z0-9_-]+\/index\/\d+$/u;
const ATC_FINDING_URI =
  /^\/sap\/bc\/adt\/atc\/findings\/itemid\/([A-Za-z0-9_-]+)\/index\/(\d+)$/u;

function trustedAtcDocumentationUri(value: unknown): string | undefined {
  return typeof value === 'string' && ATC_DOCUMENTATION_URI.test(value)
    ? value
    : undefined;
}

function documentationUriForFinding(
  finding: UnknownRecord,
): string | undefined {
  const link = records(finding.link).find(
    (entry) =>
      stringField(entry, 'rel') ===
      'http://www.sap.com/adt/relations/documentation',
  );
  const linked = trustedAtcDocumentationUri(link && stringField(link, 'href'));
  if (linked) return linked;
  const findingUri = stringField(finding, 'uri');
  const match = findingUri && ATC_FINDING_URI.exec(findingUri);
  return match
    ? `/sap/bc/adt/documentation/atc/documents/itemid/${match[1]}/index/${match[2]}`
    : undefined;
}

function canonicalAtcFinding( //NOSONAR
  object: UnknownRecord,
  finding: UnknownRecord,
): CanonicalAtcFinding {
  const line = atcLineFromLocation(finding.location);
  const quickfixes = record(finding.quickfixes);
  return {
    checkId: stringField(finding, 'checkId') ?? '',
    checkTitle: stringField(finding, 'checkTitle') ?? '',
    messageText: stringField(finding, 'messageTitle') ?? '',
    priority: Number.parseInt(stringField(finding, 'priority') ?? '3', 10),
    objectType: stringField(object, 'type') ?? '',
    objectName: stringField(object, 'name') ?? '',
    ...(line ? { lineStart: line, lineEnd: line } : {}),
    ...(optionalText(finding.messageId)
      ? { messageId: optionalText(finding.messageId) }
      : {}),
    ...(optionalText(object.packageName)
      ? { packageName: optionalText(object.packageName) }
      : {}),
    ...(optionalText(object.description)
      ? { objectDescription: optionalText(object.description) }
      : {}),
    ...(optionalText(finding.contactPerson)
      ? { contactPerson: optionalText(finding.contactPerson) }
      : {}),
    ...(optionalText(finding.processor)
      ? { processor: optionalText(finding.processor) }
      : {}),
    ...(optionalText(finding.lastChangedBy)
      ? { lastChangedBy: optionalText(finding.lastChangedBy) }
      : {}),
    ...(optionalText(finding.exemptionKind)
      ? { exemptionKind: optionalText(finding.exemptionKind) }
      : {}),
    ...(optionalText(finding.exemptionApproval)
      ? { exemptionApproval: optionalText(finding.exemptionApproval) }
      : {}),
    ...(optionalAtcBoolean(finding.noExemption) === undefined
      ? {}
      : { noExemption: optionalAtcBoolean(finding.noExemption) }),
    ...(optionalText(finding.quickfixInfo)
      ? { quickfixInfo: optionalText(finding.quickfixInfo) }
      : {}),
    ...(quickfixes
      ? {
          quickfixes: {
            ...(optionalAtcBoolean(quickfixes.manual) === undefined
              ? {}
              : { manual: optionalAtcBoolean(quickfixes.manual) }),
            ...(optionalAtcBoolean(quickfixes.automatic) === undefined
              ? {}
              : { automatic: optionalAtcBoolean(quickfixes.automatic) }),
            ...(optionalAtcBoolean(quickfixes.pseudo) === undefined
              ? {}
              : { pseudo: optionalAtcBoolean(quickfixes.pseudo) }),
          },
        }
      : {}),
    ...(typeof finding.checksum === 'string' ||
    typeof finding.checksum === 'number'
      ? { checksum: String(finding.checksum) }
      : {}),
    ...(documentationUriForFinding(finding)
      ? { documentationUri: documentationUriForFinding(finding) }
      : {}),
  };
}

function toCanonicalAtcFindings(response: unknown): CanonicalAtcFinding[] {
  const worklist = record(response)?.worklist;
  const objects = records(record(worklist)?.objects).flatMap((objects) =>
    records(objects.object),
  );
  return objects.flatMap((object) =>
    records(record(object.findings)?.finding).map((finding) =>
      canonicalAtcFinding(object, finding),
    ),
  );
}

async function resolveAtcScopeUris(
  client: AdtClient,
  scope: AtcRunBody['scope'],
): Promise<string[]> {
  switch (scope.kind) {
    case 'package':
      return [
        assertAdtUri(`/sap/bc/adt/packages/${scope.packageName.toUpperCase()}`),
      ];
    case 'transport_request':
      return [
        assertAdtUri(
          `/sap/bc/adt/cts/transportrequests/${scope.trkorr.toUpperCase()}`,
        ),
      ];
    case 'objects':
      return await Promise.all(
        scope.objects.map(async (object) => {
          const uri = await resolveObjectUri(
            client,
            object.objectName,
            adtSearchObjectType(object.objectType),
          );
          if (!uri) throw new Error('ATC object is unavailable');
          return uri;
        }),
      );
  }
}

async function resolveAtcVariant(
  client: AdtClient,
  requested: string | undefined,
): Promise<string> {
  if (requested) return requested;
  const customizing = await client.adt.atc.customizing.get();
  const properties = record(record(customizing)?.customizing)?.properties;
  const property = records(record(properties)?.property).find(
    (entry) => stringField(entry, 'name') === 'systemCheckVariant',
  );
  return stringField(property ?? {}, 'value') ?? 'DEFAULT';
}

function extractAtcWorklistId(response: unknown): string {
  if (typeof response === 'string') {
    const match = /id="([^"]+)"/u.exec(response);
    if (match) return match[1]!;
    if (response.trim()) return response.trim();
  }
  const object = record(response);
  const worklistId = stringField(record(object?.worklist) ?? {}, 'id');
  const runId = stringField(record(object?.worklistRun) ?? {}, 'worklistId');
  if (worklistId) return worklistId;
  if (runId) return runId;
  throw new Error('ATC worklist is unavailable');
}

function normalizedObjectType(value: string): string | undefined {
  const type = value.trim().toUpperCase().split('/', 1)[0]?.trim();
  return type || undefined;
}

function toCanonicalObjects(value: unknown): CanonicalObjectReference[] {
  return records(value).flatMap((entry) => {
    const objectType = normalizedObjectType(stringField(entry, 'type') ?? '');
    const objectName = stringField(entry, 'name')?.toUpperCase();
    if (!objectType || !objectName) return [];
    const optional = (
      key: string,
      outputKey: keyof CanonicalObjectReference,
    ) => {
      const field = stringField(entry, key);
      return field ? { [outputKey]: field } : {};
    };
    return [
      {
        canonicalKey: `${objectType}:${objectName}`,
        objectType,
        objectName,
        ...optional('pgmid', 'pgmid'),
        ...optional('obj_info', 'objInfo'),
        ...optional('obj_desc', 'objDesc'),
        ...optional('lock_status', 'lockStatus'),
      },
    ];
  });
}

function dedupeCanonicalObjects(
  values: CanonicalObjectReference[],
): CanonicalObjectReference[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = `${value.pgmid ?? ''}\u0000${value.canonicalKey}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeChangedAt(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function transportSummaryFromRequest(
  request: UnknownRecord,
  fallbackTrkorr: string,
): TransportSummary {
  const statusRaw = stringField(request, 'status');
  return {
    trkorr: stringField(request, 'number') ?? fallbackTrkorr,
    owner: stringField(request, 'owner') ?? '',
    description: stringField(request, 'desc') ?? '',
    status: mapTransportStatus(statusRaw),
    ...(statusRaw ? { statusRaw } : {}),
    ...(stringField(request, 'type')
      ? { trFunction: stringField(request, 'type')!.toUpperCase() }
      : {}),
    ...(stringField(request, 'target')
      ? { target: stringField(request, 'target')! }
      : {}),
    ...(stringField(request, 'client')
      ? { client: stringField(request, 'client')! }
      : {}),
    ...(normalizeChangedAt(request.lastchanged_timestamp)
      ? { changedAt: normalizeChangedAt(request.lastchanged_timestamp) }
      : {}),
  };
}

function toTransportDetail(
  response: unknown,
  transport: string,
): TransportDetail {
  const root = record(response)?.root;
  const request =
    record(record(root)?.request) ?? record(root) ?? record(response) ?? {};
  const summary = transportSummaryFromRequest(request, transport);
  const tasks = records(request.task).flatMap((task) => {
    const taskTrkorr = stringField(task, 'number');
    if (!taskTrkorr) return [];
    return [
      {
        ...transportSummaryFromRequest(task, taskTrkorr),
        parentTrkorr: transport,
        objects: toCanonicalObjects(task.abap_object),
      },
    ];
  });
  const allObjects = record(request.all_objects);
  return {
    ...summary,
    tasks,
    objects: dedupeCanonicalObjects(
      toCanonicalObjects(request.abap_object).concat(
        toCanonicalObjects(allObjects?.abap_object),
      ),
    ),
  };
}

function quickSearchReferences(response: unknown): UnknownRecord[] {
  const root = record(response) ?? {};
  const references =
    record(root.objectReferences)?.objectReference ??
    root.objectReference ??
    record(root.mainObject)?.objectReference;
  return records(references);
}

const ADT_METADATA_ORIGIN = 'https://adt.invalid';
const ADT_METADATA_PATH_PREFIX = '/sap/bc/adt/';
const RAW_METADATA_TRAVERSAL = /(?:^|\/)\.\.(?:\/|$)/u;
const ENCODED_METADATA_TRAVERSAL_OR_CONTROL =
  /%(?:25)*(?:0[09ad]|20|2e|2f|5c)/iu;
// eslint-disable-next-line no-control-regex
const METADATA_CONTROL_OR_SPACE = /[\s\u0000-\u0008\u000e-\u001f\u007f\\]/u;

function objectMetadataCapability(
  relation: string,
): ObjectMetadataCapability | undefined {
  if (relation.endsWith('/source')) return 'source';
  if (relation.endsWith('/versions')) return 'versions';
  if (relation.endsWith('/objectstructure')) return 'structure';
  if (relation.endsWith('/sources/textelements')) return 'text_elements';
  if (relation.endsWith('/enhancementImplementations')) {
    return 'enhancement_implementations';
  }
  if (
    relation.endsWith('/enhancementOptions') ||
    relation.endsWith('/enhancementOptionsOfMainObject')
  ) {
    return 'enhancement_options';
  }
  if (relation.endsWith('/abapsource/parser')) return 'syntax';
  return undefined;
}

/** Resolve only SAP-advertised relative metadata links, retaining the URI locally. */
function resolveSafeMetadataHref(
  objectUri: string,
  href: string,
): string | undefined {
  const rawHref = href.trim();
  if (
    rawHref !== href ||
    !rawHref ||
    rawHref.startsWith('//') ||
    rawHref.includes('#') ||
    METADATA_CONTROL_OR_SPACE.test(rawHref) ||
    RAW_METADATA_TRAVERSAL.test(rawHref) ||
    ENCODED_METADATA_TRAVERSAL_OR_CONTROL.test(rawHref)
  ) {
    return undefined;
  }

  const objectPath = objectUri.startsWith('/') ? objectUri : `/${objectUri}`;
  const basePath = rawHref.startsWith('.')
    ? objectPath
    : `${objectPath.replace(/\/$/u, '')}/`;
  try {
    const resolved = new URL(rawHref, `${ADT_METADATA_ORIGIN}${basePath}`);
    if (
      resolved.origin !== ADT_METADATA_ORIGIN ||
      !resolved.pathname.startsWith(ADT_METADATA_PATH_PREFIX) ||
      resolved.pathname.includes('\\')
    ) {
      return undefined;
    }
    return assertAdtUri(`${resolved.pathname}${resolved.search}`);
  } catch {
    return undefined;
  }
}

function trustedObjectMetadataCapabilities(
  objectUri: string,
  links: unknown,
): TrustedObjectMetadataCapability[] {
  const capabilities = new Map<string, TrustedObjectMetadataCapability>();
  for (const link of records(links)) {
    const relation = stringField(link, 'rel');
    const href = stringField(link, 'href');
    if (!relation || !href) continue;
    const capability = objectMetadataCapability(relation);
    // Validate the target before describing a relation as a trusted capability.
    const resolvedHref = resolveSafeMetadataHref(objectUri, href);
    if (!capability || !resolvedHref) continue;
    const mapped = {
      relation,
      capability,
      href: resolvedHref,
      ...(stringField(link, 'title')
        ? { title: stringField(link, 'title') }
        : {}),
      ...(stringField(link, 'type')
        ? { mediaType: stringField(link, 'type') }
        : {}),
      ...(stringField(link, 'etag') ? { etag: stringField(link, 'etag') } : {}),
    };
    capabilities.set(`${capability}\u0000${relation}`, mapped);
  }
  return [...capabilities.values()];
}

function toObjectMetadataCapabilities(
  objectUri: string,
  links: unknown,
): CanonicalObjectMetadata['capabilities'] {
  return trustedObjectMetadataCapabilities(objectUri, links).map(
    ({ href: _href, ...capability }) => capability,
  );
}

function toCanonicalObjectMetadata(
  objectType: string,
  objectName: string,
  objectUri: string,
  response: unknown,
): CanonicalObjectMetadata {
  const properties = record(record(response)?.objectProperties) ?? {};
  const genericObject = record(properties.object) ?? {};
  const canonicalType = normalizedObjectType(objectType);
  if (!canonicalType) throw new Error('Object type is unavailable');
  const canonicalName = objectName.toUpperCase();
  const packageName = stringField(genericObject, 'package');
  const description = stringField(genericObject, 'text');

  return {
    object: {
      canonicalKey: `${canonicalType}:${canonicalName}`,
      objectType: canonicalType,
      objectName: canonicalName,
      ...(packageName ? { packageName } : {}),
      ...(description ? { description } : {}),
    },
    metadata: {
      ...(stringField(genericObject, 'type')
        ? { adtObjectType: stringField(genericObject, 'type') }
        : {}),
      ...(description ? { description } : {}),
      ...(packageName ? { packageName } : {}),
    },
    facets: records(properties.property).map((property) => ({
      ...(stringField(property, 'facet')
        ? { facet: stringField(property, 'facet') }
        : {}),
      ...(stringField(property, 'name')
        ? { name: stringField(property, 'name') }
        : {}),
      ...(stringField(property, 'displayName')
        ? { displayName: stringField(property, 'displayName') }
        : {}),
      ...(stringField(property, 'text')
        ? { text: stringField(property, 'text') }
        : {}),
      ...(stringField(property, 'version')
        ? { version: stringField(property, 'version') }
        : {}),
      ...(booleanField(property, 'hasChildrenOfSameFacet') === undefined
        ? {}
        : {
            hasChildrenOfSameFacet: booleanField(
              property,
              'hasChildrenOfSameFacet',
            ),
          }),
    })),
    capabilities: toObjectMetadataCapabilities(objectUri, genericObject.link),
  };
}

function isAdtNotFound(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.name === 'AdtError' &&
    'status' in error &&
    (error as { status?: unknown }).status === 404
  );
}

function adtPrefixQuery(query?: string): string {
  const trimmed = query?.trim();
  if (!trimmed) return '*';
  return /[*?]/u.test(trimmed) ? trimmed : `${trimmed}*`;
}

function toPackageNodes(value: unknown): Array<{
  name: string;
  parent?: string;
  description?: string;
}> {
  const seen = new Set<string>();
  return quickSearchReferences(value).flatMap((entry) => {
    const type = stringField(entry, 'type')?.toUpperCase();
    const name = stringField(entry, 'name')?.toUpperCase();
    if (!type?.startsWith('DEVC') || !name || seen.has(name)) return [];
    seen.add(name);
    const parent = stringField(entry, 'packageName')?.toUpperCase();
    const description = stringField(entry, 'description');
    return [
      {
        name,
        ...(parent && parent !== name ? { parent } : {}),
        ...(description ? { description } : {}),
      },
    ];
  });
}

/**
 * Normalise the ADT package-tree response. The typed upstream contract has a
 * `packageTree.treeNode` shape, distinct from repository quick-search rows.
 * Keep only package identity/parent/description; ADT links stay local.
 */
function toPackageTreeNodes( // NOSONAR - SAP package-tree normalization is branch-heavy; will be refactored in follow-up
  value: unknown,
  rootPackage: string,
): Array<{ name: string; parent?: string; description?: string }> {
  const tree = record(record(value)?.packageTree);
  const nodes = records(tree?.treeNode);
  const root = rootPackage.trim().toUpperCase();
  const deduped = new Map<
    string,
    { name: string; parent?: string; description?: string }
  >();

  for (const node of nodes) {
    const type = stringField(node, 'type')?.toUpperCase();
    const name = stringField(node, 'name')?.toUpperCase();
    // `treeNode` is a package contract, but retain the type guard so an
    // unexpected mixed response cannot turn into a public object row.
    if (!name || (type && !type.startsWith('DEVC'))) continue;
    const superPackage = record(node.superPackageRef);
    const parent = superPackage
      ? stringField(superPackage, 'name')?.toUpperCase()
      : undefined;
    const description = stringField(node, 'description');
    const candidate = {
      name,
      ...(name !== root && parent && parent !== name ? { parent } : {}),
      ...(description ? { description } : {}),
    };
    const existing = deduped.get(name);
    if (!existing) deduped.set(name, candidate);
    else if (!existing.description && candidate.description)
      existing.description = candidate.description;
  }

  // Some SAP releases return only descendants for `type=sub`; preserve the
  // declared root as the stable tree anchor in either response shape.
  if (!deduped.has(root)) deduped.set(root, { name: root });
  return [...deduped.values()].sort((left, right) => {
    if (left.name === root) return -1;
    if (right.name === root) return 1;
    return left.name.localeCompare(right.name);
  });
}

/**
 * A package GET is the portable fallback for SAP releases that do not expose
 * the `$tree` capability. It contains the requested package plus direct
 * `subPackages.packageRef` children; keep the requested root as the public
 * tree anchor and never retain ADT links.
 */
function toPackageMetadataNodes(
  value: unknown,
  requestedPackage: string,
): Array<{ name: string; parent?: string; description?: string }> {
  const packageRecord = record(record(value)?.package);
  const root =
    stringField(packageRecord ?? {}, 'name')?.toUpperCase() ??
    requestedPackage.trim().toUpperCase();
  const rootDescription = stringField(packageRecord ?? {}, 'description');
  const nodes: Array<{ name: string; parent?: string; description?: string }> =
    [
      {
        name: root,
        ...(rootDescription ? { description: rootDescription } : {}),
      },
    ];
  const subPackages = record(packageRecord?.subPackages);
  const seen = new Set<string>([root]);
  for (const reference of records(subPackages?.packageRef)) {
    const name = stringField(reference, 'name')?.toUpperCase();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const description = stringField(reference, 'description');
    nodes.push({
      name,
      parent: root,
      ...(description ? { description } : {}),
    });
  }
  return nodes;
}

function isUnsupportedPackageTree(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.name === 'AdtError' &&
    'status' in error &&
    ([404, 406] as const).includes(
      (error as { status?: unknown }).status as 404 | 406,
    )
  );
}

async function getPackageTreeFromMetadata( // NOSONAR - SAP package-tree traversal is branch-heavy; will be refactored in follow-up
  client: AdtClient,
  rootPackage: string,
): Promise<{
  data: Array<{ name: string; parent?: string; description?: string }>;
  truncated: boolean;
}> {
  const root = rootPackage.trim().toUpperCase();
  const queued = new Set<string>([root]);
  const visited = new Set<string>();
  const queue = [root];
  const packages = new Map<
    string,
    { name: string; parent?: string; description?: string }
  >();
  let truncated = false;

  while (queue.length > 0) {
    queue.sort((left, right) => left.localeCompare(right));
    const name = queue.shift()!;
    queued.delete(name);
    if (visited.has(name)) continue;
    visited.add(name);

    const nodes = toPackageMetadataNodes(
      await client.adt.packages.get(name),
      name,
    );
    const [current, ...children] = nodes;
    if (current) {
      const existing = packages.get(current.name);
      if (!existing) packages.set(current.name, current);
      else if (!existing.description && current.description)
        existing.description = current.description;
    }
    for (const child of children.toSorted((left, right) =>
      left.name.localeCompare(right.name),
    )) {
      const existing = packages.get(child.name);
      if (!existing && packages.size >= MAX_PACKAGE_SEARCH_RESULTS) {
        truncated = true;
        break;
      }
      if (!existing) packages.set(child.name, child);
      else if (!existing.description && child.description)
        existing.description = child.description;
      if (!visited.has(child.name) && !queued.has(child.name)) {
        queue.push(child.name);
        queued.add(child.name);
      }
    }
    if (truncated) break;
  }

  if (queue.length > 0) truncated = true;
  return {
    data: [...packages.values()].sort((left, right) => {
      if (left.name === root) return -1;
      if (right.name === root) return 1;
      return left.name.localeCompare(right.name);
    }),
    truncated,
  };
}

function toCanonicalRepositoryObjects(
  value: unknown,
  packageName?: string,
): CanonicalRepositoryObject[] {
  const seen = new Set<string>();
  const expectedPackageName = packageName?.toUpperCase();
  return quickSearchReferences(value).flatMap((entry) => {
    const objectType = normalizedObjectType(stringField(entry, 'type') ?? '');
    const objectName = stringField(entry, 'name')?.toUpperCase();
    // Keep ADT's URI only as an adapter-local eligibility signal. It never
    // crosses this boundary, but confirms a later safe read can be resolved.
    if (
      !objectType ||
      !objectName ||
      objectType === 'DEVC' ||
      !stringField(entry, 'uri')
    )
      return [];
    const canonicalKey = `${objectType}:${objectName}`;
    if (seen.has(canonicalKey)) return [];
    const packageName = stringField(entry, 'packageName')?.toUpperCase();
    if (
      expectedPackageName &&
      packageName &&
      packageName !== expectedPackageName
    )
      return [];
    seen.add(canonicalKey);
    const description = stringField(entry, 'description');
    return [
      {
        canonicalKey,
        objectType,
        objectName,
        ...(packageName ? { packageName } : {}),
        ...(description ? { description } : {}),
      },
    ];
  });
}

function adtSearchObjectType(objectType?: string): string | undefined {
  const normalized = normalizedObjectType(objectType ?? '');
  return normalized === 'REPS' ? 'PROG' : normalized;
}

function mapTransportStatus(status?: string): string {
  switch (status) {
    case 'R':
      return 'released';
    case 'D':
    case 'L':
      return 'modifiable';
    case 'O':
    case 'P':
      return 'release_started';
    default:
      return status ? status.toLowerCase() : '';
  }
}

function toTransportSummary(header: CtsRequestHeader): TransportSummary {
  return {
    trkorr: header.TRKORR,
    owner: header.AS4USER ?? '',
    description: header.AS4TEXT ?? '',
    status: mapTransportStatus(header.TRSTATUS),
    ...(header.TRSTATUS ? { statusRaw: header.TRSTATUS } : {}),
    ...(header.TRFUNCTION ? { trFunction: header.TRFUNCTION } : {}),
    ...(header.TARSYSTEM ? { target: header.TARSYSTEM } : {}),
    ...(header.CLIENT ? { client: header.CLIENT } : {}),
    ...(header.AS4DATE
      ? { changedAt: `${header.AS4DATE}T${header.AS4TIME ?? '00:00:00'}Z` }
      : {}),
  };
}

function same(value: string | undefined, expected: string): boolean {
  return (value ?? '').toLowerCase() === expected.toLowerCase();
}

function matchesText(transport: TransportSummary, value: string): boolean {
  if (value === '*') return true;
  if (value.endsWith('*')) {
    const prefix = value.slice(0, -1).trim();
    return (
      prefix.length > 0 &&
      transport.trkorr.toLowerCase().startsWith(prefix.toLowerCase())
    );
  }
  return (
    same(transport.trkorr, value) ||
    `${transport.description} ${transport.owner}`
      .toLowerCase()
      .includes(value.toLowerCase())
  );
}

function transportMatchesCriteria( //NOSONAR
  transport: TransportSummary,
  criteria: TransportSearchCriteria,
): boolean {
  if (
    criteria.includeTasks === false &&
    transport.trFunction &&
    ['S', 'R', 'X', 'Q'].includes(transport.trFunction.toUpperCase())
  )
    return false;
  if (criteria.owner && !same(transport.owner, criteria.owner)) return false;
  if (criteria.type && !same(transport.trFunction, criteria.type)) return false;
  if (criteria.status && !same(transport.status, criteria.status)) return false;
  if (criteria.target && !same(transport.target, criteria.target)) return false;
  const date = transport.changedAt?.slice(0, 10);
  if (criteria.dateFrom && (!date || date < criteria.dateFrom)) return false;
  if (criteria.dateTo && (!date || date > criteria.dateTo)) return false;
  if (criteria.text && !matchesText(transport, criteria.text)) return false;
  return true;
}

function filterTransports(
  transports: TransportSummary[],
  criteria?: TransportSearchCriteria,
): TransportSummary[] {
  if (!criteria) return transports;
  return transports.filter((transport) =>
    transportMatchesCriteria(transport, criteria),
  );
}

function extractTransportHeaders(response: unknown): CtsRequestHeader[] {
  const root = response as {
    abap?: { values?: { DATA?: { CTS_REQ_HEADER?: unknown } } };
    values?: { DATA?: { CTS_REQ_HEADER?: unknown } };
  };
  const headers =
    root.abap?.values?.DATA?.CTS_REQ_HEADER ??
    root.values?.DATA?.CTS_REQ_HEADER;
  if (!headers) return [];
  return (Array.isArray(headers) ? headers : [headers]).flatMap((header) =>
    header &&
    typeof header === 'object' &&
    typeof (header as { TRKORR?: unknown }).TRKORR === 'string'
      ? [header as CtsRequestHeader]
      : [],
  );
}

function brokerLeaseHelpers(options: HttpBrokerOptions) {
  const fetcher = options.fetch ?? globalThis.fetch;
  const readBrokerToken = async (): Promise<string> => {
    const token = (await readFile(options.tokenFile, 'utf8')).trim();
    if (!token) throw new Error('ADT Server broker token file is empty');
    return token;
  };
  const acquireLease = async (destination: string): Promise<BrokerLease> => {
    const token = await readBrokerToken();
    const response = await fetcher(
      new URL(
        '/internal/adt-server/destination-leases:acquire',
        options.baseUrl,
      ),
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-adt-server-token': token,
        },
        body: JSON.stringify({ destination, correlationId: randomUUID() }),
      },
    );
    if (!response.ok)
      throw new Error(`Destination lease unavailable (${response.status})`);
    const lease = await response.json();
    if (!isBrokerLease(lease)) throw new Error('Destination lease unavailable');
    return lease;
  };
  const releaseLease = async (
    lease: BrokerLease,
    operationName: string,
    outcome: 'succeeded' | 'failed',
    durationMs: number,
    errorCode?: string,
  ): Promise<void> => {
    const token = await readBrokerToken();
    const response = await fetcher(
      new URL(
        '/internal/adt-server/destination-leases:release',
        options.baseUrl,
      ),
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-adt-server-token': token,
        },
        body: JSON.stringify({
          leaseId: lease.leaseId,
          operation: operationName,
          outcome,
          durationMs: Math.min(durationMs, 5 * 60_000),
          ...(errorCode ? { errorCode } : {}),
        }),
      },
    );
    if (!response.ok)
      throw new Error(`Destination lease release failed (${response.status})`);
  };
  return { fetcher, readBrokerToken, acquireLease, releaseLease };
}

function isDestinationSummary(value: unknown): value is DestinationSummary {
  if (!record(value)) return false;
  const summary = value as DestinationSummary;
  return (
    typeof summary.key === 'string' &&
    typeof summary.displayName === 'string' &&
    Array.isArray(summary.systemSids) &&
    summary.systemSids.every((systemSid) => typeof systemSid === 'string') &&
    typeof summary.authConfigured === 'boolean' &&
    Number.isInteger(summary.version)
  );
}

function isDestinationSummaryResponse(
  value: unknown,
): value is { data: DestinationSummary[] } {
  const body = record(value);
  return (
    !!body && Array.isArray(body.data) && body.data.every(isDestinationSummary)
  );
}

/** Read-only broker probe; it never acquires a destination lease or contacts SAP. */
export function createHttpBrokerReadinessProbe(
  options: HttpBrokerOptions,
): ReadinessProbe {
  const { fetcher, readBrokerToken } = brokerLeaseHelpers(options);
  return async (signal) => {
    const token = await readBrokerToken();
    const response = await fetcher(
      new URL('/internal/adt-server/destinations', options.baseUrl),
      {
        headers: { 'x-adt-server-token': token },
        redirect: 'error',
        signal,
      },
    );
    if (!response.ok)
      throw new Error(`ADT Server broker request failed (${response.status})`);
    if (!isDestinationSummaryResponse(await response.json())) {
      throw new Error(
        'ADT Server broker returned an invalid destination summary',
      );
    }
  };
}

/** ADT-private broker client. It exposes only safe summaries to the public server layer. */
export function createHttpBrokerOperations(
  options: HttpBrokerOptions,
): AdtServerOperations {
  const { fetcher, readBrokerToken, acquireLease, releaseLease } =
    brokerLeaseHelpers(options);
  const createClient =
    options.createClient ??
    ((connection: BrokerConnection) =>
      clientFromConnection(connection, options.allowedUaaHosts));
  const request = async (path: string): Promise<Response> => {
    const token = await readBrokerToken();
    const response = await fetcher(new URL(path, options.baseUrl), {
      headers: { 'x-adt-server-token': token },
    });
    if (!response.ok)
      throw new Error(`ADT Server broker request failed (${response.status})`);
    return response;
  };
  const withClient = async <T>(
    destination: string,
    operationName: string,
    operation: (client: AdtClient) => Promise<T>,
  ): Promise<T> => {
    const lease = await acquireLease(destination);
    const startedAt = Date.now();
    let clientCreated = false;
    let outcome: 'succeeded' | 'failed' = 'failed';
    let result: T | undefined;
    let operationError: unknown;
    try {
      const client = await createClient(lease.connection);
      clientCreated = true;
      result = await operation(client);
      outcome = 'succeeded';
    } catch (error) {
      operationError = error;
    } finally {
      const errorCode =
        outcome === 'failed'
          ? clientCreated
            ? 'operation_failed'
            : 'client_creation_failed'
          : undefined;
      try {
        await releaseLease(
          lease,
          operationName,
          outcome,
          Date.now() - startedAt,
          errorCode,
        );
      } catch {
        // Lease release is best-effort: the broker operation already
        // completed, and returning its result must not be masked by a
        // telemetry/release failure.
      }
    }
    if (operationError !== undefined) throw operationError;
    return result!;
  };
  return {
    async listDestinations(): Promise<DestinationSummary[]> {
      const body = (await (
        await request('/internal/adt-server/destinations')
      ).json()) as { data?: DestinationSummary[] };
      return Array.isArray(body.data) ? body.data : [];
    },
    async listTransports(destination, criteria) {
      return await withClient(
        destination,
        'list_transports',
        async (client) => {
          const response = await client.adt.cts.transports.find({
            _action: 'FIND',
            user: '*',
            trfunction: '*',
          });
          return filterTransports(
            extractTransportHeaders(response).map(toTransportSummary),
            criteria,
          );
        },
      );
    },
    async getTransportDetail(destination, transport) {
      return await withClient(
        destination,
        'get_transport_detail',
        async (client) =>
          toTransportDetail(
            await client.adt.cts.transportrequests.get(transport),
            transport,
          ),
      );
    },
    async listTransportObjects(destination, transport) {
      return await withClient(
        destination,
        'list_transport_objects',
        async (client) => {
          const detail = toTransportDetail(
            await client.adt.cts.transportrequests.get(transport),
            transport,
          );
          return dedupeCanonicalObjects([
            ...detail.objects,
            ...detail.tasks.flatMap((task) => task.objects),
          ]);
        },
      );
    },
    async searchPackages(destination, criteria: PackageSearchCriteria = {}) {
      return await withClient(
        destination,
        'search_packages',
        async (client) => {
          const cap = criteria.maxResults ?? 5_000;
          const response =
            await client.adt.repository.informationsystem.search.quickSearch({
              query: adtPrefixQuery(criteria.q),
              objectType: 'DEVC',
              maxResults: cap + 1,
            });
          const packages = toPackageNodes(response);
          return {
            data: packages.slice(0, cap),
            truncated: quickSearchReferences(response).length >= cap,
          };
        },
      );
    },
    async getPackageTree(destination, rootPackage) {
      return await withClient(
        destination,
        'get_package_tree',
        async (client) => {
          const normalizedRoot = rootPackage.trim().toUpperCase();
          try {
            const response = await client.adt.packages.tree({
              packagename: normalizedRoot,
              type: 'sub',
            });
            const packages = toPackageTreeNodes(response, normalizedRoot);
            return {
              data: packages.slice(0, MAX_PACKAGE_SEARCH_RESULTS),
              truncated: packages.length > MAX_PACKAGE_SEARCH_RESULTS,
            };
          } catch (error) {
            if (!isUnsupportedPackageTree(error)) throw error;
            return await getPackageTreeFromMetadata(client, normalizedRoot);
          }
        },
      );
    },
    async searchObjects(destination, criteria: ObjectSearchCriteria = {}) {
      return await withClient(destination, 'search_objects', async (client) => {
        const cap = criteria.maxResults ?? 5_000;
        const response =
          await client.adt.repository.informationsystem.search.quickSearch({
            query: adtPrefixQuery(criteria.query),
            maxResults: cap + 1,
            ...(criteria.packageName
              ? { packageName: criteria.packageName.toUpperCase() }
              : {}),
            ...(adtSearchObjectType(criteria.objectType)
              ? { objectType: adtSearchObjectType(criteria.objectType) }
              : {}),
          });
        const objects = toCanonicalRepositoryObjects(response);
        return {
          data: objects.slice(0, cap),
          truncated: quickSearchReferences(response).length >= cap,
        };
      });
    },
    async getObjectMetadata(destination, objectType, objectName) {
      return await withClient(
        destination,
        'get_object_metadata',
        async (client) => {
          // Reuse the upstream typed-first resolver. It owns type-to-ADT URI
          // knowledge; the resolved URI stays inside this broker.
          const objectUri = await resolveObjectUri(
            client,
            objectName,
            adtSearchObjectType(objectType),
          );
          if (!objectUri) throw new Error('Object metadata is unavailable');
          const response =
            await client.adt.repository.informationsystem.objectProperties.values(
              { uri: objectUri, facets: ['package', 'appl'] },
            );
          return toCanonicalObjectMetadata(
            objectType,
            objectName,
            objectUri,
            response,
          );
        },
      );
    },
    async getBadi(destination, badiName, options) {
      return await withClient(destination, 'get_badi', async (client) => {
        const {
          enhancement: _enhancement,
          source: _source,
          ...metadata
        } = await new BadiService(client).get({
          name: badiName,
          options: {
            includeImplementations: options?.includeImplementations,
          },
        });
        return metadata;
      });
    },
    async getObjectSourceHistory(destination, objectType, objectName) {
      return await withClient(
        destination,
        'get_object_source_history',
        async (client) => {
          const objectUri = await resolveObjectUri(
            client,
            objectName,
            adtSearchObjectType(objectType),
          );
          if (!objectUri)
            throw new Error('Object source history is unavailable');
          const response =
            await client.adt.repository.informationsystem.objectProperties.values(
              { uri: objectUri, facets: ['package', 'appl'] },
            );
          const genericObject = record(
            record(response)?.objectProperties,
          )?.object;
          const versions = trustedObjectMetadataCapabilities(
            objectUri,
            genericObject && record(genericObject)?.link,
          ).find((capability) => capability.capability === 'versions');
          if (!versions) return { available: false, versions: [] };
          const sourceVersions =
            await client.services.sourceHistory.listVersions(versions.href);
          return {
            available: true,
            versions: sourceVersions.map(
              ({ sourceUri: _sourceUri, ...version }) => ({ ...version }),
            ),
          };
        },
      );
    },
    async readObjectSource(input) {
      return await withClient(
        input.destination,
        'read_object_source',
        async (client) => {
          const objectUri = await resolveObjectUri(
            client,
            input.objectName,
            adtSearchObjectType(input.objectType),
          );
          if (!objectUri) throw new Error('Object source is unavailable');
          const sourcePath =
            `${objectUri.replace(/\/$/u, '')}/source/main` +
            (input.version
              ? `?version=${encodeURIComponent(input.version)}`
              : '');
          let source: string;
          try {
            source = await client.readTextBounded(
              sourcePath,
              MAX_SOURCE_BYTES,
              {
                headers: { Accept: 'text/plain' },
              },
            );
          } catch (error) {
            if (error instanceof AdtResponseTooLargeError) {
              throw new SourceVersionTooLargeError(
                error.maxBytes,
                error.receivedBytes,
              );
            }
            // Preserve the direct SapPort convention: only an explicit ADT 404
            // means the object simply has no fetchable source.
            if (isAdtNotFound(error)) return { bytes: 0, source: '' };
            throw error;
          }
          return { bytes: Buffer.byteLength(source, 'utf8'), source };
        },
      );
    },
    async listPackageObjects(destination, packageName) {
      return await withClient(
        destination,
        'list_package_objects',
        async (client) => {
          const cap = 5_000;
          const response =
            await client.adt.repository.informationsystem.search.quickSearch({
              query: '*',
              packageName: packageName.toUpperCase(),
              maxResults: cap + 1,
            });
          const objects = toCanonicalRepositoryObjects(response, packageName);
          return {
            data: objects.slice(0, cap),
            truncated: quickSearchReferences(response).length >= cap,
          };
        },
      );
    },
    async runAtc(input): Promise<CanonicalAtcRunResult> {
      return await withClient(input.destination, 'run_atc', async (client) => {
        const checkVariant = await resolveAtcVariant(client, input.variant);
        const created = await client.adt.atc.worklists.create({
          checkVariant,
        });
        const worklistId = extractAtcWorklistId(created);
        const targetUris = await resolveAtcScopeUris(client, input.scope);
        await client.adt.atc.runs.post(
          { worklistId },
          {
            run: {
              maximumVerdicts: 10_000,
              objectSets: {
                objectSet: [
                  {
                    kind: 'inclusive',
                    objectReferences: {
                      objectReference: targetUris.map((uri) => ({ uri })),
                    },
                  },
                ],
              },
            },
          },
        );
        const worklist = await client.adt.atc.worklists.get(worklistId, {
          includeExemptedFindings: 'false',
        });
        const findings = toCanonicalAtcFindings(worklist);
        // Enrich findings with check categories from the run's check
        // variant form template (best-effort: never fails the run). Live
        // worklist checkIds are GUIDs, so unresolved findings go through
        // the documentation bridge (each finding's documentation page names
        // the check class).
        const categoryIndex = await fetchCheckCategoryIndex(
          client,
          checkVariant,
        );
        enrichFindingsWithCategories(findings, categoryIndex);
        await resolveCategoriesViaDocumentation(
          client,
          findings,
          categoryIndex,
        );
        return {
          checkVariant,
          findings,
        };
      });
    },
    async readAtcFindingDocumentation(input) {
      return await withClient(
        input.destination,
        'read_atc_finding_documentation',
        async (client) => {
          const documentationUri = trustedAtcDocumentationUri(
            input.documentationUri,
          );
          if (!documentationUri) {
            throw new Error('ATC documentation is unavailable');
          }
          const html = await client.readTextBounded(
            documentationUri,
            input.maxBytes,
            {
              headers: {
                Accept: 'application/vnd.sap.adt.docu.v1+html',
              },
            },
          );
          return { bytes: Buffer.byteLength(html, 'utf8'), html };
        },
      );
    },
    async buildTransportSourceManifest(destination, input) {
      return await withClient(
        destination,
        'build_transport_source_manifest',
        async (client) =>
          await new ExactSourceHistoryService(client).buildTransportManifest(
            input,
          ),
      );
    },
    async readImmutableSource(input) {
      return await withClient(
        input.destination,
        'read_immutable_source',
        async (client) => {
          const source =
            await client.services.sourceHistory.readVersionSourceBounded(
              input.sourceUri,
              input.maxBytes,
            );
          return { bytes: Buffer.byteLength(source, 'utf8'), source };
        },
      );
    },
  };
}

function validateUaaUrl(
  uaaUrl: string,
  allowedUaaHosts: string[] | undefined,
): URL {
  let url: URL;
  try {
    url = new URL(uaaUrl);
  } catch {
    throw new Error('BTP service key uaa.url is not a valid URL');
  }
  if (url.protocol !== 'https:') {
    throw new Error('BTP service key uaa.url must use https:');
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error(
      'BTP service key uaa.url must not contain credentials, query, or fragment',
    );
  }
  if (allowedUaaHosts && !allowedUaaHosts.includes(url.hostname)) {
    throw new Error(
      `BTP service key uaa.url host ${url.hostname} is not allow-listed`,
    );
  }
  return url;
}

function postFormForJson<T>(
  url: URL,
  headers: Record<string, string>,
  body: string,
): Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  json(): Promise<T>;
}> {
  return new Promise((resolve, reject) => {
    const req = httpsRequest(url, { method: 'POST', headers }, (response) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => chunks.push(chunk));
      response.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve({
          ok:
            response.statusCode !== undefined &&
            response.statusCode >= 200 &&
            response.statusCode < 300,
          status: response.statusCode ?? 0,
          statusText: response.statusMessage ?? '',
          async json() {
            return JSON.parse(text) as T;
          },
        });
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function clientFromConnection(
  connection: BrokerConnection,
  allowedUaaHosts?: string[],
): Promise<AdtClient> {
  if (connection.authMethod === 'basic') {
    const username = connection.authConfig.username;
    const password = connection.authConfig.password;
    if (typeof username !== 'string' || typeof password !== 'string')
      throw new Error('Broker returned incomplete basic credentials');
    return createAdtClient({
      baseUrl: connection.baseUrl,
      client: connection.sapClient ?? undefined,
      username,
      password,
    });
  }
  const serviceKey = connection.authConfig.serviceKey as
    | { uaa?: { url?: string; clientid?: string; clientsecret?: string } }
    | undefined;
  if (
    !serviceKey?.uaa?.url ||
    !serviceKey.uaa.clientid ||
    !serviceKey.uaa.clientsecret
  )
    throw new Error('Broker returned incomplete BTP service key');
  const uaaUrl = validateUaaUrl(serviceKey.uaa.url, allowedUaaHosts);
  const credentials = Buffer.from(
    `${serviceKey.uaa.clientid}:${serviceKey.uaa.clientsecret}`,
  ).toString('base64');
  const tokenUrl = new URL('/oauth/token', uaaUrl);
  const tokenResponse = await postFormForJson<{
    access_token?: string;
    token_type?: string;
  }>(
    tokenUrl,
    {
      authorization: `Basic ${credentials}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    'grant_type=client_credentials',
  );
  if (!tokenResponse.ok) throw new Error('BTP token acquisition failed');
  const token = await tokenResponse.json();
  if (!token.access_token)
    throw new Error('BTP token response did not contain access_token');
  return createAdtClient({
    baseUrl: connection.baseUrl,
    client: connection.sapClient ?? undefined,
    authorizationHeader: `${token.token_type ?? 'Bearer'} ${token.access_token}`,
  });
}

/** Creates the opaque lease/provider pair consumed by shared MCP mode. */
export function createHttpDestinationContexts(options: HttpBrokerOptions): {
  leaseProvider: DestinationLeaseProvider;
  contextFactory: DestinationContextFactory;
  resolveFrozenSource(input: {
    destination: string;
    systemSid: string;
    sourceRef: string;
  }): Promise<{ sourceUri: string } | { sourceCapability: string }>;
} {
  const { fetcher, readBrokerToken, acquireLease, releaseLease } =
    brokerLeaseHelpers(options);
  return {
    leaseProvider: {
      async acquire({ destination }) {
        const lease = await acquireLease(destination);
        let releasePromise: Promise<void> | undefined;
        return {
          destination: lease.destination,
          version: lease.version,
          expiresAt: Date.parse(lease.expiresAt),
          material: lease.connection,
          release: async () => {
            releasePromise ??= releaseLease(
              lease,
              'mcp_destination_context',
              'succeeded',
              0,
            );
            await releasePromise;
          },
        };
      },
    },
    contextFactory: {
      async create({ lease }) {
        return {
          client: await clientFromConnection(
            lease.material as BrokerConnection,
          ),
          close: async () => undefined,
        };
      },
    },
    async resolveFrozenSource(input) {
      const token = await readBrokerToken();
      const response = await fetcher(
        new URL(
          '/internal/adt-server/frozen-source-references:resolve',
          options.baseUrl,
        ),
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-adt-server-token': token,
          },
          body: JSON.stringify(input),
        },
      );
      if (!response.ok)
        throw new Error('Frozen source reference is unavailable');
      const body = (await response.json()) as {
        sourceUri?: unknown;
        sourceCapability?: unknown;
      };
      if (
        typeof body.sourceUri === 'string' &&
        body.sourceUri.startsWith('/sap/bc/adt/') &&
        // eslint-disable-next-line no-control-regex
        !/[\s\\\u0000-\u0008\u000e-\u001f\u007f]/u.test(body.sourceUri)
      )
        return { sourceUri: body.sourceUri };
      if (
        typeof body.sourceCapability === 'string' &&
        /^src\.v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u.test(body.sourceCapability)
      )
        return { sourceCapability: body.sourceCapability };
      throw new Error('Frozen source reference is unavailable');
    },
  };
}
