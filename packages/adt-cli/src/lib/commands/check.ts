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

import { Command } from 'commander';
import { getAdtClientV2 } from '../utils/adt-client-v2';
import { getObjectUri } from '@abapify/adk';
import { normalizeSearchResults } from '../utils/lock-helpers';

type CheckMessage = {
  uri?: string;
  type?: unknown;
  shortText?: string;
  category?: string;
  code?: string;
};

type CheckReport = {
  checkMessageList?: {
    checkMessage?: CheckMessage[];
  };
  reporter?: string;
  triggeringUri?: string;
  status?: string;
  statusText?: string;
};

/**
 * Resolve a single object name to its ADT URI via quickSearch
 */
async function resolveObjectUri(
  client: Awaited<ReturnType<typeof getAdtClientV2>>,
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
  client: Awaited<ReturnType<typeof getAdtClientV2>>,
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
 * Build a typed checkObjectList body for the checkruns endpoint.
 * The `checkrun` schema union is discriminated on the root key.
 */
function buildCheckObjectList(
  objects: Array<{ uri: string }>,
  version = 'active',
) {
  return {
    checkObjectList: {
      checkObject: objects.map((o) => ({
        uri: o.uri,
        version: version as
          | ''
          | 'active'
          | 'inactive'
          | 'workingArea'
          | 'new'
          | 'partlyActive'
          | 'activeWithInactiveVersion',
      })),
    },
  };
}

/**
 * Extract reports + aggregated severity from a typed checkRunReports response.
 */
function extractReports(response: unknown): {
  reports: CheckReport[];
  hasErrors: boolean;
  hasWarnings: boolean;
} {
  const root = (response ?? {}) as Record<string, unknown>;
  const reportsBlock = (root.checkRunReports ?? root) as Record<
    string,
    unknown
  >;

  const raw = reportsBlock.checkReport as unknown;
  const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];

  const reports: CheckReport[] = arr.map((r) => {
    const rec = r as Record<string, unknown>;
    const msgList = rec.checkMessageList as
      | { checkMessage?: CheckMessage | CheckMessage[] }
      | undefined;
    const messages = msgList?.checkMessage
      ? Array.isArray(msgList.checkMessage)
        ? msgList.checkMessage
        : [msgList.checkMessage]
      : undefined;
    return {
      reporter: rec.reporter as string | undefined,
      triggeringUri: rec.triggeringUri as string | undefined,
      status: rec.status as string | undefined,
      statusText: rec.statusText as string | undefined,
      checkMessageList: messages ? { checkMessage: messages } : undefined,
    };
  });

  let hasErrors = false;
  let hasWarnings = false;
  for (const report of reports) {
    for (const msg of report.checkMessageList?.checkMessage ?? []) {
      const sev = typeof msg.type === 'string' ? msg.type : msg.category;
      if (sev === 'E' || sev === 'A') hasErrors = true;
      if (sev === 'W') hasWarnings = true;
    }
  }

  return { reports, hasErrors, hasWarnings };
}

/**
 * Display check results
 */
function displayResults(reports: CheckReport[]): number {
  let totalMessages = 0;

  for (const report of reports) {
    const messages = report.checkMessageList?.checkMessage;
    if (!messages || messages.length === 0) {
      // No messages — clean
      if (report.triggeringUri) {
        const objName =
          report.triggeringUri.split('/').pop() ?? report.triggeringUri;
        console.log(`   ✅ ${objName}`);
      }
      continue;
    }

    const objName =
      report.triggeringUri?.split('/').pop() ?? report.reporter ?? 'unknown';

    for (const msg of messages) {
      totalMessages++;
      const sev = typeof msg.type === 'string' ? msg.type : msg.category;
      const icon =
        sev === 'E' || sev === 'A' ? '❌' : sev === 'W' ? '⚠️' : 'ℹ️';
      console.log(
        `   ${icon} ${objName}: ${msg.shortText ?? msg.code ?? 'unknown message'}`,
      );
    }
  }

  return totalMessages;
}

