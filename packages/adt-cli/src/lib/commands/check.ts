/**
 * Check Command
 *
 * Run SAP syntax check (checkruns) on ABAP objects.
 * Supports checking individual objects, all objects in a package,
 * or all objects in a transport request.
 *
 * This is NOT ATC — it's the basic syntax/check run endpoint
 * at /sap/bc/adt/checkruns.
 *
 * Usage:
 *   adt check ZAGE_CHAR_WITH_LENGTH           # Single object (auto-resolves URI)
 *   adt check --package ZABAPGIT_EXAMPLES     # All objects in package
 *   adt check --transport DEVK900001          # All objects in transport
 */

import { Command, Option } from 'commander';
import type { AdtClient } from '@abapify/adt-client';
import { getAdtClientV2 } from '../utils/adt-client-v2';
import { getObjectUri } from '@abapify/adk';
import { normalizeSearchResults } from '../utils/lock-helpers';
import {
  CheckService,
  DEFAULT_CHECK_SOURCE_VERSION,
  type CheckReport,
  type CheckSourceVersion,
} from '../services/check/service';

/**
 * Resolve a single object name to its ADT URI via quickSearch
 */
async function resolveObjectUri(
  client: AdtClient,
  objectName: string,
  typeHint?: string,
): Promise<{ uri: string; type: string; name: string }> {
  // Type hint → construct URI from ADK registry
  if (typeHint) {
    const uri = getObjectUri(typeHint, objectName);
    if (uri) {
      return {
        uri,
        type: typeHint.toUpperCase(),
        name: objectName.toUpperCase(),
      };
    }
  }

  // Search-based resolution
  const searchResult =
    await client.adt.repository.informationsystem.search.quickSearch({
      query: objectName,
      maxResults: 10,
    });

  const objects = normalizeSearchResults(
    searchResult as Record<string, unknown>,
  );

  // Find exact match
  const match = objects.find(
    (o) => o.name?.toUpperCase() === objectName.toUpperCase(),
  );

  if (!match?.uri) {
    throw new Error(`Object '${objectName}' not found`);
  }

  return {
    uri: match.uri,
    type: match.type ?? 'UNKNOWN',
    name: match.name ?? objectName,
  };
}

/**
 * Search objects by package using quickSearch with package filter
 */
async function resolvePackageObjects(
  client: AdtClient,
  packageName: string,
): Promise<Array<{ uri: string; type: string; name: string }>> {
  const searchResult =
    await client.adt.repository.informationsystem.search.quickSearch({
      query: `*`,
      maxResults: 200,
      objectType: undefined as unknown as string,
      packageName,
    });

  const objects = normalizeSearchResults(
    searchResult as Record<string, unknown>,
  );

  return objects
    .filter((o) => o.uri)
    .map((o) => ({
      uri: o.uri!,
      type: o.type ?? 'UNKNOWN',
      name: o.name ?? '',
    }));
}

/**
 * Display check results
 */
function displayResults(
  reports: CheckReport[],
  writeLine: (line: string) => void,
): number {
  let totalMessages = 0;

  for (const report of reports) {
    const messages = report.checkMessageList?.checkMessage;
    if (!messages || messages.length === 0) {
      // No messages — clean
      if (report.triggeringUri) {
        const objName =
          report.triggeringUri.split('/').pop() ?? report.triggeringUri;
        writeLine(`   ✅ ${objName}`);
      }
      continue;
    }

    const objName =
      report.triggeringUri?.split('/').pop() ?? report.reporter ?? 'unknown';

    for (const msg of messages) {
      totalMessages++;
      const sev = typeof msg.type === 'string' ? msg.type : msg.category;
      let icon = 'ℹ️';
      if (sev === 'E' || sev === 'A') icon = '❌';
      else if (sev === 'W') icon = '⚠️';
      writeLine(
        `   ${icon} ${objName}: ${msg.shortText ?? msg.code ?? 'unknown message'}`,
      );
    }
  }

  return totalMessages;
}

type CheckServiceLike = Pick<CheckService, 'run'>;

type CheckObjectRef = { uri: string; type: string; name: string };

