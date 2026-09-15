import { z } from 'zod';

export const MAX_SOURCE_BYTES = 2 * 1024 * 1024;
export const MAX_ATC_DOCUMENTATION_BYTES = 1024 * 1024;
export const MAX_PACKAGE_SEARCH_RESULTS = 5_000;
export const MAX_OBJECT_SEARCH_RESULTS = 5_000;

export const destinationSummaryResponse = z
  .object({
    data: z.array(
      z
        .object({
          key: z.string().trim().min(1).max(63),
          displayName: z.string().trim().min(1).max(256),
          systemSids: z.array(z.string().trim().min(1).max(32)).max(128),
          authConfigured: z.boolean(),
          version: z.number().int().positive(),
        })
        .strict(),
    ),
  })
  .strict();

export const transportSourceManifestBody = z
  .object({
    transports: z.array(z.string().trim().min(1)).min(1),
  })
  .strict();

export const sourceVersionReadBody = z
  .object({
    sourceCapability: z
      .string()
      .min(1)
      .max(8 * 1024),
    maxBytes: z.number().int().positive().max(MAX_SOURCE_BYTES),
  })
  .strict();

const sourceVersionManifestEntry = z
  .object({
    id: z.string().trim().min(1).max(256),
    ordinal: z.number().int().nonnegative(),
    title: z.string().max(1_024).optional(),
    contentType: z.string().max(256).optional(),
    etag: z.string().max(1_024).optional(),
    updatedAt: z.string().max(128).optional(),
    author: z.string().max(256).optional(),
    transports: z.array(z.string().trim().min(1).max(64)).max(1_024),
    sourceCapability: z
      .string()
      .trim()
      .min(1)
      .max(8 * 1024),
  })
  .strict();

const transportSourceManifestObject = z
  .object({
    pgmid: z.string().trim().min(1).max(16),
    type: z.string().trim().min(1).max(64),
    name: z.string().trim().min(1).max(128),
    packageName: z.string().trim().min(1).max(128).optional(),
  })
  .strict();

const transportSourceManifestComponent = z
  .object({
    id: z.string().trim().min(1).max(256),
  })
  .strict();

const transportSourceDiagnostic = z
  .object({
    code: z.string().trim().min(1).max(128),
    message: z.string().max(1_024),
  })
  .strict();

export const transportSourceManifestResponse = z
  .object({
    requestedTransports: z.array(z.string().trim().min(1).max(64)).min(1),
    scopeTransports: z.array(z.string().trim().min(1).max(64)).min(1),
    inventory: z.array(
      z
        .object({
          pgmid: z.string().trim().min(1).max(16),
          type: z.string().trim().min(1).max(64),
          name: z.string().trim().min(1).max(128),
          wbtype: z.string().trim().min(1).max(64).optional(),
          objFunc: z.string().max(16),
          sourceTransport: z.string().trim().min(1).max(64),
        })
        .strict(),
    ),
    entries: z.array(
      z
        .object({
          object: transportSourceManifestObject,
          repositoryObject: transportSourceManifestObject.optional(),
          component: transportSourceManifestComponent,
          sourceTransport: z.string().trim().min(1).max(64),
          changeKind: z.enum([
            'added',
            'modified',
            'deleted',
            'unchanged',
            'ambiguous',
            'unsupported',
            'failed',
          ]),
          exact: z.boolean(),
          base: sourceVersionManifestEntry.optional(),
          head: sourceVersionManifestEntry.optional(),
          diagnostic: transportSourceDiagnostic.optional(),
        })
        .strict(),
    ),
  })
  .strict();

export const sourceVersionReadResponse = z
  .object({
    bytes: z.number().int().nonnegative().max(MAX_SOURCE_BYTES),
    source: z.string(),
  })
  .strict();

export const packageNode = z
  .object({
    name: z.string().trim().min(1).max(128),
    parent: z.string().trim().min(1).max(128).optional(),
    description: z.string().max(1_024).optional(),
  })
  .strict();

export const packageSearchQuery = z
  .object({
    q: z.string().trim().min(1).max(256).optional(),
    maxResults: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_PACKAGE_SEARCH_RESULTS)
      .optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
    cursor: z
      .string()
      .trim()
      .min(1)
      .max(4 * 1_024)
      .optional(),
  })
  .strict();

export const packageSearchResult = z
  .object({
    data: z.array(packageNode).max(MAX_PACKAGE_SEARCH_RESULTS),
    truncated: z.boolean(),
  })
  .strict();

export const pageQuery = z
  .object({
    limit: z.coerce.number().int().min(1).max(200).optional(),
    cursor: z
      .string()
      .trim()
      .min(1)
      .max(4 * 1_024)
      .optional(),
  })
  .strict();

