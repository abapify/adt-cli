import { getGlobalContext } from '../../base/global-context';
import type { AdkContext } from '../../base/context';
import { toText } from '../../base/fetch-utils';
import type { AdkCrudSourceContract } from './source-object';

/**
 * Shared implementation for standalone CDS/RAP source objects that support
 * full CRUD (get, source.main.get/put, post, delete) plus lock/unlock/activate.
 *
 * DDL, DCL, BDEF, and SRVD all follow the same lifecycle pattern:
 *   create skeleton → PUT source → activate
 * This base eliminates the duplicated load/saveMainSource/lock/unlock/activate
 * boilerplate across those models.
 */
export abstract class AdkCrudSourceObject<
  TMetadata extends Record<string, unknown> = Record<string, unknown>,
> {
  abstract readonly kind: string;
  readonly name: string;
  protected readonly ctx: AdkContext;
  private metadata?: TMetadata;

  protected abstract readonly objectType: string;
  protected abstract readonly endpoint: string;

  protected constructor(ctx: AdkContext, name: string) {
    this.ctx = ctx;
    this.name = name.toUpperCase();
  }

  get objectUri(): string {
    return `/sap/bc/adt/${this.endpoint}/${encodeURIComponent(this.name.toLowerCase())}`;
  }

  protected abstract get contract(): AdkCrudSourceContract;

  protected abstract getMetadataKey(): keyof TMetadata & string;

  get description(): string {
    const key = this.getMetadataKey();
    return (
      (this.metadata?.[key] as { description?: string })?.description ??
      this.name
    );
  }

  get originalLanguage(): string | undefined {
    const key = this.getMetadataKey();
    return (this.metadata?.[key] as { masterLanguage?: string })
      ?.masterLanguage;
  }

  get abapLanguageVersion(): string | undefined {
    const key = this.getMetadataKey();
    return (this.metadata?.[key] as { abapLanguageVersion?: string })
      ?.abapLanguageVersion;
  }

  get package(): string | undefined {
    const key = this.getMetadataKey();
    return (this.metadata?.[key] as { packageRef?: { name?: string } })
      ?.packageRef?.name;
  }

  // ─── Source ────────────────────────────────────────────────────────────────

  async getSource(): Promise<string> {
    return toText(await this.contract.source.main.get(this.name));
  }

  async load(): Promise<this> {
    const [metadata] = await Promise.all([
      this.contract.get(this.name),
      this.getSource(),
    ]);
    this.metadata = metadata as TMetadata;
    return this;
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
      objectType: this.objectType,
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
    } as never);
    return this;
  }

  // ─── Static helpers ────────────────────────────────────────────────────────

  protected static resolveContext(ctx?: AdkContext): AdkContext {
    return ctx ?? getGlobalContext();
  }

  /**
   * Get a source object (validates it exists by fetching source).
   * Generic helper used by static `get()` on subclasses.
   */
  protected static async getSourceObject<T extends AdkCrudSourceObject>(
    this: new (ctx: AdkContext, name: string) => T,
    name: string,
    ctx?: AdkContext,
  ): Promise<T> {
    const context = AdkCrudSourceObject.resolveContext(ctx);
    const obj = new this(context, name);
    await obj.getSource();
    return obj;
  }

  /**
   * Check if a source object exists.
   * Generic helper used by static `exists()` on subclasses.
   */
  protected static async sourceObjectExists<T extends AdkCrudSourceObject>(
    this: new (ctx: AdkContext, name: string) => T,
    name: string,
    ctx?: AdkContext,
  ): Promise<boolean> {
    try {
      await this.getSourceObject(name, ctx);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Shared skeleton-creation helper. Subclasses pass their contract's `post`
   * function and the root element name + type that their AFF schema expects.
   */
  protected static async createSourceSkeleton<T extends AdkCrudSourceObject>(
    this: new (ctx: AdkContext, name: string) => T,
    params: {
      name: string;
      description: string;
      packageName: string;
      transport?: string;
      ctx?: AdkContext;
      rootKey: string;
      objectTypeCode: string;
      responsible?: string;
    },
    post: (
      query: Record<string, string>,
      body: Record<string, unknown>,
    ) => Promise<unknown>,
  ): Promise<T> {
    const context = AdkCrudSourceObject.resolveContext(params.ctx);
    const nameU = params.name.toUpperCase();
    const pkgU = params.packageName.toUpperCase();

    await post(params.transport ? { corrNr: params.transport } : {}, {
      [params.rootKey]: {
        name: nameU,
        ...(params.objectTypeCode ? { type: params.objectTypeCode } : {}),
        description: params.description,
        language: 'EN',
        masterLanguage: 'EN',
        responsible: params.responsible ?? '$TMP',
        packageRef: {
          name: pkgU,
          type: 'DEVC/K',
          uri: `/sap/bc/adt/packages/${pkgU.toLowerCase()}`,
        },
      },
    } as never);

    return new this(context, nameU);
  }

  /**
   * Shared delete helper. Subclasses pass their contract's `delete` function.
   */
  protected static async deleteSource(
    name: string,
    options: { transport?: string; lockHandle?: string } | undefined,
    deleteFn: (
      name: string,
      options: Record<string, string>,
    ) => Promise<unknown>,
  ): Promise<void> {
    await deleteFn(name.toUpperCase(), {
      ...(options?.transport ? { corrNr: options.transport } : {}),
      ...(options?.lockHandle ? { lockHandle: options.lockHandle } : {}),
    });
  }
}
