/**
 * AUnit Command Plugin
 *
 * CLI-agnostic command for running ABAP Unit tests.
 * Uses the CliContext.getAdtClient() factory for API access.
 *
 * Supports JUnit XML output for GitLab CI integration:
 * @see https://docs.gitlab.com/ci/testing/unit_test_reports/
 */

import type { CliCommandPlugin, CliContext } from '@abapify/adt-plugin';
import { extractCoverageMeasurementId } from '@abapify/adt-contracts';
import {
  acoverageResult,
  acoverageStatements,
  type InferTypedSchema,
} from '@abapify/adt-schemas';

type AcoverageResultSchema = InferTypedSchema<typeof acoverageResult>;
type AcoverageStatementsSchema = InferTypedSchema<typeof acoverageStatements>;
// Simple ANSI color helpers (no external dependency)
const ansi = {
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
};
import { outputJunitReport, outputSonarReport } from '../formatters';
import { toJacocoXml, toSonarGenericCoverageXml } from '../formatters/jacoco';
import type {
  AunitResult,
  AunitProgram,
  AunitTestClass,
  AunitTestMethod,
  AunitAlert,
  OutputFormat,
} from '../types';

// Client type - the plugin receives a typed client from context
// The client.adt.aunit namespace provides the testruns operation
interface AdtClient {
  adt: {
    aunit: {
      testruns: {
        post: (body: RunConfigurationBody) => Promise<RunResultResponse>;
      };
    };
    runtime?: {
      traces: {
        coverage: {
          measurements: {
            post: (id: string) => Promise<AcoverageResultSchema>;
          };
          statements: {
            get: (id: string) => Promise<AcoverageStatementsSchema>;
          };
        };
      };
    };
  };
}

// Request body shape (matches aunitRun schema)
interface RunConfigurationBody {
  runConfiguration: {
    external?: {
      coverage?: { active?: string };
    };
    options?: {
      uriType?: { value?: string };
      testDeterminationStrategy?: {
        sameProgram?: string;
        assignedTests?: string;
        appendAssignedTestsPreview?: string;
      };
      testRiskLevels?: {
        harmless?: string;
        dangerous?: string;
        critical?: string;
      };
      testDurations?: {
        short?: string;
        medium?: string;
        long?: string;
      };
      withNavigationUri?: { enabled?: string };
    };
    objectSets: {
      objectSet: Array<{
        kind: string;
        objectReferences?: {
          objectReference: Array<{ uri: string }>;
        };
      }>;
    };
  };
}

// Response shape (matches aunitResult schema)
interface RunResultResponse {
  runResult: {
    program?: Array<{
      uri?: string;
      type?: string;
      name?: string;
      uriType?: string;
      testClasses?: {
        testClass?: Array<{
          uri?: string;
          name?: string;
          uriType?: string;
          durationCategory?: string;
          riskLevel?: string;
          testMethods?: {
            testMethod?: Array<{
              uri?: string;
              name?: string;
              executionTime?: string;
              uriType?: string;
              unit?: string;
              alerts?: {
                alert?: Array<{
                  kind?: string;
                  severity?: string;
                  title?: string;
                  details?: {
                    detail?: Array<{ text?: string }>;
                  };
                  stack?: {
                    stackEntry?: Array<{
                      uri?: string;
                      type?: string;
                      name?: string;
                      description?: string;
                    }>;
                  };
                }>;
              };
            }>;
          };
          alerts?: {
            alert?: Array<{
              kind?: string;
              severity?: string;
              title?: string;
              details?: {
                detail?: Array<{ text?: string }>;
              };
              stack?: {
                stackEntry?: Array<{
                  uri?: string;
                  type?: string;
                  name?: string;
                  description?: string;
                }>;
              };
            }>;
          };
        }>;
      };
      alerts?: {
        alert?: Array<{
          kind?: string;
          severity?: string;
          title?: string;
        }>;
      };
    }>;
  };
}

/**
 * Build the default runConfiguration request body.
 * Set `coverage` to enable the `<external><coverage active="true"/></external>`
 * block – SAP will then include an atom:link to the coverage
 * measurement on the runResult.
 */
