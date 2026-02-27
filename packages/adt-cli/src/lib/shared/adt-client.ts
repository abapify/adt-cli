/**
 * Shared ADT Client State
 *
 * Global state and singleton instances for ADT client management.
 * This module holds stateful objects that are shared across CLI commands.
 *
 * For the factory function that creates clients, see utils/adt-client.ts
 */
import type { Logger } from '@abapify/adt-client';

// =============================================================================
// Global CLI Context (set by CLI preAction hook)
// =============================================================================

export interface CliContext {
  sid?: string;
  logger?: Logger;
  logLevel?: string;
  logOutput?: string;
  logResponseFiles?: boolean;
  verbose?: boolean | string;
  /** Path to config file (from --config flag) */
  configPath?: string;
}

let globalCliContext: CliContext = {};

/**
 * Set global CLI context (called by CLI preAction hook)
 * This allows getAdtClientV2() to auto-read CLI options without passing them explicitly
 */
export function setCliContext(context: CliContext): void {
  globalCliContext = { ...globalCliContext, ...context };
}

/**
 * Get current CLI context
 */
export function getCliContext(): CliContext {
  return globalCliContext;
}

/**
 * Reset CLI context (useful for testing)
 */
export function resetCliContext(): void {
  globalCliContext = {};
}

// =============================================================================
// Shared Loggers
// =============================================================================

/**
 * Silent logger - suppresses all output (default for CLI)
 */
// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};
export const silentLogger: Logger = {
  trace: noop,
  debug: noop,
  info: noop,
  warn: noop,
  error: noop,
  fatal: noop,
  child: () => silentLogger,
};

/**
 * Console logger - outputs to console (used when enableLogging is true)
 */
export const consoleLogger: Logger = {
  trace: (msg: string) => console.debug(msg),
  debug: (msg: string) => console.debug(msg),
  info: (msg: string) => console.log(msg),
  warn: (msg: string) => console.warn(msg),
  error: (msg: string) => console.error(msg),
  fatal: (msg: string) => console.error(msg),
  child: () => consoleLogger,
};

// =============================================================================
// Capture Plugin State
// =============================================================================

/**
 * Captured response data from the last request
 */
export interface CapturedResponse {
  /** Raw XML/text response */
  xml?: string;
  /** Parsed JSON response */
  json?: unknown;
}

// Global capture storage (reset on each request)
let lastCaptured: CapturedResponse = {};

/**
 * Get the last captured response (for commands that need raw XML/JSON)
 */
export function getCaptured(): CapturedResponse {
  return lastCaptured;
}

/**
 * Set captured response data
 */
export function setCaptured(data: CapturedResponse): void {
  lastCaptured = data;
}

/**
 * Reset captured data (called before each request when capture is enabled)
 */
export function resetCaptured(): void {
  lastCaptured = {};
}
