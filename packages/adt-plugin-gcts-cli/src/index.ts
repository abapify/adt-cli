/**
 * @abapify/adt-plugin-gcts-cli
 *
 * CLI command-plugin adding `adt gcts ...` subcommands for SAP gCTS
 * (git-enabled CTS). See `src/lib/commands/gcts.ts` for the full subcommand
 * tree; this module simply exposes the plugin value expected by the
 * `@abapify/adt-plugin` contract.
 */

export { gctsCommand, gctsCommand as default } from './lib/commands/gcts';
export type { GctsClient } from './lib/client/gcts-client';
