/**
 * adt function module - Function Module CRUD commands
 *
 * Function modules are child objects of function groups — every command
 * takes <group> <module> as positional args.
 *
 * Usage:
 *   adt function module create ZFG_DEMO Z_DEMO_FM "Demo FM" [--transport]
 *   adt function module read ZFG_DEMO Z_DEMO_FM
 *   adt function module write ZFG_DEMO Z_DEMO_FM source.abap [--activate]
 *   adt function module activate ZFG_DEMO Z_DEMO_FM
 *   adt function module delete ZFG_DEMO Z_DEMO_FM [--transport] [-y]
 *
 * Mirrors sapcli's `sap function module` subcommand
 * (tmp/sapcli-ref/sapcli/sap/cli/function.py).
 */

import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { AdkFunctionModule } from '@abapify/adk';
import { getAdtClientV2, getCliContext } from '../../utils/adt-client-v2';
import { createProgressReporter } from '../../utils/progress-reporter';
import { createCliLogger } from '../../utils/logger-config';

async function readSource(fileArg: string): Promise<string> {
  if (fileArg === '-') {
    return new Promise<string>((resolve, reject) => {
      let data = '';
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', (chunk) => (data += chunk));
      process.stdin.on('end', () => resolve(data));
      process.stdin.on('error', reject);
    });
  }
  return readFileSync(fileArg, 'utf8');
}

function setupLoggerAndProgress(cmd: Command) {
  const globalOpts = cmd.optsWithGlobals?.() ?? {};
  const ctx = getCliContext();
  const verboseFlag = globalOpts.verbose ?? ctx.verbose ?? false;
  const logger =
    (cmd as unknown as { logger?: unknown }).logger ??
    ctx.logger ??
    createCliLogger({ verbose: verboseFlag });
  const progress = createProgressReporter({
    compact: !verboseFlag,
    logger: logger as never,
  });
  return { progress };
}

export const functionModuleCommand = new Command('module').description(
  'ABAP function module operations',
);

