/**
 * CheckinService — push a local abapGit/gCTS directory into SAP.
 *
 * Pipeline:
 *   1. Load the chosen FormatPlugin (via `loadFormatPlugin`; works for any
 *      registered format — `abapgit`, `gcts`/`aff`, third-party).
 *   2. Drive the plugin's `format.export(fileTree, client, options)`
 *      AsyncGenerator to deserialise local files into `AdkObject`
 *      instances. This is the ONE place where file → object conversion
 *      lives — every format participates transparently.
 *   3. Optionally validate the target transport via the typed
 *      `transportrequests.get` contract.
 *   4. Run diff against remote (per-object `load()` 404-check).
 *   5. Build a tier-ordered `ChangePlan` (DDIC → APP → CDS → other).
 *   6. Apply via `applyPlan` → pre-flight batch locks per tier + ADK save.
 *
 * The service returns a structured `CheckinResult` — neither the CLI nor
 * the MCP tool contains any business logic, they only format the result.
 *
 * gCTS note: because `loadFormatPlugin('gcts')` resolves to
 * `@abapify/adt-plugin-gcts`, invoking `CheckinService.checkin({format:
 * 'gcts', ...})` produces an identical apply pipeline — only the
 * deserialisation step differs. That's the FormatPlugin guarantee in action.
 */
import type { AdkObject, AdkContext } from '@abapify/adk';
import { AdkTransport, getGlobalContext } from '@abapify/adk';
import type { FormatOptionValue } from '@abapify/adt-plugin';

import { loadFormatPlugin } from '../../utils/format-loader';
import { createFsFileTree } from './filetree';

import { diffObject, type ChangePlanEntry } from './diff';
import { buildPlan, type ChangePlan, type DependencyTier } from './plan';
import { applyPlan, type ApplyOptions, type ApplyResult } from './apply';

export interface CheckinOptions {
  /** Source directory containing serialised files (abapGit/gCTS layout). */
  sourceDir: string;
  /** Format id — `abapgit` | `gcts` | `aff` | bespoke plugin package. */
  format: string;
  /** Target root package (used by FormatPlugin to resolve packageRef). */
  rootPackage?: string;
  /** Transport request for all modified/created objects. */
  transport?: string;
  /** Filter by ABAP object types (e.g. ['CLAS','INTF']). */
  objectTypes?: string[];
  /** Dry run — validate only, no SAP writes. */
  dryRun?: boolean;
  /** Activate objects after save (default true). */
  activate?: boolean;
  /** Force-unlock stale locks before applying. */
  unlock?: boolean;
  /** ABAP language version override (e.g. '5' for Cloud). */
  abapLanguageVersion?: string;
  /** Format-specific options (opaque to the service). */
  formatOptions?: Record<string, FormatOptionValue>;
  /** Optional ADK context override (tests pass a shared one). */
  adkContext?: AdkContext;
  /** Log hook — no console writes inside the service itself. */
  onLog?: (level: 'info' | 'warn' | 'error', message: string) => void;
  /** Per-object progress hook passed down to apply. */
  onObject?: (object: AdkObject, status: string) => void;
}

export interface CheckinResult {
  /** Source directory that was checked in. */
  sourceDir: string;
  /** Format id used for deserialisation. */
  format: string;
  /** Total AdkObjects discovered from the file tree. */
  discovered: number;
  /** Diff outcome per action kind (create/update/unchanged/skip). */
  actions: Record<string, number>;
  /** Tiered apply result (one entry per non-empty tier). */
  apply: ApplyResult;
  /** Plan groups as tier → entries (for dry-run/output formatting). */
  groups: Array<{
    tier: DependencyTier;
    entries: Array<{
      name: string;
      type: string;
      action: ChangePlanEntry['action'];
    }>;
  }>;
  /** True if we stopped before applying every tier. */
  aborted: boolean;
  /** Human-readable summary suitable for CLI output. */
  summary: string;
}

export class CheckinService {
  async checkin(options: CheckinOptions): Promise<CheckinResult> {
    const log = options.onLog ?? (() => undefined);

    // 1. Resolve format plugin (FormatPlugin registry + AdtPlugin legacy path).
    const plugin = await loadFormatPlugin(options.format);
    if (!plugin.instance.format.export) {
      throw new Error(
        `Format plugin '${plugin.name}' does not implement format.export — ` +
          `cannot deserialise local files. Required for checkin.`,
      );
    }
    log('info', `Loaded format plugin: ${plugin.name}`);

    // 2. Deserialise local files → AdkObjects.
    const adkContext = options.adkContext ?? getGlobalContext();
    const client = adkContext.client;
    const fileTree = createFsFileTree(options.sourceDir);

    const filterTypes = options.objectTypes?.map((t) => t.toUpperCase());
    const discovered: AdkObject[] = [];

    for await (const obj of plugin.instance.format.export(fileTree, client, {
      rootPackage: options.rootPackage,
      abapLanguageVersion: options.abapLanguageVersion,
      formatOptions: options.formatOptions,
    })) {
      if (filterTypes && !matchesTypeFilter(obj.type, filterTypes)) continue;
      discovered.push(obj);
    }
    log(
      'info',
      `Discovered ${discovered.length} objects from ${options.sourceDir}`,
    );

    // 3. Optional transport validation.
    if (options.transport && !options.dryRun) {
      try {
        await AdkTransport.get(options.transport);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(
          `Transport validation failed for ${options.transport}: ${msg}`,
          { cause: err },
        );
      }
    }

    // 4. Diff against remote.
    const entries: ChangePlanEntry[] = [];
    for (const obj of discovered) {
      entries.push(await diffObject(obj));
    }

    // 5. Build plan.
    const plan: ChangePlan = buildPlan(entries);

    const actions: Record<string, number> = {
      create: 0,
      update: 0,
      unchanged: 0,
      skip: 0,
    };
    for (const entry of entries) actions[entry.action]++;

    // 6. Apply (skipped entirely for dry run).
    const applyOptions: ApplyOptions = {
      transport: options.transport,
      dryRun: options.dryRun,
      activate: options.activate,
      unlock: options.unlock,
      onTierStart: (tier, size) =>
        log('info', `→ Applying tier ${tier} (${size} objects)`),
      onObject: options.onObject,
    };
    const applyResult = await applyPlan(plan, adkContext, applyOptions);

    const summary = formatSummary(discovered.length, actions, applyResult);

    return {
      sourceDir: options.sourceDir,
      format: options.format,
      discovered: discovered.length,
      actions,
      apply: applyResult,
      groups: plan.groups.map((g) => ({
        tier: g.tier,
        entries: g.entries.map((e) => ({
          name: e.object.name,
          type: e.object.type,
          action: e.action,
        })),
      })),
      aborted: applyResult.aborted,
      summary,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────

function matchesTypeFilter(type: string, filter: string[]): boolean {
  const upper = type.toUpperCase();
  const main = upper.split('/')[0];
  return filter.includes(upper) || filter.includes(main);
}

function formatSummary(
  discovered: number,
  actions: Record<string, number>,
  apply: ApplyResult,
): string {
  const parts = [
    `${discovered} discovered`,
    `${actions.create ?? 0} new`,
    `${actions.update ?? 0} modified`,
    `${actions.unchanged ?? 0} unchanged`,
    `${apply.totals.saved} saved`,
    `${apply.totals.activated} activated`,
  ];
  if (apply.totals.failed > 0) parts.push(`${apply.totals.failed} failed`);
  if (apply.aborted) parts.push('aborted (partial-apply)');
  return parts.join(', ');
}
