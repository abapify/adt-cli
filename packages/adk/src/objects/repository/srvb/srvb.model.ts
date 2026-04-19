/**
 * SRVB - Service Binding (RAP)
 *
 * ADK object for ABAP RAP Service Bindings (SRVB). Unlike BDEF/SRVD,
 * SRVB is **metadata-only** — there is no source text. The binding
 * XML carries the service + protocol references.
 *
 *   GET    /sap/bc/adt/businessservices/bindings/<name>
 *   POST   /sap/bc/adt/businessservices/bindings
 *   PUT    /sap/bc/adt/businessservices/bindings/<name>
 *   DELETE /sap/bc/adt/businessservices/bindings/<name>
 *   POST   /sap/bc/adt/businessservices/bindings/<name>/publishedstates  (publish)
 *   DELETE /sap/bc/adt/businessservices/bindings/<name>/publishedstates  (unpublish)
 *
 * Lifecycle follows lock/activate patterns from sibling RAP objects.
 */

import { getGlobalContext } from '../../../base/global-context';
import type { AdkContext } from '../../../base/context';

export class AdkServiceBinding {
  /** Static ADK kind marker — used by abapGit handler registry if needed. */
  static readonly kind = 'ServiceBinding' as const;
  readonly kind = AdkServiceBinding.kind;

  readonly name: string;
  protected readonly ctx: AdkContext;

  constructor(ctx: AdkContext, name: string) {
    this.ctx = ctx;
    this.name = name.toUpperCase();
  }

  get objectUri(): string {
    return `/sap/bc/adt/businessservices/bindings/${encodeURIComponent(this.name.toLowerCase())}`;
  }

  /** Placeholder description — full metadata requires additional SAP fetch */
  get description(): string {
    return this.name;
  }

  private get contract(): any {
    return this.ctx.client.adt.businessservices.bindings;
  }

  // ─── Metadata (no source) ──────────────────────────────────────────────────

  /**
   * Fetch the binding metadata document. SRVB has no source text;
   * `getSource()` returns an empty string for uniform CLI parity.
   */
  async getMetadata(): Promise<unknown> {
    return this.contract.get(this.name);
  }

  async getSource(): Promise<string> {
    // Metadata-only object — no source code.
    return '';
  }

  // ─── Lock / Unlock ─────────────────────────────────────────────────────────

  async lock(transport?: string): Promise<{ handle: string }> {
    const lockService = this.ctx.lockService;
    if (!lockService) {
      throw new Error(
        'Lock not available: no lockService in context. Did you call initializeAdk()?',
      );
    }
    return lockService.lock(this.objectUri, {
      transport,
      objectName: this.name,
      objectType: 'SRVB',
    });
  }

  async unlock(lockHandle: string): Promise<void> {
    const lockService = this.ctx.lockService;
    if (!lockService) {
      throw new Error(
        'Unlock not available: no lockService in context. Did you call initializeAdk()?',
      );
    }
    await lockService.unlock(this.objectUri, { lockHandle });
  }

  // ─── Activate ──────────────────────────────────────────────────────────────

  async activate(): Promise<this> {
    await this.ctx.client.adt.activation.activate.post({}, {
      objectReferences: {
        objectReference: [{ uri: this.objectUri, name: this.name }],
      },
    } as any);
    return this;
  }

  // ─── Publish / Unpublish ───────────────────────────────────────────────────

  /**
   * Publish (activate) the binding in the SAP Gateway.
   * POST {basePath}/{name}/publishedstates
   */
  async publish(): Promise<void> {
    await this.contract.publish(this.name);
  }

  /**
   * Unpublish (deactivate) the binding.
   * DELETE {basePath}/{name}/publishedstates
   */
  async unpublish(): Promise<void> {
    await this.contract.unpublish(this.name);
  }

  // ─── Static Factory Methods ─────────────────────────────────────────────────

  /**
   * Get a SRVB (validates it exists by fetching metadata).
   */
  static async get(name: string, ctx?: AdkContext): Promise<AdkServiceBinding> {
    const context = ctx ?? getGlobalContext();
    const obj = new AdkServiceBinding(context, name);
    await obj.getMetadata();
    return obj;
  }

  static async exists(name: string, ctx?: AdkContext): Promise<boolean> {
    try {
      await AdkServiceBinding.get(name, ctx);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a new SRVB on SAP.
   *
   * POST /sap/bc/adt/businessservices/bindings?corrNr=...
   * Body matches the `srvb:serviceBinding` envelope.
   */
  static async create(
    name: string,
    description: string,
    packageName: string,
    options?: { transport?: string },
    ctx?: AdkContext,
  ): Promise<AdkServiceBinding> {
    const context = ctx ?? getGlobalContext();
    const nameU = name.toUpperCase();
    const pkgU = packageName.toUpperCase();

    await context.client.adt.businessservices.bindings.post(
      options?.transport ? { corrNr: options.transport } : {},
      {
        serviceBinding: {
          name: nameU,
          type: 'SRVB/SVB',
          description,
          language: 'EN',
          masterLanguage: 'EN',
          responsible: pkgU,
          packageRef: {
            name: pkgU,
            type: 'DEVC/K',
            uri: `/sap/bc/adt/packages/${pkgU.toLowerCase()}`,
          },
        },
      } as any,
    );

    return new AdkServiceBinding(context, nameU);
  }

  static async delete(
    name: string,
    options?: { transport?: string; lockHandle?: string },
    ctx?: AdkContext,
  ): Promise<void> {
    const context = ctx ?? getGlobalContext();
    await context.client.adt.businessservices.bindings.delete(
      name.toUpperCase(),
      {
        ...(options?.transport ? { corrNr: options.transport } : {}),
        ...(options?.lockHandle ? { lockHandle: options.lockHandle } : {}),
      },
    );
  }

  static async publish(name: string, ctx?: AdkContext): Promise<void> {
    const context = ctx ?? getGlobalContext();
    const obj = new AdkServiceBinding(context, name);
    await obj.publish();
  }

  static async unpublish(name: string, ctx?: AdkContext): Promise<void> {
    const context = ctx ?? getGlobalContext();
    const obj = new AdkServiceBinding(context, name);
    await obj.unpublish();
  }
}
