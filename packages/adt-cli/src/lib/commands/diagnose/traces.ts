import { Command } from 'commander';
import { getAdtClientV2 } from '../../utils/adt-client-v2';

export const diagnoseTracesCommand = new Command('traces')
  .description('List ABAP traces or inspect trace hitlist/DB accesses')
  .argument('[action]', 'list | hitlist | db', 'list')
  .option('--id <id>', 'Trace id for hitlist/db actions')
  .option('--json', 'Output as JSON')
  .action(async (action: string, options: { id?: string; json?: boolean }) => {
    try {
      const client = await getAdtClientV2();
      const normalized = action === 'db' ? 'dbaccesses' : action;

      if (normalized !== 'list' && !options.id) {
        console.error('❌ --id is required for hitlist/db actions');
        process.exit(1);
      }

      const endpoint =
        normalized === 'list'
          ? '/sap/bc/adt/runtime/traces'
          : `/sap/bc/adt/runtime/traces/${encodeURIComponent(options.id ?? '')}/${normalized}`;

      const result = await client.fetch(endpoint, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        const traces = (result as { traces?: Array<Record<string, unknown>> })
          .traces;
        if (Array.isArray(traces) && traces.length > 0) {
          for (const trace of traces) {
            process.stdout.write(
              `${String(trace.id ?? '?')}\t${String(trace.user ?? '?')}\t${String(trace.program ?? '?')}\n`,
            );
          }
        } else {
          process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        }
      }
    } catch (error) {
      const is404 =
        error instanceof Error &&
        'status' in error &&
        (error as { status?: number }).status === 404;
      console.error(
        is404
          ? '❌ Traces endpoint is not available on this system (BTP systems may not support /sap/bc/adt/runtime/traces)'
          : `❌ Diagnose traces failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
    }
  });
