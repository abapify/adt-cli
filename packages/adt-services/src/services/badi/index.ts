/**
 * BAdI services — ENHO metadata (enhoxhb) and unified read (classic vit/wb + ENHO).
 *
 * - `getBadiInfo` / `parseEnhancementImplementation` — ENHO/XHB metadata from
 *   `/sap/bc/adt/enhancements/enhoxhb/{name}` (used by `adt badi <name>`).
 * - `BadiService` — auto-detect kind and read classic SXSD/SXCI or ENHO/XHH.
 */
import type { AdtClient } from '@abapify/adt-client';

import type { BasicObjectPropertiesResponse } from '@abapify/adt-contracts';
import { DOMParser } from '@xmldom/xmldom';

const NS_ENHO = 'http://www.sap.com/adt/enhancements/enho';
const NS_ADTCORE = 'http://www.sap.com/adt/core';

type XmlElement = import('@xmldom/xmldom').Element;

export interface BadiImplementation {
  name: string;
  shortText: string;
  active: boolean;
  default: boolean;
  example: boolean;
  implementingClass: string;
  badiDefinition: string;
  enhancementSpot: string;
}

export interface BadiInfo {
  name: string;
  description: string;
  type: string;
  package: string;
  responsible: string;
  version: string;
  technology: string;
  switchSupported: boolean;
  badiImplementations: BadiImplementation[];
}

interface NamespaceAccessor {
  attr(el: XmlElement | null | undefined, local: string): string;
  bool(el: XmlElement | null | undefined, local: string): boolean;
  child(parent: XmlElement, local: string): XmlElement | null;
  children(parent: XmlElement, local: string): XmlElement[];
}

function namespaceAccessor(ns: string): NamespaceAccessor {
  return {
    attr(el, local) {
      return el?.getAttributeNS(ns, local) ?? '';
    },
    bool(el, local) {
      return this.attr(el, local).toLowerCase() === 'true';
    },
    child(parent, local) {
      const list = parent.getElementsByTagNameNS(ns, local);
      return (list.item(0) as XmlElement | null) ?? null;
    },
    children(parent, local) {
      const list = parent.getElementsByTagNameNS(ns, local);
      const result: XmlElement[] = [];
      for (let i = 0; i < list.length; i++) {
        const node = list.item(i) as XmlElement | null;
        if (node) result.push(node);
      }
      return result;
    },
  };
}

const enho = namespaceAccessor(NS_ENHO);
const adtcore = namespaceAccessor(NS_ADTCORE);

function rootAttr(root: XmlElement, local: string): string {
  return adtcore.attr(root, local) || root.getAttribute(local) || '';
}

function parseBadiImplementation(node: XmlElement): BadiImplementation {
  return {
    name: enho.attr(node, 'name'),
    shortText: enho.attr(node, 'shortText'),
    active: enho.bool(node, 'active'),
    default: enho.bool(node, 'default'),
    example: enho.bool(node, 'example'),
    implementingClass: adtcore.attr(
      enho.child(node, 'implementingClass'),
      'name',
    ),
    badiDefinition: adtcore.attr(enho.child(node, 'badiDefinition'), 'name'),
    enhancementSpot: adtcore.attr(enho.child(node, 'enhancementSpot'), 'name'),
  };
}

function parseBadiInfo(root: XmlElement): BadiInfo {
  const contentCommon = enho.child(root, 'contentCommon');

  return {
    name: rootAttr(root, 'name'),
    description: rootAttr(root, 'description'),
    type: rootAttr(root, 'type'),
    package: adtcore.attr(adtcore.child(root, 'packageRef'), 'name'),
    responsible: rootAttr(root, 'responsible'),
    version: rootAttr(root, 'version'),
    technology: enho.attr(contentCommon, 'toolType'),
    switchSupported: enho.bool(contentCommon, 'switchSupported'),
    badiImplementations: enho
      .children(root, 'badiImplementation')
      .map(parseBadiImplementation),
  };
}

/**
 * Parse an `enho:objectData` XML document into a `BadiInfo` structure.
 */
export function parseEnhancementImplementation(xml: string): BadiInfo {
  const doc = new DOMParser({
    onError: () => {
      /* swallow parse warnings; caller handles malformed XML via errors */
    },
  }).parseFromString(xml, 'text/xml');

  const root = doc.documentElement;
  if (!root) {
    throw new Error('Empty or malformed ENHO XML response');
  }

  return parseBadiInfo(root as XmlElement);
}

