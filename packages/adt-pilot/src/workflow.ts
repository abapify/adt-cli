/**
 * Code Review Workflow
 *
 * A Mastra workflow that runs ATC-based code review on either an ABAP
 * package hierarchy or a transport request. The workflow is deterministic
 * and does not require an LLM — it orchestrates calls to the
 * `@abapify/adt-mcp` MCP server via a thin {@link McpToolCaller} interface.
 *
 * The workflow has exactly three steps executed in sequence:
 *
 *   resolveObjects  →  runAtcChecks  →  buildReport
 *
 * Inputs are validated against a Zod discriminated union and the output
 * conforms to the {@link CodeReviewReport} schema.
 *
 * @example
 * ```ts
 * const workflow = createCodeReviewWorkflow(callTool);
 * const run = await workflow.createRun();
 * const result = await run.start({
 *   inputData: {
 *     mode: 'package',
 *     packageName: 'ZPACKAGE',
 *     baseUrl: 'https://sap.example.com',
 *     username: 'DEVELOPER',
 *     password: 'secret',
 *   },
 * });
 * if (result.status === 'success') {
 *   console.log(result.result); // CodeReviewReport
 * }
 * ```
 */

import {
  createWorkflow as createWorkflowRaw,
  createStep as createStepRaw,
} from '@mastra/core/workflows';
import { z } from 'zod';
import type {
  AtcFinding,
  AtcStepResult,
  CodeReviewReport,
  McpToolCaller,
} from './types';

// Type-erase the Mastra workflow/step factories at the import boundary.
// See "Internal type-erasure aliases" below for the rationale.
const createWorkflow = createWorkflowRaw as unknown as (config: {
  id: string;
  description: string;
  inputSchema: unknown;
  outputSchema: unknown;
}) => AnyWorkflowBuilder;

// The `execute` callback is intentionally typed permissively. Our helper
// functions infer `inputData` from each step's Zod input schema and return
// the appropriate output object — the schemas remain the source of truth
// at runtime.
type AnyStepExecute = (args: { inputData: never }) => Promise<unknown>;

const createStep = createStepRaw as unknown as (config: {
  id: string;
  description: string;
  inputSchema: unknown;
  outputSchema: unknown;
  execute: AnyStepExecute;
}) => AnyStep;

// ---------------------------------------------------------------------------
// Internal type-erasure aliases
// ---------------------------------------------------------------------------
//
// Mastra's `Workflow`/`Step` types are extremely deeply generic. Letting
// TypeScript fully instantiate them in this file blows past the default
// `tsc` heap (4 GB) and bloats the generated `.d.ts`. We treat steps and
// the workflow builder as opaque values here — the runtime correctness
// of the chain is enforced by the Zod schemas, and the public surface
// is exposed via the narrower {@link CodeReviewWorkflow} interface.

type AnyStep = unknown;
interface AnyWorkflowBuilder {
  then(step: AnyStep): AnyWorkflowBuilder;
  commit(): unknown;
}

// ---------------------------------------------------------------------------
// Public schemas
// ---------------------------------------------------------------------------

const connectionShape = {
  baseUrl: z.string().url(),
  username: z.string().min(1),
  password: z.string().min(1),
  client: z.string().optional(),
} as const;

/**
 * Workflow input schema — discriminated union on `mode`.
 *
 * `package` mode requires `packageName`, `transport` mode requires
 * `transportNumber`. Connection credentials are required on every run.
 */
export const codeReviewInputSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('package'),
    packageName: z.string().min(1),
    ...connectionShape,
  }),
  z.object({
    mode: z.literal('transport'),
    transportNumber: z.string().min(1),
    ...connectionShape,
  }),
]);

/** Inferred TypeScript type of the workflow input. */
export type CodeReviewInput = z.infer<typeof codeReviewInputSchema>;

