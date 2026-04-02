/**
 * Lock Command
 *
 * Acquire a lock on a SAP ADT object and persist the handle
 * to ~/.adt/locks.json so that a later `adt unlock` can release it.
 *
 * Usage:
 *   adt lock ZAGE_FUGR_SAMPLE --type FUGR
 *   adt lock --uri /sap/bc/adt/functions/groups/zage_fugr_sample
 */

import { Command } from 'commander';
import { getAdtClientV2 } from '../utils/adt-client-v2';
import { resolveObjectUri, getLockService } from '../utils/lock-helpers';

export const lockCommand = new Command('lock')
  .description('Lock a SAP object (persists handle for later unlock)')
  .argument(
    '[objectNames...]',
    'Object name(s) to lock (e.g., ZAGE_FUGR_SAMPLE ZCL_MY_CLASS)',
  )
  .option(
    '--type <type>',
    'Object type (CLAS, INTF, TTYP, TABL, DOMA, DTEL, PROG, FUGR, DEVC)',
  )
  .option('--uri <uri>', 'Direct object URI (skips search)')
  .option('--transport <transport>', 'Transport request number')
  .action(
    async (
      objectNames: string[],
      options: { type?: string; uri?: string; transport?: string },
    ) => {
      try {
        const client = await getAdtClientV2();
        const locks = getLockService(client);

        // --uri without object names: lock the URI directly
        if (options.uri && objectNames.length === 0) {
          const label = options.uri.split('/').pop() || options.uri;
          console.log(`\n🔒 Locking: ${label} (via --uri)`);

          const handle = await locks.lock(options.uri, {
            objectName: label,
            transport: options.transport,
          });

          console.log(`✅ Locked`);
          console.log(`   🔑 Handle: ${handle.handle}`);
          if (handle.correlationNumber) {
            console.log(`   📦 Transport: ${handle.correlationNumber}`);
          }
          return;
        }

        if (objectNames.length === 0) {
          console.error(
            '❌ Provide object name(s) or use --uri to lock by URI directly.',
          );
          process.exit(1);
        }

        let failed = 0;

        for (const objectName of objectNames) {
          console.log(`\n🔒 Locking: ${objectName}`);

          try {
            const { uri, display } = await resolveObjectUri(
              client,
              objectName,
              'lock',
              options.type,
              objectNames.length === 1 ? options.uri : undefined,
            );
            console.log(`   📍 ${display}`);

            const handle = await locks.lock(uri, {
              objectName,
              objectType: options.type,
              transport: options.transport,
            });

            console.log(`✅ ${objectName} locked`);
            console.log(`   🔑 Handle: ${handle.handle}`);
            if (handle.correlationNumber) {
              console.log(`   📦 Transport: ${handle.correlationNumber}`);
            }
          } catch (err) {
            console.error(
              `   ❌ ${err instanceof Error ? err.message : String(err)}`,
            );
            failed++;
          }
        }

        if (failed > 0) {
          console.log(`\n⚠️  ${failed}/${objectNames.length} lock(s) failed`);
          process.exit(1);
        }
      } catch (error) {
        console.error(
          '❌ Failed:',
          error instanceof Error ? error.message : String(error),
        );
        process.exit(1);
      }
    },
  );
