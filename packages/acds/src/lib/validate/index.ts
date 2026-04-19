/**
 * Semantic validators that operate on a parsed `CdsSourceFile`.
 *
 * These do NOT replace the parser's syntactic error recovery — they catch
 * constraints that the grammar cannot easily encode (e.g. cardinality must
 * be `lower <= upper`, a typed field cannot simultaneously be `key` and
 * `virtual`, etc.).
 */
import type { CdsSourceFile } from '../../ast';
import { validateCardinality } from './cardinality';
import { validateViewElements } from './elements';

export interface SemanticDiagnostic {
  /** Stable machine-readable code. */
  code: string;
  severity: 'error' | 'warning';
  message: string;
  /** Optional location hint (e.g. element name, association alias). */
  target?: string;
}

/** Run all validators. */
export function validate(file: CdsSourceFile): SemanticDiagnostic[] {
  return [...validateCardinality(file), ...validateViewElements(file)];
}

export { validateCardinality } from './cardinality';
export { validateViewElements } from './elements';
