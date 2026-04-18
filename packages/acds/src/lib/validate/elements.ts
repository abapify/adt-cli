/**
 * View element validator.
 *
 *   - A typed field cannot also be marked `virtual` (nonsensical combination).
 *   - A `key` element must not be `virtual` (virtual columns are never keys).
 */
import type { CdsSourceFile } from '../../ast';
import { walkViewElements } from '../ast/walker';
import type { SemanticDiagnostic } from './index';

export function validateViewElements(
  file: CdsSourceFile,
): SemanticDiagnostic[] {
  const diagnostics: SemanticDiagnostic[] = [];
  for (const { element } of walkViewElements(file)) {
    const name = element.alias ?? element.expression;

    if (element.isVirtual && element.type) {
      diagnostics.push({
        code: 'ACDS010',
        severity: 'error',
        message: `View element '${name}' cannot be virtual and typed at the same time.`,
        target: name,
      });
    }

    if (element.isKey && element.isVirtual) {
      diagnostics.push({
        code: 'ACDS011',
        severity: 'error',
        message: `View element '${name}' cannot be both 'key' and 'virtual'.`,
        target: name,
      });
    }
  }
  return diagnostics;
}
