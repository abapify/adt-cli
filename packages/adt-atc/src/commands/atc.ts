/**
 * ATC Command Plugin
 *
 * CLI-agnostic command for running ABAP Test Cockpit checks.
 * Uses the CliContext.getAdtClient() factory for API access.
 */

import type { CliCommandPlugin, CliContext } from '@abapify/adt-plugin';
import chalk from 'chalk';
import { outputSarifReport, outputGitLabCodeQuality } from '../formatters';
import {
  fetchCheckCategoryIndex,
  enrichResultWithCategories,
} from '../check-categories';
import { resolveCategoriesViaDocumentation } from '../documentation-bridge';
import type { AtcResult, AtcFinding, OutputFormat } from '../types';

// Client type - the plugin receives a typed client from context
// The client.adt.atc namespace provides all ATC operations
interface AdtClient {
  adt: {
    atc: {
      customizing: {
        get: () => Promise<{
          customizing: {
            properties: { property?: Array<{ name: string; value?: string }> };
          };
        }>;
      };
      worklists: {
        create: (params: {
          checkVariant: string;
        }) => Promise<
          | string
          | { worklistRun?: { worklistId: string }; worklist?: { id: string } }
        >;
        get: (
          id: string,
          params: { includeExemptedFindings: string },
        ) => Promise<WorklistResponse>;
      };
      checkvariants: {
        formtemplate: (params?: {
          chkvName?: string;
        }) => Promise<import('../check-categories').FormTemplateDocument>;
      };
      runs: {
        post: (
          params: { worklistId: string },
          body: {
            run: {
              maximumVerdicts: number;
              objectSets: {
                objectSet: Array<{
                  kind: string;
                  objectReferences: {
                    objectReference: Array<{ uri: string }>;
                  };
                }>;
              };
            };
          },
        ) => Promise<void>;
      };
    };
  };
  /**
   * Bounded documentation text read (the real ADT client provides it).
   * Optional: without it the documentation category bridge is skipped.
   */
  readTextBounded?: (
    uri: string,
    maxBytes: number,
    options?: { headers?: Record<string, string> },
  ) => Promise<string>;
}

// Worklist response type
interface WorklistResponse {
  worklist?: {
    id: string;
    timestamp: string;
    objects: {
      object?: Array<{
        uri?: string;
        type?: string;
        name?: string;
        findings: {
          finding?: Array<{
            uri?: string;
            location?: string;
            priority?: string;
            checkId?: string;
            checkTitle?: string;
            messageId?: string;
            messageTitle?: string;
            /** Documentation link: the page that names the check class. */
            link?: Array<{ href?: string; rel?: string }>;
          }>;
        };
      }>;
    };
  };
  worklistRun?: { worklistId: string };
}

/**
 * Create OSC 8 hyperlink for terminal
 */
function hyperlink(text: string, url: string): string {
  const OSC = '\x1b]';
  const BEL = '\x07';
  const SEP = ';';
  return `${OSC}8${SEP}${SEP}${url}${BEL}${text}${OSC}8${SEP}${SEP}${BEL}`;
}

/**
 * Create ADT Eclipse link
 */
function adtLink(name: string, uri: string, systemName?: string): string {
  if (!systemName || !name || !uri) {
    return name ? chalk.cyan(name) : '';
  }
  const path = uri.startsWith('/sap/bc/adt') ? uri : `/sap/bc/adt${uri}`;
  const url = `adt://${systemName}${path}`;
  return hyperlink(chalk.cyan(name), url);
}

/**
 * The trusted documentation link of one worklist finding.
 *
 * Live shape (2026-10-22): <atom:link rel="http://www.sap.com/adt/
 * relations/documentation" href="/sap/bc/adt/documentation/atc/documents/
 * itemid/{guid}/index/{n}"/> inside the atcfinding:finding element.
 */
function documentationUriFromFinding(
  finding: NonNullable<
    NonNullable<
      NonNullable<WorklistResponse['worklist']>['objects']['object']
    >[number]['findings']['finding']
  >[number],
): string | undefined {
  return finding.link?.find(
    (link) => link.rel === 'http://www.sap.com/adt/relations/documentation',
  )?.href;
}

