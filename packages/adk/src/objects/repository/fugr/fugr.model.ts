/**
 * FUGR - ABAP Function Group
 *
 * ADK object for ABAP function groups (FUGR).
 */

import { AdkMainObject } from '../../../base/model';
import { FunctionGroup as FunctionGroupKind } from '../../../base/kinds';
import { getGlobalContext } from '../../../base/global-context';
import type { AdkContext } from '../../../base/context';

// Import response type from ADT integration layer
import type { FunctionGroupResponse } from '../../../base/adt';

/**
 * Function group data type - unwrap from root element
 *
 * The schema wraps everything in an 'abapFunctionGroup' element, so we unwrap it here
 * to provide a flat structure for ADK consumers.
 */
export type FunctionGroupXml = FunctionGroupResponse['abapFunctionGroup'];

/**
 * ADK Function Group object
 *
 * Inherits from AdkMainObject which provides:
 * - AdkObject: name, type, description, version, language, changedBy/At, createdBy/At, links
 * - AdkMainObject: package, packageRef, responsible, masterLanguage, masterSystem, abapLanguageVersion
 *
 * Access function group-specific properties via `data`:
 * - data.sourceUri, data.fixPointArithmetic, data.activeUnicodeCheck
 */
export class AdkFunctionGroup extends AdkMainObject<
  typeof FunctionGroupKind,
  FunctionGroupXml
> {
  static readonly kind = FunctionGroupKind;
  readonly kind = AdkFunctionGroup.kind;

  // ADT object URI (computed - not in data)
  get objectUri(): string {
    return `/sap/bc/adt/functions/groups/${encodeURIComponent(this.name.toLowerCase())}`;
  }

  // Lazy segments - source code

  async getSource(): Promise<string> {
    return this.lazy('source', async () => {
      return this.ctx.client.adt.functions.groups.source.main.get(this.name);
    });
  }

  // savePendingSources, checkPendingSourcesUnchanged, hasPendingSources,
  // and saveMainSource are all handled by the base class via objectUri + /source/main

  // ============================================
  // CRUD contract config - enables save()
  // ============================================

  protected override get wrapperKey() {
    return 'abapFunctionGroup';
  }
  // Note: `any` return type is intentional here — this is an established pattern
  // in the ADK codebase (see intf.model.ts). The base class defines
  // crudContract as `any` to support different contract structures per object type.
  protected override get crudContract(): any {
    return this.ctx.client.adt.functions.groups;
  }

  // ============================================
  // Static Factory Method
  // ============================================

  static async get(name: string, ctx?: AdkContext): Promise<AdkFunctionGroup> {
    const context = ctx ?? getGlobalContext();
    return new AdkFunctionGroup(context, name).load();
  }
}

// Self-register with ADK registry
import { registerObjectType } from '../../../base/registry';
registerObjectType('FUGR', FunctionGroupKind, AdkFunctionGroup, {
  endpoint: 'functions/groups',
});
