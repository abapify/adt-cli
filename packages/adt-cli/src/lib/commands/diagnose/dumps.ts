import { Command } from 'commander';
import { getAdtClientV2 } from '../../utils/adt-client-v2';
import { asText } from '../../utils/text';

/** Print dump entries as tab-separated rows (or raw JSON when shape differs). */
function printDumpsText(result: unknown): void {
  const entries = (result as { dumps?: Array<Record<string, unknown>> }).dumps;
  if (Array.isArray(entries) && entries.length > 0) {
    for (const entry of entries) {
      process.stdout.write(
        `${asText(entry.id ?? '?')}\t${asText(entry.type ?? '?')}\t${asText(entry.program ?? '?')}\t${asText(entry.user ?? '?')}\n`,
      );
    }
  } else {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  }
}

/** Report a diagnose failure, distinguishing a missing endpoint (404). */
function reportDiagnoseFailure(
  error: unknown,
  label: string,
  endpointName: string,
): void {
  const is404 =
    error instanceof Error &&
    'status' in error &&
    (error as { status?: number }).status === 404;
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(
    is404
      ? `❌ ${label} endpoint is not available on this system (BTP systems may not support /sap/bc/adt/runtime/${endpointName})`
      : `❌ Diagnose ${endpointName} failed: ${errorMessage}`,
  );
  process.exit(1);
}

export const diagnoseDumpsCommand = new Command('dumps')
  .description('List ABAP runtime short dumps or inspect a single dump')
  .option('--id <id>', 'Short dump id')
  .option('--user <user>', 'Filter by SAP user')
  .option('--max <count>', 'Maximum number of dump entries', '50')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      id?: string;
      user?: string;
      max?: string;
      json?: boolean;
    }) => {
      try {
        const client = await getAdtClientV2();
        const params = new URLSearchParams();
        if (options.user) params.set('user', options.user);
        if (options.max) params.set('maxResults', options.max);

        const query = params.toString();
        const querySuffix = query ? `?${query}` : '';
        const path = options.id
          ? `/sap/bc/adt/runtime/dumps/${encodeURIComponent(options.id)}`
          : `/sap/bc/adt/runtime/dumps${querySuffix}`;

        const result = await client.fetch(path, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          printDumpsText(result);
        }
      } catch (error) {
        reportDiagnoseFailure(error, 'Short dumps', 'dumps');
      }
    },
  );
