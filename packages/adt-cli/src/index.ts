export * from './lib/cli';
export * from './lib/plugins';

// Programmatic services – consumed by adt-mcp and other workspace packages
// that need to reuse CLI business logic without going through commander.
export {
  ImportService,
  type ObjectImportOptions,
  type PackageImportOptions,
  type TransportImportOptions,
  type ImportResult,
} from './lib/services/import/service';

// Checkin (E08) — inverse of checkout; pushes local abapGit/gCTS files → SAP.
export {
  CheckinService,
  type CheckinOptions,
  type CheckinResult,
  type ChangePlan,
  type ChangePlanEntry,
  type ChangeAction,
  type DependencyTier,
  type ApplyResult,
  type ApplyTierResult,
  buildPlan,
  classifyTier,
  flattenPlanObjects,
  diffObject,
  applyPlan,
} from './lib/services/checkin';