/**
 * Fetch ENHO metadata for a BAdI / enhancement implementation and parse
 * the BAdI implementation list.
 */
export async function getBadiInfo({
  client,
  name,
}: {
  client: AdtClient;
  name: string;
}): Promise<BadiInfo> {
  const response = await client.fetch(
    `/sap/bc/adt/enhancements/enhoxhb/${encodeURIComponent(name.toLowerCase())}`,
    {
      headers: { Accept: 'application/vnd.sap.adt.enh.enhoxhb.v4+xml' },
    },
  );

  if (typeof response !== 'string') {
    throw new Error('Unexpected non-XML response from ENHO endpoint');
  }

  return parseEnhancementImplementation(response);
}

export type BadiKind = 'definition' | 'implementation' | 'enhancement';

export type BadiMetadata = {
  name: string;
  type: string;
  kind: BadiKind;
  description?: string;
  language?: string;
  version?: string;
  packageName?: string;
  packageUri?: string;
  responsible?: string;
  masterLanguage?: string;
  masterSystem?: string;
  /** When SAP supplies a container reference, it can be used to validate lineage. */
  containerRef?: { name?: string; type?: string };
};

export type BadiReadResult = BadiMetadata & {
  /** ENHO/XHB metadata when kind is enhancement. */
  enhancement?: BadiInfo;
  source?: string;
  /** Present when `--implementations` is used on a classic definition. */
  implementations?: BadiMetadata[];
};

/** @deprecated Use BadiMetadata */
export type ClassicBadiMetadata = Omit<BadiMetadata, 'kind'>;

const BADI_REPOSITORY_TYPES = new Set(['SXSD/XD', 'SXCI/XI', 'ENHO/XHH']);

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { status?: unknown }).status === 404
  );
}

function badiKindFromType(adtType: string): BadiKind {
  const type = adtType.toUpperCase();
  if (type === 'SXSD/XD') return 'definition';
  if (type === 'SXCI/XI') return 'implementation';
  return 'enhancement';
}

