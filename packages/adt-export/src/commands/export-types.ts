/**
 * Shared CLI option and context types for the export command.
 */

import type { CliContext } from '@abapify/adt-plugin';
import type { AdkContext } from '@abapify/adk';

/** CLI options parsed for the `export` command. */
interface ExportCliOptions {
  files?: string[];
  source: string;
  format: string;
  transport?: string;
  package?: string;
  types?: string;
  dryRun?: boolean;
  activate?: boolean;
  unlock?: boolean;
  verify?: boolean;
  abapLanguageVersion?: string;
}

/** The ADT client as handed over by the CLI context (ADK-compatible). */
type ExportClient = AdkContext['client'];

/** Shared client + context threading through the export pre-deploy helpers. */
interface ExportContext {
  client: ExportClient;
  adkContext: AdkContext;
  ctx: CliContext;
}
