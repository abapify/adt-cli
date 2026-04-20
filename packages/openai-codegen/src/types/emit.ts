import type { TypeDef } from '@abapify/abap-ast';
import type { TargetProfile } from '../profiles/index';
import type { TypePlan } from './plan';
import { mapSchemaToTypeDef } from './map';

/** Emit all TypeDef nodes for the given plan, in topological order. */
export function emitTypeSection(
  plan: TypePlan,
  _profile: TargetProfile,
): TypeDef[] {
  // Profile is accepted for forward-compat (e.g. per-profile type substitutions)
  // but currently does not alter emission. Silence unused-var lint.
  void _profile;
  const out: TypeDef[] = [];
  for (const entry of plan.entries) {
    const { typeDef } = mapSchemaToTypeDef(entry, plan);
    out.push(typeDef);
  }
  return out;
}
