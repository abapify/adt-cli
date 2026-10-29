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
import {
  readFileSync,
  writeFileSync,
  renameSync,
  unlinkSync,
  statSync,
} from 'node:fs';
import { randomBytes } from 'node:crypto';
import { dirname, basename, join } from 'node:path';
import { getAdtClientV2, getCliContext } from '../../utils/adt-client-v2';
import { createProgressReporter } from '../../utils/progress-reporter';
import { createCliLogger } from '../../utils/logger-config';
import { resolveLockCorrelation } from '@abapify/adt-locks';

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

interface CreateReadbackOperations<
  T extends { name: string; description: string; package?: string },
> {
  create(
    name: string,
    description: string,
    packageName: string,
    options?: { transport?: string },
  ): Promise<T>;
  get(name: string): Promise<T>;
}

function isAmbiguousCreateFailure(error: unknown): boolean {
  const status =
    typeof error === 'object' && error !== null
      ? (error as { status?: unknown }).status
      : undefined;
  if (typeof status === 'number' && status >= 500) return true;
  return error instanceof Error && error.name === 'AdkPostCreateLockError';
}

/**
 * Reconcile a POST whose response failed after SAP may already have committed.
 * Only an exact name/description/package read-back is accepted as recovery.
 */
export async function createWithReadbackRecovery<
  T extends { name: string; description: string; package?: string },
>(
  operations: CreateReadbackOperations<T>,
  name: string,
  description: string,
  packageName: string,
  transport?: string,
): Promise<{ object: T; recovered: boolean }> {
  const normalizedName = name.toUpperCase();
  const normalizedPackage = packageName.toUpperCase();
  try {
    return {
      object: await operations.create(
        normalizedName,
        description,
        normalizedPackage,
        transport ? { transport } : undefined,
      ),
      recovered: false,
    };
  } catch (error) {
    if (!isAmbiguousCreateFailure(error)) throw error;

    let recovered: T;
    try {
      recovered = await operations.get(normalizedName);
    } catch {
      throw error;
    }

    const matches =
      recovered.name.toUpperCase() === normalizedName &&
      recovered.description.trim() === description.trim() &&
      recovered.package?.toUpperCase() === normalizedPackage;
    if (!matches) throw error;

    return { object: recovered, recovered: true };
  }
}

interface ObjectLockHandle {
  handle: string;
  correlationNumber?: string;
}

/**
 * SAP may normalize a concrete task to its parent request during LOCK.
 * Source writes must use the returned correlation number with the lock handle.
 */
export function resolveEffectiveTransport(
  lockHandle: ObjectLockHandle,
  requestedTransport?: string,
): string | undefined {
  return resolveLockCorrelation(lockHandle, requestedTransport);
}

interface SourceLifecycleObject<T = unknown> {
  saveMainSource(
    source: string,
    options?: { lockHandle?: string; transport?: string },
  ): Promise<void>;
  unlock(lockHandle: string): Promise<void>;
  activate(): Promise<T>;
}

interface PersistSourceOptions {
  lockHandle: ObjectLockHandle;
  requestedTransport?: string;
  activate: boolean;
  beforeActivate?: () => void;
}

interface DeleteLifecycleObject {
  lock(transport?: string): Promise<ObjectLockHandle>;
  unlock(lockHandle: string): Promise<void>;
}

/** Delete under an editor lock and release that lock on every outcome. */
export async function deleteWithReleasedLock(
  object: DeleteLifecycleObject,
  deleteObject: (options: {
    transport?: string;
    lockHandle: string;
  }) => Promise<void>,
  requestedTransport?: string,
): Promise<void> {
  const lockHandle = await object.lock(requestedTransport);
  let deleteError: unknown;
  try {
    await deleteObject({
      lockHandle: lockHandle.handle,
      transport: resolveEffectiveTransport(lockHandle, requestedTransport),
    });
  } catch (error) {
    deleteError = error;
  }

  try {
    await object.unlock(lockHandle.handle);
  } catch (unlockError) {
    if (deleteError) {
      throw new AggregateError(
        [deleteError, unlockError],
        'Object delete and lock release both failed',
        { cause: unlockError },
      );
    }
    throw unlockError;
  }
  if (deleteError) throw deleteError;
}

