/**
 * DDLX - CDS Metadata Extension (RAP)
 *
 * ADK object for RAP CDS Metadata Extensions.
 *
 * CDS Metadata Extensions provide additional metadata (labels,
 * semantic definitions, UI annotations) for CDS views in RAP.
 */

import { AdkMainObject } from '../../../base/model';
import { CDSEntity as CDSEntityKind } from '../../../base/kinds';
import { getGlobalContext } from '../../../base/global-context';
import type { AdkContext } from '../../../base/context';

/**
 * CDSEntity data type
 *
 * Represents a CDS Metadata Extension or Consumption Entity.
 * CDS Entities extend CDS Views with additional metadata for RAP.
 */
export interface CDSEntityXml {
  name: string;
  type: string;
  description?: string;
  language?: string;
  responsible?: string;
  packageRef?: { name?: string; type?: string };
  masterLanguage?: string;
  abapLanguageVersion?: string;
  entityName?: string;
  baseView?: string;
  metadataExtensionType?: string;
  generatedServiceDefinition?: string;
  draftEnabled?: string;
}

/**
 * ADK CDS Entity object
 *
 * Represents a CDS Metadata Extension (DDLX) for RAP applications.
 * CDS Metadata Extensions provide labels, semantic definitions,
 * and UI annotations for CDS views.
 */
export class AdkCDSEntity extends AdkMainObject<
  typeof CDSEntityKind,
  CDSEntityXml
> {
  static readonly kind = CDSEntityKind;
  readonly kind = AdkCDSEntity.kind;

  get objectUri(): string {
    return `/sap/bc/adt/ddl/ddlx/${encodeURIComponent(this.name)}`;
  }

  protected override get wrapperKey() {
    return 'metadataExtension';
  }

  protected override get crudContract(): any {
    return this.ctx.client.adt.ddl.ddlx;
  }

  static async get(name: string, ctx?: AdkContext): Promise<AdkCDSEntity> {
    const context = ctx ?? getGlobalContext();
    return new AdkCDSEntity(context, name).load();
  }
}

import { registerObjectType } from '../../../base/registry';
registerObjectType('DDLX', CDSEntityKind, AdkCDSEntity, {
  endpoint: 'ddl/ddlx',
});
