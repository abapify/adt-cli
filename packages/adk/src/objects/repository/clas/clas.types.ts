/**
 * CLAS - ABAP Class
 *
 * Public interface for ABAP Class objects.
 * Based on ADT class:abapClass XML structure.
 */

import type { AbapObject } from '../../../base/types';
import type { AdtObjectReference } from '../../../base/model';

/**
 * Class category (class:category attribute)
 */
export type ClassCategory =
  | 'generalObjectType'
  | 'exceptionClass'
  | 'testClass'
  | 'exitClass'
  | 'areaClass'
  | 'factoryClass'
  | 'persistentClass'
  | 'bspClass'
  | 'staticTypedLcpClass'
  | 'behaviorPool'
  | 'rfcProxyClass'
  | 'entityEventHandler'
  | 'communicationConnectionClass'
  | 'others';

/**
 * Class include type (class:includeType attribute)
 */
export type ClassIncludeType =
  | 'main'
  | 'definitions'
  | 'implementations'
  | 'macros'
  | 'testclasses'
  | 'localtypes';

/**
 * Class visibility (class:visibility attribute)
 */
export type ClassVisibility = 'public' | 'protected' | 'private';

/**
 * Reference to another object (used for superClass, messageClass, etc.)
 * Re-exported for backward compatibility
 */
export type ObjectReference = AdtObjectReference;

/**
 * Class include section
 */
export interface ClassInclude {
  readonly includeType: ClassIncludeType;
  readonly sourceUri: string;
  readonly name: string;
  readonly type: string;
  readonly version: string;
  readonly changedAt: Date;
  readonly createdAt: Date;
  readonly changedBy: string;
  readonly createdBy: string;
}

/**
 * ABAP Class interface
 *
 * Plugins work with this interface - implementation is internal.
 * Mirrors ADT class:abapClass structure.
 */
export interface AbapClass extends AbapObject {
  readonly kind: 'Class';

  // Core attributes (from adtcore:*)
  readonly responsible: string;
  readonly masterLanguage: string;
  readonly language: string;
  readonly version: string;
  readonly createdAt: Date;
  readonly createdBy: string;
  readonly changedAt: Date;
  readonly changedBy: string;

  // Class-specific (from class:*)
  readonly category: ClassCategory;
  readonly final: boolean;
  readonly abstract: boolean;
  readonly visibility: ClassVisibility;
  readonly sharedMemoryEnabled: boolean;

  // OO attributes (from abapoo:*)
  readonly modeled: boolean;

  // Source attributes (from abapsource:*)
  readonly fixPointArithmetic: boolean;
  readonly activeUnicodeCheck: boolean;

  // References
  readonly superClassRef?: AdtObjectReference;
  readonly messageClassRef?: AdtObjectReference;
  readonly packageRef?: AdtObjectReference;

  // Includes
  readonly includes: ClassInclude[];

  // Lazy segments - fetched on demand

  /**
   * Get main source code (global definitions + implementations)
   */
  getMainSource(): Promise<string>;

  /**
   * Get source code for a specific include
   */
  getIncludeSource(includeType: ClassIncludeType): Promise<string>;

  /**
   * Get definitions include source
   */
  getDefinitions(): Promise<string>;

  /**
   * Get implementations include source
   */
  getImplementations(): Promise<string>;

  /**
   * Get test classes source
   */
  getTestClasses(): Promise<string>;
}
