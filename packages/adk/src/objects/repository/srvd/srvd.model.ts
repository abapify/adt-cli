/**
 * SRVD - Service Definition (RAP)
 *
 * ADK object for ABAP RAP Service Definitions (SRVD).
 * Source-based objects (`.asrvd`) stored at:
 *   GET /sap/bc/adt/ddic/srvd/sources/<name>
 *   GET/PUT /sap/bc/adt/ddic/srvd/sources/<name>/source/main
 *
 * Lock/activate/create follow the same patterns as other source objects
 * (DDL, DCL, BDEF). Metadata envelope is the dedicated `srvd:source`
 * wrapper extending abapsource:AbapSourceMainObject (mirrors DDL).
 */

import { getGlobalContext } from '../../../base/global-context';
import type { AdkContext } from '../../../base/context';
import { toText } from '../../../base/fetch-utils';

export class AdkServiceDefinition {
  /** Static ADK kind marker — used by abapGit handler registry if needed. */
  static readonly kind = 'ServiceDefinition' as const;
  readonly kind = AdkServiceDefinition.kind;

  readonly name: string;
  protected readonly ctx: AdkContext;

  constructor(ctx: AdkContext, name: string) {
    this.ctx = ctx;
    this.name = name.toUpperCase();
  }

  get objectUri(): string {
    return `/sap/bc/adt/ddic/srvd/sources/${encodeURIComponent(this.name.toLowerCase())}`;
  }

  /** Placeholder description — full metadata requires additional SAP fetch */
  get description(): string {
    return this.name;
  }

  private get contract(): any {
    return this.ctx.client.adt.ddic.srvd.sources;
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
      objectType: 'SRVD',
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

  // ─── Static Factory Methods ─────────────────────────────────────────────────

  /**
   * Get a SRVD (validates it exists by fetching source).
   */
  static async get(
    name: string,
    ctx?: AdkContext,
  ): Promise<AdkServiceDefinition> {
    const context = ctx ?? getGlobalContext();
    const obj = new AdkServiceDefinition(context, name);
    // Validate it exists by fetching source
    await obj.getSource();
    return obj;
  }

  static async exists(name: string, ctx?: AdkContext): Promise<boolean> {
    try {
      await AdkServiceDefinition.get(name, ctx);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a new SRVD on SAP.
   *
   * POST /sap/bc/adt/ddic/srvd/sources?corrNr=...
   * Body matches the `srvd:source` envelope (extends
   * abapsource:AbapSourceMainObject).
   */
  static async create(
    name: string,
    description: string,
    packageName: string,
    options?: { transport?: string },
    ctx?: AdkContext,
  ): Promise<AdkServiceDefinition> {
    const context = ctx ?? getGlobalContext();
    const nameU = name.toUpperCase();
    const pkgU = packageName.toUpperCase();

    await context.client.adt.ddic.srvd.sources.post(
      options?.transport ? { corrNr: options.transport } : {},
      {
        source: {
          name: nameU,
          type: 'SRVD/SRV',
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

    return new AdkServiceDefinition(context, nameU);
  }

  static async delete(
    name: string,
    options?: { transport?: string; lockHandle?: string },
    ctx?: AdkContext,
  ): Promise<void> {
    const context = ctx ?? getGlobalContext();
    await context.client.adt.ddic.srvd.sources.delete(name.toUpperCase(), {
      ...(options?.transport ? { corrNr: options.transport } : {}),
      ...(options?.lockHandle ? { lockHandle: options.lockHandle } : {}),
    });
  }
}
