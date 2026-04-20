export * from './lib/cli';
export * from './lib/plugins';

// Programmatic client factory – consumed by adt-mcp's sap_connect tool
// (and other workspace packages) so they can resolve credentials from
// the on-disk auth store (~/.adt/sessions/<sid>.json) without
// duplicating the CLI's auth bridge.
export {
  getAdtClientV2,
  getAdtClientV2Safe,
  AdtAuthError,
} from './lib/utils/adt-client-v2';

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