const findingSchema = z.object({
  objectUri: z.string(),
  priority: z.string(),
  description: z.string(),
  category: z.string().optional(),
  checkName: z.string().optional(),
  location: z.string().optional(),
});

/** Workflow output schema (CodeReviewReport). */
export const codeReviewOutputSchema = z.object({
  mode: z.enum(['package', 'transport']),
  target: z.string(),
  objects: z.array(z.string()),
  findings: z.array(findingSchema),
  summary: z.object({
    totalObjects: z.number(),
    totalFindings: z.number(),
    bySeverity: z.record(z.string(), z.number()),
  }),
});

// ---------------------------------------------------------------------------
// Internal step schemas
// ---------------------------------------------------------------------------

/** Output of step 1 = input of step 2. */
const resolveObjectsOutputSchema = z.object({
  mode: z.enum(['package', 'transport']),
  target: z.string(),
  objects: z.array(z.string()),
  ...connectionShape,
});

const atcStepResultSchema = z.object({
  objectUri: z.string(),
  status: z.enum(['success', 'error']),
  worklist: z.unknown().optional(),
  error: z.string().optional(),
});

/** Output of step 2 = input of step 3. */
const runAtcChecksOutputSchema = z.object({
  mode: z.enum(['package', 'transport']),
  target: z.string(),
  objects: z.array(z.string()),
  atcResults: z.array(atcStepResultSchema),
});

// ---------------------------------------------------------------------------
// Step 1 – resolveObjects
// ---------------------------------------------------------------------------

/**
 * Resolve the list of object URIs to check.
 *
 * - **Package mode** — calls `list_package_objects` and extracts every
 *   `uri` field from the returned `objects[]` array.
 * - **Transport mode** — calls `cts_get_transport` to validate that the
 *   transport exists. The transport request URI itself is then used as
 *   the ATC target — SAP ATC enumerates contained objects server-side.
 *   This matches the behaviour of `adt check --transport <number>`.
 */
function createResolveObjectsStep(callTool: McpToolCaller) {
  return createStep({
    id: 'resolveObjects',
    description: 'Resolve ABAP object URIs from package or transport',
    inputSchema: codeReviewInputSchema,
    outputSchema: resolveObjectsOutputSchema,
    execute: async ({
      inputData,
    }: {
      inputData: z.infer<typeof codeReviewInputSchema>;
    }) => {
      const conn = stripConnection(inputData);

      if (inputData.mode === 'package') {
        const packageName = inputData.packageName;
        const result = await callTool('list_package_objects', {
          ...conn,
          packageName,
        });

        const objects = extractObjectUris(result);

        return {
          mode: 'package' as const,
          target: packageName,
          objects,
          ...conn,
        };
      }

      // Transport mode — validate the transport exists, then use the
      // transport URI as the ATC target.
      const transportNumber = inputData.transportNumber;
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
    },
  });
}

// ---------------------------------------------------------------------------
// Step 2 – runAtcChecks
// ---------------------------------------------------------------------------

/**
 * Run `atc_run` for each resolved object URI.
 *
 * The MCP tool layer returns a worklist on success or throws on failure.
 * We capture failures as per-object error entries so the workflow always
 * completes — partial failures are surfaced as `priority: 'error'`
 * findings in the final report.
 */
