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
export class AdkPackage
  extends AdkMainObject<typeof PackageKind, PackageXml>
  implements AbapPackage
{
  static readonly kind = PackageKind;
  readonly kind = AdkPackage.kind;

  // ADT object URI
  get objectUri(): string {
    return `/sap/bc/adt/packages/${encodeURIComponent(this.name)}`;
  }

  // Override package getter to use superPackage (packages use superPackage, not packageRef)
  override get package(): string {
    return (
      (this.dataSync as unknown as { superPackage?: { name?: string } })
        .superPackage?.name ?? ''
    );
  }

  // pak:* elements
  get attributes(): PackageAttributes {
    const attrs = this.dataSync.attributes;
    return {
      packageType: (attrs?.packageType ??
        'development') as PackageAttributes['packageType'],
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
      softwareComponent: t.softwareComponent?.name
        ? {
            name: t.softwareComponent.name,
            description: t.softwareComponent.description ?? '',
          }
        : undefined,
      transportLayer: t.transportLayer?.name
        ? {
            name: t.transportLayer.name,
            description: t.transportLayer.description ?? '',
          }
        : undefined,
    };
  }

  // Lazy segments

  async getSubpackages(): Promise<AbapPackage[]> {
    return this.lazy('subpackages', async () => {
      // Search for subpackages using repository search
      // NOTE: SAP quickSearch with packageName is hierarchical — it returns
      // ALL descendant DEVC packages, not just direct children. We load each
      // package and then filter by superPackage to keep only direct children.
      const response =
        await this.ctx.client.adt.repository.informationsystem.search.quickSearch(
          {
            query: '*',
            packageName: this.name,
            objectType: 'DEVC',
            maxResults: 1000,
          },
        );

      // Parse object references - filter for DEVC type and exclude self
      const refs = response.objectReferences?.objectReference ?? [];
      const subpkgRefs = (Array.isArray(refs) ? refs : [refs]).filter(
        (ref) => ref.type === 'DEVC/K' && ref.name !== this.name,
      );

      // Load all candidate packages and filter to direct children only
      const loaded = await Promise.all(
        subpkgRefs.map(async (ref) => {
          const pkg = new AdkPackage(this.ctx, ref.name);
          await pkg.load();
          return pkg;
        }),
      );

      return loaded.filter(
        (pkg) =>
          pkg.superPackage?.name?.toUpperCase() === this.name.toUpperCase(),
      );
    });
  }

  async getObjects(): Promise<AbapObject[]> {
    return this.lazy('objects', async () => {
      // Search for objects in this package (exact match, not subpackages)
      const response =
        await this.ctx.client.adt.repository.informationsystem.search.quickSearch(
          {
            query: '*',
            packageName: this.name,
            maxResults: 1000,
          },
        );

      // Parse object references - filter out packages (DEVC) and objects from other packages
      const refs = response.objectReferences?.objectReference ?? [];
      const objRefs = (Array.isArray(refs) ? refs : [refs]).filter(
        (ref) =>
          ref.type !== 'DEVC/K' &&
          ref.packageName?.toUpperCase() === this.name.toUpperCase(),
      );

      // Return as AbapObject array
      return objRefs.map((ref) => ({
        kind: ref.type ?? '',
        type: ref.type ?? '',
        name: ref.name,
        description: ref.description ?? '',
        package: ref.packageName ?? '',
      }));
    });
  }

  async getAllObjects(): Promise<AbapObject[]> {
    return this.lazy('allObjects', async () => {
      const direct = await this.getObjects();
      const subpackages = await this.getSubpackages();

      const nested = await Promise.all(
        subpackages.map((pkg) => pkg.getAllObjects()),
      );

      // Deduplicate by type+name — SAP quickSearch may return
      // the same object at multiple package hierarchy levels
      const seen = new Set<string>();
      return [...direct, ...nested.flat()].filter((obj) => {
        const key = `${obj.type}:${obj.name}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
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
      throw new Error(
        `Package '${this.name}' not found or returned empty response`,
      );
    }
    // Unwrap the package element from the response
    this.setData(response.package);
    return this;
  }

  protected override get wrapperKey() {
    return 'package' as const;
  }
  protected override get crudContract(): any {
    return this.ctx.client.adt.packages;
  }

  /**
   * Get skeleton data for package creation (POST).
   *
   * SAP requires ALL elements in the Package xs:sequence, even if empty.
   * The sequence order is: attributes, superPackage, extensionAlias, switch,
   * applicationComponent, transport, translation, useAccesses,
   * packageInterfaces, subPackages.
   * Missing elements cause "System expected the element ..." 400 errors.
   */
  protected override async getSkeletonData(): Promise<Record<string, unknown>> {
    const rawData = await this.data();
    const d = rawData as Record<string, unknown>;
    return {
      name: d.name,
      type: d.type ?? 'DEVC/K',
      description: d.description ?? '',
      language: d.language ?? 'EN',
      masterLanguage: d.masterLanguage ?? 'EN',
      responsible: d.responsible ?? '',
      // All xs:sequence elements required by SAP (even if empty)
      attributes: d.attributes ?? { packageType: 'development' },
      superPackage: d.superPackage ?? {},
      extensionAlias: d.extensionAlias ?? {},
      switch: d.switch ?? {},
      applicationComponent: d.applicationComponent ?? {},
      transport: d.transport ?? {},
      translation: d.translation ?? {},
      useAccesses: d.useAccesses ?? {},
      packageInterfaces: d.packageInterfaces ?? {},
      subPackages: d.subPackages ?? {},
    };
  }

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

  /**
   * Check if a package exists on SAP
   *
   * @param name - Package name
   * @param ctx - Optional ADK context (uses global context if not provided)
   * @returns true if package exists, false otherwise
   */
  static async exists(name: string, ctx?: AdkContext): Promise<boolean> {
    try {
      const context = ctx ?? getGlobalContext();
      const pkg = new AdkPackage(context, name);
      await pkg.load();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a new package on SAP
   *
   * Builds an AdkPackage with the given data and saves it in 'create' mode.
   *
   * @param name - Package name (e.g., 'ZABAPGIT_EXAMPLES_CLAS')
   * @param data - Package data (superPackage, attributes, transport, etc.)
   * @param options - Save options (transport request)
   * @param ctx - Optional ADK context (uses global context if not provided)
   */
  static async create(
    name: string,
    data: Partial<PackageXml>,
    options?: { transport?: string },
    ctx?: AdkContext,
  ): Promise<AdkPackage> {
    const context = ctx ?? getGlobalContext();
    const pkg = new AdkPackage(context, name);
    // SAP requires ALL elements in the Package sequence, even if empty.
    // The sequence is: attributes, superPackage, extensionAlias, switch,
    // applicationComponent, transport, translation, useAccesses,
    // packageInterfaces, subPackages.
    // Missing elements cause "System expected the element ..." errors.
    pkg.setData({
      name,
      type: 'DEVC/K',
      description: data.description ?? name,
      responsible: data.responsible ?? '',
      attributes: {
        packageType: 'development',
        ...data.attributes,
      },
      superPackage: data.superPackage ?? {},
      extensionAlias: data.extensionAlias ?? {},
      switch: data.switch ?? {},
      applicationComponent: data.applicationComponent ?? {},
      transport: data.transport ?? {},
      translation: data.translation ?? {},
      useAccesses: data.useAccesses ?? {},
      packageInterfaces: data.packageInterfaces ?? {},
      subPackages: data.subPackages ?? {},
      ...data,
    } as PackageXml);
    await pkg.save({ transport: options?.transport, mode: 'create' });
    return pkg;
  }

  /**
   * Delete an ABAP package from SAP
   *
   * @param name - Package name
   * @param options - Delete options (transport, lockHandle)
   * @param ctx - Optional ADK context (uses global context if not provided)
   */
  static async delete(
    name: string,
    options?: { transport?: string; lockHandle?: string },
    ctx?: AdkContext,
  ): Promise<void> {
    const context = ctx ?? getGlobalContext();
    const pkg = new AdkPackage(context, name.toUpperCase());
    await pkg.crudContract.delete(name.toUpperCase(), {
      ...(options?.transport && { corrNr: options.transport }),
      ...(options?.lockHandle && { lockHandle: options.lockHandle }),
    });
  }
}

// Self-register with ADK registry
import { registerObjectType } from '../../../base/registry';
registerObjectType('DEVC', PackageKind, AdkPackage, {
  endpoint: 'packages',
  nameTransform: 'preserve',
});
