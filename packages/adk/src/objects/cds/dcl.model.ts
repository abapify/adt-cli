/**
 * DCL - CDS Access Control Definition Language Source (DCLS)
 *
 * ADK object for ABAP CDS Access Control (DCL) sources.
 * These are source-based objects stored at:
 *   GET/PUT /sap/bc/adt/acm/dcl/sources/<name>/source/main
 *
 * The metadata document is at:
 *   GET /sap/bc/adt/acm/dcl/sources/<name>
 *
 * Lock/activate/create follow the same patterns as DDL sources.
 */

import { getGlobalContext } from '../../base/global-context';
import type { AdkContext } from '../../base/context';
import { DclSource } from '../../base/kinds';
import { registerObjectType } from '../../base/registry';
import type { AdkCrudSourceContract } from './source-object';
import { AdkCrudSourceObject } from './crud-source-object';

interface DclMetadata {
  dclSource?: {
    description?: string;
    masterLanguage?: string;
    packageRef?: { name?: string };
  };
}

export class AdkDclSource extends AdkCrudSourceObject<DclMetadata> {
  static readonly kind = DclSource;
  readonly kind = AdkDclSource.kind;

  protected readonly objectType = 'DCLS';
  protected readonly endpoint = 'acm/dcl/sources';

  private get contract(): AdkCrudSourceContract {
    return this.ctx.client.adt.ddic.dcl.sources as AdkCrudSourceContract;
  }

  protected getMetadataKey(): 'dclSource' {
    return 'dclSource';
  }

  // ─── Static Factory Methods ─────────────────────────────────────────────────

  static async get(name: string, ctx?: AdkContext): Promise<AdkDclSource> {
    return AdkCrudSourceObject.getSourceObject.call(
      this,
      name,
      ctx,
    ) as Promise<AdkDclSource>;
  }

  static async exists(name: string, ctx?: AdkContext): Promise<boolean> {
    return AdkCrudSourceObject.sourceObjectExists.call(this, name, ctx);
  }

  /**
   * Create a new CDS DCL source on SAP
   */
  static async create(
    name: string,
    description: string,
    packageName: string,
    options?: { transport?: string },
    ctx?: AdkContext,
  ): Promise<AdkDclSource> {
    const context = ctx ?? getGlobalContext();
    return AdkCrudSourceObject.createSourceSkeleton.call(
      this,
      {
        name,
        description,
        packageName,
        transport: options?.transport,
        ctx,
        rootKey: 'source',
        objectTypeCode: '',
      },
      context.client.adt.ddic.dcl.sources.post.bind(
        context.client.adt.ddic.dcl.sources,
      ),
    ) as Promise<AdkDclSource>;
  }

  static async delete(
    name: string,
    options?: { transport?: string; lockHandle?: string },
    ctx?: AdkContext,
  ): Promise<void> {
    const context = ctx ?? getGlobalContext();
    return AdkCrudSourceObject.deleteSource(
      name,
      options,
      context.client.adt.ddic.dcl.sources.delete.bind(
        context.client.adt.ddic.dcl.sources,
      ),
    );
  }
}

registerObjectType('DCLS', DclSource, AdkDclSource, {
  endpoint: 'acm/dcl/sources',
});
