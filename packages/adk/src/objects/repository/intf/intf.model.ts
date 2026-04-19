/**
 * INTF - ABAP Interface
 *
 * ADK object for ABAP interfaces (INTF).
 */

import { AdkMainObject } from '../../../base/model';
import { Interface as InterfaceKind } from '../../../base/kinds';
import { getGlobalContext } from '../../../base/global-context';
import type { AdkContext } from '../../../base/context';

// Import response type from ADT integration layer
import type { InterfaceResponse } from '../../../base/adt';

/**
 * Interface data type - imported from contract
 *
 * The schema wraps everything in an 'abapInterface' element, so we unwrap it here
 * to provide a flat structure for ADK consumers.
 */
export type InterfaceXml = InterfaceResponse['abapInterface'];

/**
 * ADK Interface object
 *
 * Inherits from AdkMainObject which provides:
 * - AdkObject: name, type, description, version, language, changedBy/At, createdBy/At, links
 * - AdkMainObject: package, packageRef, responsible, masterLanguage, masterSystem, abapLanguageVersion
 *
 * Access interface-specific properties via `data`:
 * - data.modeled, data.sourceUri, data.fixPointArithmetic, data.activeUnicodeCheck
 */
export class AdkInterface extends AdkMainObject<
  typeof InterfaceKind,
  InterfaceXml
> {
  static readonly kind = InterfaceKind;
  readonly kind = AdkInterface.kind;

  // ADT object URI (computed - not in data)
  get objectUri(): string {
    return `/sap/bc/adt/oo/interfaces/${encodeURIComponent(this.name.toLowerCase())}`;
  }

  // Lazy segments - source code

  async getSource(): Promise<string> {
    return this.lazy('source', async () => {
      return this.ctx.client.adt.oo.interfaces.source.main.get(this.name);
    });
  }

  // savePendingSources, checkPendingSourcesUnchanged, hasPendingSources,
  // and saveMainSource are all handled by the base class via objectUri + /source/main

  // ============================================
  // CRUD contract config - enables save()
  // ============================================

  protected override get wrapperKey() {
    return 'abapInterface';
  }
  protected override get crudContract(): any {
    return this.ctx.client.adt.oo.interfaces;
  }

  // ============================================
  // Static Factory Methods
  // ============================================

  static async get(name: string, ctx?: AdkContext): Promise<AdkInterface> {
    const context = ctx ?? getGlobalContext();
    return new AdkInterface(context, name).load();
  }

  /**
   * Check if an interface exists on SAP
   */
  static async exists(name: string, ctx?: AdkContext): Promise<boolean> {
    try {
      await AdkInterface.get(name, ctx);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a new ABAP interface on SAP
   *
   * @param name - Interface name (e.g., 'ZIF_MY_INTERFACE')
   * @param description - Short description
   * @param packageName - Package to assign the interface to
   * @param options - Save options (transport)
   * @param ctx - Optional ADK context
   */
  static async create(
    name: string,
    description: string,
    packageName: string,
    options?: { transport?: string },
    ctx?: AdkContext,
  ): Promise<AdkInterface> {
    const context = ctx ?? getGlobalContext();
    const intf = new AdkInterface(context, name.toUpperCase());
    intf.setData({
      name: name.toUpperCase(),
      type: 'INTF/OI',
      description,
      language: 'EN',
      masterLanguage: 'EN',
      packageRef: {
        name: packageName.toUpperCase(),
        uri: `/sap/bc/adt/packages/${encodeURIComponent(packageName.toUpperCase())}`,
        type: 'DEVC/K',
      },
    } as unknown as InterfaceXml);
    await intf.save({ transport: options?.transport, mode: 'create' });
    return intf;
  }

  /**
   * Delete an ABAP interface from SAP
   *
   * @param name - Interface name
   * @param options - Delete options (transport)
   * @param ctx - Optional ADK context
   */
  static async delete(
    name: string,
    options?: { transport?: string; lockHandle?: string },
    ctx?: AdkContext,
  ): Promise<void> {
    const context = ctx ?? getGlobalContext();
    const intf = new AdkInterface(context, name.toUpperCase());
    const contract = intf.crudContract;
    await contract.delete(name.toUpperCase(), {
      corrNr: options?.transport,
      lockHandle: options?.lockHandle,
    });
  }
}

// Self-register with ADK registry
import { registerObjectType } from '../../../base/registry';
registerObjectType('INTF', InterfaceKind, AdkInterface, {
  endpoint: 'oo/interfaces',
});
