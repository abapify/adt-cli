/**
 * ADK v2 - Base Object
 * 
 * Abstract base class for all ADK objects.
 * Supports two construction patterns:
 * 1. Full data: new AdkObject(ctx, data)
 * 2. Deferred load: new AdkObject(ctx, 'OBJECT_NAME').load()
 * 
 * Provides lazy loading, caching, and automatic lock/unlock.
 * 
 * Hierarchy (mirrors XSD):
 * - AdkObject (AdtObject) - base with name, type, links, description, version, etc.
 * - AdkMainObject (AdtMainObject) - adds packageRef, responsible, masterLanguage
 */

import type { AdkContext } from './context';
import type { AdkKind } from './kinds';

/**
 * Lock handle returned by lock operations
 */
export interface LockHandle {
  handle: string;
  correlationNumber?: string;
  correlationUser?: string;
}

/**
 * Save mode for create/update operations
 * - 'update': PUT to existing object (default, fails if doesn't exist)
 * - 'create': POST to create new object (fails if already exists)
 * - 'upsert': Try PUT first, fall back to POST if 404
 */
export type SaveMode = 'update' | 'create' | 'upsert';

/**
 * Options for save operations
 */
export interface SaveOptions {
  /** Transport request for the change */
  transport?: string;
  /** Save as inactive (default: false) */
  inactive?: boolean;
  /** Save mode: 'update' (default), 'create', or 'upsert' */
  mode?: SaveMode;
}

/**
 * Result of bulk activation
 */
export interface ActivationResult {
  /** Number of successfully activated objects */
  success: number;
  /** Number of objects that failed activation */
  failed: number;
  /** Activation messages (errors, warnings) */
  messages: string[];
  /** Raw response from SAP (for debugging) */
  response?: string;
}

/**
 * Atom link (from atom:link element)
 * Used for HATEOAS-style navigation in ADT responses
 */
export interface AtomLink {
  href: string;
  rel?: string;
  type?: string;
  title?: string;
  etag?: string;
}

/**
 * ADT object reference (adtcore:objectReference)
 */
export interface AdtObjectReference {
  uri?: string;
  name?: string;
  type?: string;
  description?: string;
  packageName?: string;
}


/**
 * Base data contract for all ADK objects
 * Matches XSD AdtObject type attributes and elements
 */
export interface AdkObjectData {
  // Required attributes
  name: string;
  type: string;
  // Optional AdtObject attributes
  description?: string;
  changedBy?: string;
  changedAt?: string | Date;
  createdBy?: string;
  createdAt?: string | Date;
  version?: string;
  language?: string;
  descriptionTextLimit?: number;
  // Optional AdtObject elements
  links?: AtomLink[];
  containerRef?: AdtObjectReference;
}

/**
 * Main object data contract (extends AdtObject)
 * Matches XSD AdtMainObject type
 */
export interface AdkMainObjectData extends AdkObjectData {
  packageRef?: AdtObjectReference;
  masterSystem?: string;
  masterLanguage?: string;
  responsible?: string;
  abapLanguageVersion?: string;
}

