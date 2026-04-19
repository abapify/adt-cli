/**
 * gCTS (git-enabled CTS) JSON schemas.
 *
 * gCTS lives under `/sap/bc/cts_abapvcs/` — a separate REST surface from
 * `/sap/bc/adt/`. All responses are JSON. Schemas are hand-built
 * `Serializable<T>` values matching speci's `_infer` marker pattern (same as
 * `adt-contracts/src/adt/datapreview/schema.ts`). No XSDs involved.
 *
 * Shapes derived from:
 *   - /tmp/sapcli-ref/sapcli/sap/rest/gcts/remote_repo.py
 *   - /tmp/sapcli-ref/sapcli/test/unit/test_sap_rest_gcts.py
 *   - /tmp/sapcli-ref/sapcli/test/unit/fixtures_sap_rest_gcts.py
 */

import type { Serializable } from '@abapify/speci/rest';

// ── Primitives ─────────────────────────────────────────────────────────────

export interface GctsConfigEntry {
  key: string;
  value?: string;
  category?: string;
  changedAt?: string;
  changedBy?: string;
  [extra: string]: unknown;
}

export interface GctsRepository {
  rid: string;
  name?: string;
  role?: 'SOURCE' | 'TARGET' | (string & {});
  type?: 'GIT' | 'GITHUB' | (string & {});
  vsid?: string;
  status?: string;
  branch?: string;
  currentCommit?: string;
  url?: string;
  connection?: string;
  config?: GctsConfigEntry[];
  [extra: string]: unknown;
}

export interface GctsBranch {
  name: string;
  type?: 'active' | 'local' | 'remote' | (string & {});
  isSymbolic?: boolean;
  isPeeled?: boolean;
  ref?: string;
  [extra: string]: unknown;
}

export interface GctsCommit {
  id: string;
  author?: string;
  authorMail?: string;
  date?: string;
  message?: string;
  description?: string;
  [extra: string]: unknown;
}

export interface GctsRepoObject {
  pgmid?: string;
  type?: string;
  object?: string;
  description?: string;
  [extra: string]: unknown;
}

export interface GctsCommitObjectRef {
  /** Transport number, package name, or object key (depends on `type`). */
  object: string;
  /** `TRANSPORT` | `FULL_PACKAGE` | object pgmid */
  type: string;
}

// ── Request bodies ─────────────────────────────────────────────────────────

export interface GctsCreateRepositoryRequest {
  repository: string;
  data: GctsRepository;
}

export interface GctsSetConfigRequest {
  key: string;
  value: string;
}

export interface GctsCreateBranchRequest {
  branch: string;
  type?: 'local' | 'global';
  isSymbolic?: boolean;
  isPeeled?: boolean;
}

export interface GctsCommitRequest {
  message: string;
  /** Always serialised as lowercase string by gCTS ("true"/"false"). */
  autoPush?: 'true' | 'false' | boolean;
  objects: GctsCommitObjectRef[];
  description?: string;
}

// ── Responses ──────────────────────────────────────────────────────────────

export interface GctsRepositoriesResponse {
  result?: GctsRepository[];
  [extra: string]: unknown;
}

export interface GctsRepositoryEnvelope {
  /** GET /repository/<id> — repo under `result`. */
  result?: GctsRepository;
  /** POST /repository (create) — repo under `repository`. */
  repository?: GctsRepository;
  [extra: string]: unknown;
}

export interface GctsBranchesResponse {
  branches?: GctsBranch[];
  [extra: string]: unknown;
}

export interface GctsCreateBranchResponse {
  branch?: GctsBranch;
  [extra: string]: unknown;
}

export interface GctsLogResponse {
  commits?: GctsCommit[];
  [extra: string]: unknown;
}

export interface GctsPullResponse {
  fromCommit?: string;
  toCommit?: string;
  history?: {
    fromCommit?: string;
    toCommit?: string;
    type?: string;
    [extra: string]: unknown;
  };
  [extra: string]: unknown;
}

export interface GctsObjectsResponse {
  objects?: GctsRepoObject[];
  [extra: string]: unknown;
}

export interface GctsConfigResponse {
  result?: GctsConfigEntry;
  [extra: string]: unknown;
}

export interface GctsCommitResponse {
  /** SAP returns varying shapes; keep permissive. */
  [extra: string]: unknown;
}

export interface GctsErrorResponse {
  exception?: string;
  log?: Array<{ message?: string; [extra: string]: unknown }>;
  [extra: string]: unknown;
}

// ── Schema helper ──────────────────────────────────────────────────────────

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

export const gctsRepositoriesSchema = jsonSchema<GctsRepositoriesResponse>();
export const gctsRepositorySchema = jsonSchema<GctsRepositoryEnvelope>();
export const gctsCreateRepositoryBodySchema =
  jsonSchema<GctsCreateRepositoryRequest>();
export const gctsSetItemBodySchema = jsonSchema<Record<string, unknown>>();
export const gctsBranchesSchema = jsonSchema<GctsBranchesResponse>();
export const gctsCreateBranchBodySchema = jsonSchema<GctsCreateBranchRequest>();
export const gctsCreateBranchResponseSchema =
  jsonSchema<GctsCreateBranchResponse>();
export const gctsSetConfigBodySchema = jsonSchema<GctsSetConfigRequest>();
export const gctsConfigSchema = jsonSchema<GctsConfigResponse>();
export const gctsLogSchema = jsonSchema<GctsLogResponse>();
export const gctsPullSchema = jsonSchema<GctsPullResponse>();
export const gctsObjectsSchema = jsonSchema<GctsObjectsResponse>();
export const gctsCommitBodySchema = jsonSchema<GctsCommitRequest>();
export const gctsCommitResponseSchema = jsonSchema<GctsCommitResponse>();
export const gctsGenericOkSchema = jsonSchema<Record<string, unknown>>();
