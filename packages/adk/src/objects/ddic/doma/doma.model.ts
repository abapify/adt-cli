/**
 * DOMA - Domain
 *
 * ADK object for ABAP Domains (DOMA).
 * DDIC objects are metadata-only (no source code).
 */

import { AdkMainObject } from '../../../base/model';
import { Domain as DomainKind } from '../../../base/kinds';
import { getGlobalContext } from '../../../base/global-context';
import type { AdkContext } from '../../../base/context';

import type { DomainResponse } from '../../../base/adt';

/**
 * Domain data type - unwrap from schema root element
 */
export type DomainXml = DomainResponse['domain'];

/**
 * ADK Domain object
 *
 * Inherits from AdkMainObject which provides:
 * - name, type, description, version, language, changedBy/At, createdBy/At, links
 * - package, packageRef, responsible, masterLanguage, masterSystem, abapLanguageVersion
 *
 * Domain-specific properties via `data`:
 * - data.typeInformation (dataType, length, decimals, outputLength)
 * - data.outputInformation (conversionExit, signPresentation, lowerCase)
 * - data.fixedValues
 */
export class AdkDomain extends AdkMainObject<typeof DomainKind, DomainXml> {
  static readonly kind = DomainKind;
  readonly kind = AdkDomain.kind;

  get objectUri(): string {
    return `/sap/bc/adt/ddic/domains/${encodeURIComponent(this.name.toLowerCase())}`;
  }

  protected override get wrapperKey() {
    return 'domain';
  }
  protected override get crudContract(): any {
    return this.ctx.client.adt.ddic.domains;
  }

  static async get(name: string, ctx?: AdkContext): Promise<AdkDomain> {
    const context = ctx ?? getGlobalContext();
    return new AdkDomain(context, name).load();
  }
}

// Self-register with ADK registry
import { registerObjectType } from '../../../base/registry';
registerObjectType('DOMA', DomainKind, AdkDomain, { endpoint: 'ddic/domains' });
