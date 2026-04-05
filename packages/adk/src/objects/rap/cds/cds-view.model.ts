/**
 * DDLS - CDS View (RAP)
 *
 * ADK object for RAP CDS Views (Data Definition Language Source).
 *
 * CDS Views define the data model in the ABAP RESTful Application
 * Programming model using the Core Data Services.
 */

import { AdkMainObject } from '../../../base/model';
import { CDSView as CDSViewKind } from '../../../base/kinds';
import { getGlobalContext } from '../../../base/global-context';
import type { AdkContext } from '../../../base/context';

/**
 * CDSView data type
 *
 * Represents a CDS View definition.
 * CDS Views include: viewName, exposure, dataSources, fields,
 * associations, and various annotations.
 */
export interface CDSViewXml {
  name: string;
  type: string;
  description?: string;
  language?: string;
  responsible?: string;
  packageRef?: { name?: string; type?: string };
  masterLanguage?: string;
  abapLanguageVersion?: string;
  viewName?: string;
  exposure?: string;
  dataSources?: DataSource[];
  generatedRuntimeObject?: string;
  semantic?: string;
}

export interface DataSource {
  id?: string;
  name?: string;
  type?: string;
  alias?: string;
}

/**
 * ADK CDS View object
 *
 * Represents a CDS View (DDLS) for RAP applications.
 * CDS Views define the data projection and are the foundation
 * of RAP entity definitions.
 */
export class AdkCDSView extends AdkMainObject<typeof CDSViewKind, CDSViewXml> {
  static readonly kind = CDSViewKind;
  readonly kind = AdkCDSView.kind;

  get objectUri(): string {
    return `/sap/bc/adt/ddl/ddls/${encodeURIComponent(this.name)}`;
  }

  protected override get wrapperKey() {
    return 'ddls';
  }

  protected override get crudContract(): any {
    return this.ctx.client.adt.ddl.ddls;
  }

  static async get(name: string, ctx?: AdkContext): Promise<AdkCDSView> {
    const context = ctx ?? getGlobalContext();
    return new AdkCDSView(context, name).load();
  }
}

import { registerObjectType } from '../../../base/registry';
registerObjectType('DDLS', CDSViewKind, AdkCDSView, { endpoint: 'ddl/ddls' });
