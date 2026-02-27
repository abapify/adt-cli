/**
 * DEVC - ABAP Package
 *
 * Public interface for ABAP Package objects.
 * Based on ADT pak:package XML structure.
 */

import type { AbapObject } from '../../../base/types';
import type { AdtObjectReference } from '../../../base/model';

/**
 * Package type (pak:packageType attribute)
 */
export type PackageType = 'development' | 'structure' | 'main';

/**
 * Reference to another object (used for superPackage, etc.)
 * Re-exported for backward compatibility
 */
export type ObjectReference = AdtObjectReference;

/**
 * Package attributes (pak:attributes element)
 */
export interface PackageAttributes {
  readonly packageType: PackageType;
  readonly isEncapsulated: boolean;
  readonly isAddingObjectsAllowed: boolean;
  readonly recordChanges: boolean;
  readonly languageVersion: string;
}

/**
 * Application component info
 */
export interface ApplicationComponent {
  readonly name: string;
  readonly description: string;
}

/**
 * Software component info
 */
export interface SoftwareComponent {
  readonly name: string;
  readonly description: string;
}

/**
 * Transport layer info
 */
export interface TransportLayer {
  readonly name: string;
  readonly description: string;
}

/**
 * Transport configuration
 */
export interface TransportConfig {
  readonly softwareComponent?: SoftwareComponent;
  readonly transportLayer?: TransportLayer;
}

/**
 * ABAP Package interface
 *
 * Plugins work with this interface - implementation is internal.
 * Mirrors ADT pak:package structure.
 */
export interface AbapPackage extends AbapObject {
  readonly kind: 'Package';

  // Core attributes (from adtcore:*)
  readonly responsible: string;
  readonly masterLanguage: string;
  readonly language: string;
  readonly version: string;
  readonly createdAt: Date;
  readonly createdBy: string;
  readonly changedAt: Date;
  readonly changedBy: string;

  // Package-specific (from pak:*)
  readonly attributes: PackageAttributes;
  readonly superPackage?: AdtObjectReference;
  readonly applicationComponent?: ApplicationComponent;
  readonly transport?: TransportConfig;

  // Lazy segments - fetched on demand

  /**
   * Get direct subpackages
   */
  getSubpackages(): Promise<AbapPackage[]>;

  /**
   * Get objects contained in this package (direct, not recursive)
   */
  getObjects(): Promise<AbapObject[]>;

  /**
   * Get all objects recursively (includes subpackages)
   */
  getAllObjects(): Promise<AbapObject[]>;
}
