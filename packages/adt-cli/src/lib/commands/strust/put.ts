/**
 * `adt strust put <context> <applic> <pem-file>` — Upload a PEM certificate.
 */

import { readFileSync } from 'node:fs';
import { Command } from 'commander';
import { getAdtClientV2 } from '../../utils/adt-client-v2';

export const strustPutCommand = new Command('put')
  .description('Upload a PEM-encoded certificate into a PSE')
  .argument('<context>', 'PSE context (e.g., SSLC, SSLS)')
  .argument('<applic>', 'PSE application (e.g., DFAULT, ANONYM)')
  .argument('<pem-file>', 'Path to a PEM-encoded X.509 certificate file')
  .option('--json', 'Output as JSON')
  .action(
    async (
      context: string,
      applic: string,
      pemFile: string,
      options: { json?: boolean },
    ) => {
      try {
        const pem = readFileSync(pemFile, 'utf8');
        if (!pem.includes('BEGIN CERTIFICATE')) {
          throw new Error(
            `Input file ${pemFile} does not appear to contain a PEM certificate`,
          );
        }

        const client = await getAdtClientV2();
        await client.adt.system.security.pses.uploadCertificate(
          context,
          applic,
          pem,
        );

        if (options.json) {
          console.log(JSON.stringify({ ok: true, context, applic }, null, 2));
          return;
        }
        console.log(
          `Certificate uploaded to PSE ${context}/${applic} from ${pemFile}`,
        );
      } catch (error) {
        console.error(
          'strust put failed:',
          error instanceof Error ? error.message : String(error),
        );
        process.exit(1);
      }
    },
  );
