/**
 * adt srvb - RAP Service Binding commands
 *
 * SRVB (Service Binding) objects are metadata-only RAP artifacts at
 * `/sap/bc/adt/businessservices/bindings`. Unlike BDEF/SRVD there is
 * no source file — the binding XML carries all information.
 *
 * Beyond standard CRUD, SRVB supports publish/unpublish:
 *   - publish:   POST   {basePath}/{name}/publishedstates
 *   - unpublish: DELETE {basePath}/{name}/publishedstates
 *
 * Usage:
 *   adt srvb create ZUI_MY_SRVB "Service binding" ZMYPKG
 *   adt srvb read ZUI_MY_SRVB
 *   adt srvb publish ZUI_MY_SRVB
 *   adt srvb unpublish ZUI_MY_SRVB
 *   adt srvb delete ZUI_MY_SRVB --transport DEVK900001
 */

import { Command } from 'commander';
import { AdkServiceBinding, initializeAdk } from '@abapify/adk';
import { getAdtClientV2 } from '../../utils/adt-client-v2';

async function ensureAdk() {
  const client = await getAdtClientV2();
  initializeAdk(client);
  return client;
}

export const srvbCommand = new Command('srvb').description(
  'ABAP service binding (SRVB) operations',
);

// ─── create ───────────────────────────────────────────────────────────────
srvbCommand.addCommand(
  new Command('create')
    .description('Create a new ABAP service binding')
    .argument('<name>', 'SRVB name')
    .argument('<description>', 'Short description')
    .argument('<package>', 'Package name')
    .option('-t, --transport <corrnr>', 'Transport request number')
    .option('--no-error-existing', 'Skip if SRVB already exists', false)
    .option('--json', 'Output as JSON')
    .action(async (name, description, pkg, options) => {
      try {
        await ensureAdk();
        if (!options.errorExisting) {
          if (await AdkServiceBinding.exists(name.toUpperCase())) {
            if (options.json) {
              console.log(
                JSON.stringify(
                  { name: name.toUpperCase(), status: 'already_exists' },
                  null,
                  2,
                ),
              );
            } else {
              console.log(
                `ℹ️  service binding ${name.toUpperCase()} already exists — skipping`,
              );
            }
            return;
          }
        }
        const obj = await AdkServiceBinding.create(
          name,
          description,
          pkg,
          options.transport ? { transport: options.transport } : undefined,
        );
        if (options.json) {
          console.log(
            JSON.stringify(
              {
                name: obj.name,
                description: obj.description,
                status: 'created',
              },
              null,
              2,
            ),
          );
        } else {
          console.log(`✅ service binding ${obj.name} created`);
        }
      } catch (error) {
        console.error(
          `❌ Create failed:`,
          error instanceof Error ? error.message : String(error),
        );
        process.exit(1);
      }
    }),
);

// ─── read ─────────────────────────────────────────────────────────────────
srvbCommand.addCommand(
  new Command('read')
    .description('Read an ABAP service binding')
    .argument('<name>', 'SRVB name')
    .option('--json', 'Output as JSON')
    .action(async (name, options) => {
      try {
        await ensureAdk();
        const obj = await AdkServiceBinding.get(name.toUpperCase());
        const metadata = await obj.getMetadata();
        if (options.json) {
          console.log(JSON.stringify({ name: obj.name, metadata }, null, 2));
        } else {
          console.log(`📦 service binding: ${obj.name}`);
        }
      } catch (error) {
        console.error(
          `❌ Read failed:`,
          error instanceof Error ? error.message : String(error),
        );
        process.exit(1);
      }
    }),
);

// ─── publish ──────────────────────────────────────────────────────────────
srvbCommand.addCommand(
  new Command('publish')
    .description('Publish (activate) an ABAP service binding via Gateway')
    .argument('<name>', 'SRVB name')
    .option('--json', 'Output as JSON')
    .action(async (name, options) => {
      const n = name.toUpperCase();
      try {
        await ensureAdk();
        await AdkServiceBinding.publish(n);
        if (options.json) {
          console.log(
            JSON.stringify({ name: n, status: 'published' }, null, 2),
          );
        } else {
          console.log(`✅ service binding ${n} published`);
        }
      } catch (error) {
        console.error(
          `❌ Publish failed:`,
          error instanceof Error ? error.message : String(error),
        );
        process.exit(1);
      }
    }),
);

// ─── unpublish ────────────────────────────────────────────────────────────
srvbCommand.addCommand(
  new Command('unpublish')
    .description('Unpublish (deactivate) an ABAP service binding')
    .argument('<name>', 'SRVB name')
    .option('--json', 'Output as JSON')
    .action(async (name, options) => {
      const n = name.toUpperCase();
      try {
        await ensureAdk();
        await AdkServiceBinding.unpublish(n);
        if (options.json) {
          console.log(
            JSON.stringify({ name: n, status: 'unpublished' }, null, 2),
          );
        } else {
          console.log(`✅ service binding ${n} unpublished`);
        }
      } catch (error) {
        console.error(
          `❌ Unpublish failed:`,
          error instanceof Error ? error.message : String(error),
        );
        process.exit(1);
      }
    }),
);

// ─── activate ─────────────────────────────────────────────────────────────
srvbCommand.addCommand(
  new Command('activate')
    .description('Activate one or more ABAP service binding(s)')
    .argument('<names...>', 'SRVB name(s)')
    .option('--json', 'Output as JSON')
    .action(async (names, options) => {
      try {
        await ensureAdk();
        const results: Array<{ name: string; status: string; error?: string }> =
          [];
        for (const name of names) {
          const n = name.toUpperCase();
          try {
            const obj = await AdkServiceBinding.get(n);
            await obj.activate();
            results.push({ name: n, status: 'activated' });
          } catch (err) {
            results.push({
              name: n,
              status: 'failed',
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }
        if (options.json) {
          console.log(JSON.stringify(results, null, 2));
        } else {
          for (const r of results) {
            if (r.status === 'activated')
              console.log(`✅ Activated: ${r.name}`);
            else console.error(`❌ ${r.name}: ${r.error}`);
          }
          if (results.some((r) => r.status === 'failed')) process.exit(1);
        }
      } catch (error) {
        console.error(
          `❌ Activate failed:`,
          error instanceof Error ? error.message : String(error),
        );
        process.exit(1);
      }
    }),
);

// ─── delete ───────────────────────────────────────────────────────────────
srvbCommand.addCommand(
  new Command('delete')
    .description('Delete an ABAP service binding')
    .argument('<name>', 'SRVB name')
    .option('-t, --transport <corrnr>', 'Transport request number')
    .option('-y, --yes', 'Skip confirmation prompt')
    .option('--json', 'Output as JSON')
    .action(async (name, options) => {
      const { confirm } = await import('@inquirer/prompts');
      const n = name.toUpperCase();
      try {
        await ensureAdk();
        if (!options.yes && !options.json) {
          const confirmed = await confirm({
            message: `Delete service binding ${n}?`,
            default: false,
          });
          if (!confirmed) {
            console.log('❌ Deletion cancelled');
            process.exit(0);
          }
        }
        await AdkServiceBinding.delete(
          n,
          options.transport ? { transport: options.transport } : undefined,
        );
        if (options.json) {
          console.log(JSON.stringify({ name: n, status: 'deleted' }, null, 2));
        } else {
          console.log(`✅ service binding ${n} deleted`);
        }
      } catch (error) {
        console.error(
          `❌ Delete failed:`,
          error instanceof Error ? error.message : String(error),
        );
        process.exit(1);
      }
    }),
);
