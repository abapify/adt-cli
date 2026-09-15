import type { Serializable } from '@abapify/speci/rest';

const COVERAGE_NAMESPACE = 'http://www.sap.com/adt/cov';
const ADT_CORE_NAMESPACE = 'http://www.sap.com/adt/core';
const STATEMENTS_RELATION =
  'http://www.sap.com/adt/relations/runtime/traces/coverage/results/statements';

export const coverageXmlBody = {
  parse: (value: unknown) => String(value),
  build: (value: string) => value,
  _infer: undefined as unknown as string,
} satisfies Serializable<string>;

function escapeXmlAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export function buildCoverageQuery(objectUris: string[]): string {
  const objectReferences = objectUris
    .map(
      (uri) =>
        `<adtcore:objectReference adtcore:uri="${escapeXmlAttribute(uri)}"/>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<cov:query xmlns:cov="${COVERAGE_NAMESPACE}">
<adtcore:objectSets xmlns:adtcore="${ADT_CORE_NAMESPACE}">
<objectSet kind="inclusive">
<adtcore:objectReferences>
${objectReferences}
</adtcore:objectReferences>
</objectSet>
</adtcore:objectSets>
</cov:query>`;
}

function takeUnseenRecord(
  value: unknown,
  seenValues: Set<unknown>,
): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || seenValues.has(value)) return;
  seenValues.add(value);
  return value as Record<string, unknown>;
}

function takeStatementUri(
  record: Record<string, unknown>,
  seenUris: Set<string>,
): string | undefined {
  const { rel, href } = record;
  if (
    rel !== STATEMENTS_RELATION ||
    typeof href !== 'string' ||
    seenUris.has(href)
  ) {
    return;
  }
  seenUris.add(href);
  return href;
}

function enqueueChildObjects(
  record: Record<string, unknown>,
  queue: unknown[],
): void {
  for (const child of Object.values(record)) {
    if (Array.isArray(child)) {
      queue.push(...child);
      continue;
    }
    if (child && typeof child === 'object') queue.push(child);
  }
}

export function extractCoverageStatementUris(value: unknown): string[] {
  const statementUris: string[] = [];
  const seenUris = new Set<string>();
  const seenValues = new Set<unknown>();
  const queue: unknown[] = [value];

  while (queue.length > 0) {
    const record = takeUnseenRecord(queue.shift(), seenValues);
    if (!record) continue;
    const statementUri = takeStatementUri(record, seenUris);
    if (statementUri) statementUris.push(statementUri);
    enqueueChildObjects(record, queue);
  }

  return statementUris;
}

export function buildStatementsBulkRequest(statementUris: string[]): string {
  const requests = statementUris
    .map((uri) => `<statementsRequest get="${escapeXmlAttribute(uri)}"/>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<cov:statementsBulkRequest xmlns:cov="${COVERAGE_NAMESPACE}">
${requests}
</cov:statementsBulkRequest>`;
}
