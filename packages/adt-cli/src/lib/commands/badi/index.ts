/**
 * BAdI commands — ENHO CRUD + metadata (`adt badi`) and unified read (`adt get badi`).
 *
 *   adt get badi MOCK_CTS_REQUEST_CHECK --json
 *   adt get badi MOCK_CTS_REQUEST_CHECK --implementations --json
 *   adt get badi ZE_MOCK_CLASSIC_BADI_IMPL --json
 *   adt get badi ZE_MOCK_BADI                 # ENHO/XHH source
 *
 * Mutating operations (create, write, delete) belong under deploy/checkin.
 */

import { AdkBadi } from '@abapify/adk';
import { Command } from 'commander';
import { getAdtClientV2, getCliContext } from '../../utils/adt-client-v2';
import { createProgressReporter } from '../../utils/progress-reporter';
import { createCliLogger } from '../../utils/logger-config';
import {
  BadiService,
  getBadiInfo,
  type BadiReadResult,
} from '../../services/badi';
import { buildObjectCrudCommands } from '../object/builder';

type BadiInfo = Awaited<ReturnType<typeof getBadiInfo>>;

/** Print the detailed implementation list (--implementations mode). */
function printBadiImplementations(
  impls: BadiInfo['badiImplementations'],
): void {
  console.log(`   BAdI implementations (${impls.length}):`);
  for (const impl of impls) {
    const flags = [
      impl.active ? 'active' : 'inactive',
      impl.default ? 'default' : '',
      impl.example ? 'example' : '',
    ]
      .filter(Boolean)
      .join(', ');
    console.log(`     • ${impl.name} [${flags}]`);
    console.log(`       Implementing class: ${impl.implementingClass}`);
    console.log(`       BAdI definition: ${impl.badiDefinition}`);
    console.log(`       Enhancement spot: ${impl.enhancementSpot}`);
    if (impl.shortText) {
      console.log(`       Description: ${impl.shortText}`);
    }
  }
}

/** Print BAdI metadata and implementations as human-readable text. */
function printBadiInfo(
  info: BadiInfo,
  options: { implementations?: boolean },
): void {
  console.log(`📦 BAdI / Enhancement Implementation: ${info.name}`);
  if (info.description) {
    console.log(`   Description: ${info.description}`);
  }
  if (info.package) {
    console.log(`   Package: ${info.package}`);
  }
  if (info.type) {
    console.log(`   Type: ${info.type}`);
  }
  if (info.technology) {
    console.log(`   Technology: ${info.technology}`);
  }
  console.log(`   Switch Supported: ${info.switchSupported ? 'Yes' : 'No'}`);

  if (info.badiImplementations.length === 0) {
    console.log('   BAdI implementations: none');
  } else if (options.implementations) {
    printBadiImplementations(info.badiImplementations);
  } else {
    console.log(
      `   BAdI implementations: ${info.badiImplementations.length} (use --implementations to list)`,
    );
  }
}

const badiCommand = buildObjectCrudCommands({
  label: 'BAdI / enhancement implementation',
  command: 'badi',

  get: (name) => AdkBadi.get(name),
  exists: (name) => AdkBadi.exists(name),
  create: (name, description, packageName, options) =>
    AdkBadi.create(name, description, packageName, options),
  delete: (name, options) => AdkBadi.delete(name, options),

  getSource: (obj) => obj.getSource(),
});

badiCommand
  .argument('[name]', 'BAdI / enhancement implementation name')
  .option(
    '--implementations',
    'List BAdI implementations carried by the enhancement implementation',
  )
  .option('--json', 'Output metadata and implementations as JSON')
  .action(
    async (
      name: string | undefined,
      options: { implementations?: boolean; json?: boolean },
    ) => {
      if (!name) {
        badiCommand.outputHelp();
        return;
      }

      const normalizedName = name.toUpperCase();

      try {
        const adtClient = await getAdtClientV2();
        const info = await getBadiInfo({
          client: adtClient,
          name: normalizedName,
        });

        if (options.json) {
          console.log(JSON.stringify(info, null, 2));
          return;
        }

        printBadiInfo(info, options);
      } catch (error) {
        console.error(
          '❌ Command failed:',
          error instanceof Error ? error.message : String(error),
        );
        process.exit(1);
      }
    },
  );

function printHumanResult(result: BadiReadResult): void {
  console.log(`Kind:        ${result.kind}`);
  console.log(`Name:        ${result.name}`);
  console.log(`Type:        ${result.type}`);
  if (result.description) console.log(`Description: ${result.description}`);
  if (result.packageName) console.log(`Package:     ${result.packageName}`);
  if (result.version) console.log(`Version:     ${result.version}`);

  if (result.implementations?.length) {
    console.log('');
    console.log(`Implementations (${result.implementations.length}):`);
    for (const impl of result.implementations) {
      const suffix = impl.description ? ` — ${impl.description}` : '';
      console.log(`  ${impl.name}${suffix}`);
    }
  }
}

export const getBadiCommand = new Command('badi')
  .argument('<name>', 'BAdI definition, implementation, or ENHO name')
  .description(
    'Get BAdI metadata; use --implementations on a definition to list classic implementations',
  )
  .option('--json', 'Output as JSON')
  .option(
    '--implementations',
    'When reading a classic definition (SXSD/XD), include its SXCI/XI implementations',
  )
  .action(async function (
    this: Command,
    name: string,
    options: { json?: boolean; implementations?: boolean },
  ) {
    const globalOpts = (this.optsWithGlobals?.() ?? {}) as {
      json?: boolean;
      implementations?: boolean;
      verbose?: boolean;
    };
    const opts = {
      json: options.json ?? globalOpts.json ?? false,
      implementations:
        options.implementations ?? globalOpts.implementations ?? false,
    };
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
      const client = await getAdtClientV2();
      const service = new BadiService(client);

      if (!opts.json) {
        progress.step(`🔍 Loading ${name.toUpperCase()}...`);
      }
      const result = await service.get({
        name,
        options: {
          includeSource: !opts.json,
          includeImplementations: opts.implementations,
        },
      });
      if (!opts.json) {
        progress.done();
      }

      if (opts.implementations && result.kind !== 'definition') {
        console.error(
          '❌ --implementations is only valid for classic BAdI definitions (SXSD/XD)',
        );
        process.exit(1);
      }

      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      if (result.source) {
        process.stdout.write(result.source);
        return;
      }

      printHumanResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!opts.json) {
        progress.done(`❌ ${message}`);
      }
      console.error(`❌ Get BAdI failed:`, message);
      process.exit(1);
    }
  });

export { badiCommand };
