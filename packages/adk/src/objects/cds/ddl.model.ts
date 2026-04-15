/**
 * DDL - CDS Data Definition Language Source (DDLS)
 *
 * ADK object for ABAP CDS Data Definition sources.
 * These are source-based objects stored at:
 *   GET/PUT /sap/bc/adt/ddic/ddl/sources/<name>/source/main
 *
 * The metadata document is at:
 *   GET /sap/bc/adt/ddic/ddl/sources/<name>
 *
 * Lock/activate/create follow the same patterns as other source objects.
 */

import { getGlobalContext } from '../../base/global-context';
import type { AdkContext } from '../../base/context';
import { toText } from '../../base/fetch-utils';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export class AdkDdlSource {
  readonly name: string;
  protected readonly ctx: AdkContext;

  constructor(ctx: AdkContext, name: string) {
    this.ctx = ctx;
    this.name = name.toUpperCase();
  }

  get objectUri(): string {
    return `/sap/bc/adt/ddic/ddl/sources/${encodeURIComponent(this.name.toLowerCase())}`;
  }

  /** Placeholder description — full metadata requires additional SAP fetch */
  get description(): string {
    return this.name;
  }

  // ─── Source ────────────────────────────────────────────────────────────────

  async getSource(): Promise<string> {
    const result = await this.ctx.client.fetch(
      `${this.objectUri}/source/main`,
      { method: 'GET', headers: { Accept: 'text/plain' } },
    );
    return toText(result);
  }

  async saveMainSource(
    source: string,
    options?: { lockHandle?: string; transport?: string },
  ): Promise<void> {
    const params = new URLSearchParams();
    if (options?.lockHandle) params.set('lockHandle', options.lockHandle);
    if (options?.transport) params.set('corrNr', options.transport);
    const qs = params.toString();
    await this.ctx.client.fetch(
      `${this.objectUri}/source/main${qs ? '?' + qs : ''}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'text/plain' },
        body: source,
      },
    );
  }

  // ─── Lock / Unlock ─────────────────────────────────────────────────────────

  async lock(transport?: string): Promise<{ handle: string }> {
    const lockService = this.ctx.lockService;
    if (!lockService) {
      throw new Error(
        'Lock not available: no lockService in context. Did you call initializeAdk()?',
      );
    }
    return lockService.lock(this.objectUri, {
      transport,
      objectName: this.name,
      objectType: 'DDLS',
    });
  }

  async unlock(lockHandle: string): Promise<void> {
    const lockService = this.ctx.lockService;
    if (!lockService) {
      throw new Error(
        'Unlock not available: no lockService in context. Did you call initializeAdk()?',
      );
    }
    await lockService.unlock(this.objectUri, { lockHandle });
  }

  // ─── Activate ──────────────────────────────────────────────────────────────

  async activate(): Promise<this> {
    const activationXml = `<?xml version="1.0" encoding="UTF-8"?><adtcore:objectReferences xmlns:adtcore="http://www.sap.com/adt/core"><adtcore:objectReference adtcore:uri="${this.objectUri}" adtcore:name="${this.name}"/></adtcore:objectReferences>`;
    await this.ctx.client.fetch(
      '/sap/bc/adt/activation?method=activate&preauditRequested=true',
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/vnd.sap.adt.activation.request+xml; charset=utf-8',
          Accept:
            'application/xml, application/vnd.sap.adt.activationresults+xml',
        },
        body: activationXml,
      },
    );
    return this;
  }

  // ─── Static Factory Methods ─────────────────────────────────────────────────

  /**
   * Get a DDL source (does not fetch metadata, just returns handle)
   */
  static async get(name: string, ctx?: AdkContext): Promise<AdkDdlSource> {
    const context = ctx ?? getGlobalContext();
    const obj = new AdkDdlSource(context, name);
    // Validate it exists by fetching source
    await obj.getSource();
    return obj;
  }

  static async exists(name: string, ctx?: AdkContext): Promise<boolean> {
    try {
      await AdkDdlSource.get(name, ctx);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a new CDS DDL source on SAP
   *
   * POST /sap/bc/adt/ddic/ddl/sources?corrNr=...
   * with XML body containing the object metadata
   */
  static async create(
    name: string,
    description: string,
    packageName: string,
    options?: { transport?: string },
    ctx?: AdkContext,
  ): Promise<AdkDdlSource> {
    const context = ctx ?? getGlobalContext();
    const nameU = name.toUpperCase();
    const pkgU = packageName.toUpperCase();

    const params = new URLSearchParams();
    if (options?.transport) params.set('corrNr', options.transport);
    const qs = params.toString();

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<ddl:source xmlns:ddl="http://www.sap.com/adt/ddl" xmlns:adtcore="http://www.sap.com/adt/core" adtcore:description="${escapeXml(description)}" adtcore:language="EN" adtcore:masterLanguage="EN" adtcore:name="${nameU}" adtcore:responsible="$TMP">
  <adtcore:packageRef adtcore:name="${pkgU}" adtcore:type="DEVC/K" adtcore:uri="/sap/bc/adt/packages/${pkgU.toLowerCase()}"/>
</ddl:source>`;

    await context.client.fetch(
      `/sap/bc/adt/ddic/ddl/sources${qs ? '?' + qs : ''}`,
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/vnd.sap.adt.ddl.source.v2+xml; charset=utf-8',
        },
        body,
      },
    );

    return new AdkDdlSource(context, nameU);
  }

  static async delete(
    name: string,
    options?: { transport?: string; lockHandle?: string },
    ctx?: AdkContext,
  ): Promise<void> {
    const context = ctx ?? getGlobalContext();
    const obj = new AdkDdlSource(context, name);
    const params = new URLSearchParams();
    if (options?.transport) params.set('corrNr', options.transport);
    if (options?.lockHandle) params.set('lockHandle', options.lockHandle);
    const qs = params.toString();
    await context.client.fetch(`${obj.objectUri}${qs ? '?' + qs : ''}`, {
      method: 'DELETE',
    });
  }
}
