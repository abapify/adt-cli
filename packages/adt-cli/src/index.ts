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

// Changeset (Wave 3) — transactional unit-of-work shared by CLI and MCP.
export {
  ChangesetService,
  createChangeset,
  type Changeset,
  type ChangesetEntry,
  type ChangesetStatus,
  type AddEntryArgs as ChangesetAddArgs,
  type CommitResult as ChangesetCommitResult,
  type RollbackResult as ChangesetRollbackResult,
} from './lib/services/changeset';

export {
  resolveConnectionClient,
  type ConnectionResolveArgs,
  type ResolveConnectionClientHooks,
  type ResolvedConnectionClient,
} from './lib/services/connection';

// Exact immutable source history — shared by CLI and MCP delivery surfaces.
export {
  ExactSourceHistoryService,
  ExactSourceHistoryServiceError,
  toMetadataOnlySourceVersionListing,
  toMetadataOnlyTransportSourceManifest,
  type BuildTransportManifestInput,
  type BuildTransportManifestResult,
  type ExactSourceHistoryOperations,
  type ExactSourceHistoryServiceErrorCode,
  type GetVersionSourceInput,
  type ListObjectVersionsInput,
  type ListObjectVersionsResult,
} from './lib/services/source-history';

export {
  CtsTransportMetadataService,
  type CtsTransportMetadataResult,
  type CtsTransportMetadataUnit,
} from './lib/services/cts';

// Source retrieval — shared by CLI and MCP for arc-1 SAPRead parity.
export {
  getSource,
  GetSourceTooLargeError,
  type GetSourceOptions,
  type GetSourceResult,
  type GetSourceDefaultResult,
  type GetSourceMethodListResult,
  type GetSourceMethodResult,
  type GetSourceGrepResult,
  type GetSourceStructuredResult,
  type SourceInclude,
  type SourceMethod,
  type GrepMatch,
} from './lib/services/source';

export {
  CheckService,
  DEFAULT_CHECK_SOURCE_VERSION,
  type CheckMessage,
  type CheckReport,
  type CheckResult,
  type CheckServiceInput,
  type CheckSourceVersion,
} from './lib/services/check/service';

export {
  CtsTransportLifecycleService,
  type CtsTransportLifecycleOperations,
  type CtsTransportSummary,
  type CreateTaskInput,
  type CreateTaskResult,
  type ReassignTransportInput,
  type ReassignTransportResult,
  type ReleaseTransportInput,
  type ReleaseTransportResult,
} from './lib/services/cts';

// BAdI — ENHO metadata (enhoxhb) and unified read (classic vit/wb + ENHO)
export {
  getBadiInfo,
  parseEnhancementImplementation,
  BadiService,
  ClassicBadiService,
  normalizeClassicBadiMetadata,
  type BadiInfo,
  type BadiImplementation,
  type BadiKind,
  type BadiMetadata,
  type BadiReadResult,
  type ClassicBadiMetadata,
} from './lib/services/badi';