export const objectSearchQuery = z
  .object({
    query: z.string().trim().min(1).max(256).optional(),
    packageName: z
      .string()
      .trim()
      .min(1)
      .max(128)
      .regex(/^[A-Za-z0-9_/$-]+$/u)
      .optional(),
    objectType: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(/^[A-Za-z0-9_/-]+$/u)
      .optional(),
    maxResults: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_OBJECT_SEARCH_RESULTS)
      .optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
    cursor: z
      .string()
      .trim()
      .min(1)
      .max(4 * 1_024)
      .optional(),
  })
  .strict();

export const packagePageResponse = z
  .object({
    data: z.array(packageNode).max(200),
    nextCursor: z
      .string()
      .min(1)
      .max(4 * 1_024)
      .nullable(),
    truncated: z.boolean(),
    observedAt: z.string().datetime(),
  })
  .strict();

export const transportSearchQuery = z
  .object({
    includeTasks: z.enum(['true', 'false']).optional(),
    owner: z.string().trim().min(1).max(128).optional(),
    type: z.string().trim().min(1).max(16).optional(),
    status: z.string().trim().min(1).max(64).optional(),
    target: z.string().trim().min(1).max(128).optional(),
    dateFrom: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/u)
      .optional(),
    dateTo: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/u)
      .optional(),
    text: z.string().trim().min(1).max(256).optional(),
  })
  .strict();

export const transportSummary = z
  .object({
    trkorr: z.string().trim().min(1).max(64),
    owner: z.string().max(128),
    description: z.string().max(1_024),
    status: z.string().max(64),
    statusRaw: z.string().max(16).optional(),
    trFunction: z.string().max(16).optional(),
    target: z.string().max(128).optional(),
    client: z.string().max(16).optional(),
    changedAt: z.string().datetime().optional(),
  })
  .strict();

export const transportListResponse = z.array(transportSummary);

/** Public object identity. ADT URIs remain adapter-local and never cross REST. */
export const canonicalObjectReference = z
  .object({
    canonicalKey: z
      .string()
      .trim()
      .min(3)
      .max(256)
      .regex(/^[A-Z0-9_]+:.+$/u),
    objectType: z.string().trim().min(1).max(64),
    objectName: z.string().trim().min(1).max(128),
    pgmid: z.string().trim().min(1).max(16).optional(),
    objInfo: z.string().trim().min(1).max(256).optional(),
    objDesc: z.string().trim().min(1).max(1_024).optional(),
    lockStatus: z.string().trim().min(1).max(64).optional(),
  })
  .strict();

/** Canonical repository-search entry. ADT object URI stays adapter-local. */
export const canonicalRepositoryObject = canonicalObjectReference.extend({
  packageName: z.string().trim().min(1).max(128).optional(),
  description: z.string().max(1_024).optional(),
});

export const objectSearchResult = z
  .object({
    data: z.array(canonicalRepositoryObject).max(MAX_OBJECT_SEARCH_RESULTS),
    truncated: z.boolean(),
  })
  .strict();

export const objectPageResponse = z
  .object({
    data: z.array(canonicalRepositoryObject).max(200),
    nextCursor: z
      .string()
      .min(1)
      .max(4 * 1_024)
      .nullable(),
    truncated: z.boolean(),
    observedAt: z.string().datetime(),
  })
  .strict();

export const transportTaskDetail = transportSummary
  .extend({
    parentTrkorr: z.string().trim().min(1).max(64),
    objects: z.array(canonicalObjectReference),
  })
  .strict();

export const transportDetailResponse = transportSummary
  .extend({
    tasks: z.array(transportTaskDetail),
    objects: z.array(canonicalObjectReference),
  })
  .strict();

export const transportObjectsResponse = z.array(canonicalObjectReference);

export const transportPathParameter = z
  .string()
  .trim()
  .min(3)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/u);

/** Package names can contain spaces and slash when URL-encoded on the wire. */
export const packagePathParameter = z
  .string()
  .trim()
  .min(1)
  .max(128)
  // eslint-disable-next-line no-control-regex
  .regex(/^[^\u0000-\u001F\u007F]+$/u);

/** Canonical ADT object types may carry a subtype suffix such as `PROG/P`. */
export const objectTypePathParameter = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_/-]+$/u);

/** Namespaced ABAP objects use URL-encoded slashes in the path segment. */
export const objectNamePathParameter = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_/$-]+$/u);

