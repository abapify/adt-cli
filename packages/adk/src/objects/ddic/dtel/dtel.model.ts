/**
 * DTEL - Data Element
 *
 * ADK object for ABAP Data Elements (DTEL).
 * DDIC objects are metadata-only (no source code).
 */

import { AdkMainObject } from '../../../base/model';
import { DataElement as DataElementKind } from '../../../base/kinds';
import { getGlobalContext } from '../../../base/global-context';
import type { AdkContext } from '../../../base/context';

import type { DataElementResponse } from '../../../base/adt';

/**
 * Data Element data type - unwrap from wrapper root element
 * SAP wraps DTEL content in a blue:wbobj element extending AdtMainObject
 */
export type DataElementXml = DataElementResponse['wbobj'];

/**
 * ADK Data Element object
 *
 * Inherits from AdkMainObject which provides:
 * - name, type, description, version, language, changedBy/At, createdBy/At, links
 * - package, packageRef, responsible, masterLanguage, masterSystem, abapLanguageVersion
 *
 * Data element-specific properties via `data`:
 * - data.typeKind, data.typeName, data.dataType
 * - data.shortDescription, data.mediumDescription, data.longDescription, data.headingDescription
 * - data.searchHelp
 */
export class AdkDataElement extends AdkMainObject<
  typeof DataElementKind,
  DataElementXml
> {
  static readonly kind = DataElementKind;
  readonly kind = AdkDataElement.kind;

  get objectUri(): string {
    return `/sap/bc/adt/ddic/dataelements/${encodeURIComponent(this.name.toLowerCase())}`;
  }

  protected override get wrapperKey() {
    return 'wbobj';
  }
  protected override get crudContract(): any {
    return this.ctx.client.adt.ddic.dataelements;
  }

  static async get(name: string, ctx?: AdkContext): Promise<AdkDataElement> {
    const context = ctx ?? getGlobalContext();
    return new AdkDataElement(context, name).load();
  }
}

// Self-register with ADK registry
import { registerObjectType } from '../../../base/registry';
registerObjectType('DTEL', DataElementKind, AdkDataElement);
