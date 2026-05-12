import type { Serializable } from '@abapify/speci/rest';

export interface CompletionProposal {
  id?: string;
  kind?: string;
  label?: string;
  insertText?: string;
  [extra: string]: unknown;
}

export interface CompletionResponse {
  proposals?: CompletionProposal[];
  [extra: string]: unknown;
}

export interface CompletionQuery {
  uri: string;
  line: number;
  column: number;
}

export interface CompletionRequestBody {
  source?: string;
}

function parseJsonOrRaw(raw: string): CompletionResponse {
  if (!raw) return {};

  const trimmed = raw.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return JSON.parse(trimmed) as CompletionResponse;
  }

  return {
    raw,
  };
}

export const completionResponseSchema: Serializable<CompletionResponse> = {
  _infer: undefined as unknown as CompletionResponse,
  parse: parseJsonOrRaw,
  build: (value: CompletionResponse): string => JSON.stringify(value),
};

export const completionRequestSchema: Serializable<CompletionRequestBody> = {
  _infer: undefined as unknown as CompletionRequestBody,
  parse: (raw: string): CompletionRequestBody => {
    if (!raw) return {};
    const trimmed = raw.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return JSON.parse(trimmed) as CompletionRequestBody;
    }

    return {
      source: raw,
    };
  },
  build: (value: CompletionRequestBody): string => JSON.stringify(value),
};
