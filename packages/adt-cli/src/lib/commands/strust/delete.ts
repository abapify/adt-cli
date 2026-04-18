/**
 * `adt strust delete <context> <applic> <cert-id>` — Remove a certificate.
 */

import { Command } from 'commander';
import { getAdtClientV2 } from '../../utils/adt-client-v2';

export const strustDeleteCommand = new Command('delete')
  .description('Delete a certificate from a PSE')
  .argument('<context>', 'PSE context (e.g., SSLC, SSLS)')
  .argument('<applic>', 'PSE application (e.g., DFAULT, ANONYM)')
  .argument('<cert-id>', 'Certificate id (from `adt strust get`)')
  .option('-y, --yes', 'Skip confirmation prompt', false)
  .option('--json', 'Output as JSON')
  .action(
    async (
      context: string,
      applic: string,
      certId: string,
      options: { yes?: boolean; json?: boolean },
    ) => {
      try {
        if (!options.yes && !options.json) {
          console.log(
            `About to delete certificate ${certId} from PSE ${context}/${applic}. Pass -y to confirm.`,
          );
          return;
        }

        const client = await getAdtClientV2();
        await client.adt.system.security.pses.deleteCertificate(
          context,
          applic,
          certId,
        );

        if (options.json) {
          console.log(
            JSON.stringify({ ok: true, context, applic, certId }, null, 2),
          );
          return;
        }
        console.log(
          `Deleted certificate ${certId} from PSE ${context}/${applic}`,
        );
      } catch (error) {
        console.error(
          'strust delete failed:',
          error instanceof Error ? error.message : String(error),
        );
        process.exit(1);
      }
    },
  );