/**
 * Convert worklist response to AtcResult
 */
function convertWorklistToResult(
  worklistResponse: WorklistResponse,
  checkVariant: string,
): AtcResult {
  const findings: AtcFinding[] = [];

  if (worklistResponse.worklist) {
    const objects = worklistResponse.worklist.objects.object || [];

    for (const obj of objects) {
      const objFindings = obj.findings.finding || [];
      for (const finding of objFindings) {
        findings.push({
          checkId: finding.checkId || '',
          checkTitle: finding.checkTitle || '',
          messageId: finding.messageId || '',
          priority: Number.parseInt(finding.priority || '3', 10),
          messageText: finding.messageTitle || '',
          objectUri: obj.uri || '',
          objectType: obj.type || '',
          objectName: obj.name || '',
          location: finding.location,
          findingUri: finding.uri,
          documentationUri: documentationUriFromFinding(finding),
        });
      }
    }
  }

  const errorCount = findings.filter((f) => f.priority === 1).length;
  const warningCount = findings.filter((f) => f.priority === 2).length;
  const infoCount = findings.filter((f) => f.priority >= 3).length;

  return {
    checkVariant,
    totalFindings: findings.length,
    errorCount,
    warningCount,
    infoCount,
    findings,
  };
}

/**
 * Display ATC results in console
 */
function displayAtcResults(result: AtcResult, systemName?: string): void {
  if (result.totalFindings === 0) {
    console.log(`\n✅ ATC check passed - No issues found!`);
    console.log(`   🎯 Variant: ${result.checkVariant}`);
    return;
  }

  console.log(`\n📊 ATC Results Summary:`);
  console.log(`   🎯 Variant: ${result.checkVariant}`);
  if (result.errorCount > 0) console.log(`   ❌ Errors: ${result.errorCount}`);
  if (result.warningCount > 0)
    console.log(`   ⚠️ Warnings: ${result.warningCount}`);
  if (result.infoCount > 0) console.log(`   ℹ️ Info: ${result.infoCount}`);
  console.log(`   📋 Total Issues: ${result.totalFindings}`);

  if (result.findings && result.findings.length > 0) {
    console.log(`\n📄 Findings:`);
    result.findings.slice(0, 5).forEach((finding) => {
      const priorityIcon =
        finding.priority === 1 ? '❌' : finding.priority === 2 ? '⚠️' : 'ℹ️';
      const objectLink = finding.location
        ? adtLink(finding.objectName, finding.location, systemName)
        : finding.objectName;
      console.log(
        `   ${priorityIcon} ${finding.checkTitle || finding.checkId}`,
      );
      console.log(`      ${finding.messageText}`);
      console.log(`      Object: ${objectLink} (${finding.objectType})`);
    });

    if (result.findings.length > 5) {
      console.log(`   ... (${result.findings.length - 5} more findings)`);
    }
  }

  console.log(`\n💡 Use --debug for detailed results`);
}

/**
 * ATC Command Plugin
 */
