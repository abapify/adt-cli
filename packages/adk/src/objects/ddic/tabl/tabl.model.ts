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
import { toText } from '../../../base/fetch-utils';

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

  /**
   * Get CDS-style table source code from SAP
   * Returns the ABAP source definition (annotations + field definitions)
   */
  async getSource(): Promise<string> {
    return this.lazy('source', async () => {
      const response = await this.ctx.client.fetch(
        `${this.objectUri}/source/main`,
        { method: 'GET', headers: { Accept: 'text/plain' } },
      );
      return toText(response);
    });
  }

  /**
   * Get table technical settings (DD09L data)
   * Returns XML from /sap/bc/adt/ddic/db/settings/{name}
   */
  async getSettings(): Promise<string> {
    return this.lazy('settings', async () => {
      const response = await this.ctx.client.fetch(
        `/sap/bc/adt/ddic/db/settings/${encodeURIComponent(this.name.toLowerCase())}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/vnd.sap.adt.table.settings.v2+xml',
          },
        },
      );
      return toText(response);
    });
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

  static async exists(name: string, ctx?: AdkContext): Promise<boolean> {
    try {
      await AdkTable.get(name, ctx);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a new ABAP database table on SAP.
   */
  static async create(
    name: string,
    description: string,
    packageName: string,
    options?: { transport?: string },
    ctx?: AdkContext,
  ): Promise<AdkTable> {
    const context = ctx ?? getGlobalContext();
    const table = new AdkTable(context, name.toUpperCase());
    table.setData({
      name: name.toUpperCase(),
      type: 'TABL/DT',
      description,
      language: 'EN',
      masterLanguage: 'EN',
      packageRef: {
        name: packageName.toUpperCase(),
        uri: `/sap/bc/adt/packages/${encodeURIComponent(packageName.toUpperCase())}`,
        type: 'DEVC/K',
      },
    } as unknown as TableXml);
    await table.save({ transport: options?.transport, mode: 'create' });
    return table;
  }

  static async delete(
    name: string,
    options?: { transport?: string; lockHandle?: string },
    ctx?: AdkContext,
  ): Promise<void> {
    const context = ctx ?? getGlobalContext();
    const table = new AdkTable(context, name.toUpperCase());
    await table.crudContract.delete(name.toUpperCase(), {
      ...(options?.transport && { corrNr: options.transport }),
      ...(options?.lockHandle && { lockHandle: options.lockHandle }),
    });
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

  /**
   * Get CDS-style structure source code from SAP
   * Returns the ABAP source definition (annotations + field definitions)
   */
  async getSource(): Promise<string> {
    return this.lazy('source', async () => {
      const response = await this.ctx.client.fetch(
        `${this.objectUri}/source/main`,
        { method: 'GET', headers: { Accept: 'text/plain' } },
      );
      return toText(response);
    });
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

  static async exists(name: string, ctx?: AdkContext): Promise<boolean> {
    try {
      await AdkStructure.get(name, ctx);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a new ABAP structure on SAP.
   */
  static async create(
    name: string,
    description: string,
    packageName: string,
    options?: { transport?: string },
    ctx?: AdkContext,
  ): Promise<AdkStructure> {
    const context = ctx ?? getGlobalContext();
    const struct = new AdkStructure(context, name.toUpperCase());
    struct.setData({
      name: name.toUpperCase(),
      type: 'TABL/DS',
      description,
      language: 'EN',
      masterLanguage: 'EN',
      packageRef: {
        name: packageName.toUpperCase(),
        uri: `/sap/bc/adt/packages/${encodeURIComponent(packageName.toUpperCase())}`,
        type: 'DEVC/K',
      },
    } as unknown as TableXml);
    await struct.save({ transport: options?.transport, mode: 'create' });
    return struct;
  }

  static async delete(
    name: string,
    options?: { transport?: string; lockHandle?: string },
    ctx?: AdkContext,
  ): Promise<void> {
    const context = ctx ?? getGlobalContext();
    const struct = new AdkStructure(context, name.toUpperCase());
    await struct.crudContract.delete(name.toUpperCase(), {
      ...(options?.transport && { corrNr: options.transport }),
      ...(options?.lockHandle && { lockHandle: options.lockHandle }),
    });
  }
}

// Self-register with ADK registry
import { registerObjectType } from '../../../base/registry';
registerObjectType('TABL', TableKind, AdkTable, { endpoint: 'ddic/tables' });
registerObjectType('TABL/DS', StructureKind, AdkStructure, {
  endpoint: 'ddic/structures',
});
