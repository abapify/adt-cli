/**
 * TTYP - Table Type
 *
 * ADK object for ABAP Table Types (TTYP).
 * DDIC objects are metadata-only (no source code).
 */

import { AdkMainObject } from '../../../base/model';
import { TableType as TableTypeKind } from '../../../base/kinds';
import { getGlobalContext } from '../../../base/global-context';
import type { AdkContext } from '../../../base/context';

import type { TableTypeResponse } from '../../../base/adt';

/**
 * Table Type data type - unwrap from schema root element
 */
export type TableTypeXml = TableTypeResponse['tableType'];

/**
 * ADK Table Type object
 *
 * Inherits from AdkMainObject which provides:
 * - name, type, description, version, language, changedBy/At, createdBy/At, links
 * - package, packageRef, responsible, masterLanguage, masterSystem, abapLanguageVersion
 *
 * Table type-specific properties via `data`:
 * - data.rowType (typeName, typeCategory, tableTypeSchemaReference)
 * - data.primaryKey
 * - data.secondaryKeys
 */
export class AdkTableType extends AdkMainObject<
  typeof TableTypeKind,
  TableTypeXml
> {
  static readonly kind = TableTypeKind;
  readonly kind = AdkTableType.kind;

  get objectUri(): string {
    return `/sap/bc/adt/ddic/tabletypes/${encodeURIComponent(this.name.toLowerCase())}`;
  }

  protected override get wrapperKey() {
    return 'tableType';
  }
  protected override get crudContract(): any {
    return this.ctx.client.adt.ddic.tabletypes;
  }

  static async get(name: string, ctx?: AdkContext): Promise<AdkTableType> {
    const context = ctx ?? getGlobalContext();
    return new AdkTableType(context, name).load();
  }
}

// Self-register with ADK registry
import { registerObjectType } from '../../../base/registry';
registerObjectType('TTYP', TableTypeKind, AdkTableType);
