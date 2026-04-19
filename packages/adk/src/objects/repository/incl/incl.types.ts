/**
 * INCL - ABAP Program Include
 *
 * Public interface for ABAP Program Include objects.
 * Based on ADT include:abapInclude XML structure (see
 * `.xsd/sap/includes.xsd`).
 */

import type { AbapObject } from '../../../base/types';
import type { AdtObjectReference } from '../../../base/model';

/**
 * ABAP Include interface
 *
 * Plugins work with this interface - implementation is internal.
 * Mirrors ADT include:abapInclude structure.
 */
export interface AbapInclude extends AbapObject {
  readonly kind: 'Include';

  // Core attributes (from adtcore:*)
  readonly responsible: string;
  readonly masterLanguage: string;
  readonly language: string;
  readonly version: string;
  readonly createdAt: Date;
  readonly createdBy: string;
  readonly changedAt: Date;
  readonly changedBy: string;

  // Source attributes (from abapsource:*)
  readonly sourceUri: string;
  readonly fixPointArithmetic: boolean;
  readonly activeUnicodeCheck: boolean;

  // References
  readonly packageRef?: AdtObjectReference;
  /** Reference to the "main" program that owns this include. */
  readonly contextRef?: AdtObjectReference;

  // Lazy segments - fetched on demand

  /** Get include source code */
  getSource(): Promise<string>;
}
