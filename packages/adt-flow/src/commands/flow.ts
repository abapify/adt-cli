import { randomUUID } from 'node:crypto';
import { lstatSync, readlinkSync, realpathSync } from 'node:fs';
import { mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, relative, resolve } from 'node:path';
import type { AdtClient } from '@abapify/adt-client';
import type { FlowConfig } from '@abapify/adt-config';
import {
  getFormatPlugin,
  type CliCommandPlugin,
  type CliContext,
  type FormatPlugin,
} from '@abapify/adt-plugin';
import { createAdtFlowDependencies } from '../adt-client-adapter';
import { compareStrings } from '../deterministic';
import { createAdtFlowService, type AdtFlowService } from '../service';
import { flowConfigSchema } from '../schemas';
import { AdtFlowError } from '../types';

export interface FlowCommandDependencies {
  getFormat(id: string): FormatPlugin | undefined;
  createService(client: AdtClient, format: FormatPlugin): AdtFlowService;
}

const DEFAULT_DEPENDENCIES: FlowCommandDependencies = {
  getFormat: getFormatPlugin,
  createService: (client, format) =>
    createAdtFlowService(createAdtFlowDependencies(client, format)),
};

function transports(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function flowConfig(ctx: CliContext): FlowConfig {
  const value = ctx.config['flow'];
  if (!value || typeof value !== 'object') {
    throw new AdtFlowError(
      'configuration_invalid',
      'adt.config.ts must define a flow section.',
    );
  }
  try {
    return flowConfigSchema.parse(value);
  } catch (error) {
    throw new AdtFlowError(
      'configuration_invalid',
      'Flow configuration is invalid.',
      { cause: error instanceof Error ? error.message : String(error) },
    );
  }
}

function escapeRoot(realRoot: string, path: string): boolean {
  const fromRoot = relative(realRoot, path);
  return (
    isAbsolute(fromRoot) ||
    fromRoot === '..' ||
    fromRoot.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`)
  );
}

function assertNoSymlinkEscape(path: string, realRoot: string): void {
  let linkCurrent = path;
  const seen = new Set<string>();
  for (;;) {
    if (seen.has(linkCurrent)) {
      throw new AdtFlowError(
        'invalid_input',
        '--partial-report path contains a symlink loop.',
      );
    }
    seen.add(linkCurrent);
    const stat = tryLstat(linkCurrent);
    if (stat === undefined) {
      // Dangling or non-existent target — check parent chain for
      // intermediate symlink components that escape the checkout.
      assertParentChainSafe(linkCurrent, realRoot);
      return;
    }
    if (!stat.isSymbolicLink()) return;
    const linkTarget = resolve(dirname(linkCurrent), readlinkSync(linkCurrent));
    if (escapeRoot(realRoot, linkTarget)) {
      throw new AdtFlowError(
        'invalid_input',
        '--partial-report must not escape the checkout root via symlinks.',
      );
    }
    linkCurrent = linkTarget;
  }
}

function tryLstat(path: string): ReturnType<typeof lstatSync> | undefined {
  try {
    return lstatSync(path);
  } catch {
    return undefined;
  }
}

function assertParentChainSafe(path: string, realRoot: string): void {
  const parent = dirname(path);
  if (parent === path) return;
  try {
    assertNoSymlinkEscape(parent, realRoot);
  } catch (error) {
    if (error instanceof AdtFlowError) throw error;
  }
}

function partialReportPath(
  value: unknown,
  root: string,
  realRoot: string,
): string | undefined {
  if (value === undefined || value === false) return undefined;
  if (typeof value !== 'string' || !value.trim()) {
    throw new AdtFlowError(
      'invalid_input',
      '--partial-report requires a non-empty repository-relative file path.',
    );
  }
  if (isAbsolute(value)) {
    throw new AdtFlowError(
      'invalid_input',
      '--partial-report must be a repository-relative path, not absolute.',
    );
  }
  const target = resolve(root, value);
  const fromRoot = relative(root, target);
  if (fromRoot === '') {
    throw new AdtFlowError(
      'invalid_input',
      '--partial-report must not target the checkout root directory.',
    );
  }
  if (escapeRoot(root, target)) {
    throw new AdtFlowError(
      'invalid_input',
      '--partial-report must remain inside the checkout root.',
    );
  }
  // Resolve symlinks in the parent directory to detect in-root symlinks
  // that point outside the checkout. The target file itself may not exist
  // yet, so we resolve its parent. If the parent doesn't exist either,
  // walk up to the nearest existing ancestor, resolving that, and
  // re-append the remaining path segments. At each step, check for
  // dangling symlinks (existing lstat but realpath fails) that point
  // outside the checkout — mkdir/writeFile would follow them.
  const parent = dirname(target);
  const base = basename(target);
  let realParent: string;
  try {
    realParent = realpathSync(parent);
  } catch {
    // Parent doesn't exist — walk up to the nearest existing ancestor
    // and re-append the non-existent segments.
    let current = parent;
    const segments: string[] = [];
    for (;;) {
      // Check if current is a symlink (including dangling ones) whose
      // chain escapes the checkout root.
      try {
        assertNoSymlinkEscape(current, realRoot);
      } catch (error) {
        if (error instanceof AdtFlowError) throw error;
        // lstat failed — path doesn't exist at all, continue walking up.
      }
      try {
        realParent = resolve(realpathSync(current), ...segments.reverse());
        break;
      } catch {
        segments.push(basename(current));
        const next = dirname(current);
        if (next === current) {
          realParent = parent;
          break;
        }
        current = next;
      }
    }
  }
  const realTarget = resolve(realParent, base);
  if (escapeRoot(realRoot, realTarget)) {
    throw new AdtFlowError(
      'invalid_input',
      '--partial-report must not escape the checkout root via symlinks.',
    );
  }
  // Validate the target file itself — if it already exists as a symlink,
  // the report write would replace it or follow it outside the checkout.
  assertNoSymlinkEscape(target, realRoot);
  return target;
}

async function writePartialReport(
  output: string,
  realRoot: string,
  result: Awaited<ReturnType<AdtFlowService['checkout']>>,
): Promise<void> {
  const skipped = [...result.skipped].sort((a, b) => {
    return (
      compareStrings(a.object, b.object) ||
      compareStrings(a.component, b.component) ||
      compareStrings(a.diagnostic, b.diagnostic) ||
      compareStrings(a.sourceTransport ?? '', b.sourceTransport ?? '')
    );
  });
  const payload = `${JSON.stringify(
    {
      schemaVersion: 1,
      requestedTransports: result.requestedTransports,
      skipped,
    },
    null,
    2,
  )}\n`;
  // Re-validate the output path right before writing to mitigate
  // TOCTOU: a parent directory could be replaced with a symlink
  // between partialReportPath validation and the actual write.
  assertNoSymlinkEscape(output, realRoot);
  assertNoSymlinkEscape(dirname(output), realRoot);
  await mkdir(dirname(output), { recursive: true });
  const temporary = `${output}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, payload, 'utf8');
    await rename(temporary, output);
  } catch (error) {
    await unlink(temporary).catch(() => {
      // Ignore cleanup failures — the original error is more important.
    });
    throw error;
  }
}

