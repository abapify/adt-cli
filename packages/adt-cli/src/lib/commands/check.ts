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
import { XMLParser } from 'fast-xml-parser';
import { getAdtClientV2 } from '../utils/adt-client-v2';
import { getObjectUri } from '@abapify/adk';

type SearchObject = {
  name?: string;
  type?: string;
  uri?: string;
  description?: string;
  packageName?: string;
};

type CheckMessage = {
  uri?: string;
  type?: string;
  shortText?: string;
  category?: string;
  code?: string;
};

type CheckReport = {
  checkMessageList?: {
    checkMessage?: CheckMessage | CheckMessage[];
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

  const resultsAny = searchResult as Record<string, unknown>;
  let rawObjects: SearchObject | SearchObject[] | undefined;
  if ('objectReferences' in resultsAny && resultsAny.objectReferences) {
    const refs = resultsAny.objectReferences as {
      objectReference?: SearchObject | SearchObject[];
    };
    rawObjects = refs.objectReference;
  } else if ('mainObject' in resultsAny && resultsAny.mainObject) {
    const main = resultsAny.mainObject as {
      objectReference?: SearchObject | SearchObject[];
    };
    rawObjects = main.objectReference;
  }

  const objects: SearchObject[] = rawObjects
    ? Array.isArray(rawObjects)
      ? rawObjects
      : [rawObjects]
    : [];

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

  const resultsAny = searchResult as Record<string, unknown>;
  let rawObjects: SearchObject | SearchObject[] | undefined;
  if ('objectReferences' in resultsAny && resultsAny.objectReferences) {
    const refs = resultsAny.objectReferences as {
      objectReference?: SearchObject | SearchObject[];
    };
    rawObjects = refs.objectReference;
  } else if ('mainObject' in resultsAny && resultsAny.mainObject) {
    const main = resultsAny.mainObject as {
      objectReference?: SearchObject | SearchObject[];
    };
    rawObjects = main.objectReference;
  }

  const objects: SearchObject[] = rawObjects
    ? Array.isArray(rawObjects)
      ? rawObjects
      : [rawObjects]
    : [];

  return objects
    .filter((o) => o.uri)
    .map((o) => ({
      uri: o.uri!,
      type: o.type ?? 'UNKNOWN',
      name: o.name ?? '',
    }));
}

/**
 * Build checkObjectList XML for the checkruns endpoint
 */
function buildCheckObjectListXml(
  objects: Array<{ uri: string }>,
  version: string = 'active',
): string {
  const checkObjects = objects
    .map(
      (o) =>
        `  <chkrun:checkObject adtcore:uri="${o.uri}" chkrun:version="${version}"/>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun" xmlns:adtcore="http://www.sap.com/adt/core">
${checkObjects}
</chkrun:checkObjectList>`;
}

/**
 * Parse XML response from checkruns endpoint
 */
function parseCheckRunXml(xmlOrParsed: unknown): {
  reports: CheckReport[];
  hasErrors: boolean;
  hasWarnings: boolean;
} {
  let data: Record<string, unknown>;

  if (typeof xmlOrParsed === 'string') {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      removeNSPrefix: true,
    });
    data = parser.parse(xmlOrParsed) as Record<string, unknown>;
  } else {
    data = xmlOrParsed as Record<string, unknown>;
  }

  let reports: CheckReport[] = [];
  let hasErrors = false;
  let hasWarnings = false;

  // Navigate into checkRunReports > checkReport
  const reportsRoot = (data.checkRunReports ?? data) as Record<string, unknown>;
  const rawReports = reportsRoot.checkReport;
  if (rawReports) {
    const arr = Array.isArray(rawReports) ? rawReports : [rawReports];
    reports = arr.map((r: Record<string, unknown>) => ({
      reporter: (r.reporter as string) ?? undefined,
      triggeringUri: (r.triggeringUri as string) ?? undefined,
      status: (r.status as string) ?? undefined,
      statusText: (r.statusText as string) ?? undefined,
      checkMessageList: r.checkMessageList as CheckReport['checkMessageList'],
    }));
  }

  for (const report of reports) {
    const msgList = report.checkMessageList;
    if (!msgList?.checkMessage) continue;

    const messages = Array.isArray(msgList.checkMessage)
      ? msgList.checkMessage
      : [msgList.checkMessage];

    for (const msg of messages) {
      const sev = msg.type ?? msg.category;
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
    const msgList = report.checkMessageList;
    if (!msgList?.checkMessage) {
      // No messages — clean
      if (report.triggeringUri) {
        const objName =
          report.triggeringUri.split('/').pop() ?? report.triggeringUri;
        console.log(`   ✅ ${objName}`);
      }
      continue;
    }

    const messages = Array.isArray(msgList.checkMessage)
      ? msgList.checkMessage
      : [msgList.checkMessage];

    if (messages.length === 0) continue;

    const objName =
      report.triggeringUri?.split('/').pop() ?? report.reporter ?? 'unknown';

    for (const msg of messages) {
      totalMessages++;
      const sev = msg.type ?? msg.category;
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
          const trResult = await client.fetch(
            `/sap/bc/adt/cts/transportrequests/${options.transport}`,
            {
              method: 'GET',
              headers: {
                Accept: 'application/vnd.sap.adt.transportrequests.v1+xml',
              },
            },
          );
          // Parse transport objects from response
          const trData = trResult as Record<string, unknown>;
          // Transport response contains objects — extract URIs
          // For now, search by transport number as a workaround
          console.log(`⚠️ Transport object extraction: parsing response...`);
          // Attempt to find object references in the transport data
          const trJson = JSON.stringify(trData);
          const uriMatches = trJson.match(/\/sap\/bc\/adt\/[^"]+/g);
          if (uriMatches && uriMatches.length > 0) {
            const uniqueUris = [...new Set(uriMatches)].filter(
              (u) => !u.includes('transportrequests') && !u.includes('cts/'),
            );
            for (const uri of uniqueUris) {
              const name = uri.split('/').pop() ?? '';
              checkObjects.push({ uri, type: 'UNKNOWN', name });
            }
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

        // Build and POST checkrun request
        const xml = buildCheckObjectListXml(checkObjects, options.version);
        console.log(
          `\n🔄 Running syntax check on ${checkObjects.length} object(s)...`,
        );

        const response = await client.fetch('/sap/bc/adt/checkruns', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/vnd.sap.adt.checkobjects+xml',
            Accept: 'application/vnd.sap.adt.checkmessages+xml',
          },
          body: xml,
        });

        // Parse and display results
        const { reports, hasErrors, hasWarnings } = parseCheckRunXml(response);

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
