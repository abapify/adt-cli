/**
 * adt abap run <file>|- - Execute ABAP code snippets
 *
 * Mirrors sapcli's `abap run` command.
 *
 * Workflow:
 *  1. Read ABAP source from file or stdin
 *  2. Wrap in IF_OO_ADT_CLASSRUN implementation skeleton (if not already)
 *  3. Create a temporary class in $TMP (or --package)
 *  4. Write the source
 *  5. Activate the class
 *  6. Execute via POST /sap/bc/adt/oo/classrun/<classname>
 *  7. Print output
 *  8. Delete the temporary class (always, even on failure)
 *
 * Usage:
 *   adt abap run snippet.abap
 *   echo "out->write( 'hello' )." | adt abap run -
 *   adt abap run snippet.abap --prefix zcl_my_runner
 *   adt abap run snippet.abap --package $TMP
 *
 * Note: The input can be a bare method body (just the statements) or a
 * full class definition. If it contains the class structure, it's used
 * as-is. Otherwise it's wrapped in the IF_OO_ADT_CLASSRUN template.
 */

import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { getAdtClientV2, getCliContext } from '../../utils/adt-client-v2';
import { createProgressReporter } from '../../utils/progress-reporter';
import { createCliLogger } from '../../utils/logger-config';
import { AdkClass } from '@abapify/adk';

function buildClassTemplate(className: string, body: string): string {
  const lower = className.toLowerCase();
  return `CLASS ${lower} DEFINITION PUBLIC FINAL CREATE PUBLIC.
  PUBLIC SECTION.
    INTERFACES if_oo_adt_classrun.
ENDCLASS.

CLASS ${lower} IMPLEMENTATION.
  METHOD if_oo_adt_classrun~main.
${body
  .split('\n')
  .map((l) => '    ' + l)
  .join('\n')}
  ENDMETHOD.
ENDCLASS.`;
}

function buildClassSource(rawSource: string, className: string): string {
  const upper = rawSource.trimStart().toUpperCase();
  // Already a full class definition — use as-is (user is responsible for class name)
  if (upper.startsWith('CLASS ')) {
    return rawSource;
  }
  // Bare method body — wrap in classrun template with the correct class name
  return buildClassTemplate(className, rawSource);
}

async function readSource(fileArg: string): Promise<string> {
  if (fileArg === '-') {
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

export const abapRunCommand = new Command('run')
  .description('Execute ABAP code from a file or stdin')
  .argument('[file]', 'Source file path (use - for stdin)', '-')
  .option('--prefix <name>', 'Temp class name prefix', 'zcl_adtcli_run')
  .option('--package <pkg>', 'Package for the temp class', '$TMP')
  .option('--transport <corrnr>', 'Transport request (not needed for $TMP)')
  .action(async function (
    this: Command,
    file: string,
    options: { prefix: string; package: string; transport?: string },
  ) {
    const globalOpts = this.optsWithGlobals?.() ?? {};
    const ctx = getCliContext();
    const verboseFlag = globalOpts.verbose ?? ctx.verbose ?? false;
    const compact = !verboseFlag;
    const logger =
      (this as any).logger ??
      ctx.logger ??
      createCliLogger({ verbose: verboseFlag });
    const progress = createProgressReporter({ compact, logger });

    const className = options.prefix.toUpperCase();

    try {
      const client = await getAdtClientV2();

      // Step 1: Read source
      progress.step(`📄 Reading source from ${file}...`);
      const rawSource = await readSource(file);
      progress.done();

      const classSource = buildClassSource(rawSource, className);

      // Step 2: Create temp class
      progress.step(`📝 Creating temp class ${className}...`);
      let cls: AdkClass;
      try {
        cls = await AdkClass.create(
          className,
          'Temporary ADT CLI runner class',
          options.package,
          options.transport ? { transport: options.transport } : undefined,
        );
      } catch (err) {
        // Class may already exist from a previous failed run — try to get it
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('already exists') || msg.includes('422')) {
          cls = await AdkClass.get(className);
        } else {
          throw err;
        }
      }
      progress.done();

      let output = '';
      let runError: Error | undefined;

      try {
        // Step 3: Lock + write source
        progress.step(`🔒 Locking ${className}...`);
        const lockHandle = await cls.lock(options.transport);
        progress.done();

        try {
          progress.step(`💾 Writing source...`);
          await cls.saveMainSource(classSource, {
            lockHandle: lockHandle.handle,
            transport: options.transport,
          });
          progress.done();
        } finally {
          await cls.unlock(lockHandle.handle);
        }

        // Step 4: Activate
        progress.step(`⚡ Activating ${className}...`);
        await cls.activate();
        progress.done();

        // Step 5: Execute
        progress.step(`🚀 Executing ${className}...`);
        const result = await client.adt.oo.classrun.post(className);
        output = typeof result === 'string' ? result : String(result ?? '');
        progress.done();
      } catch (err) {
        runError = err instanceof Error ? err : new Error(String(err));
        progress.done(`❌ ${runError.message}`);
      } finally {
        // Step 6: Always delete the temp class
        progress.step(`🗑️  Cleaning up ${className}...`);
        try {
          await AdkClass.delete(
            className,
            options.transport ? { transport: options.transport } : undefined,
          );
          progress.done();
        } catch {
          progress.done(`⚠️  Cleanup failed (class ${className} may remain)`);
        }
      }

      if (runError) {
        console.error('❌ Execution failed:', runError.message);
        process.exit(1);
      }

      // Print output
      if (output) {
        process.stdout.write(output.endsWith('\n') ? output : output + '\n');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      progress.done(`❌ ${message}`);
      console.error('❌ abap run failed:', message);
      process.exit(1);
    }
  });