function extractSearchObjects(results: unknown): Array<{
  name?: string;
  type?: string;
}> {
  const record = results as Record<string, unknown>;
  let raw:
    | Array<{ name?: string; type?: string }>
    | { name?: string; type?: string }
    | undefined;

  if (record.objectReferences && typeof record.objectReferences === 'object') {
    const refs = record.objectReferences as {
      objectReference?: typeof raw;
    };
    raw = refs.objectReference;
  } else if (record.objectReference) {
    raw = record.objectReference as typeof raw;
  } else if (record.mainObject && typeof record.mainObject === 'object') {
    const main = record.mainObject as { objectReference?: typeof raw };
    raw = main.objectReference;
  }

  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export function normalizeClassicBadiMetadata({
  response,
  kind,
}: {
  response: BasicObjectPropertiesResponse;
  kind: 'definition' | 'implementation';
}): BadiMetadata {
  if (!('mainObject' in response) || !response.mainObject) {
    throw new Error('BAdI response missing mainObject');
  }
  const main = response.mainObject;
  return {
    kind,
    name: (main.name ?? '').toUpperCase(),
    type: main.type ?? '',
    description: main.description,
    language: main.language,
    version: main.version,
    packageName: main.packageRef?.name,
    packageUri: main.packageRef?.uri,
    responsible: main.responsible,
    masterLanguage: main.masterLanguage,
    masterSystem: main.masterSystem,
    containerRef: main.containerRef
      ? { name: main.containerRef.name, type: main.containerRef.type }
      : undefined,
  };
}

function searchQueriesForDefinition({ name }: { name: string }): string[] {
  const normalized = name.trim().toUpperCase();
  const queries = new Set<string>([
    `*${normalized}*`,
    `*${normalized.replaceAll('_', '*')}*`,
  ]);
  const parts = normalized.split('_').filter(Boolean);
  if (parts.length >= 2) {
    const tail2 = parts.slice(-2).join('_');
    if (tail2.length >= 10) {
      queries.add(`*${tail2}*`);
    }
  }
  return [...queries];
}

interface ServiceContext {
  readonly client: AdtClient;
  readonly normalized: string;
}

interface ReadContext extends ServiceContext {
  readonly options?: {
    includeSource?: boolean;
    includeImplementations?: boolean;
  };
}

async function resolveBySearch(
  ctx: ServiceContext,
): Promise<BadiKind | undefined> {
  const search =
    await ctx.client.adt.repository.informationsystem.search.quickSearch({
      query: ctx.normalized,
      maxResults: 20,
    });
  const matches = extractSearchObjects(search).filter(
    (obj) =>
      obj.name?.toUpperCase() === ctx.normalized &&
      obj.type &&
      BADI_REPOSITORY_TYPES.has(obj.type.toUpperCase()),
  );
  if (matches.length === 1) {
    return badiKindFromType(matches[0].type!);
  }
  if (matches.length > 1) {
    throw new Error(
      `Ambiguous BAdI name ${ctx.normalized}: ${matches.map((m) => m.type).join(', ')}`,
    );
  }
  return undefined;
}

async function runProbe(
  ctx: ServiceContext & { kind: BadiKind; expectedType: string },
): Promise<BadiKind | undefined> {
  const response =
    ctx.kind === 'definition'
      ? await ctx.client.adt.vit.wb.objectProperties.getDefinition(
          ctx.normalized,
        )
      : await ctx.client.adt.vit.wb.objectProperties.getImplementation(
          ctx.normalized,
        );
  if (!('mainObject' in response) || !response.mainObject) {
    return undefined;
  }
  const main = response.mainObject;
  if (
    main.type?.toUpperCase() === ctx.expectedType &&
    main.name?.toUpperCase() === ctx.normalized
  ) {
    return ctx.kind;
  }
  return undefined;
}

async function resolveEnhancement(
  ctx: ServiceContext,
): Promise<BadiKind | undefined> {
  try {
    await getBadiInfo({ client: ctx.client, name: ctx.normalized });
    return 'enhancement';
  } catch (error) {
    if (!isNotFound(error)) throw error;
    return undefined;
  }
}

async function resolveKind(ctx: ServiceContext): Promise<BadiKind> {
  const bySearch = await resolveBySearch(ctx);
  if (bySearch) return bySearch;

  const definition = await runProbe({
    ...ctx,
    kind: 'definition',
    expectedType: 'SXSD/XD',
  });
  if (definition) return definition;

  const implementation = await runProbe({
    ...ctx,
    kind: 'implementation',
    expectedType: 'SXCI/XI',
  });
  if (implementation) return implementation;

  const enhancement = await resolveEnhancement(ctx);
  if (enhancement) return enhancement;

  throw new Error(`BAdI object not found: ${ctx.normalized}`);
}

async function readDefinition(ctx: ServiceContext): Promise<BadiMetadata> {
  const response = await ctx.client.adt.vit.wb.objectProperties.getDefinition(
    ctx.normalized,
  );
  return normalizeClassicBadiMetadata({ response, kind: 'definition' });
}

async function readImplementation(ctx: ServiceContext): Promise<BadiMetadata> {
  const response =
    await ctx.client.adt.vit.wb.objectProperties.getImplementation(
      ctx.normalized,
    );
  return normalizeClassicBadiMetadata({ response, kind: 'implementation' });
}

async function readEnhancement(ctx: ReadContext): Promise<BadiReadResult> {
  const lower = ctx.normalized.toLowerCase();
  const info = await getBadiInfo({ client: ctx.client, name: ctx.normalized });
  const source = ctx.options?.includeSource
    ? String(await ctx.client.adt.enhancements.enhoxhh.source.main.get(lower))
    : undefined;
  return {
    kind: 'enhancement',
    name: info.name.toUpperCase(),
    type: info.type,
    description: info.description,
    version: info.version,
    packageName: info.package,
    responsible: info.responsible,
    enhancement: info,
    source,
  };
}

async function getBadi(ctx: ReadContext): Promise<BadiReadResult> {
  const kind = await resolveKind(ctx);
  switch (kind) {
    case 'definition': {
      const definition = await readDefinition(ctx);
      if (!ctx.options?.includeImplementations) {
        return definition;
      }
      const implementations = await listImplementations(ctx);
      return { ...definition, implementations };
    }
    case 'implementation':
      return readImplementation(ctx);
    case 'enhancement':
      return readEnhancement(ctx);
    default:
      throw new Error(`Unsupported BAdI kind: ${kind satisfies never}`);
  }
}

interface SearchCandidateContext extends ServiceContext {
  readonly query: string;
  readonly objectType?: 'SXCI';
  readonly seen: Set<string>;
}

function candidateNames(ctx: {
  search: unknown;
  normalized: string;
  seen: Set<string>;
}): string[] {
  const names: string[] = [];
  for (const obj of extractSearchObjects(ctx.search)) {
    if (obj.type?.toUpperCase() !== 'SXCI/XI') continue;
    const implName = obj.name?.toUpperCase();
    if (!implName) continue;
    if (implName === ctx.normalized) continue;
    if (ctx.seen.has(implName)) continue;
    ctx.seen.add(implName);
    names.push(implName);
  }
  return names;
}

async function tryReadImplementation(ctx: {
  client: AdtClient;
  definitionName: string;
  implName: string;
}): Promise<BadiMetadata | undefined> {
  try {
    const impl = await readImplementation({
      client: ctx.client,
      normalized: ctx.implName,
    });
    const containerName = impl.containerRef?.name?.toUpperCase();
    if (containerName && containerName !== ctx.definitionName) {
      return undefined;
    }
    return impl;
  } catch (error) {
    if (!isNotFound(error)) throw error;
    return undefined;
  }
}

async function collectSearchCandidates(
  ctx: SearchCandidateContext,
): Promise<BadiMetadata[]> {
  const params: { query: string; maxResults: number; objectType?: 'SXCI' } = {
    query: ctx.query,
    maxResults: 100,
  };
  if (ctx.objectType) {
    params.objectType = ctx.objectType;
  }
  const search =
    await ctx.client.adt.repository.informationsystem.search.quickSearch(
      params,
    );

  const names = candidateNames({
    search,
    normalized: ctx.normalized,
    seen: ctx.seen,
  });
  const found: BadiMetadata[] = [];
  for (const implName of names) {
    const impl = await tryReadImplementation({
      client: ctx.client,
      definitionName: ctx.normalized,
      implName,
    });
    if (impl) found.push(impl);
  }
  return found;
}

async function listImplementations(
  ctx: ServiceContext,
): Promise<BadiMetadata[]> {
  await readDefinition(ctx);

  const queries = searchQueriesForDefinition({ name: ctx.normalized });
  const seen = new Set<string>();
  const all: BadiMetadata[] = [];

  for (const query of queries) {
    all.push(
      ...(await collectSearchCandidates({
        client: ctx.client,
        normalized: ctx.normalized,
        query,
        seen,
      })),
      ...(await collectSearchCandidates({
        client: ctx.client,
        normalized: ctx.normalized,
        query,
        objectType: 'SXCI',
        seen,
      })),
    );
  }

  return all.sort((a, b) => a.name.localeCompare(b.name));
}

export class BadiService {
  constructor(private readonly client: AdtClient) {}

  private contextFor(name: string): ServiceContext {
    return { client: this.client, normalized: name.trim().toUpperCase() };
  }

  private readContextFor(
    name: string,
    options?: { includeSource?: boolean; includeImplementations?: boolean },
  ): ReadContext {
    return { ...this.contextFor(name), options };
  }

  async resolveKind({ name }: { name: string }): Promise<BadiKind> {
    return resolveKind(this.contextFor(name));
  }

  async get({
    name,
    options,
  }: {
    name: string;
    options?: { includeSource?: boolean; includeImplementations?: boolean };
  }): Promise<BadiReadResult> {
    return getBadi(this.readContextFor(name, options));
  }

  async getDefinition({ name }: { name: string }): Promise<BadiMetadata> {
    return readDefinition(this.contextFor(name));
  }

  async getImplementation({ name }: { name: string }): Promise<BadiMetadata> {
    return readImplementation(this.contextFor(name));
  }

  /**
   * List classic BAdI implementations (SXCI/XI) for a definition name.
   * Uses repository quick search heuristics — authoritative active/inactive
   * state requires SXC_ATTR (not exposed on all systems).
   */
  async listImplementations({
    name,
  }: {
    name: string;
  }): Promise<BadiMetadata[]> {
    return listImplementations(this.contextFor(name));
  }
}

/** @deprecated Use BadiService */
export const ClassicBadiService = BadiService;
