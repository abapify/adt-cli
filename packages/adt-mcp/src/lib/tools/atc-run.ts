/**
 * Tool: atc_run – run ABAP Test Cockpit checks
 *
 * The public MCP contract takes a canonical target scope. ADT object URIs
 * remain an implementation detail: the tool resolves them only after the
 * trusted destination/session has selected the SAP client.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AdtClient } from '@abapify/adt-client';
import {
  fetchCheckCategoryIndex,
  enrichFindingsWithCategories,
  resolveCategoriesViaDocumentation,
} from '@abapify/adt-atc';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';
import {
  extractSafeExecutePolicy,
  handleSafeExecuteError,
  mcpErrorResult,
  resolveObjectUri,
  safeExecuteLimitResult,
} from './utils';

type UnknownRecord = Record<string, unknown>;

const packageName = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_/$-]+$/u);
const transportRequest = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/u);
const objectType = z.string().trim().min(1).max(128);
const objectName = z.string().trim().min(1).max(256);

const atcScope = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('package'), packageName }).strict(),
  z
    .object({ kind: z.literal('transport_request'), trkorr: transportRequest })
    .strict(),
  z
    .object({
      kind: z.literal('objects'),
      objects: z
        .array(z.object({ objectType, objectName }).strict())
        .min(1)
        .max(1_024),
    })
    .strict(),
]);

type AtcScope = z.infer<typeof atcScope>;

function record(value: unknown): UnknownRecord | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : undefined;
}

function records(value: unknown): UnknownRecord[] {
  return (Array.isArray(value) ? value : [value]).flatMap((entry) => {
    const parsed = record(entry);
    return parsed ? [parsed] : [];
  });
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function stringField(value: UnknownRecord, key: string): string | undefined {
  return text(value[key]);
}

function priority(value: unknown): number {
  let parsed: number;
  if (typeof value === 'number') {
    parsed = value;
  } else if (typeof value === 'string') {
    parsed = Number.parseInt(value, 10);
  } else {
    parsed = Number.NaN;
  }
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 3;
}

function lineFromLocation(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined;
  const match = /(?:^|[?#&])start=(\d+)(?:[,&#]|$)/u.exec(value);
  if (!match) return undefined;
  const line = Number.parseInt(match[1]!, 10);
  return Number.isSafeInteger(line) && line > 0 ? line : undefined;
}

/** Canonical finding record: an unknown record with a guaranteed checkId. */
type CanonicalFindingRecord = UnknownRecord & { checkId: string };

/** The trusted documentation link of one worklist finding (atom:link). */
function documentationUriFromFinding(
  finding: UnknownRecord,
): string | undefined {
  const link = records(finding.link).find(
    (entry) =>
      stringField(entry, 'rel') ===
      'http://www.sap.com/adt/relations/documentation',
  );
  return link ? stringField(link, 'href') : undefined;
}

function canonicalFindings(response: unknown): CanonicalFindingRecord[] {
  const root = record(response);
  const worklist = record(root?.worklist) ?? root;
  const objects = records(worklist?.objects).flatMap((entry) =>
    records(entry.object ?? entry),
  );

  return objects.flatMap((object) => {
    const findingsContainer = record(object.findings);
    const findings = records(findingsContainer?.finding ?? object.findings);
    return findings.map((finding) => {
      const line = lineFromLocation(finding.location);
      const documentationUri = documentationUriFromFinding(finding);
      return {
        checkId: stringField(finding, 'checkId') ?? '',
        checkTitle: stringField(finding, 'checkTitle') ?? '',
        messageText: stringField(finding, 'messageTitle') ?? '',
        priority: priority(finding.priority),
        objectType: stringField(object, 'type') ?? '',
        objectName: stringField(object, 'name') ?? '',
        ...(line ? { lineStart: line, lineEnd: line } : {}),
        ...(documentationUri ? { documentationUri } : {}),
        ...(stringField(finding, 'messageId')
          ? { messageId: stringField(finding, 'messageId') }
          : {}),
        ...(stringField(object, 'packageName')
          ? { packageName: stringField(object, 'packageName') }
          : {}),
        ...(stringField(finding, 'checksum')
          ? { checksum: stringField(finding, 'checksum') }
          : {}),
      };
    });
  });
}