type CheckCommandOptions = {
  package?: string;
  transport?: string;
  type?: string;
  sourceVersion?: CheckSourceVersion;
  json?: boolean;
};

export interface CheckCommandDependencies {
  getClient(): Promise<AdtClient>;
  createService(client: AdtClient): CheckServiceLike;
  writeLine(line: string): void;
  writeError(line: string): void;
  setExitCode(code: number): void;
}

const defaultDependencies: CheckCommandDependencies = {
  getClient: getAdtClientV2,
  createService: (client) => new CheckService(client),
  writeLine: (line) => console.log(line),
  writeError: (line) => console.error(line),
  setExitCode: (code) => {
    process.exit(code);
  },
};

/**
 * Collect abap_object entries from a typed transport response.
 * Schema shape (see transportmanagment.types.ts): deeply nested
 * workbench/customizing → target → status → request[] → { task[]?,
 * abap_object[]? } with `abap_object.uri`.
 */
function collectTransportAbapObjects(
  node: unknown,
  collected: Map<string, { type: string; name: string }>,
): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) collectTransportAbapObjects(item, collected);
    return;
  }
  const rec = node as Record<string, unknown>;
  const uri = rec.uri;
  const type = rec.type;
  const name = rec.name;
  // abap_object entries have pgmid/type/name/uri
  if (
    typeof uri === 'string' &&
    typeof rec.pgmid === 'string' &&
    typeof name === 'string'
  ) {
    collected.set(uri, {
      type: typeof type === 'string' ? type : 'UNKNOWN',
      name,
    });
  }
  for (const v of Object.values(rec)) collectTransportAbapObjects(v, collected);
}

// Mode 1: resolve all objects in a package.
// Returns false (after reporting + setting the exit code) when empty.
async function collectPackageTargets(
  client: AdtClient,
  packageName: string,
  options: CheckCommandOptions,
  deps: CheckCommandDependencies,
  checkObjects: CheckObjectRef[],
): Promise<boolean> {
  if (!options.json) {
    deps.writeLine(`🔍 Resolving objects in package ${packageName}...`);
  }
  const pkgObjects = await resolvePackageObjects(client, packageName);
  if (pkgObjects.length === 0) {
    deps.writeError(`⚠️ No objects found in package ${packageName}`);
    deps.setExitCode(1);
    return false;
  }
  checkObjects.push(...pkgObjects);
  if (!options.json) {
    deps.writeLine(`   Found ${checkObjects.length} object(s)`);
  }
  return true;
}

// Mode 2: fetch objects from transport tasks.
// Returns false (after reporting + setting the exit code) when empty.
async function collectTransportTargets(
  client: AdtClient,
  transport: string,
  options: CheckCommandOptions,
  deps: CheckCommandDependencies,
  checkObjects: CheckObjectRef[],
): Promise<boolean> {
  if (!options.json) {
    deps.writeLine(`🔍 Resolving objects in transport ${transport}...`);
  }
  const trResponse = await client.services.transports.get(transport);
  const collected = new Map<string, { type: string; name: string }>();
  collectTransportAbapObjects(trResponse, collected);
  for (const [uri, meta] of collected) {
    checkObjects.push({ uri, type: meta.type, name: meta.name });
  }
  if (checkObjects.length === 0) {
    deps.writeError(`⚠️ No objects found in transport ${transport}`);
    deps.setExitCode(1);
    return false;
  }
  if (!options.json) {
    deps.writeLine(`   Found ${checkObjects.length} object(s)`);
  }
  return true;
}

