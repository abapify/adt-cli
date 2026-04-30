/**
 * abapify Pilot – public types
 *
 * Shared types for the Code Review workflow and the Mastra Harness agent.
 */

/**
 * SAP ADT connection parameters.
 *
 * Forwarded as MCP tool arguments on every call. The package never persists
 * these credentials — they must be passed as part of every workflow input.
 */
export interface ConnectionParams {
  /** Base URL of the SAP system (e.g. `http://sap:8000`) */
  baseUrl: string;
  /** SAP user name */
  username: string;
  /** SAP user password */
  password: string;
  /** Optional SAP client number (e.g. `"100"`) */
  client?: string;
}

/**
 * Discriminator for {@link CodeReviewReport.mode} and the workflow input.
 */
export type CodeReviewMode = 'package' | 'transport';

/** A single ATC finding produced by the Code Review workflow. */
export interface AtcFinding {
  /** ADT URI of the object that triggered the finding */
  objectUri: string;
  /**
   * Severity / priority. Either a numeric ATC priority (`"1"`, `"2"`,
   * `"3"`) or `"error"` for synthetic findings created when an MCP tool
   * call failed.
   */
  priority: string;
  /** Human-readable description of the finding */
  description: string;
  /** Optional ATC check category (e.g. `PERFORMANCE`, `SECURITY`) */
  category?: string;
  /** Optional name of the ATC check that raised the finding */
  checkName?: string;
  /** Optional source location within the object */
  location?: string;
}

/**
 * Per-object intermediate result produced by the `runAtcChecks` step.
 *
 * On `success` the raw `worklist` is preserved so {@link AtcFinding}
 * extraction can run in the next step. On `error` we capture the failure
 * message so the workflow can surface it as a synthetic
 * `priority: 'error'` finding.
 */
export interface AtcStepResult {
  /** Object URI the ATC check ran against */
  objectUri: string;
  /** Whether the per-object ATC call succeeded or threw */
  status: 'success' | 'error';
  /** Raw worklist response (only present when `status === 'success'`) */
  worklist?: unknown;
  /** Error message captured when `status === 'error'` */
  error?: string;
}

/** Structured output of the Code Review workflow. */
export interface CodeReviewReport {
  /** Mode used for this run */
  mode: CodeReviewMode;
  /** The reviewed target — package name or transport number */
  target: string;
  /** Resolved ADT object URIs that ATC ran against */
  objects: string[];
  /** All ATC findings collected across every checked object */
  findings: AtcFinding[];
  /** Aggregated statistics for quick consumption */
  summary: {
    /** Number of object URIs ATC was invoked on */
    totalObjects: number;
    /** Total number of findings (including synthetic error entries) */
    totalFindings: number;
    /** Findings grouped by `priority` */
    bySeverity: Record<string, number>;
  };
}

/**
 * Minimal interface for invoking an MCP tool and returning its parsed
 * response. Implementations should:
 *
 * 1. Forward the response body as-is when it is plain text.
 * 2. `JSON.parse()` it when the tool returned a JSON document.
 * 3. Throw an `Error` whenever the tool's `isError` flag is set so the
 *    workflow can record the failure.
 *
 * In production this is implemented by wrapping
 * `@modelcontextprotocol/sdk`'s `Client.callTool()` (see
 * {@link createMcpToolCaller}). In tests it can be implemented inline as
 * a stub.
 */
export type McpToolCaller = (
  toolName: string,
  args: Record<string, unknown>,
) => Promise<unknown>;
