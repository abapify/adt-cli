/**
 * ADK v2 - Base Types
 */

import type { AdkKind } from './kinds';

/**
 * Base interface for all ABAP objects
 */
export interface AbapObject {
  readonly kind: AdkKind | string; // Allow kind or custom string
  readonly name: string;
  readonly package: string;
  readonly description: string;

  /**
   * ADT object type (e.g., 'DEVC/K', 'CLAS/OC')
   */
  readonly type: string;
}
