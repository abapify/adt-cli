/**
 * TABL - Database Table / Structure
 *
 * ADK object for ABAP Database Tables (TABL/DT) and Structures (TABL/DS).
 * Tables and structures are source-based DDIC objects whose definition
 * lives in ABAP source code (retrieved via sourceUri).
 *
 * Note: Tables and structures share the same ADT main type (TABL)
 * but use different endpoints and subtypes.
 * - Tables: /sap/bc/adt/ddic/tables (TABL/DT)
 * - Structures: /sap/bc/adt/ddic/structures (TABL/DS)
 *
 * SAP wraps both in a blue:blueSource root element
 * (namespace http://www.sap.com/wbobj/blue) extending AbapSourceMainObject.
 */

import { AdkMainObject } from '../../../base/model';
import {
  Table as TableKind,
  Structure as StructureKind,
} from '../../../base/kinds';
import { getGlobalContext } from '../../../base/global-context';
import type { AdkContext } from '../../../base/context';

import type { TableResponse } from '../../../base/adt';

/**
 * Table/Structure data type - unwrap from blueSource wrapper root element
 */
export type TableXml = TableResponse['blueSource'];

/**
 * ADK Table object (database table - TABL/DT)
 */
export class AdkTable extends AdkMainObject<typeof TableKind, TableXml> {
  static readonly kind = TableKind;
  readonly kind = AdkTable.kind;

  get objectUri(): string {
    return `/sap/bc/adt/ddic/tables/${encodeURIComponent(this.name.toLowerCase())}`;
  }

  protected override get wrapperKey() {
    return 'blueSource';
  }
  protected override get crudContract(): any {
    return this.ctx.client.adt.ddic.tables;
  }

  static async get(name: string, ctx?: AdkContext): Promise<AdkTable> {
    const context = ctx ?? getGlobalContext();
    return new AdkTable(context, name).load();
  }
}

/**
 * ADK Structure object (TABL/DS)
 */
export class AdkStructure extends AdkMainObject<
  typeof StructureKind,
  TableXml
> {
  static readonly kind = StructureKind;
  readonly kind = AdkStructure.kind;

  get objectUri(): string {
    return `/sap/bc/adt/ddic/structures/${encodeURIComponent(this.name.toLowerCase())}`;
  }

  protected override get wrapperKey() {
    return 'blueSource';
  }
  protected override get crudContract(): any {
    return this.ctx.client.adt.ddic.structures;
  }

  static async get(name: string, ctx?: AdkContext): Promise<AdkStructure> {
    const context = ctx ?? getGlobalContext();
    return new AdkStructure(context, name).load();
  }
}

// Self-register with ADK registry
import { registerObjectType } from '../../../base/registry';
registerObjectType('TABL', TableKind, AdkTable);
// Note: Structure uses same main type TABL but different ADK kind
// Registration uses TABL main type - structures will be resolved via subtype logic
