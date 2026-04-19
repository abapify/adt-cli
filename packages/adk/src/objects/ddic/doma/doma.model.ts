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

  static async exists(name: string, ctx?: AdkContext): Promise<boolean> {
    try {
      await AdkDomain.get(name, ctx);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a new ABAP domain on SAP.
   *
   * Note: Domains are metadata-only objects (no source code). After creation,
   * use the `adt get domain <name>` command or abapGit-based deploy to fill in
   * the domain properties (data type, field length, etc.).
   */
  static async create(
    name: string,
    description: string,
    packageName: string,
    options?: { transport?: string },
    ctx?: AdkContext,
  ): Promise<AdkDomain> {
    const context = ctx ?? getGlobalContext();
    const domain = new AdkDomain(context, name.toUpperCase());
    domain.setData({
      name: name.toUpperCase(),
      type: 'DOMA',
      description,
      language: 'EN',
      masterLanguage: 'EN',
      packageRef: {
        name: packageName.toUpperCase(),
        uri: `/sap/bc/adt/packages/${encodeURIComponent(packageName.toUpperCase())}`,
        type: 'DEVC/K',
      },
    } as unknown as DomainXml);
    await domain.save({ transport: options?.transport, mode: 'create' });
    return domain;
  }

  static async delete(
    name: string,
    options?: { transport?: string; lockHandle?: string },
    ctx?: AdkContext,
  ): Promise<void> {
    const context = ctx ?? getGlobalContext();
    const domain = new AdkDomain(context, name.toUpperCase());
    await domain.crudContract.delete(name.toUpperCase(), {
      ...(options?.transport && { corrNr: options.transport }),
      ...(options?.lockHandle && { lockHandle: options.lockHandle }),
    });
  }
}

// Self-register with ADK registry
import { registerObjectType } from '../../../base/registry';
registerObjectType('DOMA', DomainKind, AdkDomain, { endpoint: 'ddic/domains' });
