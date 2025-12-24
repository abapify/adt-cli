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

  // ============================================
  // Source Code Save Methods
  // ============================================

  /**
   * Save main source code
   * Requires object to be locked first
   */
  async saveMainSource(
    source: string,
    options?: { lockHandle?: string; transport?: string },
  ): Promise<void> {
    const params = new URLSearchParams();
    if (options?.lockHandle) params.set('lockHandle', options.lockHandle);
    if (options?.transport) params.set('corrNr', options.transport);

    await this.ctx.client.fetch(
      `/sap/bc/adt/oo/interfaces/${this.name.toLowerCase()}/source/main${params.toString() ? '?' + params.toString() : ''}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'text/plain' },
        body: source,
      },
    );
  }

  /**
   * Save pending source (set via _pendingSource)
   * Used by export workflow after deserialization from abapGit
   * Overrides base class method
   */
  protected override async savePendingSources(options?: {
    lockHandle?: string;
    transport?: string;
  }): Promise<void> {
    const pendingSource = (this as unknown as { _pendingSource?: string })
      ._pendingSource;
    if (!pendingSource) return;

    await this.saveMainSource(pendingSource, options);

    // Clear pending source after save
    delete (this as unknown as { _pendingSource?: string })._pendingSource;
  }

  /**
   * Check if object has pending sources to save
   * Overrides base class method
   */
  protected override hasPendingSources(): boolean {
    return !!(this as unknown as { _pendingSource?: string })._pendingSource;
  }

  // ============================================
  // CRUD contract config - enables save()
  // ============================================

  protected override get wrapperKey() {
    return 'abapInterface';
  }
  protected override get crudContract() {
    return this.ctx.client.adt.oo.interfaces;
  }

  // ============================================
  // Static Factory Method
  // ============================================

  static async get(name: string, ctx?: AdkContext): Promise<AdkInterface> {
    const context = ctx ?? getGlobalContext();
    return new AdkInterface(context, name).load();
  }
}

// Self-register with ADK registry
import { registerObjectType } from '../../../base/registry';
registerObjectType('INTF', InterfaceKind, AdkInterface);
