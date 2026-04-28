/**
 * abapify Pilot – types
 *
 * Shared types for the Code Review workflow and the Harness agent.
 */

/** SAP ADT connection parameters – forwarded as tool arguments on every MCP call. */
export interface ConnectionParams {
  baseUrl: string;
  username: string;
  password: string;
  /** SAP client number (e.g. "100"). Optional. */
  client?: string;
}

/** A single ATC finding returned by the Code Review workflow. */
export interface AtcFinding {
  /** ADT URI of the object that triggered the finding */
  objectUri: string;
  /** Severity / priority (e.g. "1", "2", "warning", "error") */
  priority: string;
  /** Human-readable description of the finding */
  description: string;
  /** ATC check category (e.g. "PERFORMANCE", "SECURITY") */
  category?: string;
  /** Name of the ATC check that raised the finding */
  checkName?: string;
  /** Optional source location within the object */
  location?: string;
}

/** Structured output of the Code Review workflow. */
export interface CodeReviewReport {
  /** Input mode used for this review */
  mode: 'package' | 'transport';
  /** The reviewed target (package name or transport number) */
  target: string;
  /** Resolved ADT object URIs that were checked */
  objects: string[];
  /** All ATC findings across all objects */
  findings: AtcFinding[];
  /** Aggregated statistics */
  summary: {
    totalObjects: number;
    totalFindings: number;
    /** Findings grouped by priority/severity */
    bySeverity: Record<string, number>;
  };
}

/**
 * Minimal interface for calling an MCP tool and getting its result.
 *
 * In production this is implemented by wrapping `@modelcontextprotocol/sdk`'s
 * `Client.callTool()`. In tests it is backed by an in-process mock.
 */
export type McpToolCaller = (
  toolName: string,
  args: Record<string, unknown>,
) => Promise<unknown>;
