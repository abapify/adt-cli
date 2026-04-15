/**
 * Object CRUD Command Builder
 *
 * Creates a consistent set of CRUD subcommands (create, read, write, activate, delete)
 * for ABAP repository objects (class, program, interface).
 *
 * Each built command group supports:
 *   adt <type> create <name> <description> <package> [--transport] [--no-error-existing]
 *   adt <type> read <name>
 *   adt <type> write <name> [file|-] [--transport] [--activate]
 *   adt <type> activate <name...>
 *   adt <type> delete <name> [--transport] [-y]
 */

import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { getAdtClientV2, getCliContext } from '../../utils/adt-client-v2';
import { createProgressReporter } from '../../utils/progress-reporter';
import { createCliLogger } from '../../utils/logger-config';

// ============================================================================
// Types
// ============================================================================

export interface ObjectTypeDef<T> {
  /** Human readable name (e.g., "class") */
  label: string;
  /** CLI command name (e.g., "class") */
  command: string;

  /** Get an existing object by name */
  get(name: string): Promise<T>;

  /** Check if an object exists */
  exists(name: string): Promise<boolean>;

  /** Create a new object */
  create(
    name: string,
    description: string,
    packageName: string,
    options?: { transport?: string },
  ): Promise<T>;

  /** Delete an object */
  delete(
    name: string,
    options?: { transport?: string; lockHandle?: string },
  ): Promise<void>;

  /** Get source code (optional — objects without source skip write/read) */
  getSource?: (obj: T) => Promise<string>;
}

// ============================================================================
// Helper: read source from file or stdin
// ============================================================================

async function readSource(fileArg: string): Promise<string> {
  if (fileArg === '-') {
    // Read from stdin
    return new Promise((resolve, reject) => {
      let data = '';
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', (chunk) => (data += chunk));
      process.stdin.on('end', () => resolve(data));
      process.stdin.on('error', reject);
    });
  }
  return readFileSync(fileArg, 'utf8');
}

// ============================================================================
// Command Builder
// ============================================================================

/**
 * Build a full set of CRUD subcommands for an ABAP object type.
 *
 * Returns a Command group with: create, read, write, activate, delete
 */
export function buildObjectCrudCommands<
  T extends {
    name: string;
    description: string;
    activate(): Promise<T>;
    lock(transport?: string): Promise<{ handle: string }>;
    unlock(lockHandle: string): Promise<void>;
    saveMainSource(
      source: string,
      options?: { lockHandle?: string; transport?: string },
    ): Promise<void>;
  },
