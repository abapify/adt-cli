import { s4CloudProfile } from './cloud';
import { onPremClassicProfile } from './onprem-classic';
import { s4OnPremModernProfile } from './onprem-modern';
import { WhitelistViolationError } from './errors';
import type { TargetProfile, TargetProfileId } from './types';

const PROFILES: Readonly<Record<TargetProfileId, TargetProfile>> = {
  'on-prem-classic': onPremClassicProfile,
  's4-onprem-modern': s4OnPremModernProfile,
  's4-cloud': s4CloudProfile,
};

export const ALL_PROFILES: ReadonlyArray<TargetProfileId> = [
  'on-prem-classic',
  's4-onprem-modern',
  's4-cloud',
];

export function getProfile(id: TargetProfileId): TargetProfile {
  const profile = PROFILES[id];
  if (!profile) {
    throw new Error(`Unknown target profile: ${String(id)}`);
  }
  return profile;
}

function normalizeAllowed(set: ReadonlySet<string>): Set<string> {
  const out = new Set<string>();
  for (const item of set) {
    out.add(item.toLowerCase());
  }
  return out;
}

export function assertClassAllowed(
  profile: TargetProfile,
  className: string,
): void {
  const normalized = normalizeAllowed(profile.allowedClasses);
  if (!normalized.has(className.toLowerCase())) {
    throw new WhitelistViolationError(className, profile.id);
  }
}