// Mode 3: resolve individual object names. Resolve failures set the exit
// code but do not abort — successfully resolved objects are still checked.
async function collectNamedTargets(
  client: AdtClient,
  objects: string[],
  options: CheckCommandOptions,
  deps: CheckCommandDependencies,
  checkObjects: CheckObjectRef[],
): Promise<boolean> {
  if (!options.json) {
    deps.writeLine(`🔍 Resolving ${objects.length} object(s)...`);
  }
  let hasResolveErrors = false;
  for (const objectName of objects) {
    try {
      const resolved = await resolveObjectUri(client, objectName, options.type);
      checkObjects.push(resolved);
      if (!options.json) {
        deps.writeLine(
          `   📄 ${resolved.name} (${resolved.type}) → ${resolved.uri}`,
        );
      }
    } catch (err) {
      hasResolveErrors = true;
      deps.writeError(
        `   ❌ ${objectName}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  if (hasResolveErrors) {
    deps.setExitCode(1);
  }
  return true;
}

/** Print check results (JSON or human-readable) and set the exit code. */
function outputCheckResults(
  reports: CheckReport[],
  result: { hasErrors: boolean; hasWarnings: boolean },
  checkCount: number,
  options: CheckCommandOptions,
  deps: CheckCommandDependencies,
): void {
  if (options.json) {
    deps.writeLine(JSON.stringify(reports, null, 2));
    if (result.hasErrors) deps.setExitCode(1);
    return;
  }

  deps.writeLine(`\n📋 Check Results:`);
  const totalMessages = displayResults(reports, deps.writeLine);

  if (totalMessages === 0) {
    deps.writeLine(`\n✅ All ${checkCount} object(s) passed syntax check`);
    return;
  }

  deps.writeLine(`\n📊 ${totalMessages} message(s) found`);
  if (result.hasErrors) {
    deps.writeLine('❌ Errors detected');
    deps.setExitCode(1);
  }
  if (result.hasWarnings) {
    deps.writeLine('⚠️ Warnings detected');
  }
}

export function createCheckCommand(
  overrides: Partial<CheckCommandDependencies> = {},
): Command {
  const dependencies = { ...defaultDependencies, ...overrides };

  return new Command('check')
    .description('Run syntax check (checkruns) on ABAP objects')
    .argument('[objects...]', 'Object name(s) to check')
    .option('-p, --package <package>', 'Check all objects in a package')
    .option(
      '-t, --transport <transport>',
      'Check all objects in a transport request',
    )
    .option(
      '--type <type>',
      'Object type hint for resolving URIs (e.g., CLAS, DOMA)',
    )
    .addOption(
      new Option('--source-version <version>', 'Source version to check')
        .choices([
          'active',
          'inactive',
          'workingArea',
          'new',
          'partlyActive',
          'activeWithInactiveVersion',
        ])
        .default(DEFAULT_CHECK_SOURCE_VERSION),
    )
    .option('--json', 'Output results as JSON')
    .action(
      async (
        objects: string[],
        options: {
          package?: string;
          transport?: string;
          type?: string;
          sourceVersion?: CheckSourceVersion;
          json?: boolean;
        },
      ) => {
        try {
          const client = await dependencies.getClient();
          const checkObjects: CheckObjectRef[] = [];

          // Mode 1: Package / Mode 2: Transport / Mode 3: Individual objects
          let resolved = false;
          if (options.package) {
            resolved = await collectPackageTargets(
              client,
              options.package,
              options,
              dependencies,
              checkObjects,
            );
          } else if (options.transport) {
            resolved = await collectTransportTargets(
              client,
              options.transport,
              options,
              dependencies,
              checkObjects,
            );
          } else if (objects.length > 0) {
            resolved = await collectNamedTargets(
              client,
              objects,
              options,
              dependencies,
              checkObjects,
            );
          } else {
            dependencies.writeError(
              '❌ Specify object name(s), --package, or --transport',
            );
            dependencies.setExitCode(1);
          }
          if (!resolved) return;

          if (checkObjects.length === 0) {
            dependencies.writeError('❌ No objects to check');
            dependencies.setExitCode(1);
            return;
          }

          if (!options.json) {
            dependencies.writeLine(
              `\n🔄 Running syntax check on ${checkObjects.length} object(s)...`,
            );
          }

          const { reports, hasErrors, hasWarnings } = await dependencies
            .createService(client)
            .run({
              objects: checkObjects.map(({ uri }) => ({ uri })),
              sourceVersion: options.sourceVersion,
            });

          outputCheckResults(
            reports,
            { hasErrors, hasWarnings },
            checkObjects.length,
            options,
            dependencies,
          );
        } catch (error) {
          dependencies.writeError(
            `❌ Check failed: ${error instanceof Error ? error.message : String(error)}`,
          );
          dependencies.setExitCode(1);
        }
      },
    );
}

export const checkCommand = createCheckCommand();