/**
 * Base class for all ADK objects
 * 
 * All ADK objects (AdkPackage, AdkTransportRequest, etc.) extend this.
 * Supports deferred loading - create with just a name, then call load().
 * 
 * Note: Uses loose type constraint for D to allow schema-inferred types
 * from contracts which may have different shapes. The getters safely
 * handle missing properties with defaults.
 * 
 * @typeParam K - The object kind (from AdkKind)
 * @typeParam D - The internal data type (typically schema-inferred from contract)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export abstract class AdkObject<K extends AdkKind = AdkKind, D = any> {
  /** Object kind identifier */
  abstract readonly kind: K;
  
  /** 
   * ADT object URI - base path for all operations.
   * Example: `/sap/bc/adt/oo/classes/zcl_my_class`
   */
  abstract get objectUri(): string;
  
  /**
   * ADT collection URI - base path for creating new objects.
   * Example: `/sap/bc/adt/oo/classes`
   * Default: derived from objectUri by removing the object name
   */
  get collectionUri(): string {
    // Default: strip the last path segment from objectUri
    const uri = this.objectUri;
    const lastSlash = uri.lastIndexOf('/');
    return lastSlash > 0 ? uri.substring(0, lastSlash) : uri;
  }
  
  protected readonly ctx: AdkContext;
  protected _data?: D;
  protected _name: string;
  protected cache = new Map<string, unknown>();
  protected dirty = new Set<string>();
  protected _lockHandle?: LockHandle;
  
  /**
   * Create ADK object
   * @param ctx - ADK context
   * @param dataOrName - Full data object OR just the object name for deferred loading
   */
  constructor(ctx: AdkContext, dataOrName: D | string) {
    this.ctx = ctx;
    if (typeof dataOrName === 'string') {
      // Deferred load - just store the name
      this._name = dataOrName;
    } else {
      // Full data provided
      this._data = dataOrName;
      // Cast to access name property which may exist on schema-inferred types
      this._name = (dataOrName as AdkObjectData).name;
    }
  }

  // ============================================
  // Deferred Loading Support
  // ============================================

  /**
   * Load object data from SAP
   * 
   * Default implementation uses crudContract.get() and unwraps with wrapperKey.
   * Objects without crudContract must override this.
   * 
   * @returns this (for chaining)
   */
  async load(): Promise<this> {
    const contract = this.crudContract;
    const wrapperKey = this.wrapperKey;
    
    if (!contract || !wrapperKey) {
      throw new Error(`Load not implemented for ${this.kind}. Override load() or provide crudContract/wrapperKey.`);
    }
    
    const response = await contract.get(this.name);
    
    if (!response || !(wrapperKey in response)) {
      throw new Error(`${this.kind} '${this.name}' not found or returned empty response`);
    }
    
    this.setData((response as Record<string, unknown>)[wrapperKey] as D);
    return this;
  }

  /** Whether data has been loaded */
  get isLoaded(): boolean {
    return !!this._data;
  }

  /** 
   * Get data - auto-loads if not already loaded
   * @returns Promise that resolves to the data
   */
  async data(): Promise<D> {
    if (!this._data) {
      await this.load();
    }
    // After load(), _data is guaranteed to be set
    return this._data as D;
  }

  /** 
   * Get data synchronously - throws if not loaded
   * Use when you know data is already loaded
   */
  get dataSync(): D {
    if (!this._data) {
      throw new Error(`${this.kind} '${this._name}' not loaded. Call load() or use data() instead.`);
    }
    return this._data;
  }

  /** Set data (for subclasses to use after loading) */
  protected setData(data: D): void {
    this._data = data;
    // Cast to access name property which may exist on schema-inferred types
    this._name = (data as AdkObjectData).name;
  }
  
  /** Helper to access data with AdkObjectData properties */
  private get coreData(): AdkObjectData {
    return this.dataSync as unknown as AdkObjectData;
  }

  // ============================================
  // Core Properties (adtcore:* attributes)
  // ============================================

  /** ADT object name (adtcore:name) - available even before load() */
  get name(): string { return this._name; }
  
  /** ADT object type (adtcore:type, e.g. 'RQRQ', 'DEVC/K') - requires load() */
  get type(): string { return this.coreData.type; }
  
  /** Description text (adtcore:description) */
  get description(): string { return this.coreData.description ?? ''; }
  
  /** Version state (adtcore:version) - active, inactive, etc. */
  get version(): string { return this.coreData.version ?? ''; }
  
  /** Current language (adtcore:language) */
  get language(): string { return this.coreData.language ?? ''; }
  
  /** User who last modified (adtcore:changedBy) */
  get changedBy(): string { return this.coreData.changedBy ?? ''; }
  
  /** Last modification timestamp (adtcore:changedAt) */
  get changedAt(): Date {
    const val = this.coreData.changedAt;
    return val instanceof Date ? val : val ? new Date(val) : new Date(0);
  }
  
  /** User who created (adtcore:createdBy) */
  get createdBy(): string { return this.coreData.createdBy ?? ''; }
  
  /** Creation timestamp (adtcore:createdAt) */
  get createdAt(): Date {
    const val = this.coreData.createdAt;
    return val instanceof Date ? val : val ? new Date(val) : new Date(0);
  }
  
  // ============================================
  // Links (atom:link elements)
  // ============================================
  
  /** All atom:link elements */
  get links(): AtomLink[] { return this.coreData.links ?? []; }
  
  /** Find link by rel attribute */
  getLink(rel: string): AtomLink | undefined {
    return this.links.find(l => l.rel === rel);
  }
  
  /** Get link href by rel, or undefined */
  getLinkHref(rel: string): string | undefined {
    return this.getLink(rel)?.href;
  }
  
  /** Container reference (adtcore:containerRef) */
  get containerRef(): AdtObjectReference | undefined {
    return this.coreData.containerRef;
  }
  
  // ============================================
  // Lock State
  // ============================================
  
  /** Check if object is currently locked */
  get isLocked(): boolean { return !!this._lockHandle; }
  
  /** Get current lock handle */
  get lockHandle(): LockHandle | undefined {
    return this._lockHandle;
  }
  
  /** 
   * Lock the object for modification
   * 
   * Uses the CRUD contract's lock() method.
   * 
   * The lock response contains:
   * - LOCK_HANDLE: Required for subsequent PUT/unlock operations
   * - CORRNR: Transport request assigned to this object (use for PUT if no explicit transport)
   * - CORRUSER: User who owns the transport
   * 
   * @param transport - Optional transport request to use for locking.
   *                    Required when object is already in a transport.
   */
  async lock(transport?: string): Promise<LockHandle> {
    if (this._lockHandle) return this._lockHandle;
    
    const contract = this.crudContract;
    if (!contract?.lock) {
      throw new Error(`Lock not supported for ${this.kind}. Provide crudContract with lock() method.`);
    }
    
    // Use contract's lock method
    const response = await contract.lock(this.name, { corrNr: transport });
    
    // Parse lock response XML
    // Response format: <asx:abap>...<DATA><LOCK_HANDLE>xxx</LOCK_HANDLE><CORRNR>yyy</CORRNR>...</DATA>...</asx:abap>
    const responseText = String(response);
    this._lockHandle = this.parseLockResponse(responseText);
    return this._lockHandle;
  }
  
  /** 
   * Unlock the object
   * 
   * Uses the CRUD contract's unlock() method.
   */
  async unlock(): Promise<void> {
    if (!this._lockHandle) return;
    
    const contract = this.crudContract;
    if (!contract?.unlock) {
      throw new Error(`Unlock not supported for ${this.kind}. Provide crudContract with unlock() method.`);
    }
    
    // Use contract's unlock method
    await contract.unlock(this.name, { lockHandle: this._lockHandle.handle });
    this._lockHandle = undefined;
  }
  
  /**
   * Parse lock response XML to extract lock handle and correlation info
   */
  protected parseLockResponse(responseText: string): LockHandle {
    const lockHandleMatch = responseText.match(/<LOCK_HANDLE>([^<]+)<\/LOCK_HANDLE>/);
    
    if (!lockHandleMatch) {
      // Don't expose raw SAP response in error message for security
      throw new Error('Failed to parse lock handle from SAP response. The response format may have changed.');
    }
    
    // Extract CORRNR (transport request) - this is the transport assigned to the object
    const corrNrMatch = responseText.match(/<CORRNR>([^<]+)<\/CORRNR>/);
    const corrUserMatch = responseText.match(/<CORRUSER>([^<]+)<\/CORRUSER>/);
    
    return { 
      handle: lockHandleMatch[1],
      correlationNumber: corrNrMatch?.[1],
      correlationUser: corrUserMatch?.[1],
    };
  }
  
  /**
   * Set lock handle (for subclasses that need custom lock logic)
   */
  protected setLockHandle(handle: LockHandle | undefined): void {
    this._lockHandle = handle;
  }
  
  // ============================================
  // Save Operations
  // ============================================
  
  /**
   * Save the object to SAP
   * 
   * Generic implementation that handles:
   * - Lock/unlock lifecycle
   * - Mode switching (create/update/upsert)
   * - Error handling
   * 
   * Subclasses implement `saveViaContract()` to provide the typed contract call.
   * 
   * Modes:
   * - 'update' (default): PUT to existing object
   * - 'create': POST to create new object
   * - 'upsert': Try PUT first, fall back to POST if 404
   * 
   * @param options - Save options
   * @returns this (for chaining)
   */
  async save(options: SaveOptions = {}): Promise<this> {
    const { transport, mode = 'update' } = options;
    
    // Lock if not already locked (skip for create mode - object doesn't exist yet)
    const wasLocked = this.isLocked;
    const needsLock = mode !== 'create';
    if (needsLock && !wasLocked) {
      try {
        await this.lock(transport);
      } catch (e) {
        // For upsert, only fallback to create if it's a 404 Not Found error
        if (mode === 'upsert' && this.isNotFoundError(e)) {
          return this.save({ ...options, mode: 'create' });
        }
        throw e;
      }
    }
    
    try {
      // Check if object has pending sources (from abapGit deserialization)
      // For existing objects with sources, save sources instead of metadata
      const hasPendingSources = this.hasPendingSources();
      
      // Use transport from lock response if not explicitly provided
      // The lock response contains CORRNR which is the transport assigned to this object
      const effectiveTransport = transport ?? this._lockHandle?.correlationNumber;
      
      if (hasPendingSources && mode !== 'create') {
        // Save sources only - skip metadata PUT which SAP often rejects
        await this.savePendingSources({ 
          lockHandle: this._lockHandle?.handle,
          transport: effectiveTransport,
        });
      } else {
        // Delegate to subclass for typed contract call
        // Note: 'upsert' is handled by the retry logic, so we pass the effective mode
        const effectiveMode = mode === 'upsert' ? 'update' : mode;
        await this.saveViaContract(effectiveMode, {
          transport: effectiveTransport,
          lockHandle: this._lockHandle?.handle,
        });
      }
      
      // Clear dirty flags
      this.dirty.clear();
      
      return this;
    } catch (e: unknown) {
      // For upsert with PUT failure (404), try POST
      if (mode === 'upsert' && this.isNotFoundError(e)) {
        return this.save({ ...options, mode: 'create' });
      }
      throw e;
    } finally {
      // Unlock if we locked it
      if (needsLock && !wasLocked) {
        await this.unlock();
      }
    }
  }
  
  /**
   * Wrapper key for the data in contract requests/responses
   * 
   * Contracts wrap data like { abapClass: ... } or { abapInterface: ... }.
   * Subclasses that support save override this.
   */
  protected get wrapperKey(): string | undefined {
    return undefined;
  }
  
  /**
   * CRUD contract for this object type
   * 
   * Subclasses that support save override this to return their contract.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected get crudContract(): any {
    return undefined;
  }
  
  /**
   * Execute the typed contract call for save
   * 
   * Generic implementation using wrapperKey and crudContract.
   * Objects that don't support save leave wrapperKey/crudContract undefined.
   * 
   * @param mode - 'create' (POST) or 'update' (PUT)
   * @param options - Contract options (transport, lockHandle)
   */
  protected async saveViaContract(
    mode: 'create' | 'update',
    options: { transport?: string; lockHandle?: string }
  ): Promise<void> {
    const wrapperKey = this.wrapperKey;
    const contract = this.crudContract;
    
    if (!wrapperKey || !contract) {
      throw new Error(`Save not supported for ${this.kind}.`);
    }
    
    const data = { [wrapperKey]: await this.data() };
    
    if (mode === 'create') {
      await contract.post({ corrNr: options.transport }, data);
    } else {
      await contract.put(this.name, { corrNr: options.transport, lockHandle: options.lockHandle }, data);
    }
  }
  
  /**
   * Check if error is a 404 Not Found
   */
  protected isNotFoundError(e: unknown): boolean {
    if (e instanceof Error) {
      return e.message.includes('404') || e.message.includes('Not Found');
    }
    return false;
  }
  
  /**
   * Check if object has pending sources to save
   * Subclasses with source code (classes, interfaces) override this
   */
  protected hasPendingSources(): boolean {
    const self = this as unknown as { 
      _pendingSources?: Record<string, string>;
      _pendingSource?: string;
    };
    return !!(self._pendingSources || self._pendingSource);
  }
  
  /**
   * Save pending sources
   * Subclasses with source code (classes, interfaces) override this
   * Default implementation does nothing
   */
  protected async savePendingSources(_options?: { lockHandle?: string; transport?: string }): Promise<void> {
    // Default: no-op. Subclasses like AdkClass override this.
  }
  
  /**
   * Set source content for a source-based object
   * 
   * Generic implementation for objects with source code (classes, includes, etc.)
   * Subclasses should override if they need custom source handling.
   * 
   * @param sourcePath - Relative path to source (e.g., '/source/main')
   * @param content - Source code content
   * @param options - Save options
   */
  async setSource(
    sourcePath: string,
    content: string,
    options: SaveOptions = {}
  ): Promise<void> {
    const { transport } = options;
    
    // Lock if not already locked
    const wasLocked = this.isLocked;
    if (!wasLocked) {
      await this.lock();
    }
    
    try {
      // Build URL
      const params = new URLSearchParams();
      if (transport) {
        params.set('corrNr', transport);
      }
      if (this._lockHandle) {
        params.set('lockHandle', this._lockHandle.handle);
      }
      
      const fullPath = `${this.objectUri}${sourcePath}`;
      const url = params.toString() 
        ? `${fullPath}?${params.toString()}`
        : fullPath;
      
      // PUT source content
      await this.ctx.client.fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
        body: content,
      });
    } finally {
      // Unlock if we locked it
      if (!wasLocked) {
        await this.unlock();
      }
    }
  }
  
  /**
   * Activate this object
   * 
   * Activates a single object. For bulk activation of multiple objects,
   * use `AdkObjectSet.activateAll()`.
   * 
   * @returns this (for chaining)
   */
  async activate(): Promise<this> {
    // Build activation request XML for single object
    const activationXml = `<?xml version="1.0" encoding="UTF-8"?>
<adtcore:objectReferences xmlns:adtcore="http://www.sap.com/adt/core">
  <adtcore:objectReference adtcore:uri="${this.objectUri}" adtcore:type="${this.type}" adtcore:name="${this.name}"/>
</adtcore:objectReferences>`;

    await this.ctx.client.fetch('/sap/bc/adt/activation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        'Accept': 'application/xml',
      },
      body: activationXml,
    });
    
    return this;
  }
  
  // ============================================
  // Caching Infrastructure
  // ============================================
  
  /** Lazy load a segment (async) - fetches only once, then cached */
  protected async lazy<T>(key: string, loader: () => Promise<T>): Promise<T> {
    if (!this.cache.has(key)) {
      this.cache.set(key, await loader());
    }
    return this.cache.get(key) as T;
  }
  
  /** Lazy compute a segment (sync) - computes only once, then cached */
  protected cached<T>(key: string, compute: () => T): T {
    if (!this.cache.has(key)) {
      this.cache.set(key, compute());
    }
    return this.cache.get(key) as T;
  }
  
  /** Set a cached value directly (for local/generated data) */
  protected set<T>(key: string, value: T): void {
    this.cache.set(key, value);
  }
  
  /** Mark a segment as dirty (modified locally) */
  protected markDirty(key: string): void {
    this.dirty.add(key);
  }
  
  /** Check if any segment (or specific segment) is dirty */
  isDirty(segment?: string): boolean {
    return segment ? this.dirty.has(segment) : this.dirty.size > 0;
  }
  
  /** Clear cache for a segment (force reload on next access) */
  protected invalidate(key: string): void {
    this.cache.delete(key);
    this.dirty.delete(key);
  }
}


/**
 * Base class for main development objects (AdtMainObject)
 * 
 * Extends AdkObject with package reference, responsible user, and master language.
 * Used for repository objects like classes, interfaces, packages, etc.
 * 
 * Note: Uses type assertions internally because schema-inferred types from
 * contracts may have different shapes than AdkMainObjectData. The getters
 * safely handle missing properties with defaults.
 * 
 * @typeParam K - The object kind (from AdkKind)
 * @typeParam D - The internal data type (typically schema-inferred from contract)
 */
export abstract class AdkMainObject<
  K extends AdkKind = AdkKind, 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  D = any
> extends AdkObject<K, D> {
  
  // Helper to access data with main object properties
  private get mainData(): AdkMainObjectData {
    return this.dataSync as unknown as AdkMainObjectData;
  }
  
  // ============================================
  // Main Object Properties (AdtMainObject additions)
  // ============================================
  
  /** Package reference (adtcore:packageRef) */
  get packageRef(): AdtObjectReference | undefined {
    return this.mainData.packageRef;
  }
  
  /** Package name (convenience getter) */
  get package(): string {
    return this.mainData.packageRef?.name ?? '';
  }
  
  /** Master system (adtcore:masterSystem) */
  get masterSystem(): string {
    return this.mainData.masterSystem ?? '';
  }
  
  /** Master language (adtcore:masterLanguage) */
  get masterLanguage(): string {
    return this.mainData.masterLanguage ?? '';
  }
  
  /** Responsible user (adtcore:responsible) */
  get responsible(): string {
    return this.mainData.responsible ?? '';
  }
  
  /** ABAP language version (adtcore:abapLanguageVersion) */
  get abapLanguageVersion(): string {
    return this.mainData.abapLanguageVersion ?? '';
  }
}
