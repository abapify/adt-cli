/**
 * Cardinality validator.
 *
 * Ensures `[lower..upper]` bounds are consistent:
 *   - lower >= 0
 *   - upper >= 1 (unless `*`)
 *   - lower <= upper (when both numeric)
 */
import type { CdsSourceFile } from '../../ast';
import { walkAssociations } from '../ast/walker';
import type { SemanticDiagnostic } from './index';

export function validateCardinality(file: CdsSourceFile): SemanticDiagnostic[] {
  const diagnostics: SemanticDiagnostic[] = [];
  for (const { association } of walkAssociations(file)) {
    const card = association.cardinality;
    if (!card) continue;

    const { min, max } = card;
    const name = association.alias ?? association.target;

    if (min !== undefined && min < 0) {
      diagnostics.push({
        code: 'ACDS001',
        severity: 'error',
        message: `Association '${name}': lower bound (${min}) must be >= 0.`,
        target: name,
      });
    }

    if (typeof max === 'number' && max < 1) {
      diagnostics.push({
        code: 'ACDS002',
        severity: 'error',
        message: `Association '${name}': upper bound (${max}) must be >= 1.`,
        target: name,
      });
    }

    if (min !== undefined && typeof max === 'number' && min > max) {
      diagnostics.push({
        code: 'ACDS003',
        severity: 'error',
        message: `Association '${name}': lower bound (${min}) exceeds upper bound (${max}).`,
        target: name,
      });
    }
  }
  return diagnostics;
}