/** A package tree is intentionally rooted: ADT does not provide a bounded global forest. */
export const packageTreeQuery = z
  .object({
    root: packagePathParameter,
    limit: z.coerce.number().int().min(1).max(200).optional(),
    cursor: z
      .string()
      .trim()
      .min(1)
      .max(4 * 1_024)
      .optional(),
  })
  .strict();

const objectMetadataFacet = z
  .object({
    facet: z.string().trim().min(1).max(256).optional(),
    name: z.string().trim().min(1).max(256).optional(),
    displayName: z.string().max(1_024).optional(),
    text: z.string().max(1_024).optional(),
    version: z.string().trim().min(1).max(256).optional(),
    hasChildrenOfSameFacet: z.boolean().optional(),
  })
  .strict();

const objectMetadataCapability = z
  .object({
    relation: z.string().trim().min(1).max(1_024),
    capability: z.enum([
      'source',
      'versions',
      'structure',
      'text_elements',
      'enhancement_implementations',
      'enhancement_options',
      'syntax',
    ]),
    title: z.string().max(1_024).optional(),
    mediaType: z.string().trim().min(1).max(256).optional(),
    etag: z.string().trim().min(1).max(1_024).optional(),
  })
  .strict();

/** Canonical BAdI metadata (classic vit/wb or ENHO/XHH). */
export const badiResponse = z
  .object({
    kind: z.enum(['definition', 'implementation', 'enhancement']),
    name: z.string().trim().min(1).max(128),
    type: z.string().trim().min(1).max(64),
    description: z.string().max(1_024).optional(),
    language: z.string().trim().min(1).max(16).optional(),
    version: z.string().trim().min(1).max(64).optional(),
    packageName: z.string().trim().min(1).max(128).optional(),
    packageUri: z
      .string()
      .max(8 * 1024)
      .optional(),
    responsible: z.string().max(256).optional(),
    masterLanguage: z.string().trim().min(1).max(16).optional(),
    masterSystem: z.string().trim().min(1).max(32).optional(),
    implementations: z
      .array(
        z
          .object({
            kind: z.literal('implementation'),
            name: z.string().trim().min(1).max(128),
            type: z.string().trim().min(1).max(64),
            description: z.string().max(1_024).optional(),
            language: z.string().trim().min(1).max(16).optional(),
            version: z.string().trim().min(1).max(64).optional(),
            packageName: z.string().trim().min(1).max(128).optional(),
            packageUri: z
              .string()
              .max(8 * 1024)
              .optional(),
            responsible: z.string().max(256).optional(),
            masterLanguage: z.string().trim().min(1).max(16).optional(),
            masterSystem: z.string().trim().min(1).max(32).optional(),
          })
          .strict(),
      )
      .max(5_000)
      .optional(),
  })
  .strict();

/** @deprecated Use badiResponse */
export const classicBadiResponse = badiResponse.omit({ kind: true });

/** Safe metadata projection. Raw ADT links remain broker-local. */
export const objectMetadataResponse = z
  .object({
    object: canonicalRepositoryObject,
    metadata: z
      .object({
        adtObjectType: z.string().trim().min(1).max(64).optional(),
        description: z.string().max(1_024).optional(),
        packageName: z.string().trim().min(1).max(128).optional(),
      })
      .strict(),
    facets: z.array(objectMetadataFacet).max(1_024),
    capabilities: z.array(objectMetadataCapability).max(64),
  })
  .strict();

const objectSourceHistoryVersion = z
  .object({
    id: z.string().trim().min(1).max(256),
    ordinal: z.number().int().nonnegative(),
    title: z.string().max(1_024).optional(),
    contentType: z.string().trim().min(1).max(256).optional(),
    etag: z.string().trim().min(1).max(1_024).optional(),
    updatedAt: z.string().max(128).optional(),
    author: z.string().max(256).optional(),
    transports: z.array(z.string().trim().min(1).max(64)).max(1_024),
  })
  .strict();

/** Metadata-only history: source-version locators never leave the broker. */
export const objectSourceHistoryResponse = z
  .object({
    available: z.boolean(),
    versions: z.array(objectSourceHistoryVersion).max(1_024),
  })
  .strict();

/** One canonical object source selector; raw ADT paths are never accepted. */
export const objectSourceReadBody = z
  .object({
    version: z.string().trim().min(1).max(256).optional(),
  })
  .strict();

const atcScopeObject = z
  .object({
    objectType: objectTypePathParameter,
    objectName: objectNamePathParameter,
  })
  .strict();

const atcPackageName = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_/$-]+$/u);