export const atcCommand: CliCommandPlugin = {
  name: 'atc',
  description: 'Run ABAP Test Cockpit (ATC) checks',

  options: [
    { flags: '-p, --package <package>', description: 'Run ATC on package' },
    {
      flags: '-o, --object <uri>',
      description:
        'Run ATC on specific object (e.g., /sap/bc/adt/oo/classes/zcl_my_class)',
    },
    {
      flags: '-t, --transport <transport>',
      description: 'Run ATC on transport request (e.g., TRLK942970)',
    },
    {
      flags: '-f, --from-file <file>',
      description: 'Run ATC on objects listed in file (one URI per line)',
    },
    {
      flags: '--variant <variant>',
      description: 'ATC check variant (default: from system customizing)',
    },
    {
      flags: '--max-results <number>',
      description: 'Maximum number of results',
      default: '100',
    },
    {
      flags: '--format <format>',
      description: 'Output format: console, json, gitlab, sarif',
      default: 'console',
    },
    {
      flags: '--output <file>',
      description: 'Output file (required for gitlab/sarif format)',
    },
    {
      flags: '--resolver <name>',
      description:
        'Finding resolver plugin for path/line resolution (e.g., abapgit)',
    },
  ],

  async execute(args, ctx: CliContext) {
    const options = args as {
      package?: string;
      object?: string;
      transport?: string;
      fromFile?: string;
      variant?: string;
      maxResults?: string;
      format?: OutputFormat;
      output?: string;
      resolver?: string;
    };

    // Validate mutually exclusive options
    const targetCount = [
      options.package,
      options.object,
      options.transport,
      options.fromFile,
    ].filter(Boolean).length;

    if (targetCount === 0) {
      ctx.logger.error(
        '❌ One of --package, --object, --transport, or --from-file is required',
      );
      process.exit(1);
    }

    if (targetCount > 1) {
      ctx.logger.error(
        '❌ Only one of --package, --object, --transport, or --from-file can be specified',
      );
      process.exit(1);
    }

    // Validate output file for gitlab/sarif formats
    if (
      (options.format === 'gitlab' || options.format === 'sarif') &&
      !options.output
    ) {
      ctx.logger.error(`❌ --output is required for ${options.format} format`);
      process.exit(1);
    }

    // Get ADT client from context
    if (!ctx.getAdtClient) {
      ctx.logger.error(
        '❌ ADT client not available. This command requires authentication.',
      );
      ctx.logger.error('   Run: adt auth login');
      process.exit(1);
    }

    const client = (await ctx.getAdtClient()) as AdtClient;

    ctx.logger.info('🔍 Running ABAP Test Cockpit checks...');

    // Determine target(s)
    let targetUris: string[];
    let targetName: string;

    if (options.fromFile) {
      // Read URIs from file
      const { readFileSync } = await import('fs');
      const fileContent = readFileSync(options.fromFile, 'utf-8');
      targetUris = fileContent
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#')); // Skip empty lines and comments

      if (targetUris.length === 0) {
        ctx.logger.error(`❌ No objects found in ${options.fromFile}`);
        process.exit(1);
      }
      targetName = `${targetUris.length} objects from ${options.fromFile}`;
      ctx.logger.info(`📄 Target: ${targetName}`);
    } else if (options.transport) {
      targetUris = [`/sap/bc/adt/cts/transportrequests/${options.transport}`];
      targetName = `Transport ${options.transport}`;
      ctx.logger.info(`🚚 Target: ${targetName}`);
    } else if (options.package) {
      targetUris = [`/sap/bc/adt/packages/${options.package.toUpperCase()}`];
      targetName = `Package ${options.package.toUpperCase()}`;
      ctx.logger.info(`📦 Target: ${targetName}`);
    } else {
      targetUris = [options.object!];
      targetName = options.object!;
      ctx.logger.info(`📄 Target: ${targetName}`);
    }

    // Step 1: Get ATC customizing to find default check variant
    ctx.logger.info('📋 Reading ATC customizing...');
    const customizing = await client.adt.atc.customizing.get();

    // Find systemCheckVariant in properties
    let checkVariant = options.variant;
    if (!checkVariant) {
      const variantProp = customizing.customizing.properties.property?.find(
        (p) => p.name === 'systemCheckVariant',
      );
      if (variantProp?.value) {
        checkVariant = variantProp.value;
      } else {
        checkVariant = 'DEFAULT';
      }
    }
    ctx.logger.info(`🎯 Check variant: ${checkVariant}`);

    // Step 2: Create worklist (just with checkVariant, no objects)
    ctx.logger.info('📋 Creating ATC worklist...');
    const worklistCreateResponse = await client.adt.atc.worklists.create({
      checkVariant,
    });

    // Extract worklist ID - SAP can return plain string or object
    let worklistId: string;
    if (typeof worklistCreateResponse === 'string') {
      // Plain string response - extract ID from XML or use as-is
      const idMatch = worklistCreateResponse.match(/id="([^"]+)"/);
      worklistId = idMatch ? idMatch[1] : worklistCreateResponse.trim();
    } else if (
      'worklist' in worklistCreateResponse &&
      worklistCreateResponse.worklist?.id
    ) {
      worklistId = worklistCreateResponse.worklist.id;
    } else if (
      'worklistRun' in worklistCreateResponse &&
      worklistCreateResponse.worklistRun?.worklistId
    ) {
      worklistId = worklistCreateResponse.worklistRun.worklistId;
    } else {
      ctx.logger.error('❌ Failed to get worklist ID from response');
      process.exit(1);
    }
    ctx.logger.info(`📋 Worklist created: ${worklistId}`);

    // Step 3: Run ATC checks with objects
    ctx.logger.info('⏳ Running ATC analysis...');
    const maxResults = Number.parseInt(options.maxResults || '100', 10);
    const runData = {
      run: {
        maximumVerdicts: maxResults,
        objectSets: {
          objectSet: [
            {
              kind: 'inclusive',
              objectReferences: {
                objectReference: targetUris.map((uri) => ({ uri })),
              },
            },
          ],
        },
      },
    };
    await client.adt.atc.runs.post({ worklistId }, runData);

    // Step 4: Get results
    ctx.logger.info('📊 Fetching results...');
    const worklistResult = await client.adt.atc.worklists.get(worklistId, {
      includeExemptedFindings: 'false',
    });

    // Convert to AtcResult
    const result = convertWorklistToResult(
      worklistResult as WorklistResponse,
      checkVariant,
    );

    // Enrich findings with check categories from the run's check variant
    // form template (best-effort: never fails the run itself). The catalog is
    // fetched after the run, so categories reflect the variant configuration
    // in effect at that time.
    const categoryIndex = await fetchCheckCategoryIndex(
      client,
      checkVariant,
      ctx.logger,
    );
    const enriched = enrichResultWithCategories(result, categoryIndex);
    if (enriched > 0) {
      ctx.logger.info(
        `🏷️ Enriched ${enriched}/${result.totalFindings} finding(s) with check categories`,
      );
    }

    // Bridge remaining findings through their ATC documentation page: the
    // worklist checkId is a check-instance GUID, not the implementing class
    // the form-template catalog lists (live evidence, 2026-10-22), so
    // the direct index match cannot resolve them. The documentation page
    // names the check class, which resolves through the same index.
    // Best-effort: never fails the run.
    const bridged = await resolveCategoriesViaDocumentation(
      client,
      result.findings,
      categoryIndex,
      { logger: ctx.logger },
    );
    if (bridged > 0) {
      ctx.logger.info(
        `🏷 Bridged ${bridged} finding(s) to check categories via ATC documentation`,
      );
    }

    // Load finding resolver if requested
    let resolver: import('../types').FindingResolver | undefined;
    if (options.resolver) {
      const name = options.resolver;
      if (name === 'abapgit') {
        // Built-in abapgit resolver — no external dependencies
        const { createAbapGitResolver } = await import('../resolvers/abapgit');
        resolver = createAbapGitResolver();
      } else {
        // External resolver — try dynamic import
        try {
          ctx.logger.info(`📂 Loading external resolver: ${name}`);
          const mod = await import(name);
          if (typeof mod.createFindingResolver === 'function') {
            resolver = mod.createFindingResolver();
          } else {
            ctx.logger.warn(
              `⚠️ Module ${name} does not export createFindingResolver()`,
            );
          }
        } catch (e) {
          ctx.logger.warn(
            `⚠️ Failed to load resolver "${name}": ${e instanceof Error ? e.message : e}`,
          );
        }
      }
    }

    // Output based on format
    if (options.format === 'json') {
      console.log(JSON.stringify(result, null, 2));
    } else if (options.format === 'gitlab' && options.output) {
      await outputGitLabCodeQuality(result, options.output, { resolver });
    } else if (options.format === 'sarif' && options.output) {
      await outputSarifReport(result, options.output, targetName);
    } else {
      displayAtcResults(result, ctx.adtSystemName);
    }

    // Exit with error code if there are errors
    if (result.errorCount > 0) {
      process.exit(1);
    }
  },
};

export default atcCommand;