function buildRunConfiguration(
  targetUris: string[],
  coverage = false,
): RunConfigurationBody {
  return {
    runConfiguration: {
      external: {
        coverage: { active: coverage ? 'true' : 'false' },
      },
      options: {
        uriType: { value: 'semantic' },
        testDeterminationStrategy: {
          sameProgram: 'true',
          assignedTests: 'false',
          appendAssignedTestsPreview: 'true',
        },
        testRiskLevels: {
          harmless: 'true',
          dangerous: 'true',
          critical: 'true',
        },
        testDurations: {
          short: 'true',
          medium: 'true',
          long: 'true',
        },
        withNavigationUri: { enabled: 'false' },
      },
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
}

/**
 * Convert a single test method alert to an AunitAlert, updating the status.
 */
function convertAlerts(
  rawAlerts: Array<{
    kind?: string;
    severity?: string;
    title?: string;
    details?: { detail?: Array<{ text?: string }> };
    stack?: {
      stackEntry?: Array<{
        uri?: string;
        type?: string;
        name?: string;
        description?: string;
      }>;
    };
  }>,
): { alerts: AunitAlert[]; status: AunitTestMethod['status'] } {
  const alerts: AunitAlert[] = [];
  let status: AunitTestMethod['status'] = 'pass';

  for (const alert of rawAlerts) {
    const details = (alert.details?.detail ?? []).map((d) => d.text || '');
    const stack = (alert.stack?.stackEntry ?? []).map((s) => ({
      uri: s.uri,
      type: s.type,
      name: s.name,
      description: s.description,
    }));

    alerts.push({
      kind: alert.kind || 'unknown',
      severity: alert.severity || 'unknown',
      title: alert.title || '',
      details,
      stack,
    });

    if (alert.severity === 'critical' || alert.kind === 'failedAssertion') {
      status = 'fail';
    } else if (alert.severity === 'fatal' || alert.kind === 'error') {
      status = 'error';
    }
  }

  return { alerts, status };
}

/**
 * Convert SAP AUnit response to our normalized AunitResult
 */
function convertResponse(response: RunResultResponse): AunitResult {
  const programs: AunitProgram[] = [];
  let totalTests = 0;
  let passCount = 0;
  let failCount = 0;
  let errorCount = 0;
  let skipCount = 0;
  let totalTime = 0;

  for (const prog of response.runResult.program || []) {
    const testClasses: AunitTestClass[] = [];

    for (const tc of prog.testClasses?.testClass || []) {
      const methods: AunitTestMethod[] = [];

      for (const tm of tc.testMethods?.testMethod || []) {
        const execTime = Number.parseFloat(tm.executionTime || '0');
        totalTime += execTime;

        const { alerts, status } = convertAlerts(tm.alerts?.alert || []);

        totalTests++;
        if (status === 'pass') passCount++;
        else if (status === 'fail') failCount++;
        else if (status === 'error') errorCount++;
        else if (status === 'skip') skipCount++;

        methods.push({
          name: tm.name || 'UNKNOWN',
          uri: tm.uri,
          executionTime: execTime,
          status,
          alerts,
        });
      }

      testClasses.push({
        name: tc.name || 'UNKNOWN',
        uri: tc.uri,
        riskLevel: tc.riskLevel,
        durationCategory: tc.durationCategory,
        methods,
      });
    }

    programs.push({
      name: prog.name || 'UNKNOWN',
      type: prog.type,
      uri: prog.uri,
      testClasses,
    });
  }

  return {
    programs,
    totalTests,
    passCount,
    failCount,
    errorCount,
    skipCount,
    totalTime,
  };
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
    return name ? ansi.cyan(name) : '';
  }
  const path = uri.startsWith('/sap/bc/adt') ? uri : `/sap/bc/adt${uri}`;
  const url = `adt://${systemName}${path}`;
  return hyperlink(ansi.cyan(name), url);
}

/**
 * Display a single failed/errored test method in console
 */
function displayFailedMethod(method: AunitTestMethod): void {
  const icon = method.status === 'fail' ? ansi.red('✗') : ansi.red('⚠');
  console.log(`     ${icon} ${method.name} (${method.executionTime}s)`);
  for (const alert of method.alerts) {
    console.log(`       ${ansi.dim(alert.title)}`);
    for (const detail of alert.details) {
      const dimDetail = ansi.dim(`  ${detail}`);
      console.log(`       ${dimDetail}`);
    }
  }
}

/**
 * Display AUnit results summary in console
 */
function displaySummary(result: AunitResult): void {
  const allPassed = result.failCount === 0 && result.errorCount === 0;
  const statusIcon = allPassed ? '✅' : '❌';
  console.log(`\n${statusIcon} ABAP Unit Test Results:`);
  console.log(
    `   📋 Total: ${result.totalTests} tests in ${result.totalTime.toFixed(3)}s`,
  );
  if (result.passCount > 0)
    console.log(`   ${ansi.green(`✓ ${result.passCount} passed`)}`);
  if (result.failCount > 0)
    console.log(`   ${ansi.red(`✗ ${result.failCount} failed`)}`);
  if (result.errorCount > 0)
    console.log(`   ${ansi.red(`⚠ ${result.errorCount} errors`)}`);
  if (result.skipCount > 0)
    console.log(`   ${ansi.yellow(`○ ${result.skipCount} skipped`)}`);
}

/**
 * Display AUnit results in console
 */
function displayResults(result: AunitResult, systemName?: string): void {
  if (result.totalTests === 0) {
    console.log(`\n⚠️  No tests found`);
    return;
  }

  displaySummary(result);

  // Show failed tests
  for (const prog of result.programs) {
    for (const tc of prog.testClasses) {
      const failedMethods = tc.methods.filter(
        (m) => m.status === 'fail' || m.status === 'error',
      );
      if (failedMethods.length === 0) continue;

      const classLink = adtLink(
        `${prog.name} → ${tc.name}`,
        tc.uri || prog.uri || '',
        systemName,
      );
      console.log(`\n   ${classLink}`);

      for (const method of failedMethods) {
        displayFailedMethod(method);
      }
    }
  }
}

/**
 * Resolve target URIs and name from command options
 */
async function resolveTargets(options: {
  fromFile?: string;
  transport?: string;
  class?: string;
  package?: string;
  object?: string;
}): Promise<{ targetUris: string[]; targetName: string }> {
  if (options.fromFile) {
    const { readFileSync } = await import('node:fs');
    const content = readFileSync(options.fromFile, 'utf-8');
    const targetUris = content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));
    return {
      targetUris,
      targetName: `${targetUris.length} objects from ${options.fromFile}`,
    };
  }
  if (options.transport) {
    return {
      targetUris: [
        `/sap/bc/adt/cts/transportrequests/${options.transport.toUpperCase()}`,
      ],
      targetName: `Transport ${options.transport.toUpperCase()}`,
    };
  }
  if (options.class) {
    return {
      targetUris: [`/sap/bc/adt/oo/classes/${options.class.toLowerCase()}`],
      targetName: `Class ${options.class.toUpperCase()}`,
    };
  }
  if (options.package) {
    return {
      targetUris: [`/sap/bc/adt/packages/${options.package.toUpperCase()}`],
      targetName: `Package ${options.package.toUpperCase()}`,
    };
  }
  return { targetUris: [options.object!], targetName: options.object! };
}

