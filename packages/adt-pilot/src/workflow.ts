/**
 * Code Review Workflow
 *
 * A Mastra workflow that runs ATC-based code review on an ABAP package
 * hierarchy or a transport request.
 *
 * Usage:
 *   // Package mode
 *   const workflow = createCodeReviewWorkflow(callTool);
 *   const result = await workflow.execute({
 *     mode: 'package', packageName: 'ZPACKAGE',
 *     baseUrl: '...', username: '...', password: '...'
 *   });
 *
 *   // Transport mode
 *   const result = await workflow.execute({
 *     mode: 'transport', transportNumber: 'DEVK900001',
 *     baseUrl: '...', username: '...', password: '...'
 *   });
 */

import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import type { AtcFinding, CodeReviewReport, McpToolCaller } from './types.js';

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const connectionSchema = z.object({
  baseUrl: z.string().url(),
  username: z.string(),
  password: z.string(),
  client: z.string().optional(),
});

/** Workflow input schema */
export const codeReviewInputSchema = z.discriminatedUnion('mode', [
  connectionSchema.extend({
    mode: z.literal('package'),
    packageName: z.string(),
  }),
  connectionSchema.extend({
    mode: z.literal('transport'),
    transportNumber: z.string(),
  }),
]);

export type CodeReviewInput = z.infer<typeof codeReviewInputSchema>;

/** Workflow output schema */
export const codeReviewOutputSchema = z.object({
  mode: z.enum(['package', 'transport']),
  target: z.string(),
  objects: z.array(z.string()),
  findings: z.array(
    z.object({
      objectUri: z.string(),
      priority: z.string(),
      description: z.string(),
      category: z.string().optional(),
      checkName: z.string().optional(),
      location: z.string().optional(),
    }),
  ),
  summary: z.object({
    totalObjects: z.number(),
    totalFindings: z.number(),
    bySeverity: z.record(z.string(), z.number()),
  }),
});

// ---------------------------------------------------------------------------
// Step 1 – resolveObjects
// ---------------------------------------------------------------------------

/**
 * Resolve the list of object URIs to check.
 *
 * - Package mode: calls `list_package_objects` and extracts URIs
 * - Transport mode: calls `cts_get_transport` to validate, then uses the
 *   transport URI so ATC can run on the whole transport in one call
 */
const resolveObjectsInputSchema = z.object({
  mode: z.enum(['package', 'transport']),
  packageName: z.string().optional(),
  transportNumber: z.string().optional(),
  baseUrl: z.string(),
  username: z.string(),
  password: z.string(),
  client: z.string().optional(),
});

const resolveObjectsOutputSchema = z.object({
  mode: z.enum(['package', 'transport']),
  target: z.string(),
  objects: z.array(z.string()),
  baseUrl: z.string(),
  username: z.string(),
  password: z.string(),
  client: z.string().optional(),
});

