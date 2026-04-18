/**
 * BAdI — Enhancement Implementation (ENHO/XHH) — RAP-era BAdI container.
 *
 * ADK object for ABAP Enhancement Implementations that host BAdI
 * implementations. These live at:
 *
 *   GET    /sap/bc/adt/enhancements/enhoxhh/<name>
 *   PUT    /sap/bc/adt/enhancements/enhoxhh/<name>
 *   DELETE /sap/bc/adt/enhancements/enhoxhh/<name>
 *   GET/PUT /sap/bc/adt/enhancements/enhoxhh/<name>/source/main
 *
 * Mirrors the source-driven pattern used by `AdkBehaviorDefinition`
 * (BDEF): create skeleton → PUT source → activate.
 *
 * sapcli reference: `sap/cli/badi.py` (`_get_enhancement_implementation`).
 */

import { getGlobalContext } from '../../../base/global-context';
import type { AdkContext } from '../../../base/context';
import { toText } from '../../../base/fetch-utils';

export class AdkBadi {
  /** Static ADK kind marker. */
  static readonly kind = 'Badi' as const;
  readonly kind = AdkBadi.kind;

  readonly name: string;
  protected readonly ctx: AdkContext;

  constructor(ctx: AdkContext, name: string) {
    this.ctx = ctx;
    this.name = name.toUpperCase();
  }

  /** ADT URI (lowercase path segment — SAP convention). */
  get objectUri(): string {
    return `/sap/bc/adt/enhancements/enhoxhh/${encodeURIComponent(this.name.toLowerCase())}`;
  }

  /** Placeholder description — real metadata arrives via GET/objectstructure. */
  get description(): string {
    return this.name;
  }

  private get contract(): any {
    return this.ctx.client.adt.enhancements.enhoxhh;
  }

  // ─── Metadata ──────────────────────────────────────────────────────────────

  async getMetadata(): Promise<unknown> {
    return await this.contract.get(this.name);
  }

  // ─── Source ────────────────────────────────────────────────────────────────

  async getSource(): Promise<string> {
    const result = await this.contract.source.main.get(this.name);
    return toText(result);
  }

  async saveMainSource(
    source: string,
    options?: { lockHandle?: string; transport?: string },
  ): Promise<void> {
    await this.contract.source.main.put(
      this.name,
      {
        ...(options?.lockHandle ? { lockHandle: options.lockHandle } : {}),
        ...(options?.transport ? { corrNr: options.transport } : {}),
      },
      source,
    );
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
      objectType: 'ENHO',
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

  // ─── Static Factory Methods ────────────────────────────────────────────────

  /** Fetch a BAdI / ENHO, validating existence via a metadata GET. */
  static async get(name: string, ctx?: AdkContext): Promise<AdkBadi> {
    const context = ctx ?? getGlobalContext();
    const obj = new AdkBadi(context, name);
    await obj.getMetadata();
    return obj;
  }

  static async exists(name: string, ctx?: AdkContext): Promise<boolean> {
    try {
      await AdkBadi.get(name, ctx);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a new Enhancement Implementation (BAdI container).
   *
   * Trial systems typically reject this with HTTP 403 — this is an
   * area that requires elevated authorisation on most SAP installs.
   */
  static async create(
    name: string,
    description: string,
    packageName: string,
    options?: { transport?: string },
    ctx?: AdkContext,
  ): Promise<AdkBadi> {
    const context = ctx ?? getGlobalContext();
    const nameU = name.toUpperCase();
    const pkgU = packageName.toUpperCase();

    await context.client.adt.enhancements.enhoxhh.post(
      options?.transport ? { corrNr: options.transport } : {},
      {
        enhancementImplementation: {
          name: nameU,
          type: 'ENHO/XHH',
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

    return new AdkBadi(context, nameU);
  }

  static async delete(
    name: string,
    options?: { transport?: string; lockHandle?: string },
    ctx?: AdkContext,
  ): Promise<void> {
    const context = ctx ?? getGlobalContext();
    await context.client.adt.enhancements.enhoxhh.delete(name.toUpperCase(), {
      ...(options?.transport ? { corrNr: options.transport } : {}),
      ...(options?.lockHandle ? { lockHandle: options.lockHandle } : {}),
    });
  }
}