>(def: ObjectTypeDef<T>): Command {
  const group = new Command(def.command).description(
    `ABAP ${def.label} operations`,
  );

  // ─── create ───────────────────────────────────────────────────────────────
  group.addCommand(
    new Command('create')
      .description(`Create a new ABAP ${def.label}`)
      .argument('<name>', `${def.label} name`)
      .argument('<description>', 'Short description')
      .argument('<package>', 'Package name')
      .option('-t, --transport <corrnr>', 'Transport request number')
      .option(
        '--no-error-existing',
        `Skip if ${def.label} already exists`,
        false,
      )
      .option('--json', 'Output as JSON')
      .action(async function (
        this: Command,
        name: string,
        description: string,
        pkg: string,
        options: {
          transport?: string;
          errorExisting: boolean;
          json: boolean;
        },
      ) {
        const globalOpts = this.optsWithGlobals?.() ?? {};
        const ctx = getCliContext();
        const verboseFlag = globalOpts.verbose ?? ctx.verbose ?? false;
        const logger =
          (this as any).logger ??
          ctx.logger ??
          createCliLogger({ verbose: verboseFlag });
        const progress = createProgressReporter({
          compact: !verboseFlag,
          logger,
        });

        try {
          await getAdtClientV2();

          if (!options.errorExisting) {
            progress.step(`🔍 Checking ${name}...`);
            const already = await def.exists(name.toUpperCase());
            progress.done();
            if (already) {
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
                  `ℹ️  ${def.label} ${name.toUpperCase()} already exists — skipping`,
                );
              }
              return;
            }
          }

          progress.step(`📝 Creating ${def.label} ${name.toUpperCase()}...`);
          const obj = await def.create(
            name,
            description,
            pkg,
            options.transport ? { transport: options.transport } : undefined,
          );
          progress.done();

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
            console.log(`✅ ${def.label} ${obj.name} created`);
            console.log(`   Description: ${obj.description}`);
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          progress.done(`❌ ${message}`);
          console.error(`❌ Create failed:`, message);
          process.exit(1);
        }
      }),
  );

  // ─── read ─────────────────────────────────────────────────────────────────
  group.addCommand(
    new Command('read')
      .description(`Read source code of an ABAP ${def.label}`)
      .argument('<name>', `${def.label} name`)
      .option('--json', 'Output metadata as JSON (no source)')
      .action(async function (
        this: Command,
        name: string,
        options: { json: boolean },
      ) {
        const globalOpts = this.optsWithGlobals?.() ?? {};
        const ctx = getCliContext();
        const verboseFlag = globalOpts.verbose ?? ctx.verbose ?? false;
        const logger =
          (this as any).logger ??
          ctx.logger ??
          createCliLogger({ verbose: verboseFlag });
        const progress = createProgressReporter({
          compact: !verboseFlag,
          logger,
        });

        try {
          await getAdtClientV2();

          progress.step(`🔍 Loading ${name.toUpperCase()}...`);
          const obj = await def.get(name.toUpperCase());
          progress.done();

          if (options.json) {
            console.log(
              JSON.stringify(
                { name: obj.name, description: obj.description },
                null,
                2,
              ),
            );
            return;
          }

          if (def.getSource) {
            progress.step('📄 Fetching source...');
            const source = await def.getSource(obj);
            progress.done();
            process.stdout.write(source);
          } else {
            console.log(`📦 ${def.label}: ${obj.name}`);
            console.log(`   Description: ${obj.description}`);
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          progress.done(`❌ ${message}`);
          console.error(`❌ Read failed:`, message);
          process.exit(1);
        }
      }),
  );

  // ─── write ────────────────────────────────────────────────────────────────
  if (def.getSource) {
    group.addCommand(
      new Command('write')
        .description(`Write source code to an ABAP ${def.label}`)
        .argument('<name>', `${def.label} name`)
        .argument('[file]', 'Source file path (use - for stdin)', '-')
        .option('-t, --transport <corrnr>', 'Transport request number')
        .option('--activate', 'Activate after writing')
        .action(async function (
          this: Command,
          name: string,
          file: string,
          options: { transport?: string; activate: boolean },
        ) {
          const globalOpts = this.optsWithGlobals?.() ?? {};
          const ctx = getCliContext();
          const verboseFlag = globalOpts.verbose ?? ctx.verbose ?? false;
          const logger =
            (this as any).logger ??
            ctx.logger ??
            createCliLogger({ verbose: verboseFlag });
          const progress = createProgressReporter({
            compact: !verboseFlag,
            logger,
          });

          try {
            await getAdtClientV2();

            progress.step(`📄 Reading source from ${file}...`);
            const source = await readSource(file);
            progress.done();

            progress.step(`🔍 Loading ${name.toUpperCase()}...`);
            const obj = await def.get(name.toUpperCase());
            progress.done();

            progress.step(`🔒 Locking ${name.toUpperCase()}...`);
            const lockHandle = await obj.lock(options.transport);
            progress.done();

            try {
              progress.step(`💾 Writing source to ${name.toUpperCase()}...`);
              await obj.saveMainSource(source, {
                lockHandle: lockHandle.handle,
                transport: options.transport,
              });
              progress.done();

              if (options.activate) {
                progress.step(`⚡ Activating ${name.toUpperCase()}...`);
                await obj.activate();
                progress.done();
              }
            } finally {
              await obj.unlock(lockHandle.handle);
            }

            console.log(
              `✅ ${def.label} ${obj.name} written${options.activate ? ' and activated' : ''}`,
            );
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            progress.done(`❌ ${message}`);
            console.error(`❌ Write failed:`, message);
            process.exit(1);
          }
        }),
    );
  }

  // ─── activate ─────────────────────────────────────────────────────────────
  group.addCommand(
    new Command('activate')
      .description(`Activate one or more ABAP ${def.label}(s)`)
      .argument('<names...>', `${def.label} name(s)`)
      .option('--json', 'Output as JSON')
      .action(async function (
        this: Command,
        names: string[],
        options: { json: boolean },
      ) {
        const globalOpts = this.optsWithGlobals?.() ?? {};
        const ctx = getCliContext();
        const verboseFlag = globalOpts.verbose ?? ctx.verbose ?? false;
        const logger =
          (this as any).logger ??
          ctx.logger ??
          createCliLogger({ verbose: verboseFlag });
        const progress = createProgressReporter({
          compact: !verboseFlag,
          logger,
        });

        const results: Array<{
          name: string;
          status: string;
          error?: string;
        }> = [];

        try {
          await getAdtClientV2();

          for (const name of names) {
            const n = name.toUpperCase();
            progress.step(`⚡ Activating ${n}...`);
            try {
              const obj = await def.get(n);
              await obj.activate();
              progress.done();
              results.push({ name: n, status: 'activated' });
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              progress.done(`❌ ${n}: ${message}`);
              results.push({ name: n, status: 'failed', error: message });
            }
          }

          if (options.json) {
            console.log(JSON.stringify(results, null, 2));
          } else {
            const ok = results.filter((r) => r.status === 'activated');
            const failed = results.filter((r) => r.status === 'failed');
            if (ok.length)
              console.log(`✅ Activated: ${ok.map((r) => r.name).join(', ')}`);
            if (failed.length) {
              for (const r of failed) console.error(`❌ ${r.name}: ${r.error}`);
              process.exit(1);
            }
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          progress.done(`❌ ${message}`);
          console.error(`❌ Activate failed:`, message);
          process.exit(1);
        }
      }),
  );

  // ─── delete ───────────────────────────────────────────────────────────────
  group.addCommand(
    new Command('delete')
      .description(`Delete an ABAP ${def.label}`)
      .argument('<name>', `${def.label} name`)
      .option('-t, --transport <corrnr>', 'Transport request number')
      .option('-y, --yes', 'Skip confirmation prompt')
      .option('--json', 'Output as JSON')
      .action(async function (
        this: Command,
        name: string,
        options: { transport?: string; yes: boolean; json: boolean },
      ) {
        const { confirm } = await import('@inquirer/prompts');
        const globalOpts = this.optsWithGlobals?.() ?? {};
        const ctx = getCliContext();
        const verboseFlag = globalOpts.verbose ?? ctx.verbose ?? false;
        const logger =
          (this as any).logger ??
          ctx.logger ??
          createCliLogger({ verbose: verboseFlag });
        const progress = createProgressReporter({
          compact: !verboseFlag,
          logger,
        });

        const n = name.toUpperCase();

        try {
          await getAdtClientV2();

          if (!options.yes && !options.json) {
            const confirmed = await confirm({
              message: `Delete ${def.label} ${n}?`,
              default: false,
            });
            if (!confirmed) {
              console.log('❌ Deletion cancelled');
              process.exit(0);
            }
          }

          progress.step(`🗑️  Deleting ${def.label} ${n}...`);
          await def.delete(
            n,
            options.transport ? { transport: options.transport } : undefined,
          );
          progress.done();

          if (options.json) {
            console.log(
              JSON.stringify({ name: n, status: 'deleted' }, null, 2),
            );
          } else {
            console.log(`✅ ${def.label} ${n} deleted`);
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          progress.done(`❌ ${message}`);
          console.error(`❌ Delete failed:`, message);
          process.exit(1);
        }
      }),
  );

  return group;
}