export const checkCommand = new Command('check')
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
  .option(
    '--version <version>',
    'Version to check: active, inactive, new',
    'new',
  )
  .option('--json', 'Output results as JSON')
  .action(
    async (
      objects: string[],
      options: {
        package?: string;
        transport?: string;
        type?: string;
        version?: string;
        json?: boolean;
      },
    ) => {
      try {
        const client = await getAdtClientV2();
        const checkObjects: Array<{ uri: string; type: string; name: string }> =
          [];

        // Mode 1: Package
        if (options.package) {
          console.log(`🔍 Resolving objects in package ${options.package}...`);
          const pkgObjects = await resolvePackageObjects(
            client,
            options.package,
          );
          if (pkgObjects.length === 0) {
            console.log(`⚠️ No objects found in package ${options.package}`);
            return;
          }
          checkObjects.push(...pkgObjects);
          console.log(`   Found ${checkObjects.length} object(s)`);
        }
        // Mode 2: Transport (fetch objects from transport tasks)
        else if (options.transport) {
          console.log(
            `🔍 Resolving objects in transport ${options.transport}...`,
          );
          const trResponse = await client.services.transports.get(
            options.transport,
          );
          // Walk the typed transport response to collect abap_object URIs.
          // Schema shape (see transportmanagment.types.ts): deeply nested
          // workbench/customizing → target → status → request[] → { task[]?,
          // abap_object[]? } with `abap_object.uri`.
          const collected = new Map<string, { type: string; name: string }>();
          const visit = (node: unknown): void => {
            if (!node || typeof node !== 'object') return;
            if (Array.isArray(node)) {
              for (const item of node) visit(item);
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
            for (const v of Object.values(rec)) visit(v);
          };
          visit(trResponse);

          for (const [uri, meta] of collected) {
            checkObjects.push({ uri, type: meta.type, name: meta.name });
          }
          if (checkObjects.length === 0) {
            console.log(
              `⚠️ No objects found in transport ${options.transport}`,
            );
            return;
          }
          console.log(`   Found ${checkObjects.length} object(s)`);
        }
        // Mode 3: Individual objects
        else if (objects.length > 0) {
          console.log(`🔍 Resolving ${objects.length} object(s)...`);
          for (const objectName of objects) {
            try {
              const resolved = await resolveObjectUri(
                client,
                objectName,
                options.type,
              );
              checkObjects.push(resolved);
              console.log(
                `   📄 ${resolved.name} (${resolved.type}) → ${resolved.uri}`,
              );
            } catch (err) {
              console.error(
                `   ❌ ${objectName}: ${err instanceof Error ? err.message : String(err)}`,
              );
            }
          }
        } else {
          console.error('❌ Specify object name(s), --package, or --transport');
          process.exit(1);
        }

        if (checkObjects.length === 0) {
          console.error('❌ No objects to check');
          process.exit(1);
        }

        // Build and POST checkrun request via typed contract
        const body = buildCheckObjectList(checkObjects, options.version);
        console.log(
          `\n🔄 Running syntax check on ${checkObjects.length} object(s)...`,
        );

        const response = await client.adt.checkruns.checkObjects.post(body);

        // Extract reports from typed response
        const { reports, hasErrors, hasWarnings } = extractReports(response);

        if (options.json) {
          console.log(JSON.stringify(reports, null, 2));
        } else {
          console.log(`\n📋 Check Results:`);
          const totalMessages = displayResults(reports);

          if (totalMessages === 0) {
            console.log(
              `\n✅ All ${checkObjects.length} object(s) passed syntax check`,
            );
          } else {
            console.log(`\n📊 ${totalMessages} message(s) found`);
            if (hasErrors) {
              console.log('❌ Errors detected');
              process.exit(1);
            }
            if (hasWarnings) {
              console.log('⚠️ Warnings detected');
            }
          }
        }
      } catch (error) {
        console.error(
          '❌ Check failed:',
          error instanceof Error ? error.message : String(error),
        );
        process.exit(1);
      }
    },
  );
