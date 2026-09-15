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
import { BehaviorDefinition } from '../../../base/kinds';
import { registerObjectType } from '../../../base/registry';
import type { AdkCrudSourceContract } from '../../cds/source-object';
import { AdkCrudSourceObject } from '../../cds/crud-source-object';

interface BdefMetadata {
  blueSource?: {
    description?: string;
    masterLanguage?: string;
    abapLanguageVersion?: string;
    packageRef?: { name?: string };
  };
}

export class AdkBehaviorDefinition extends AdkCrudSourceObject<BdefMetadata> {
  /** Static ADK kind marker — used by abapGit handler registry if needed. */
  static readonly kind = BehaviorDefinition;
  readonly kind = AdkBehaviorDefinition.kind;

  protected readonly objectType = 'BDEF';
  protected readonly endpoint = 'bo/behaviordefinitions';

  private get contract(): AdkCrudSourceContract {
    return this.ctx.client.adt.bo
      .behaviordefinitions as unknown as AdkCrudSourceContract;
  }

  protected getMetadataKey(): 'blueSource' {
    return 'blueSource';
  }

  // ─── Static Factory Methods ─────────────────────────────────────────────────

  /**
   * Get a BDEF (validates it exists by fetching source).
   */
  static async get(
    name: string,
    ctx?: AdkContext,
  ): Promise<AdkBehaviorDefinition> {
    return AdkCrudSourceObject.getSourceObject.call(
      this,
      name,
      ctx,
    ) as Promise<AdkBehaviorDefinition>;
  }

  static async exists(name: string, ctx?: AdkContext): Promise<boolean> {
    return AdkCrudSourceObject.sourceObjectExists.call(this, name, ctx);
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
    return AdkCrudSourceObject.createSourceSkeleton.call(
      this,
      {
        name,
        description,
        packageName,
        transport: options?.transport,
        ctx,
        rootKey: 'blueSource',
        objectTypeCode: 'BDEF/BDO',
        responsible: packageName.toUpperCase(),
      },
      context.client.adt.bo.behaviordefinitions.post.bind(
        context.client.adt.bo.behaviordefinitions,
      ),
    ) as Promise<AdkBehaviorDefinition>;
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
      context.client.adt.bo.behaviordefinitions.delete.bind(
        context.client.adt.bo.behaviordefinitions,
      ),
    );
  }
}

registerObjectType('BDEF', BehaviorDefinition, AdkBehaviorDefinition, {
  endpoint: 'bo/behaviordefinitions',
});