class AtcObjectUnavailableError extends Error {
  constructor() {
    super('ATC object is unavailable');
    this.name = 'AtcObjectUnavailableError';
  }
}

async function resolveScopeUris(
  client: AdtClient,
  scope: AtcScope,
): Promise<string[]> {
  switch (scope.kind) {
    case 'package':
      return [`/sap/bc/adt/packages/${scope.packageName.toUpperCase()}`];
    case 'transport_request':
      return [
        `/sap/bc/adt/cts/transportrequests/${scope.trkorr.toUpperCase()}`,
      ];
    case 'objects':
      return await Promise.all(
        scope.objects.map(async (object) => {
          const uri = await resolveObjectUri(
            client,
            object.objectName,
            object.objectType,
          );
          if (!uri) throw new AtcObjectUnavailableError();
          return uri;
        }),
      );
  }
}

async function resolveVariant(
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

function worklistIdFrom(response: unknown): string {
  if (typeof response === 'string') {
    const match = /id="([^"]+)"/u.exec(response);
    if (match) return match[1]!;
    if (response.trim()) return response.trim();
  }
  const result = record(response);
  const worklistId = stringField(record(result?.worklist) ?? {}, 'id');
  const runId = stringField(record(result?.worklistRun) ?? {}, 'worklistId');
  const legacyId = stringField(result ?? {}, 'worklistId');
  if (worklistId) return worklistId;
  if (runId) return runId;
  if (legacyId) return legacyId;
  throw new Error('ATC worklist is unavailable');
}

export function registerAtcRunTool(server: McpServer, ctx: ToolContext): void {
  server.tool(
    'atc_run',
    'Run ABAP Test Cockpit (ATC) checks for a package, transport request, or named objects.',
    {
      ...sessionOrConnectionShape,
      scope: atcScope.describe('Canonical target scope; never an ADT URI'),
      variant: z.string().trim().min(1).max(256).optional(),
      // Deliberately rejects the deprecated raw URI field rather than silently
      // accepting it. Destination mode preserves this field as `never`.
      objectUri: z.never().optional(),
    },
    async (args, extra) => {
      const safePolicy = extractSafeExecutePolicy(
        ctx.requestAccess?.(extra ?? {}),
        'atc_run',
      );
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});
        const checkVariant = await resolveVariant(client, args.variant);
        const targetUris = await resolveScopeUris(client, args.scope);
        const created = await client.adt.atc.worklists.create({
          checkVariant,
        });
        const worklistId = worklistIdFrom(created);

        await client.adt.atc.runs.post(
          { worklistId },
          {
            run: {
              maximumVerdicts: safePolicy?.maxFindings ?? 10_000,
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
        const findings = canonicalFindings(worklist);
        // Enrich findings with check categories from the run's check variant
        // form template (best-effort: never fails the run). Live worklist
        // checkIds are GUIDs, so unresolved findings go through the
        // documentation bridge (each finding's documentation page names the
        // check class).
        const logger = {
          warn: (message: string) => console.error(message),
        };
        const categoryIndex = await fetchCheckCategoryIndex(
          client,
          checkVariant,
          logger,
        );
        enrichFindingsWithCategories(findings, categoryIndex);
        await resolveCategoriesViaDocumentation(
          client,
          findings,
          categoryIndex,
          {
            logger,
          },
        );
        // The model-facing response must stay URI-free: the documentation
        // link is internal enrichment state only.
        for (const finding of findings) delete finding.documentationUri;
        if (safePolicy && findings.length > safePolicy.maxFindings) {
          return safeExecuteLimitResult('safe_execute_limit_exceeded');
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  checkVariant,
                  findings,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        if (error instanceof AtcObjectUnavailableError) {
          return mcpErrorResult(error, 'ATC run');
        }
        return handleSafeExecuteError(error, safePolicy, 'ATC run');
      }
    },
  );
}