function createResolveObjectsStep(callTool: McpToolCaller) {
  return createStep({
    id: 'resolveObjects',
    description: 'Resolve ABAP object URIs from package or transport',
    inputSchema: resolveObjectsInputSchema,
    outputSchema: resolveObjectsOutputSchema,
    execute: async ({ inputData }) => {
      const conn = {
        baseUrl: inputData.baseUrl,
        username: inputData.username,
        password: inputData.password,
        ...(inputData.client != null ? { client: inputData.client } : {}),
      };

      if (inputData.mode === 'package') {
        const packageName = inputData.packageName ?? '';
        const result = (await callTool('list_package_objects', {
          ...conn,
          packageName,
        })) as Record<string, unknown> | null;

        const rawObjects =
          result && Array.isArray(result.objects) ? result.objects : [];

        const objects = rawObjects
          .map((o: unknown) => {
            const obj = o as Record<string, unknown>;
            return typeof obj.uri === 'string' ? obj.uri : null;
          })
          .filter((uri): uri is string => uri !== null);

        return {
          mode: 'package' as const,
          target: packageName,
          objects,
          ...conn,
        };
      } else {
        // Transport mode: validate transport exists, then use transport URI
        const transportNumber = inputData.transportNumber ?? '';
        await callTool('cts_get_transport', {
          ...conn,
          transport: transportNumber,
        });

        const transportUri = `/sap/bc/adt/cts/transportrequests/${transportNumber}`;
        return {
          mode: 'transport' as const,
          target: transportNumber,
          objects: [transportUri],
          ...conn,
        };
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Step 2 – runAtcChecks
// ---------------------------------------------------------------------------

const atcResultSchema = z.object({
  objectUri: z.string(),
  status: z.enum(['success', 'error']),
  worklist: z.unknown().optional(),
  error: z.string().optional(),
});

const runAtcChecksInputSchema = z.object({
  mode: z.enum(['package', 'transport']),
  target: z.string(),
  objects: z.array(z.string()),
  baseUrl: z.string(),
  username: z.string(),
  password: z.string(),
  client: z.string().optional(),
});

const runAtcChecksOutputSchema = z.object({
  mode: z.enum(['package', 'transport']),
  target: z.string(),
  objects: z.array(z.string()),
  atcResults: z.array(atcResultSchema),
});

function createRunAtcChecksStep(callTool: McpToolCaller) {
  return createStep({
    id: 'runAtcChecks',
    description: 'Run ATC checks on each resolved object URI',
    inputSchema: runAtcChecksInputSchema,
    outputSchema: runAtcChecksOutputSchema,
    execute: async ({ inputData }) => {
      const conn = {
        baseUrl: inputData.baseUrl,
        username: inputData.username,
        password: inputData.password,
        ...(inputData.client != null ? { client: inputData.client } : {}),
      };

      const atcResults = [];

      for (const objectUri of inputData.objects) {
        try {
          const result = (await callTool('atc_run', {
            ...conn,
            objectUri,
          })) as Record<string, unknown> | null;

          atcResults.push({
            objectUri,
            status: 'success' as const,
            worklist: result?.worklist,
          });
        } catch (error) {
          atcResults.push({
            objectUri,
            status: 'error' as const,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      return {
        mode: inputData.mode,
        target: inputData.target,
        objects: inputData.objects,
        atcResults,
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Step 3 – buildReport
// ---------------------------------------------------------------------------

const buildReportInputSchema = z.object({
  mode: z.enum(['package', 'transport']),
  target: z.string(),
  objects: z.array(z.string()),
  atcResults: z.array(atcResultSchema),
});

function createBuildReportStep() {
  return createStep({
    id: 'buildReport',
    description: 'Aggregate ATC results into a CodeReviewReport',
    inputSchema: buildReportInputSchema,
    outputSchema: codeReviewOutputSchema,
    execute: async ({ inputData }) => {
      const findings: AtcFinding[] = [];

      for (const result of inputData.atcResults) {
        if (result.status === 'error') {
          // Error finding – insert a synthetic finding so the caller knows
          findings.push({
            objectUri: result.objectUri,
            priority: 'error',
            description: result.error ?? 'ATC check failed',
          });
          continue;
        }

        // Parse worklist findings
        const extracted = extractFindings(result.objectUri, result.worklist);
        findings.push(...extracted);
      }

      // Severity summary
      const bySeverity: Record<string, number> = {};
      for (const f of findings) {
        bySeverity[f.priority] = (bySeverity[f.priority] ?? 0) + 1;
      }

      const report: CodeReviewReport = {
        mode: inputData.mode,
        target: inputData.target,
        objects: inputData.objects,
        findings,
        summary: {
          totalObjects: inputData.objects.length,
          totalFindings: findings.length,
          bySeverity,
        },
      };

      return report;
    },
  });
}

// ---------------------------------------------------------------------------
// Worklist parsing helper
// ---------------------------------------------------------------------------

/**
 * Safely extract AtcFinding[] from a raw worklist response.
 *
 * The worklist may be shaped as:
 *   { worklist: { objects: { object: [...] } } }  ← successful run
 *   { worklistRun: { ... } }                      ← run-only response (no findings yet)
 *   null / undefined                              ← no result
 *
 * We do best-effort parsing and return an empty array on failure.
 */
function extractFindings(
  fallbackObjectUri: string,
  worklist: unknown,
): AtcFinding[] {
  if (!worklist || typeof worklist !== 'object') return [];

  const wl = worklist as Record<string, unknown>;

  // Normalise: unwrap top-level "worklist" key if present
  const inner =
    wl.worklist && typeof wl.worklist === 'object'
      ? (wl.worklist as Record<string, unknown>)
      : wl;

  const objectsContainer = inner.objects as Record<string, unknown> | undefined;
  if (!objectsContainer) return [];

  const rawObjects = objectsContainer.object;
  const objectArray = Array.isArray(rawObjects)
    ? rawObjects
    : rawObjects != null
      ? [rawObjects]
      : [];

  const findings: AtcFinding[] = [];

  for (const obj of objectArray) {
    const o = obj as Record<string, unknown>;
    const objectUri = typeof o.uri === 'string' ? o.uri : fallbackObjectUri;

    const findingsContainer = o.findings as Record<string, unknown> | undefined;
    if (!findingsContainer) continue;

    const rawFindings = findingsContainer.finding;
    const findingArray = Array.isArray(rawFindings)
      ? rawFindings
      : rawFindings != null
        ? [rawFindings]
        : [];

    for (const f of findingArray) {
      const finding = f as Record<string, unknown>;
      findings.push({
        objectUri,
        priority: String(finding.priority ?? 'unknown'),
        description: String(
          finding.messageTitle ??
            finding.checkTitle ??
            finding.description ??
            '',
        ),
        category:
          typeof finding.checkTitle === 'string'
            ? finding.checkTitle
            : undefined,
        checkName:
          typeof finding.checkId === 'string' ? finding.checkId : undefined,
        location:
          typeof finding.location === 'string' ? finding.location : undefined,
      });
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create the Code Review workflow, bound to the given MCP tool caller.
 *
 * @param callTool Function that calls a named MCP tool and returns the parsed
 *                 JSON response.
 */
export function createCodeReviewWorkflow(callTool: McpToolCaller) {
  const resolveObjectsStep = createResolveObjectsStep(callTool);
  const runAtcChecksStep = createRunAtcChecksStep(callTool);
  const buildReportStep = createBuildReportStep();

  return createWorkflow({
    id: 'code-review',
    description:
      'Run ATC-based code review on a package hierarchy or transport request',
    inputSchema: resolveObjectsInputSchema,
    outputSchema: codeReviewOutputSchema,
  })
    .then(resolveObjectsStep)
    .then(runAtcChecksStep)
    .then(buildReportStep)
    .commit();
}
