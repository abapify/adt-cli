/**
 * Fiori Launchpad (FLP) — JSON schemas for the Page Builder OData surface.
 *
 * IMPORTANT: Unlike most contracts in this package, FLP is NOT served from
 * `/sap/bc/adt/*`. The epic E14 originally pointed at `/sap/bc/adt/uifsa/`,
 * but probing BTP Trial shows that namespace does not exist. The real FLP
 * inventory endpoints live on the OData service
 * `/sap/opu/odata/UI2/PAGE_BUILDER_PERS/` (and the customizing twin
 * `PAGE_BUILDER_CUST/`). sapcli's `sap/flp/service.py` uses the same
 * OData service via pyodata — we follow that precedent.
 *
 * To make OData JSON responses play nicely with the existing adapter we
 * request `?$format=json`. The server wraps all feeds in `{ d: { results: [] } }`
 * and single entities in `{ d: {…} }`.
 *
 * Shapes are intentionally permissive (extra keys ignored, most fields
 * optional) because the Page Builder service returns a lot of navigation
 * `__deferred` links and internal metadata that consumers don't care about.
 */

import type { Serializable } from '@abapify/speci/rest';

// ── Primitives ─────────────────────────────────────────────────────────────

/** An OData `Catalogs` entity — one FLP catalog. */
export interface FlpCatalog {
  id?: string;
  type?: string;
  domainId?: string;
  title?: string;
  systemAlias?: string;
  originalLanguage?: string;
  scope?: string;
  /** SAP returns this as a zero-padded string ("0001"), not a number. */
  chipCount?: string;
  isReadOnly?: string;
  outdated?: string;
  [extra: string]: unknown;
}

/** An OData `Pages` entity — a launchpad group / page. */
export interface FlpGroup {
  id?: string;
  title?: string;
  catalogId?: string;
  layout?: string;
  originalLanguage?: string;
  isCatalogPage?: string;
  chipInstanceCount?: string;
  isPersLocked?: string;
  isReadOnly?: string;
  scope?: string;
  /** SAP serialises dates as `/Date(<ms>)/`. */
  updated?: string;
  outdated?: string;
  [extra: string]: unknown;
}

/** An OData `Chips` entity — a tile definition or instance. */
export interface FlpTile {
  id?: string;
  title?: string;
  description?: string;
  configuration?: string;
  url?: string;
  baseChipId?: string;
  catalogId?: string;
  catalogPageChipInstanceId?: string;
  referenceChipId?: string;
  isReadOnly?: string;
  [extra: string]: unknown;
}

// ── OData envelope types ───────────────────────────────────────────────────

/** OData v2 feed: `{ d: { results: T[] } }`. */
export interface ODataFeed<T> {
  d?: {
    results?: T[];
    [extra: string]: unknown;
  };
  [extra: string]: unknown;
}

/** OData v2 single entity: `{ d: T }`. */
export interface ODataEntity<T> {
  d?: T;
  [extra: string]: unknown;
}

export type FlpCatalogListResponse = ODataFeed<FlpCatalog>;
export type FlpCatalogResponse = ODataEntity<FlpCatalog>;
export type FlpGroupListResponse = ODataFeed<FlpGroup>;
export type FlpGroupResponse = ODataEntity<FlpGroup>;
export type FlpTileListResponse = ODataFeed<FlpTile>;
export type FlpTileResponse = ODataEntity<FlpTile>;

// ── Schema helpers ─────────────────────────────────────────────────────────

function jsonSchema<T>(): Serializable<T> {
  return {
    _infer: undefined as unknown as T,
    parse: (raw: string): T => {
      if (raw == null || raw === '') return {} as T;
      return JSON.parse(raw) as T;
    },
    build: (data: T): string => JSON.stringify(data),
  };
}

// ── Exported schemas ───────────────────────────────────────────────────────

export const flpCatalogListSchema = jsonSchema<FlpCatalogListResponse>();
export const flpCatalogSchema = jsonSchema<FlpCatalogResponse>();
export const flpGroupListSchema = jsonSchema<FlpGroupListResponse>();
export const flpGroupSchema = jsonSchema<FlpGroupResponse>();
export const flpTileListSchema = jsonSchema<FlpTileListResponse>();
export const flpTileSchema = jsonSchema<FlpTileResponse>();

// ── Result normalisers ─────────────────────────────────────────────────────

/** Extract `d.results` from an OData feed response. */
export function normalizeOdataFeed<T>(response: ODataFeed<T>): T[] {
  return response?.d?.results ?? [];
}

/** Extract `d` from an OData single-entity response. */
export function normalizeOdataEntity<T>(
  response: ODataEntity<T>,
): T | undefined {
  return response?.d;
}