/** Canonical ATC target set; an ADT URI is never a REST argument. */
export const atcRunBody = z
  .object({
    scope: z.discriminatedUnion('kind', [
      z
        .object({
          kind: z.literal('package'),
          packageName: atcPackageName,
        })
        .strict(),
      z
        .object({
          kind: z.literal('transport_request'),
          trkorr: transportPathParameter,
        })
        .strict(),
      z
        .object({
          kind: z.literal('objects'),
          objects: z.array(atcScopeObject).min(1).max(1_024),
        })
        .strict(),
    ]),
    variant: z.string().trim().min(1).max(256).optional(),
  })
  .strict();

const atcQuickfixes = z
  .object({
    manual: z.boolean().optional(),
    automatic: z.boolean().optional(),
    pseudo: z.boolean().optional(),
  })
  .strict();

/** Safe, URI-free ATC evidence. Documentation is a sealed capability. */
export const atcFindingResponse = z
  .object({
    checkId: z.string().max(256),
    checkTitle: z.string().max(1_024),
    messageText: z.string().max(8 * 1_024),
    priority: z.number().int().min(1).max(99),
    objectType: objectTypePathParameter,
    objectName: objectNamePathParameter,
    lineStart: z.number().int().positive().optional(),
    lineEnd: z.number().int().positive().optional(),
    messageId: z.string().trim().min(1).max(256).optional(),
    packageName: packagePathParameter.optional(),
    objectDescription: z.string().max(1_024).optional(),
    contactPerson: z.string().trim().min(1).max(256).optional(),
    processor: z.string().trim().min(1).max(256).optional(),
    lastChangedBy: z.string().trim().min(1).max(256).optional(),
    exemptionKind: z.string().trim().min(1).max(256).optional(),
    exemptionApproval: z.string().trim().min(1).max(256).optional(),
    noExemption: z.boolean().optional(),
    quickfixInfo: z.string().max(1_024).optional(),
    quickfixes: atcQuickfixes.optional(),
    checksum: z.string().trim().min(1).max(1_024).optional(),
    documentationCapability: z
      .string()
      .trim()
      .min(1)
      .max(8 * 1_024)
      .optional(),
  })
  .strict();

export const atcRunResponse = z
  .object({
    checkVariant: z.string().trim().min(1).max(256),
    findings: z.array(atcFindingResponse).max(10_000),
  })
  .strict();

/** Redeems a capability issued by an ATC-run response, never a SAP URI. */
export const atcDocumentationReadBody = z
  .object({
    documentationCapability: z
      .string()
      .trim()
      .min(1)
      .max(8 * 1_024),
    maxBytes: z
      .number()
      .int()
      .positive()
      .max(MAX_ATC_DOCUMENTATION_BYTES)
      .optional(),
  })
  .strict();

export const atcDocumentationReadResponse = z
  .object({
    bytes: z.number().int().nonnegative().max(MAX_ATC_DOCUMENTATION_BYTES),
    html: z.string(),
  })
  .strict();

export function parseTransportSearchQuery(input: unknown) {
  const query = transportSearchQuery.parse(input);
  return {
    ...query,
    ...(query.includeTasks === undefined
      ? {}
      : { includeTasks: query.includeTasks === 'true' }),
  };
}

export function parsePackageSearchQuery(input: unknown) {
  const { limit, cursor, ...criteria } = packageSearchQuery.parse(input);
  return {
    criteria,
    page: { limit: limit ?? 200, ...(cursor ? { cursor } : {}) },
  };
}

export function parseObjectSearchQuery(input: unknown) {
  const { limit, cursor, ...criteria } = objectSearchQuery.parse(input);
  return {
    criteria,
    page: { limit: limit ?? 200, ...(cursor ? { cursor } : {}) },
  };
}

export function parsePackageTreeQuery(input: unknown) {
  const { root, limit, cursor } = packageTreeQuery.parse(input);
  return {
    rootPackage: root.toUpperCase(),
    page: { limit: limit ?? 200, ...(cursor ? { cursor } : {}) },
  };
}

export function parsePageQuery(input: unknown) {
  const { limit, cursor } = pageQuery.parse(input);
  return { limit: limit ?? 200, ...(cursor ? { cursor } : {}) };
}

export type TransportSourceManifestInput = z.infer<
  typeof transportSourceManifestBody
>;

export type AtcRunBody = z.infer<typeof atcRunBody>;
export type AtcRunResponse = z.infer<typeof atcRunResponse>;

export type TransportSearchCriteria = ReturnType<
  typeof parseTransportSearchQuery
>;

export type PackageSearchCriteria = ReturnType<
  typeof parsePackageSearchQuery
>['criteria'];

export type ObjectSearchCriteria = ReturnType<
  typeof parseObjectSearchQuery
>['criteria'];
