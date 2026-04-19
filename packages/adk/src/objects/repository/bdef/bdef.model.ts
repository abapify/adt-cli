/**
 * BDEF - Behavior Definition (RAP)
 *
 * ADK object for ABAP RAP Behavior Definitions (BDEF).
 * These are source-based objects (`.abdl`) stored at:
 *   GET /sap/bc/adt/bo/behaviordefinitions/<name>
 *   GET/PUT /sap/bc/adt/bo/behaviordefinitions/<name>/source/main
 *
 * Lock/activate/create follow the same patterns as other source objects
 * (DDL, DCL). The metadata document uses the shared `blue:blueSource`
 * wrapper — same envelope as TABL/STRUCT.
 *
 * This class intentionally mirrors `AdkDdlSource` (lightweight ADK object,
 * not a full AdkMainObject subclass) because BDEF metadata is source-driven
 * and the typical lifecycle is: create skeleton → PUT source → activate.
 */

import { getGlobalContext } from '../../../base/global-context';
import type { AdkContext } from '../../../base/context';
import { toText } from '../../../base/fetch-utils';

export class AdkBehaviorDefinition {
  /** Static ADK kind marker — used by abapGit handler registry if needed. */
  static readonly kind = 'BehaviorDefinition' as const;
  readonly kind = AdkBehaviorDefinition.kind;

  readonly name: string;
  protected readonly ctx: AdkContext;

  constructor(ctx: AdkContext, name: string) {
    this.ctx = ctx;
    this.name = name.toUpperCase();
  }

  get objectUri(): string {
    return `/sap/bc/adt/bo/behaviordefinitions/${encodeURIComponent(this.name.toLowerCase())}`;
  }

  /** Placeholder description — full metadata requires additional SAP fetch */
  get description(): string {
    return this.name;
  }

  private get contract(): any {
    return this.ctx.client.adt.bo.behaviordefinitions;
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
      objectType: 'BDEF',
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
   * Get a BDEF (validates it exists by fetching source).
   */
  static async get(
    name: string,
    ctx?: AdkContext,
  ): Promise<AdkBehaviorDefinition> {
    const context = ctx ?? getGlobalContext();
    const obj = new AdkBehaviorDefinition(context, name);
    // Validate it exists by fetching source
    await obj.getSource();
    return obj;
  }

  static async exists(name: string, ctx?: AdkContext): Promise<boolean> {
    try {
      await AdkBehaviorDefinition.get(name, ctx);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a new BDEF on SAP.
   *
   * POST /sap/bc/adt/bo/behaviordefinitions?corrNr=...
   * Body matches the `blue:blueSource` envelope (extends
   * abapsource:AbapSourceMainObject).
   */
  static async create(
    name: string,
    description: string,
    packageName: string,
    options?: { transport?: string },
    ctx?: AdkContext,
  ): Promise<AdkBehaviorDefinition> {
    const context = ctx ?? getGlobalContext();
    const nameU = name.toUpperCase();
    const pkgU = packageName.toUpperCase();

    await context.client.adt.bo.behaviordefinitions.post(
      options?.transport ? { corrNr: options.transport } : {},
      {
        blueSource: {
          name: nameU,
          type: 'BDEF/BDO',
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

    return new AdkBehaviorDefinition(context, nameU);
  }

  static async delete(
    name: string,
    options?: { transport?: string; lockHandle?: string },
    ctx?: AdkContext,
  ): Promise<void> {
    const context = ctx ?? getGlobalContext();
    await context.client.adt.bo.behaviordefinitions.delete(name.toUpperCase(), {
      ...(options?.transport ? { corrNr: options.transport } : {}),
      ...(options?.lockHandle ? { lockHandle: options.lockHandle } : {}),
    });
  }
}
