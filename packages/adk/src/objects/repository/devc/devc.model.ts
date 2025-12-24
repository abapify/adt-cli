/**
 * DEVC - ABAP Package
 *
 * ADK object for ABAP packages (DEVC).
 */

import { AdkMainObject } from '../../../base/model';
import type { PackageResponse } from '../../../base/adt';
import { Package as PackageKind } from '../../../base/kinds';
import { getGlobalContext } from '../../../base/global-context';
import type { AdkContext } from '../../../base/context';
import type { AbapObject } from '../../../base/types';
import type {
  AbapPackage,
  PackageAttributes,
  ObjectReference,
  ApplicationComponent,
  TransportConfig,
} from './devc.types';

/**
 * Package data type - inferred from packagesContract response
 * 
 * The schema wraps everything in a 'package' element, so we unwrap it here
 * to provide a flat structure for ADK consumers.
 */
export type PackageXml = NonNullable<PackageResponse['package']>;

/**
 * ADK Package object
 * 
 * Inherits from AdkMainObject which provides:
 * - AdkObject: name, type, description, version, language, changedBy/At, createdBy/At, links
 * - AdkMainObject: packageRef, responsible, masterLanguage, masterSystem, abapLanguageVersion
 * 
 * Note: For packages, the parent package is stored in `superPackage` not `packageRef`.
 * The `package` getter is overridden to return the super package name.
 */
export class AdkPackage extends AdkMainObject<typeof PackageKind, PackageXml> implements AbapPackage {
  static readonly kind = PackageKind;
  readonly kind = AdkPackage.kind;
  
  // ADT object URI
  get objectUri(): string { return `/sap/bc/adt/packages/${encodeURIComponent(this.name)}`; }
  
  // Override package getter to use superPackage (packages use superPackage, not packageRef)
  override get package(): string { 
    return (this.dataSync as unknown as { superPackage?: { name?: string } }).superPackage?.name ?? ''; 
  }
  
  // pak:* elements
  get attributes(): PackageAttributes {
    const attrs = this.dataSync.attributes;
    return {
      packageType: (attrs?.packageType ?? 'development') as PackageAttributes['packageType'],
      isEncapsulated: attrs?.isEncapsulated ?? false,
      isAddingObjectsAllowed: attrs?.isAddingObjectsAllowed ?? true,
      recordChanges: attrs?.recordChanges ?? false,
      languageVersion: attrs?.languageVersion ?? '',
    };
  }
  
  get superPackage(): ObjectReference | undefined {
    const sp = this.dataSync.superPackage;
    if (!sp?.name) return undefined;
    return {
      uri: sp.uri ?? '',
      type: sp.type ?? 'DEVC/K',
      name: sp.name,
      description: sp.description,
    };
  }
  
  get applicationComponent(): ApplicationComponent | undefined {
    const ac = this.dataSync.applicationComponent;
    if (!ac?.name) return undefined;
    return {
      name: ac.name,
      description: ac.description ?? '',
    };
  }
  
  get transport(): TransportConfig | undefined {
    const t = this.dataSync.transport;
    if (!t) return undefined;
    return {
      softwareComponent: t.softwareComponent?.name ? {
        name: t.softwareComponent.name,
        description: t.softwareComponent.description ?? '',
      } : undefined,
      transportLayer: t.transportLayer?.name ? {
        name: t.transportLayer.name,
        description: t.transportLayer.description ?? '',
      } : undefined,
    };
  }
  
  // Lazy segments
  
  async getSubpackages(): Promise<AbapPackage[]> {
    return this.lazy('subpackages', async () => {
      // NOTE: Could use client.repository.packages.children(this.name) when available
      return [];
    });
  }
  
  async getObjects(): Promise<AbapObject[]> {
    return this.lazy('objects', async () => {
      // NOTE: Could use client.repository.packages.objects(this.name) when available
      return [];
    });
  }
  
  async getAllObjects(): Promise<AbapObject[]> {
    return this.lazy('allObjects', async () => {
      const direct = await this.getObjects();
      const subpackages = await this.getSubpackages();
      
      const nested = await Promise.all(
        subpackages.map(pkg => pkg.getAllObjects())
      );
      
      return [...direct, ...nested.flat()];
    });
  }
  
  // ============================================
  // Deferred Loading (implements abstract from AdkObject)
  // ============================================
  
  override async load(): Promise<this> {
    const response = await this.ctx.client.adt.packages.get(this.name);
    // Type guard: response is a union of { package } | { packageTree }
    // ADK Package objects only use the package variant
    if (!response || !('package' in response) || !response.package) {
      throw new Error(`Package '${this.name}' not found or returned empty response`);
    }
    // Unwrap the package element from the response
    this.setData(response.package);
    return this;
  }

  // Note: save() not yet implemented - no crudContract defined
  // Package creation requires transport handling
  
  // Lock/unlock inherited from AdkObject using generic lock service
  
  // ============================================
  // Static Factory Methods
  // ============================================
  
  /**
   * Get a package by name
   * 
   * @param name - Package name (e.g., '$TMP', 'ZPACKAGE')
   * @param ctx - Optional ADK context (uses global context if not provided)
   */
  static async get(name: string, ctx?: AdkContext): Promise<AdkPackage> {
    const context = ctx ?? getGlobalContext();
    const pkg = new AdkPackage(context, name);
    await pkg.load();
    return pkg;
  }
}


// Self-register with ADK registry
import { registerObjectType } from '../../../base/registry';
registerObjectType('DEVC', PackageKind, AdkPackage);