function createRunAtcChecksStep(callTool: McpToolCaller) {
  return createStep({
    id: 'runAtcChecks',
    description: 'Run ATC checks on each resolved object URI',
    inputSchema: resolveObjectsOutputSchema,
    outputSchema: runAtcChecksOutputSchema,
    execute: async ({
      inputData,
    }: {
      inputData: z.infer<typeof resolveObjectsOutputSchema>;
    }) => {
      const conn = stripConnection(inputData);
      const atcResults: AtcStepResult[] = [];

      for (const objectUri of inputData.objects) {
        try {
          const result = await callTool('atc_run', { ...conn, objectUri });
          const worklist = pickWorklist(result);
          atcResults.push({
            objectUri,
            status: 'success',
            ...(worklist !== undefined ? { worklist } : {}),
          });
        } catch (error) {
          atcResults.push({
            objectUri,
            status: 'error',
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

/**
 * Aggregate ATC step results into a {@link CodeReviewReport}.
 *
 * Each successful ATC result is parsed for findings via {@link extractFindings}.
 * Each error result produces a synthetic `priority: 'error'` finding
 * containing the captured error message.
 */
function createBuildReportStep() {
  return createStep({
    id: 'buildReport',
    description: 'Aggregate ATC results into a CodeReviewReport',
    inputSchema: runAtcChecksOutputSchema,
    outputSchema: codeReviewOutputSchema,
    execute: async ({
      inputData,
    }: {
      inputData: z.infer<typeof runAtcChecksOutputSchema>;
    }) => {
      const findings: AtcFinding[] = [];

      for (const result of inputData.atcResults) {
        if (result.status === 'error') {
          findings.push({
            objectUri: result.objectUri,
            priority: 'error',
            description: result.error ?? 'ATC check failed',
          });
          continue;
        }

        findings.push(...extractFindings(result.objectUri, result.worklist));
      }

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
// Helpers
// ---------------------------------------------------------------------------

/** Pull the connection shape out of a step input, dropping mode-specific fields. */
function stripConnection(input: {
  baseUrl: string;
  username: string;
  password: string;
  client?: string | undefined;
}): { baseUrl: string; username: string; password: string; client?: string } {
  return {
    baseUrl: input.baseUrl,
    username: input.username,
    password: input.password,
    ...(input.client !== undefined ? { client: input.client } : {}),
  };
}

/**
 * Extract `objects[].uri` from the `list_package_objects` response.
 *
 * The MCP tool returns:
 * ```
 * { packageName, count, objects: [{ uri, name?, type?, packageName? }, ...] }
 * ```
 *
 * Anything unrecognised is silently ignored — the goal is best-effort
 * resilience against minor response shape changes.
 */
function extractObjectUris(response: unknown): string[] {
  if (!response || typeof response !== 'object') return [];
  const root = response as Record<string, unknown>;
  const rawObjects = Array.isArray(root.objects) ? root.objects : [];

  const uris: string[] = [];
  for (const obj of rawObjects) {
    if (obj && typeof obj === 'object') {
      const rec = obj as Record<string, unknown>;
      if (typeof rec.uri === 'string' && rec.uri.length > 0) {
        uris.push(rec.uri);
      }
    }
  }
  return uris;
}

/**
 * Pull the `worklist` field out of an ATC tool response.
 *
 * The `atc_run` MCP tool returns one of:
 * ```
 * { status: 'completed', worklist: { ... } }   // findings present
 * { status: 'completed', findings: [], raw: { ... } }   // no worklist id
 * ```
 */
function pickWorklist(response: unknown): unknown {
  if (!response || typeof response !== 'object') return undefined;
  const rec = response as Record<string, unknown>;
  return rec.worklist;
}

/**
 * Best-effort extraction of {@link AtcFinding} entries from an ATC worklist.
 *
 * The worklist may take any of these shapes (depending on parser):
 * ```
 * { worklist: { objects: { object: [...] } } }
 * { objects: { object: [...] } }
 * { objects: { object: { ... } } }     // single object collapsed
 * ```
 *
 * Within each `object` entry, findings may live under `findings.finding`
 * either as an array or a single object. We normalise both shapes.
 *
 * Returns an empty array on any unexpected structure rather than throwing
 * — the caller surfaces tool errors via the `error` path instead.
 */
function extractFindings(
  fallbackObjectUri: string,
  worklist: unknown,
): AtcFinding[] {
  if (!worklist || typeof worklist !== 'object') return [];

  const wl = worklist as Record<string, unknown>;
  const inner =
    wl.worklist && typeof wl.worklist === 'object'
      ? (wl.worklist as Record<string, unknown>)
      : wl;

  const objectsContainer = inner.objects;
  if (!objectsContainer || typeof objectsContainer !== 'object') return [];

  const rawObjects = (objectsContainer as Record<string, unknown>).object;
  const objectArray = toArray(rawObjects);

  const findings: AtcFinding[] = [];
  for (const obj of objectArray) {
    if (!obj || typeof obj !== 'object') continue;
    const o = obj as Record<string, unknown>;
    const objectUri =
      typeof o.uri === 'string' && o.uri.length > 0 ? o.uri : fallbackObjectUri;

    const findingsContainer = o.findings;
    if (!findingsContainer || typeof findingsContainer !== 'object') continue;

    const rawFindings = (findingsContainer as Record<string, unknown>).finding;
    for (const f of toArray(rawFindings)) {
      if (!f || typeof f !== 'object') continue;
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
        ...(typeof finding.checkTitle === 'string'
          ? { category: finding.checkTitle }
          : {}),
        ...(typeof finding.checkId === 'string'
          ? { checkName: finding.checkId }
          : {}),
        ...(typeof finding.location === 'string'
          ? { location: finding.location }
          : {}),
      });
    }
  }
  return findings;
}

/** Normalise SAP-style "single-or-array" XML mappings into a plain array. */
function toArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

// ---------------------------------------------------------------------------
// Public workflow handle type
// ---------------------------------------------------------------------------

/**
 * Result returned by {@link CodeReviewRun.start}. Mirrors the relevant
 * subset of Mastra's `WorkflowResult` so consumers don't need to import
 * `@mastra/core`.
 */
export type CodeReviewRunResult =
  | { status: 'success'; result: CodeReviewReport }
  | { status: 'failed'; error: Error }
  | { status: 'suspended' | 'paused' | 'tripwire' };

/**
 * Public handle for an in-flight workflow run.
 *
 * Wraps Mastra's `Run` instance with a narrow surface so DTS generation
 * doesn't have to expand the deeply generic Mastra type parameters
 * (which causes OOM in `rolldown-plugin-dts`).
 */
export interface CodeReviewRun {
  start(args: { inputData: CodeReviewInput }): Promise<CodeReviewRunResult>;
}

/**
 * Public handle for a committed workflow.
 *
 * Calling {@link CodeReviewWorkflow.createRun} returns a {@link CodeReviewRun}
 * (asynchronously) — Mastra needs to acquire a runId before returning.
 */
export interface CodeReviewWorkflow {
  createRun(): Promise<CodeReviewRun>;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create the Code Review workflow, bound to the given MCP tool caller.
 *
 * The returned workflow can be executed many times — each call to
 * `createRun()` produces an independent run. The workflow is stateless;
 * connection credentials must be passed as part of every input.
 *
 * @param callTool Function that invokes a named MCP tool and returns the
 *                 parsed JSON response. Implementations should throw on
 *                 tool-level errors so the workflow can record them.
 */
export function createCodeReviewWorkflow(
  callTool: McpToolCaller,
): CodeReviewWorkflow {
  const resolveObjectsStep = createResolveObjectsStep(callTool);
  const runAtcChecksStep = createRunAtcChecksStep(callTool);
  const buildReportStep = createBuildReportStep();

  const workflow = createWorkflow({
    id: 'code-review',
    description:
      'Run ATC-based code review on a package hierarchy or transport request',
    inputSchema: codeReviewInputSchema,
    outputSchema: codeReviewOutputSchema,
  })
    .then(resolveObjectsStep)
    .then(runAtcChecksStep)
    .then(buildReportStep)
    .commit();

  // The runtime methods we expose match Mastra's `Workflow` exactly — we
  // simply present a narrower public type to avoid leaking the deeply
  // generic Mastra type parameters into the DTS bundle.
  return workflow as unknown as CodeReviewWorkflow;
}
