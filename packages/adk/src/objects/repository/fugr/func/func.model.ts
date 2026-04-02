/**
 * FUGR/FF - ABAP Function Module
 *
 * ADK object for ABAP function modules (FUGR/FF).
 * Function modules are child objects of function groups - they are accessed
 * via the parent group's URL path and require the group name for all operations.
 */

import { AdkObject } from '../../../../base/model';
import { FunctionModule as FunctionModuleKind } from '../../../../base/kinds';
import { getGlobalContext } from '../../../../base/global-context';
import { toText } from '../../../../base/fetch-utils';
import type { AdkContext } from '../../../../base/context';

// Import response type from ADT integration layer
import type { FunctionModuleResponse } from '../../../../base/adt';

/**
 * Function module data type - unwrap from root element
 *
 * The schema wraps everything in an 'abapFunctionModule' element, so we unwrap it here
 * to provide a flat structure for ADK consumers.
 */
export type FunctionModuleXml = FunctionModuleResponse['abapFunctionModule'];

/**
 * ADK Function Module object
 *
 * Function modules are child objects of function groups. Unlike main objects
 * (classes, interfaces, etc.), they don't have their own package reference.
 * All API operations require the parent group name in the URL path.
 *
 * Key differences from AdkMainObject:
 * - Requires `groupName` for URI construction and all CRUD operations
 * - Overrides lock/unlock/load/save to pass groupName to contract calls
 * - No packageRef (lives within parent function group's package)
 */
export class AdkFunctionModule extends AdkObject<
  typeof FunctionModuleKind,
  FunctionModuleXml