// ─── create ────────────────────────────────────────────────────────────────
functionModuleCommand.addCommand(
  new Command('create')
    .description('Create a new function module in a function group')
    .argument('<group>', 'Function group name')
    .argument('<name>', 'Function module name')
    .argument('<description>', 'Short description')
    .option('-t, --transport <corrnr>', 'Transport request number')
    .option(
      '--processing-type <type>',
      'Processing type (normal, rfc, update, ...)',
      'normal',
    )
    .option('--no-error-existing', 'Skip if module already exists', false)
    .option('--json', 'Output as JSON')
    .action(async function (
      this: Command,
      group: string,
      name: string,
      description: string,
      options: {
        transport?: string;
        processingType: string;
        errorExisting: boolean;
        json: boolean;
      },
    ) {
      const { progress } = setupLoggerAndProgress(this);
      try {
        await getAdtClientV2();

        if (!options.errorExisting) {
          progress.step(
            `🔍 Checking ${group.toUpperCase()}/${name.toUpperCase()}...`,
          );
          const already = await AdkFunctionModule.exists(group, name);
          progress.done();
          if (already) {
            if (options.json) {
              console.log(
                JSON.stringify(
                  {
                    group: group.toUpperCase(),
                    name: name.toUpperCase(),
                    status: 'already_exists',
                  },
                  null,
                  2,
                ),
              );
            } else {
              console.log(
                `ℹ️  function module ${group.toUpperCase()}/${name.toUpperCase()} already exists — skipping`,
              );
            }
            return;
          }
        }

        progress.step(`📝 Creating function module ${name.toUpperCase()}...`);
        const fm = await AdkFunctionModule.create(group, name, description, {
          transport: options.transport,
          processingType: options.processingType,
        });
        progress.done();

        if (options.json) {
          console.log(
            JSON.stringify(
              {
                group: fm.groupName,
                name: fm.name,
                description: fm.description,
                status: 'created',
              },
              null,
              2,
            ),
          );
        } else {
          console.log(`✅ function module ${fm.groupName}/${fm.name} created`);
          console.log(`   Description: ${fm.description}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        progress.done(`❌ ${message}`);
        console.error(`❌ Create failed:`, message);
        process.exit(1);
      }
    }),
);

// ─── read ──────────────────────────────────────────────────────────────────
functionModuleCommand.addCommand(
  new Command('read')
    .description('Read source code of a function module')
    .argument('<group>', 'Function group name')
    .argument('<name>', 'Function module name')
    .option('--json', 'Output metadata as JSON (no source)')
    .action(async function (
      this: Command,
      group: string,
      name: string,
      options: { json: boolean },
    ) {
      const { progress } = setupLoggerAndProgress(this);
      try {
        await getAdtClientV2();
        progress.step(
          `🔍 Loading ${group.toUpperCase()}/${name.toUpperCase()}...`,
        );
        const fm = await AdkFunctionModule.get(group, name);
        progress.done();

        if (options.json) {
          console.log(
            JSON.stringify(
              {
                group: fm.groupName,
                name: fm.name,
                description: fm.description,
              },
              null,
              2,
            ),
          );
          return;
        }

        progress.step('📄 Fetching source...');
        const source = await fm.getSource();
        progress.done();
        process.stdout.write(source);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        progress.done(`❌ ${message}`);
        console.error(`❌ Read failed:`, message);
        process.exit(1);
      }
    }),
);

// ─── write ─────────────────────────────────────────────────────────────────
functionModuleCommand.addCommand(
  new Command('write')
    .description('Write source code to a function module')
    .argument('<group>', 'Function group name')
    .argument('<name>', 'Function module name')
    .argument('[file]', 'Source file path (use - for stdin)', '-')
    .option('-t, --transport <corrnr>', 'Transport request number')
    .option('--activate', 'Activate after writing')
    .action(async function (
      this: Command,
      group: string,
      name: string,
      file: string,
      options: { transport?: string; activate: boolean },
    ) {
      const { progress } = setupLoggerAndProgress(this);
      try {
        await getAdtClientV2();

        progress.step(`📄 Reading source from ${file}...`);
        const source = await readSource(file);
        progress.done();

        progress.step(
          `🔍 Loading ${group.toUpperCase()}/${name.toUpperCase()}...`,
        );
        const fm = await AdkFunctionModule.get(group, name);
        progress.done();

        progress.step(`🔒 Locking ${name.toUpperCase()}...`);
        const lockHandle = await fm.lock(options.transport);
        progress.done();

        try {
          progress.step(`💾 Writing source to ${name.toUpperCase()}...`);
          await fm.client.adt.functions.groups.fmodules.source.main.put(
            fm.groupName,
            fm.name,
            {
              lockHandle: lockHandle.handle,
              ...(options.transport ? { corrNr: options.transport } : {}),
            },
            source,
          );
          progress.done();

          if (options.activate) {
            progress.step(`⚡ Activating ${name.toUpperCase()}...`);
            await fm.activate();
            progress.done();
          }
        } finally {
          await fm.unlock();
        }

        console.log(
          `✅ function module ${fm.groupName}/${fm.name} written${options.activate ? ' and activated' : ''}`,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        progress.done(`❌ ${message}`);
        console.error(`❌ Write failed:`, message);
        process.exit(1);
      }
    }),
);

// ─── activate ──────────────────────────────────────────────────────────────
functionModuleCommand.addCommand(
  new Command('activate')
    .description('Activate a function module')
    .argument('<group>', 'Function group name')
    .argument('<name>', 'Function module name')
    .option('--json', 'Output as JSON')
    .action(async function (
      this: Command,
      group: string,
      name: string,
      options: { json: boolean },
    ) {
      const { progress } = setupLoggerAndProgress(this);
      try {
        await getAdtClientV2();
        progress.step(
          `⚡ Activating ${group.toUpperCase()}/${name.toUpperCase()}...`,
        );
        const fm = await AdkFunctionModule.get(group, name);
        await fm.activate();
        progress.done();

        if (options.json) {
          console.log(
            JSON.stringify(
              { group: fm.groupName, name: fm.name, status: 'activated' },
              null,
              2,
            ),
          );
        } else {
          console.log(`✅ Activated: ${fm.groupName}/${fm.name}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        progress.done(`❌ ${message}`);
        console.error(`❌ Activate failed:`, message);
        process.exit(1);
      }
    }),
);

// ─── delete ────────────────────────────────────────────────────────────────
functionModuleCommand.addCommand(
  new Command('delete')
    .description('Delete a function module')
    .argument('<group>', 'Function group name')
    .argument('<name>', 'Function module name')
    .option('-t, --transport <corrnr>', 'Transport request number')
    .option('-y, --yes', 'Skip confirmation prompt')
    .option('--json', 'Output as JSON')
    .action(async function (
      this: Command,
      group: string,
      name: string,
      options: { transport?: string; yes: boolean; json: boolean },
    ) {
      const { progress } = setupLoggerAndProgress(this);
      const g = group.toUpperCase();
      const n = name.toUpperCase();

      try {
        await getAdtClientV2();

        if (!options.yes && !options.json) {
          const { confirm } = await import('@inquirer/prompts');
          const confirmed = await confirm({
            message: `Delete function module ${g}/${n}?`,
            default: false,
          });
          if (!confirmed) {
            console.log('❌ Deletion cancelled');
            process.exit(0);
          }
        }

        progress.step(`🗑️  Deleting function module ${g}/${n}...`);
        await AdkFunctionModule.delete(
          g,
          n,
          options.transport ? { transport: options.transport } : undefined,
        );
        progress.done();

        if (options.json) {
          console.log(
            JSON.stringify({ group: g, name: n, status: 'deleted' }, null, 2),
          );
        } else {
          console.log(`✅ function module ${g}/${n} deleted`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        progress.done(`❌ ${message}`);
        console.error(`❌ Delete failed:`, message);
        process.exit(1);
      }
    }),
);