/** Save under the editor lock, release it, and only then activate. */
export async function persistSourceWithReleasedLock<T>(
  object: SourceLifecycleObject<T>,
  source: string,
  options: PersistSourceOptions,
): Promise<void> {
  let saveError: unknown;
  try {
    await object.saveMainSource(source, {
      lockHandle: options.lockHandle.handle,
      transport: resolveEffectiveTransport(
        options.lockHandle,
        options.requestedTransport,
      ),
    });
  } catch (error) {
    saveError = error;
  }

  try {
    await object.unlock(options.lockHandle.handle);
  } catch (unlockError) {
    if (saveError) {
      throw new AggregateError(
        [saveError, unlockError],
        'Source write and lock release both failed',
        { cause: unlockError },
      );
    }
    throw unlockError;
  }
  if (saveError) throw saveError;

  if (options.activate) {
    options.beforeActivate?.();
    await object.activate();
  }
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
// Helper: atomically write a file (temp + rename) to avoid partial writes
// ============================================================================
function writeFileAtomic(filePath: string, content: string): void {
  const dir = dirname(filePath) || '.';
  let mode: number | undefined;
  try {
    mode = statSync(filePath).mode & 0o777;
  } catch {
    mode = undefined;
  }
  const tmp = join(
    dir,
    `.${basename(filePath)}.${process.pid}.${randomBytes(16).toString('hex')}.tmp`,
  );
  try {
    writeFileSync(tmp, content, {
      encoding: 'utf8',
      flag: 'wx',
      ...(mode !== undefined ? { mode } : {}),
    });
    renameSync(tmp, filePath);
  } catch (error) {
    try {
      unlinkSync(tmp);
    } catch {
      // ignore cleanup errors
    }
    throw error;
  }
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
    package?: string;
    activate(): Promise<T>;
    lock(transport?: string): Promise<ObjectLockHandle>;
    unlock(lockHandle: string): Promise<void>;
    saveMainSource?(
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
          const { object: obj, recovered } = await createWithReadbackRecovery(
            def,
            name,
            description,
            pkg,
            options.transport,
          );
          progress.done();

          if (options.json) {
            console.log(
              JSON.stringify(
                {
                  name: obj.name,
                  description: obj.description,
                  status: 'created',
                  ...(recovered ? { recovered: true } : {}),
                },
                null,
                2,
              ),
            );
          } else {
            console.log(`✅ ${def.label} ${obj.name} created`);
            console.log(`   Description: ${obj.description}`);
            if (recovered) {
              console.log(
                '   Confirmed by read-back after an ambiguous response',
              );
            }
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
      .option(
        '-o, --output <file>',
        'Write source to <file> in UTF-8 instead of stdout (avoids shell redirect encoding issues)',
      )
      .action(async function (
        this: Command,
        name: string,
        options: { json: boolean; output?: string },
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

          if (options.json && options.output !== undefined) {
            progress.done(`❌ --json and --output cannot be used together`);
            console.error(
              `❌ --json and --output cannot be used together (${def.label} ${obj.name})`,
            );
            process.exit(1);
          }

          if (options.json) {
            console.log(
              JSON.stringify(
                { name: obj.name, description: obj.description },
                null,
                2,
              ),
            );
          }

          if (options.output !== undefined) {
            if (!def.getSource) {
              progress.done(`❌ ${def.label} has no source to write`);
              console.error(
                `❌ ${def.label} ${obj.name} has no source; --output is not supported`,
              );
              process.exit(1);
            }
            progress.step('📄 Fetching source...');
            const source = await def.getSource(obj);
            progress.done();
            progress.step(`📝 Writing source to ${options.output}...`);
            writeFileAtomic(options.output, source);
            progress.done();
            console.log(
              `✅ Source written to ${options.output} (${source.length} chars, UTF-8)`,
            );
          } else if (!options.json) {
            if (def.getSource) {
              progress.step('📄 Fetching source...');
              const source = await def.getSource(obj);
              progress.done();
              process.stdout.write(source);
            } else {
              console.log(`📦 ${def.label}: ${obj.name}`);
              console.log(`   Description: ${obj.description}`);
            }
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

            if (!obj.saveMainSource) {
              throw new Error(`${def.label} does not support source writes`);
            }

            progress.step(`🔒 Locking ${name.toUpperCase()}...`);
            const lockHandle = await obj.lock(options.transport);
            progress.done();

            progress.step(`💾 Writing source to ${name.toUpperCase()}...`);
            await persistSourceWithReleasedLock(
              obj as T & SourceLifecycleObject<T>,
              source,
              {
                lockHandle,
                requestedTransport: options.transport,
                activate: options.activate,
                beforeActivate: () => {
                  progress.done();
                  progress.step(`⚡ Activating ${name.toUpperCase()}...`);
                },
              },
            );
            progress.done();

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
          const object = await def.get(n);
          await deleteWithReleasedLock(
            object,
            (deleteOptions) => def.delete(n, deleteOptions),
            options.transport,
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
