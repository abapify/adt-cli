/**
 * PROG - ABAP Program
 *
 * ADK object for ABAP programs (PROG).
 */

import { AdkMainObject } from '../../../base/model';
import { Program as ProgramKind } from '../../../base/kinds';
import { getGlobalContext } from '../../../base/global-context';
import type { AdkContext } from '../../../base/context';

// Import response type from ADT integration layer
import type { ProgramResponse } from '../../../base/adt';

/**
 * Program data type - unwrap from root element
 *
 * The schema wraps everything in an 'abapProgram' element, so we unwrap it here
 * to provide a flat structure for ADK consumers.
 */
export type ProgramXml = ProgramResponse['abapProgram'];

/**
 * ADK Program object
 *
 * Inherits from AdkMainObject which provides:
 * - AdkObject: name, type, description, version, language, changedBy/At, createdBy/At, links
 * - AdkMainObject: package, packageRef, responsible, masterLanguage, masterSystem, abapLanguageVersion
 *
 * Access program-specific properties via `data`:
 * - data.programType, data.sourceUri, data.fixPointArithmetic, data.activeUnicodeCheck
 */
export class AdkProgram extends AdkMainObject<typeof ProgramKind, ProgramXml> {
  static readonly kind = ProgramKind;
  readonly kind = AdkProgram.kind;

  // ADT object URI (computed - not in data)
  get objectUri(): string {
    return `/sap/bc/adt/programs/programs/${encodeURIComponent(this.name.toLowerCase())}`;
  }

  // Lazy segments - source code

  async getSource(): Promise<string> {
    return this.lazy('source', async () => {
      return this.ctx.client.adt.programs.programs.source.main.get(this.name);
    });
  }

  // savePendingSources, checkPendingSourcesUnchanged, hasPendingSources,
  // and saveMainSource are all handled by the base class via objectUri + /source/main

  // ============================================
  // CRUD contract config - enables save()
  // ============================================

  protected override get wrapperKey() {
    return 'abapProgram';
  }
  // Note: `any` return type is intentional here — this is an established pattern
  // in the ADK codebase (see intf.model.ts). The base class defines
  // crudContract as `any` to support different contract structures per object type.
  protected override get crudContract(): any {
    return this.ctx.client.adt.programs.programs;
  }

  // ============================================
  // Static Factory Methods
  // ============================================

  static async get(name: string, ctx?: AdkContext): Promise<AdkProgram> {
    const context = ctx ?? getGlobalContext();
    return new AdkProgram(context, name).load();
  }

  /**
   * Check if a program exists on SAP
   */
  static async exists(name: string, ctx?: AdkContext): Promise<boolean> {
    try {
      await AdkProgram.get(name, ctx);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a new ABAP program on SAP
   *
   * @param name - Program name (e.g., 'ZMYPROGRAM')
   * @param description - Short description
   * @param packageName - Package to assign the program to
   * @param options - Save options (transport)
   * @param ctx - Optional ADK context
   */
  static async create(
    name: string,
    description: string,
    packageName: string,
    options?: { transport?: string },
    ctx?: AdkContext,
  ): Promise<AdkProgram> {
    const context = ctx ?? getGlobalContext();
    const prog = new AdkProgram(context, name.toUpperCase());
    prog.setData({
      name: name.toUpperCase(),
      type: 'PROG/P',
      description,
      language: 'EN',
      masterLanguage: 'EN',
      packageRef: {
        name: packageName.toUpperCase(),
        uri: `/sap/bc/adt/packages/${encodeURIComponent(packageName.toUpperCase())}`,
        type: 'DEVC/K',
      },
    } as unknown as ProgramXml);
    await prog.save({ transport: options?.transport, mode: 'create' });
    return prog;
  }

  /**
   * Delete an ABAP program from SAP
   *
   * @param name - Program name
   * @param options - Delete options (transport)
   * @param ctx - Optional ADK context
   */
  static async delete(
    name: string,
    options?: { transport?: string; lockHandle?: string },
    ctx?: AdkContext,
  ): Promise<void> {
    const context = ctx ?? getGlobalContext();
    const prog = new AdkProgram(context, name.toUpperCase());
    const contract = prog.crudContract;
    await contract.delete(name.toUpperCase(), {
      corrNr: options?.transport,
      lockHandle: options?.lockHandle,
    });
  }
}

// Self-register with ADK registry
import { registerObjectType } from '../../../base/registry';
registerObjectType('PROG', ProgramKind, AdkProgram, {
  endpoint: 'programs/programs',
});