function checkoutTrCommand(
  dependencies: FlowCommandDependencies,
): CliCommandPlugin {
  return {
    name: 'tr',
    description: 'Checkout the exact source-tree boundary for transports',
    arguments: [
      {
        name: '<transport>',
        description: 'Transport number or comma-separated transport scope',
      },
    ],
    options: [
      {
        flags: '--base',
        description: 'Checkout the version immediately before the scope',
      },
      {
        flags: '--partial',
        description:
          'Materialize only objects with exact source-history boundaries',
      },
      {
        flags: '--partial-report <file>',
        description:
          'Write skipped-object JSON after a successful partial checkout',
      },
    ],
    async execute(args, ctx) {
      if (!ctx.getAdtClient) {
        throw new AdtFlowError(
          'sap_operation_failed',
          'An authenticated ADT client is required.',
        );
      }
      const config = flowConfig(ctx);
      const format = dependencies.getFormat(config.format?.id);
      if (!format) {
        throw new AdtFlowError(
          'format_unsupported',
          `Format plugin "${config.format?.id ?? ''}" is not registered.`,
        );
      }
      const client = (await ctx.getAdtClient()) as AdtClient;
      // Resolve the real checkout root once to detect symlink escapes
      // in --partial-report paths. Fall back to cwd if realpath fails.
      let realRoot: string;
      try {
        realRoot = realpathSync(ctx.cwd);
      } catch {
        realRoot = ctx.cwd;
      }
      // Commander normalizes --partial-report to partialReport at runtime;
      // retain the dashed spelling for direct plugin callers and tests.
      const report = partialReportPath(
        args.partialReport ?? args['partial-report'],
        ctx.cwd,
        realRoot,
      );
      if (report && args['partial'] !== true) {
        throw new AdtFlowError(
          'invalid_input',
          '--partial-report requires the explicit --partial opt-in.',
        );
      }
      const result = await dependencies.createService(client, format).checkout({
        root: ctx.cwd,
        transports: transports(args['transport']),
        mode: args['base'] === true ? 'base' : 'head',
        partial: args['partial'] === true,
        config,
      });
      if (report) await writePartialReport(report, realRoot, result);
      ctx.logger.info(
        `Checked out ${result.mode} for ${result.requestedTransports.join(', ')}: ` +
          `${result.changed.length} changed, ${result.moved.length} moved, ` +
          `${result.removed.length} removed, ${result.unchanged.length} unchanged.`,
      );
      for (const skipped of result.skipped) {
        ctx.logger.warn(
          `Skipped object ${skipped.object} (${skipped.component}; ${skipped.diagnostic}).`,
        );
      }
      ctx.logger.info(
        `SAP calls: manifest=${result.sapCalls.manifest}, metadata=${result.sapCalls.metadata}, ` +
          `source=${result.sapCalls.source}; fast-path=${result.fastPath}.`,
      );
    },
  };
}

export function createFlowCommand(
  overrides: Partial<FlowCommandDependencies> = {},
): CliCommandPlugin {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  return {
    name: 'flow',
    description: 'Materialize incremental ADT source-tree boundaries',
    subcommands: [
      {
        name: 'checkout',
        description: 'Reconcile a source tree to an ADT boundary',
        subcommands: [checkoutTrCommand(dependencies)],
      },
    ],
  };
}

export const flowCommand = createFlowCommand();
export default flowCommand;
