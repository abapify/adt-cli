/**
 * INTF - ABAP Interface
 *
 * Public interface for ABAP Interface objects.
 * Based on ADT intf:abapInterface XML structure.
 */

import type { AbapObject } from '../../../base/types';
import type { AdtObjectReference } from '../../../base/model';

/**
 * ABAP Interface interface
 *
 * Plugins work with this interface - implementation is internal.
 * Mirrors ADT intf:abapInterface structure.
 */
export interface AbapInterface extends AbapObject {
  readonly kind: 'Interface';

  // Core attributes (from adtcore:*)
  readonly responsible: string;
  readonly masterLanguage: string;
  readonly language: string;
  readonly version: string;
  readonly createdAt: Date;
  readonly createdBy: string;
  readonly changedAt: Date;
  readonly changedBy: string;

  // OO attributes (from abapoo:*)
  readonly modeled: boolean;

  // Source attributes (from abapsource:*)
  readonly sourceUri: string;
  readonly fixPointArithmetic: boolean;
  readonly activeUnicodeCheck: boolean;

  // References
  readonly packageRef?: AdtObjectReference;

  // Lazy segments - fetched on demand

  /**
   * Get interface source code
   */
  getSource(): Promise<string>;
}
