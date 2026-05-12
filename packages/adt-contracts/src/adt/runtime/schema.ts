import type { Serializable } from '@abapify/speci/rest';

export interface RuntimeDumpSummary {
  id?: string;
  type?: string;
  program?: string;
  user?: string;
  timestamp?: string;
  [extra: string]: unknown;
}

export interface RuntimeDumpListResponse {
  dumps?: RuntimeDumpSummary[];
  [extra: string]: unknown;
}

export interface RuntimeDumpDetailResponse {
  id?: string;
  text?: string;
  [extra: string]: unknown;
}

export interface RuntimeTraceSummary {
  id?: string;
  user?: string;
  program?: string;
  timestamp?: string;
  [extra: string]: unknown;
}

export interface RuntimeTraceListResponse {
  traces?: RuntimeTraceSummary[];
  [extra: string]: unknown;
}

export interface RuntimeTraceDetailResponse {
  id?: string;
  entries?: unknown[];
  [extra: string]: unknown;
}

function parseJsonOrRaw<T extends Record<string, unknown>>(raw: string): T {
  if (!raw) {
    return {} as T;
  }

  const trimmed = raw.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return JSON.parse(trimmed) as T;
  }

  return {
    raw,
  } as T;
}

function buildJson<T>(value: T): string {
  return JSON.stringify(value);
}

export const runtimeDumpListSchema: Serializable<RuntimeDumpListResponse> = {
  _infer: undefined as unknown as RuntimeDumpListResponse,
  parse: (raw: string): RuntimeDumpListResponse =>
    parseJsonOrRaw<RuntimeDumpListResponse>(raw),
  build: (value: RuntimeDumpListResponse): string => buildJson(value),
};

export const runtimeDumpDetailSchema: Serializable<RuntimeDumpDetailResponse> =
  {
    _infer: undefined as unknown as RuntimeDumpDetailResponse,
    parse: (raw: string): RuntimeDumpDetailResponse =>
      parseJsonOrRaw<RuntimeDumpDetailResponse>(raw),
    build: (value: RuntimeDumpDetailResponse): string => buildJson(value),
  };

export const runtimeTraceListSchema: Serializable<RuntimeTraceListResponse> = {
  _infer: undefined as unknown as RuntimeTraceListResponse,
  parse: (raw: string): RuntimeTraceListResponse =>
    parseJsonOrRaw<RuntimeTraceListResponse>(raw),
  build: (value: RuntimeTraceListResponse): string => buildJson(value),
};

export const runtimeTraceDetailSchema: Serializable<RuntimeTraceDetailResponse> =
  {
    _infer: undefined as unknown as RuntimeTraceDetailResponse,
    parse: (raw: string): RuntimeTraceDetailResponse =>
      parseJsonOrRaw<RuntimeTraceDetailResponse>(raw),
    build: (value: RuntimeTraceDetailResponse): string => buildJson(value),
  };
