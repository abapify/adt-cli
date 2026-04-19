export { CheckinService } from './service';
export type { CheckinOptions, CheckinResult } from './service';
export { diffObject } from './diff';
export type { ChangePlanEntry, ChangeAction } from './diff';
export { buildPlan, classifyTier, flattenPlanObjects } from './plan';
export type { ChangePlan, DependencyTier } from './plan';
export { applyPlan } from './apply';
export type { ApplyOptions, ApplyResult, ApplyTierResult } from './apply';
