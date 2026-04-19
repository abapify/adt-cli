/**
 * `adt rfc <FM> --param KEY=VALUE ...` — invoke a classic RFC function
 * module through SAP's SOAP-RFC wrapper (`/sap/bc/soap/rfc`).
 *
 * Reference (sapcli parity): `tmp/sapcli-ref/sapcli/sap/cli/startrfc.py`.
 */

import { Command } from 'commander';
import { writeFileSync } from 'node:fs';
import {
  createRfcClient,
  RfcSoapFault,
  RfcTransportUnavailable,
  type RfcParams,
} from '@abapify/adt-rfc';
import { getAdtClientV2 } from '../../utils/adt-client-v2';

function collectParam(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}

/**
 * Parse `KEY=VALUE` strings into a flat `RfcParams` object.
 *
 * - Keys are upper-cased (SAP convention).
 * - Values are kept as strings — SAP RFC SOAP expects string-encoded
 *   scalars; callers needing structures/tables should use the MCP tool
 *   (which accepts arbitrary JSON) or scripting.
 */
function parseParams(raw: string[]): RfcParams {
  const out: RfcParams = {};
  for (const item of raw) {
    const eq = item.indexOf('=');
    if (eq < 0) {
      throw new Error(`Invalid --param value '${item}'. Expected KEY=VALUE.`);
    }
    const key = item.slice(0, eq).trim().toUpperCase();
    const value = item.slice(eq + 1);
    if (!key) {
      throw new Error(`Invalid --param value '${item}': empty key.`);
    }
    out[key] = value;
  }
  return out;
}

export const rfcCommand = new Command('rfc')
  .description(
    'Invoke a classic RFC function module via SOAP-over-HTTP (/sap/bc/soap/rfc)',
  )
  .argument(
    '<fm>',
    'RFC function module name (case-insensitive, e.g. STFC_CONNECTION)',
  )
  .option(
    '-p, --param <key=value>',
    'Pass an importing/changing parameter. Repeatable.',
    collectParam,
    [] as string[],
  )
  .option(
    '-j, --json <json>',
    'Additional parameters as a JSON object (merged with --param values)',
  )
  .option(
    '-x, --exception-mode <mode>',
    'How to handle SOAP faults: raw|bapi (default: raw)',
    'raw',
  )
  .option('-o, --output <file>', 'Write the JSON response to a file')
  .option('--client <sap-client>', 'Override sap-client query parameter')
  .option('--pretty', 'Pretty-print JSON output (default: true)', true)
  .action(async (fm: string, options) => {
    try {
      const params = parseParams(options.param as string[]);
      if (options.json) {
        let extra: Record<string, unknown>;
        try {
          extra = JSON.parse(options.json);
        } catch (err) {
          throw new Error(
            `--json payload is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
            { cause: err },
          );
        }
        if (
          typeof extra !== 'object' ||
          extra === null ||
          Array.isArray(extra)
        ) {
          throw new Error('--json payload must be an object.');
        }
        Object.assign(params, extra);
      }

      const adtClient = await getAdtClientV2();
      const rfc = createRfcClient({
        fetch: (url, opts) => adtClient.fetch(url, opts) as Promise<unknown>,
        client: options.client,
      });

      console.log(`🔄 Calling RFC ${fm.toUpperCase()} ...`);
      const response = await rfc.call(fm, params);

      const rendered = options.pretty
        ? JSON.stringify(response, null, 2)
        : JSON.stringify(response);

      if (options.output) {
        writeFileSync(options.output, rendered);
        console.log(`💾 Response written to ${options.output}`);
      } else {
        console.log(rendered);
      }
      console.log('✅ Done!');
    } catch (error) {
      if (error instanceof RfcSoapFault) {
        if (options.exceptionMode === 'bapi') {
          // BAPI-ish: print structured fault info but still exit 1.
          console.error(
            JSON.stringify(
              {
                faultcode: error.faultcode,
                faultstring: error.faultstring,
              },
              null,
              2,
            ),
          );
        } else {
          console.error(
            `❌ SOAP Fault: ${error.faultcode}: ${error.faultstring}`,
          );
        }
        process.exit(1);
      }
      if (error instanceof RfcTransportUnavailable) {
        console.error(
          `❌ SOAP-RFC endpoint unavailable (HTTP ${error.status}). ` +
            `Your SAP system may have /sap/bc/soap/rfc disabled.`,
        );
        process.exit(2);
      }
      console.error(
        '❌ RFC call failed:',
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });
