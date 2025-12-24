/**
 * CLAS - ABAP Class
 *
 * ADK object for ABAP classes (CLAS).
 */

import { AdkMainObject } from '../../../base/model';
import { Class as ClassKind } from '../../../base/kinds';
import { getGlobalContext } from '../../../base/global-context';
import { invalidateLazy } from '../../../decorators';
import type { AdkContext } from '../../../base/context';
import type { ClassIncludeType } from './clas.types';

// Import response type from ADT integration layer
import type { ClassResponse } from '../../../base/adt';

/**
 * Class data type - imported from contract
 * 
 * The schema wraps everything in an 'abapClass' element, so we unwrap it here
 * to provide a flat structure for ADK consumers.
 */
export type ClassXml = ClassResponse['abapClass'];

/**
 * ADK Class object
 * 
 * Inherits from AdkMainObject which provides:
 * - AdkObject: name, type, description, version, language, changedBy/At, createdBy/At, links
 * - AdkMainObject: package, packageRef, responsible, masterLanguage, masterSystem, abapLanguageVersion
 * 
 * Access class-specific properties via `data`:
 * - data.category, data.final, data.abstract, data.visibility
 * - data.sharedMemoryEnabled, data.modeled, data.fixPointArithmetic
 * - data.superClassRef, data.messageClassRef, data.include
 */
export class AdkClass extends AdkMainObject<typeof ClassKind, ClassXml> {
  static readonly kind = ClassKind;
  readonly kind = AdkClass.kind;
  
  // ADT object URI (computed - not in data)
  get objectUri(): string { return `/sap/bc/adt/oo/classes/${encodeURIComponent(this.name.toLowerCase())}`; }
  
  // Lazy segments - source code
  
  async getMainSource(): Promise<string> {
    return this.lazy('source:main', async () => {
      return this.crudContract.source.main.get(this.name);
    });
  }
  
  async getIncludeSource(includeType: ClassIncludeType): Promise<string> {
    return this.lazy(`source:${includeType}`, async () => {
      if (includeType === 'main') {
        return this.crudContract.source.main.get(this.name);
      }
      // Use contract's generic includes.get() - works for all include types
      return this.crudContract.includes.get(this.name, includeType);
    });
  }
  
  async getDefinitions(): Promise<string> {
    return this.getIncludeSource('definitions');
  }
  
  async getImplementations(): Promise<string> {
    return this.getIncludeSource('implementations');
  }
  
  async getTestClasses(): Promise<string> {
    return this.getIncludeSource('testclasses');
  }
  
  // ============================================
  // Source Code Save Methods
  // ============================================
  
  /**
   * Save main source code
   * Requires object to be locked first
   */
  async saveMainSource(source: string, options?: { lockHandle?: string; transport?: string }): Promise<void> {
    const params = new URLSearchParams();
    if (options?.lockHandle) params.set('lockHandle', options.lockHandle);
    if (options?.transport) params.set('corrNr', options.transport);
    
    await this.ctx.client.fetch(
      `/sap/bc/adt/oo/classes/${this.name.toLowerCase()}/source/main${params.toString() ? '?' + params.toString() : ''}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'text/plain' },
        body: source,
      }
    );
    
    // Invalidate cached source
    invalidateLazy(this, 'source:main');
  }
  
  /**
   * Save include source code
   * Requires object to be locked first
   */
  async saveIncludeSource(includeType: ClassIncludeType, source: string, options?: { lockHandle?: string; transport?: string }): Promise<void> {
    const params = new URLSearchParams();
    if (options?.lockHandle) params.set('lockHandle', options.lockHandle);
    if (options?.transport) params.set('corrNr', options.transport);
    
    const endpoint = includeType === 'main' 
      ? `/sap/bc/adt/oo/classes/${this.name.toLowerCase()}/source/main`
      : `/sap/bc/adt/oo/classes/${this.name.toLowerCase()}/includes/${includeType}`;
    
    await this.ctx.client.fetch(
      `${endpoint}${params.toString() ? '?' + params.toString() : ''}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'text/plain' },
        body: source,
      }
    );
    
    // Invalidate cached source
    invalidateLazy(this, `source:${includeType}`);
  }
  
  /**
   * Save all pending sources (set via _pendingSources)
   * Used by export workflow after deserialization from abapGit
   * Overrides base class method
   */
  protected override async savePendingSources(options?: { lockHandle?: string; transport?: string }): Promise<void> {
    const pendingSources = (this as unknown as { _pendingSources?: Record<string, string> })._pendingSources;
    if (!pendingSources) return;
    
    const errors: Error[] = [];
    
    for (const [key, source] of Object.entries(pendingSources)) {
      try {
        if (key === 'main') {
          await this.saveMainSource(source, options);
        } else {
          await this.saveIncludeSource(key as ClassIncludeType, source, options);
        }
      } catch (e) {
        // 409 Conflict means the include is already locked in the transport
        // This is expected when the object is already in a transport request
        // We can skip this include and continue with others
        const errorMsg = e instanceof Error ? e.message : String(e);
        if (errorMsg.includes('409') || errorMsg.includes('Conflict')) {
          // Skip - include already in transport, will be saved with transport release
          continue;
        }
        errors.push(e instanceof Error ? e : new Error(String(e)));
      }
    }
    
    // Clear pending sources after save
    delete (this as unknown as { _pendingSources?: Record<string, string> })._pendingSources;
    delete (this as unknown as { _pendingSource?: string })._pendingSource;
    
    // If there were non-conflict errors, throw the first one
    if (errors.length > 0) {
      throw errors[0];
    }
  }
  
  /**
   * Check if object has pending sources to save
   * Overrides base class method
   */
  protected override hasPendingSources(): boolean {
    return !!(this as unknown as { _pendingSources?: Record<string, string> })._pendingSources;
  }
  
  // ============================================
  // CRUD contract config - enables save()
  // ============================================
  
  protected override get wrapperKey() { return 'abapClass'; }
  protected override get crudContract() { return this.ctx.client.adt.oo.classes; }
  
  // ============================================
  // Static Factory Method
  // ============================================
  
  static async get(name: string, ctx?: AdkContext): Promise<AdkClass> {
    const context = ctx ?? getGlobalContext();
    return new AdkClass(context, name).load();
  }
}


// Self-register with ADK registry
import { registerObjectType } from '../../../base/registry';
registerObjectType('CLAS', ClassKind, AdkClass);
             