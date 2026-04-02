/**
 * FUGR/FF - ABAP Function Module
 *
 * Public interface for ABAP Function Module objects.
 * Based on ADT fmodules:abapFunctionModule XML structure.
 */

import type { AbapObject } from '../../../../base/types';

/**
 * Function module processing type
 */
export type FunctionModuleProcessingType = 'normal' | 'rfc' | 'update';

/**
 * Function module release state
 */
export type FunctionModuleReleaseState =
  | 'notReleased'
  | 'internal'
  | 'external'
  | 'obsolete'
  | 'markedForRelease';

/**
 * ABAP Function Module interface
 *
 * Plugins work with this interface - implementation is internal.
 * Mirrors ADT fmodules:abapFunctionModule structure.
 */
export interface AbapFunctionModule extends AbapObject {
  readonly kind: 'FunctionModule';

  /** Parent function group name */
  readonly groupName: string;

  // Core attributes (from adtcore:*)
  readonly version: string;
  readonly language: string;
  readonly createdAt: Date;
  readonly createdBy: string;
  readonly changedAt: Date;
  readonly changedBy: string;

  // Source attributes (from abapsource:*)
  readonly sourceUri: string;

  // FM-specific attributes
  readonly processingType: FunctionModuleProcessingType;
  readonly releaseState: FunctionModuleReleaseState;
  readonly basXMLEnabled: boolean;

  /**
   * Get function module source code
   */
  getSource(): Promise<string>;
}
