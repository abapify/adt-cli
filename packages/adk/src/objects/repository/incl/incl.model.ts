/**
 * INCL - ABAP Program Include
 *
 * ADK object for ABAP program includes (PROG/I). Mirrors the PROG model
 * but targets the `/sap/bc/adt/programs/includes` endpoint.
 */

import { AdkMainObject } from '../../../base/model';
import { Include as IncludeKind } from '../../../base/kinds';
import { getGlobalContext } from '../../../base/global-context';
import type { AdkContext } from '../../../base/context';

// Import response type from ADT integration layer
import type { IncludeResponse } from '../../../base/adt';

/**
 * Include data type - unwrap from root element.
 *
 * The schema wraps everything in an 'abapInclude' element, so we unwrap
 * it here to provide a flat structure for ADK consumers.
 */
export type IncludeXml = IncludeResponse['abapInclude'];

/**
 * ADK Include object
 *
 * Inherits from AdkMainObject which provides:
 * - AdkObject: name, type, description, version, language, changedBy/At,
 *   createdBy/At, links
 * - AdkMainObject: package, packageRef, responsible, masterLanguage,
 *   masterSystem, abapLanguageVersion
 *
 * Access include-specific properties via `data`:
 * - data.sourceUri, data.fixPointArithmetic, data.activeUnicodeCheck,
 *   data.contextRef (pointer to the main program)
 */
export class AdkInclude extends AdkMainObject<typeof IncludeKind, IncludeXml> {
  static readonly kind = IncludeKind;
  readonly kind = AdkInclude.kind;

  // ADT object URI (computed - not in data)
  get objectUri(): string {
    return `/sap/bc/adt/programs/includes/${encodeURIComponent(this.name.toLowerCase())}`;
  }

  // Lazy segments - source code
  async getSource(): Promise<string> {
    return this.lazy('source', async () => {
      return this.ctx.client.adt.programs.includes.source.main.get(this.name);
    });
  }

  // savePendingSources, checkPendingSourcesUnchanged, hasPendingSources,
  // and saveMainSource are all handled by the base class via objectUri + /source/main

  // ============================================
  // CRUD contract config - enables save()
  // ============================================

  protected override get wrapperKey() {
    return 'abapInclude';
  }
  // Note: `any` return type mirrors intf.model.ts / prog.model.ts — the base
  // class types crudContract as `any` to support slightly different contract
  // shapes per object type.
  protected override get crudContract(): any {
    return this.ctx.client.adt.programs.includes;
  }

  /**
   * Skeleton POST data for includes.
   *
   * Extends the base skeleton (name/type/description/packageRef) with
   * `contextRef`, which sapcli's `sap.adt.Include(..., master=...)` serializes
   * at creation time. Without this the include would be created detached
   * from its main program.
   */
  protected override async getSkeletonData(): Promise<Record<string, unknown>> {
    const base = await super.getSkeletonData();
    const d = (await this.data()) as Record<string, unknown>;
    if (d.contextRef) {
      base.contextRef = d.contextRef;
    }
    return base;
  }

  // ============================================
  // Static Factory Methods
  // ============================================

  static async get(name: string, ctx?: AdkContext): Promise<AdkInclude> {
    const context = ctx ?? getGlobalContext();
    return new AdkInclude(context, name).load();
  }

  /**
   * Check if an include exists on SAP
   */
  static async exists(name: string, ctx?: AdkContext): Promise<boolean> {
    try {
      await AdkInclude.get(name, ctx);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a new ABAP include on SAP
   *
   * @param name - Include name (e.g., 'ZMY_INCLUDE')
   * @param description - Short description
   * @param packageName - Package to assign the include to
   * @param options - Save options (transport, master program)
   * @param ctx - Optional ADK context
   */
  static async create(
    name: string,
    description: string,
    packageName: string,
    options?: { transport?: string; master?: string },
    ctx?: AdkContext,
  ): Promise<AdkInclude> {
    const context = ctx ?? getGlobalContext();
    const incl = new AdkInclude(context, name.toUpperCase());
    const data: Record<string, unknown> = {
      name: name.toUpperCase(),
      type: 'PROG/I',
      description,
      language: 'EN',
      masterLanguage: 'EN',
      packageRef: {
        name: packageName.toUpperCase(),
        uri: `/sap/bc/adt/packages/${encodeURIComponent(packageName.toUpperCase())}`,
        type: 'DEVC/K',
      },
    };
    if (options?.master) {
      const master = options.master.toUpperCase();
      data.contextRef = {
        name: master,
        uri: `/sap/bc/adt/programs/programs/${encodeURIComponent(master.toLowerCase())}`,
        type: 'PROG/P',
      };
    }
    incl.setData(data as unknown as IncludeXml);
    await incl.save({ transport: options?.transport, mode: 'create' });
    return incl;
  }

  /**
   * Delete an ABAP include from SAP
   *
   * @param name - Include name
   * @param options - Delete options (transport, lockHandle)
   * @param ctx - Optional ADK context
   */
  static async delete(
    name: string,
    options?: { transport?: string; lockHandle?: string },
    ctx?: AdkContext,
  ): Promise<void> {
    const context = ctx ?? getGlobalContext();
    const incl = new AdkInclude(context, name.toUpperCase());
    const contract = incl.crudContract;
    await contract.delete(name.toUpperCase(), {
      corrNr: options?.transport,
      lockHandle: options?.lockHandle,
    });
  }
}

// Self-register with ADK registry
import { registerObjectType } from '../../../base/registry';
registerObjectType('INCL', IncludeKind, AdkInclude, {
  endpoint: 'programs/includes',
});