> {
  static readonly kind = FunctionModuleKind;
  readonly kind = AdkFunctionModule.kind;

  /** Parent function group name */
  groupName: string;

  /**
   * Constructor supports two calling patterns:
   *
   * 1. Direct (3-arg): `new AdkFunctionModule(ctx, groupName, nameOrData)`
   *    Used by static factory method and when group name is known upfront.
   *
   * 2. Factory (2-arg): `new AdkFunctionModule(ctx, data)`
   *    Used by ADK factory's `getWithData()`. The groupName is extracted from
   *    `data._groupName` or `data.containerRef.name`.
   */
  constructor(
    ctx: AdkContext,
    groupNameOrData: string | FunctionModuleXml,
    dataOrName?: FunctionModuleXml | string,
  ) {
    if (dataOrName !== undefined) {
      // 3-arg form: (ctx, groupName, dataOrName)
      super(ctx, dataOrName);
      this.groupName = groupNameOrData as string;
    } else if (typeof groupNameOrData === 'string') {
      // 2-arg form with string: (ctx, name) — groupName must be set later
      super(ctx, groupNameOrData);
      this.groupName = '';
    } else {
      // 2-arg form with data object: (ctx, data) — extract groupName from data
      const data = groupNameOrData as Record<string, unknown>;
      super(ctx, groupNameOrData);
      this.groupName =
        (data._groupName as string) ??
        ((data.containerRef as Record<string, unknown> | undefined)
          ?.name as string) ??
        '';
    }
  }

  // ADT object URI (computed - includes parent group)
  get objectUri(): string {
    return `/sap/bc/adt/functions/groups/${encodeURIComponent(this.groupName.toLowerCase())}/fmodules/${encodeURIComponent(this.name.toLowerCase())}`;
  }

  override get collectionUri(): string {
    return `/sap/bc/adt/functions/groups/${encodeURIComponent(this.groupName.toLowerCase())}/fmodules`;
  }

  // ============================================
  // CRUD contract config
  // ============================================

  protected override get wrapperKey() {
    return 'abapFunctionModule';
  }

  // Note: `any` return type is intentional — the base class defines
  // crudContract as `any` to support different contract structures per object type.
  protected override get crudContract(): any {
    return this.ctx.client.adt.functions.groups.fmodules;
  }

  // ============================================
  // Override base methods to pass groupName
  // ============================================

  /**
   * Load function module data from SAP
   *
   * Overrides base to pass groupName as first arg to contract.get()
   */
  override async load(): Promise<this> {
    const contract = this.crudContract;
    const wrapperKey = this.wrapperKey;

    if (!contract || !wrapperKey) {
      throw new Error(
        `Load not implemented for ${this.kind}. Override load() or provide crudContract/wrapperKey.`,
      );
    }

    const response = await contract.get(this.groupName, this.name);

    if (!response || !(wrapperKey in response)) {
      throw new Error(
        `${this.kind} '${this.name}' in group '${this.groupName}' not found or returned empty response`,
      );
    }

    this.setData(
      (response as Record<string, unknown>)[wrapperKey] as FunctionModuleXml,
    );
    return this;
  }

  // lock() and unlock() are inherited from base AdkObject — they delegate to
  // ctx.lockService using this.objectUri which already includes the group path.

  /**
   * Get skeleton data for FM creation (POST).
   *
   * FMs only need name, type, description, and processing attributes.
   * No packageRef — FMs inherit the package from their parent FUGR.
   */
  protected override async getSkeletonData(): Promise<Record<string, unknown>> {
    const rawData = await this.data();
    const d = rawData as Record<string, unknown>;
    return {
      name: d.name,
      type: d.type,
      description: d.description ?? '',
      processingType: d.processingType,
      basXMLEnabled: d.basXMLEnabled,
    };
  }

  /**
   * Execute the typed contract call for save
   *
   * Overrides base to pass groupName to contract.put()/post()
   */
  protected override async saveViaContract(
    mode: 'create' | 'update',
    options: { transport?: string; lockHandle?: string },
  ): Promise<void> {
    const wrapperKey = this.wrapperKey;
    const contract = this.crudContract;

    if (!wrapperKey || !contract) {
      throw new Error(`Save not supported for ${this.kind}.`);
    }

    if (mode === 'create') {
      // POST skeleton — minimal fields only
      const skeleton = await this.getSkeletonData();
      const data = { [wrapperKey]: skeleton };
      await contract.post(this.groupName, { corrNr: options.transport }, data);
    } else {
      const rawData = await this.data();

      // Strip abapLanguageVersion from the payload (same as base class)
      const { abapLanguageVersion: _, ...rest } = rawData as Record<
        string,
        unknown
      >;
      const saveData = rest;
      const data = { [wrapperKey]: saveData };

      await contract.put(
        this.groupName,
        this.name,
        {
          corrNr: options.transport,
          lockHandle: options.lockHandle,
        },
        data,
      );
    }
  }

  /**
   * Check if the function module exists on the SAP system.
   *
   * Overrides base to pass groupName to contract.get()
   */
  protected override async checkObjectExists(): Promise<boolean> {
    const contract = this.crudContract;
    if (!contract?.get) return true;
    try {
      await contract.get(this.groupName, this.name);
      return true;
    } catch (e) {
      if (this.shouldFallbackToCreate(e)) return false;
      throw e;
    }
  }

  /**
   * Refresh cached ETags after acquiring a lock.
   *
   * FM's savePendingSources() does a metadata PUT first (to apply processingType),
   * then a source PUT. Both need fresh ETags after locking.
   * The contract uses groupName + name (potentially UPPERCASE), so we must
   * refresh via the contract to match the same cache key.
   */
  protected override async refreshETagsAfterLock(): Promise<void> {
    // Refresh metadata ETag (needed by saveViaContract in savePendingSources)
    try {
      await this.crudContract.get(this.groupName, this.name);
    } catch {
      // Object may be newly created — clear stale ETags to avoid 412
      this.ctx.client.clearETag();
    }
    // Refresh source ETag (needed by source PUT in savePendingSources)
    const sourceUrl = `${this.objectUri}/source/main`;
    try {
      await this.ctx.client.fetch(sourceUrl, {
        method: 'GET',
        headers: { Accept: 'text/plain' },
      });
    } catch {
      // Source may not exist yet — clear stale ETag to avoid 412
      this.ctx.client.clearETag(sourceUrl);
    }
  }

  // ============================================
  // Source code handling
  // ============================================

  /**
   * Strip the parameter comment block from FM source code.
   *
   * abapGit serializes FM source with a "Local Interface" comment block
   * that describes IMPORTING/EXPORTING/CHANGING/TABLES/EXCEPTIONS.
   * SAP ADT rejects this block when saving source — it manages the
   * interface metadata separately. Strip it before sending.
   *
   * Pattern:
   * ```
   * *"----------------------------------------------------------------------
   * *"*"Local Interface:
   * *"  IMPORTING ...
   * *"----------------------------------------------------------------------
   * ```
   */
  private stripParameterCommentBlock(source: string): string {
    const lines = source.split('\n');
    const result: string[] = [];
    let inBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trimEnd();

      if (
        !inBlock &&
        trimmed.startsWith('*"') &&
        trimmed.includes('---')
      ) {
        // Start of comment block — check if next line is Local Interface
        if (
          i + 1 < lines.length &&
          lines[i + 1].trimEnd().startsWith('*"')
        ) {
          inBlock = true;
          continue;
        }
      }

      if (inBlock) {
        if (trimmed.startsWith('*"') && trimmed.includes('---')) {
          // End of comment block
          inBlock = false;
          continue;
        }
        if (trimmed.startsWith('*"')) {
          // Inside the comment block — skip
          continue;
        }
        // Not a *" line — block ended without closing dashes (shouldn't happen)
        inBlock = false;
      }

      result.push(lines[i]);
    }

    return result.join('\n');
  }

  /**
   * Save pending source for function module.
   *
   * Overrides base to:
   * 1. PUT metadata first (SAP ignores processingType and other attributes during POST)
   * 2. Refresh source ETag (metadata PUT changes the object version)
   * 3. Strip the parameter comment block that abapGit includes
   * 4. Use the FM-specific source endpoint via groupName
   */
  protected override async savePendingSources(options?: {
    lockHandle?: string;
    transport?: string;
  }): Promise<void> {
    const self = this as unknown as { _pendingSource?: string };
    if (!self._pendingSource) return;

    // PUT metadata to ensure processingType and other attributes are applied.
    // SAP ignores some attributes (like processingType) during POST creation,
    // so we must PUT them separately after the object exists.
    await this.saveViaContract('update', {
      lockHandle: options?.lockHandle,
      transport: options?.transport,
    });

    // The metadata PUT changes the object's ETag, so we must refresh the
    // cached source ETag before the source PUT (otherwise If-Match fails).
    const sourceUrl = `${this.objectUri}/source/main`;
    await this.ctx.client.fetch(sourceUrl, {
      method: 'GET',
      headers: { Accept: 'text/plain' },
    });

    // Strip the parameter comment block before sending
    const cleanSource = this.stripParameterCommentBlock(self._pendingSource);

    const params = new URLSearchParams();
    if (options?.lockHandle) params.set('lockHandle', options.lockHandle);
    if (options?.transport) params.set('corrNr', options.transport);

    const qs = params.toString();
    await this.ctx.client.fetch(
      `${this.objectUri}/source/main${qs ? '?' + qs : ''}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'text/plain' },
        body: cleanSource,
      },
    );

    delete self._pendingSource;
  }

  /**
   * Extract the body of a FUNCTION...ENDFUNCTION block.
   *
   * SAP reconstructs the FUNCTION header when returning source code:
   *   Local:  `FUNCTION zage_fm.`                         (lowercase, period inline)
   *   SAP:    `FUNCTION ZAGE_FM\n " template comment"\n.` (uppercase, period on own line)
   *
   * The body between the header and ENDFUNCTION is identical, so we compare
   * only that part. The header ends at the first period that terminates the
   * FUNCTION statement (either inline `FUNCTION name.` or on a separate line `.`).
   */
  private extractFunctionBody(source: string): string {
    const lines = source.split('\n');
    let bodyStart = 0;
    let bodyEnd = lines.length;

    // Find the end of the FUNCTION header — the first line whose trimmed
    // content is just "." or that ends with "." on the FUNCTION line itself.
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trimEnd();
      if (i === 0 && /^FUNCTION\s+\S+\.\s*$/i.test(trimmed)) {
        // Period on the same line as FUNCTION
        bodyStart = i + 1;
        break;
      }
      if (i > 0 && trimmed === '.') {
        // Period on its own line (SAP style)
        bodyStart = i + 1;
        break;
      }
    }

    // Find ENDFUNCTION
    for (let i = lines.length - 1; i >= bodyStart; i--) {
      if (/^\s*ENDFUNCTION\.\s*$/i.test(lines[i].trimEnd())) {
        bodyEnd = i;
        break;
      }
    }

    return lines.slice(bodyStart, bodyEnd).join('\n');
  }

  /**
   * Pre-lock comparison for FM source.
   *
   * Overrides base to:
   * 1. Strip parameter comment block from local source
   * 2. Extract only the function body (between FUNCTION header and ENDFUNCTION)
   *    from both local and SAP source, because SAP reconstructs the FUNCTION
   *    header with uppercase name and template comments.
   */
  protected override async checkPendingSourcesUnchanged(): Promise<void> {
    const self = this as unknown as { _pendingSource?: string };
    if (!self._pendingSource) return;

    try {
      const currentSource = await toText(
        await this.ctx.client.fetch(
          `${this.objectUri}/source/main`,
          { method: 'GET', headers: { Accept: 'text/plain' } },
        ),
      );
      const cleanPending = this.stripParameterCommentBlock(self._pendingSource);
      const localBody = this.extractFunctionBody(cleanPending);
      const sapBody = this.extractFunctionBody(currentSource);
      if (
        this.normalizeSource(localBody) ===
        this.normalizeSource(sapBody)
      ) {
        this._unchanged = true;
        delete self._pendingSource;
      }
    } catch {
      // Source doesn't exist on SAP (404) — needs saving
    }
  }

  // ============================================
  // Lazy segments - source code
  // ============================================

  async getSource(): Promise<string> {
    return this.lazy('source', async () => {
      return this.ctx.client.adt.functions.groups.fmodules.source.main.get(
        this.groupName,
        this.name,
      );
    });
  }

  // ============================================
  // Static Factory Method
  // ============================================

  /**
   * Get a function module by name
   *
   * @param groupName - Parent function group name
   * @param name - Function module name
   * @param ctx - Optional ADK context (uses global if not provided)
   */
  static async get(
    groupName: string,
    name: string,
    ctx?: AdkContext,
  ): Promise<AdkFunctionModule> {
    const context = ctx ?? getGlobalContext();
    return new AdkFunctionModule(context, groupName, name).load();
  }
}

// Self-register with ADK registry
// Note: Uses 'FUGR/FF' (the SAP subtype) rather than 'FUNC'
// because in SAP, function modules have ADT type FUGR/FF
import { registerObjectType } from '../../../../base/registry';
registerObjectType('FUGR/FF', FunctionModuleKind, AdkFunctionModule as any, {
  endpoint: 'functions/groups',
});