/**
 * AUnit Command Plugin
 */
export const aunitCommand: CliCommandPlugin = {
  name: 'aunit',
  description: 'Run ABAP Unit tests',

  options: [
    {
      flags: '-p, --package <package>',
      description: 'Run tests on package',
    },
    {
      flags: '-o, --object <uri>',
      description:
        'Run tests on specific object (e.g., /sap/bc/adt/oo/classes/zcl_my_class)',
    },
    {
      flags: '-c, --class <name>',
      description: 'Run tests on ABAP class (e.g., ZCL_MY_CLASS)',
    },
    {
      flags: '-t, --transport <transport>',
      description: 'Run tests on transport request (e.g., NPLK900042)',
    },
    {
      flags: '-f, --from-file <file>',
      description: 'Run tests on objects listed in file (one URI per line)',
    },
    {
      flags: '--format <format>',
      description: 'Output format: console, json, junit, sonar',
      default: 'console',
    },
    {
      flags: '--output <file>',
      description:
        'Output file (required for junit/sonar format, e.g., aunit-report.xml)',
    },
    {
      flags: '--coverage',
      description:
        'Request ABAP code coverage with the test run and follow the resulting measurement link',
    },
    {
      flags: '--coverage-output <file>',
      description:
        'Write the coverage report to this file (default: stdout for jacoco/sonar-generic)',
    },
    {
      flags: '--coverage-format <format>',
      description: 'Coverage format: jacoco | sonar-generic',
      default: 'jacoco',
    },
  ],

  async execute(args, ctx: CliContext) {
    const options = args as {
      package?: string;
      object?: string;
      class?: string;
      transport?: string;
      fromFile?: string;
      format?: OutputFormat;
      output?: string;
      coverage?: boolean;
      coverageOutput?: string;
      coverageFormat?: 'jacoco' | 'sonar-generic';
    };

    // Validate: at least one target
    const targetCount = [
      options.package,
      options.object,
      options.class,
      options.transport,
      options.fromFile,
    ].filter(Boolean).length;

    if (targetCount === 0) {
      ctx.logger.error(
        '❌ One of --package, --object, --class, --transport, or --from-file is required',
      );
      process.exit(1);
    }

    if (targetCount > 1) {
      ctx.logger.error(
        '❌ Only one of --package, --object, --class, --transport, or --from-file can be specified',
      );
      process.exit(1);
    }

    // Validate output file for junit/sonar format
    if (
      (options.format === 'junit' || options.format === 'sonar') &&
      !options.output
    ) {
      ctx.logger.error(`❌ --output is required for ${options.format} format`);
      process.exit(1);
    }

    // Get ADT client
    if (!ctx.getAdtClient) {
      ctx.logger.error('❌ ADT client not available. Run: adt auth login');
      process.exit(1);
    }

    const client = (await ctx.getAdtClient()) as AdtClient;

    // Determine targets
    const { targetUris, targetName } = await resolveTargets(options);

    if (options.fromFile && targetUris.length === 0) {
      ctx.logger.error(`❌ No objects found in ${options.fromFile}`);
      process.exit(1);
    }

    ctx.logger.info(`🧪 Running ABAP Unit tests on ${targetName}...`);

    // Execute test run
    const body = buildRunConfiguration(targetUris, options.coverage === true);
    const response = await client.adt.aunit.testruns.post(body);

    // Convert to normalized result
    const result = convertResponse(response);

    // Output
    if (options.format === 'json') {
      console.log(JSON.stringify(result, null, 2));
    } else if (options.format === 'junit' && options.output) {
      await outputJunitReport(result, options.output);
      // Also print summary to console
      displayResults(result, ctx.adtSystemName);
    } else if (options.format === 'sonar' && options.output) {
      outputSonarReport(result, options.output);
      // Also print summary to console
      displayResults(result, ctx.adtSystemName);
    } else {
      displayResults(result, ctx.adtSystemName);
    }

    // Coverage reporting – only if the user explicitly asked for it.
    if (options.coverage) {
      const measurementId = extractCoverageMeasurementId(response);
      if (!measurementId) {
        ctx.logger.warn?.(
          '⚠️  Coverage requested but SAP returned no measurement link. ' +
            'The system may not have coverage collection enabled for this user/package, ' +
            'or additional system configuration is required.',
        );
      } else if (!client.adt.runtime) {
        ctx.logger.warn?.(
          '⚠️  Coverage link present but the runtime/traces contract is not available on this client.',
        );
      } else {
        try {
          const cov = client.adt.runtime.traces.coverage;
          const measurements = await cov.measurements.post(measurementId);
          const statements = await cov.statements.get(measurementId);
          const format = options.coverageFormat ?? 'jacoco';
          const xml =
            format === 'sonar-generic'
              ? toSonarGenericCoverageXml({ measurements, statements })
              : toJacocoXml({ measurements, statements });
          if (options.coverageOutput) {
            const { writeFileSync } = await import('node:fs');
            writeFileSync(options.coverageOutput, xml, 'utf-8');
            ctx.logger.info(
              `📊 Coverage report (${format}) written to ${options.coverageOutput}`,
            );
          } else {
            console.log(xml);
          }
        } catch (err) {
          ctx.logger.error(
            `❌ Coverage collection failed: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    }

    // Exit with non-zero code equal to number of failures+errors (sapcli convention)
    const failures = result.failCount + result.errorCount;
    if (failures > 0) {
      process.exit(failures > 125 ? 125 : failures);
    }
  },
};

export default aunitCommand;
