/**
 * ADK Object Set - Bulk Operations Service
 *
 * Provides a semantic layer for working with collections of ADK objects.
 * Supports bulk save, activate, and other batch operations.
 *
 * @example
 * ```typescript
 * const set = new AdkObjectSet(ctx);
 *
 * // Add objects from various sources
 * set.add(classObj);
 * set.addAll(interfaceObjects);
 *
 * // Bulk operations
 * await set.saveAll({ transport: 'DEVK900001', inactive: true });
 * await set.activateAll();
 * ```
 */

import type { AdkContext } from './context';
import type { SaveOptions, ActivationResult, LockHandle } from './model';
import { AdkObject } from './model';

/**
 * Result of bulk save operation
 */
export interface BulkSaveResult {
  /** Number of successfully saved objects */
  success: number;
  /** Number of objects that failed to save */
  failed: number;
  /** Details per object */
  results: Array<{
    object: AdkObject;
    success: boolean;
    error?: string;
  }>;
}

/**
 * Options for bulk save operation
 */
export interface BulkSaveOptions extends SaveOptions {
  /** Continue saving remaining objects if one fails (default: true) */
  continueOnError?: boolean;
  /** Callback for progress reporting */
  onProgress?: (saved: number, total: number, current: AdkObject) => void;
}

/**
 * Options for bulk activation
 */
export interface BulkActivateOptions {
  /** Callback for progress reporting */
  onProgress?: (message: string) => void;
}

/**
 * ADK Object Set - Collection of objects with bulk operations
 *
 * A semantic layer for managing collections of ADK objects and
 * performing bulk operations like save and activate.
 */
export class AdkObjectSet {
  private readonly ctx: AdkContext;
  private readonly objects: AdkObject[] = [];

  constructor(ctx: AdkContext) {
    this.ctx = ctx;
  }

  // ============================================
  // Collection Management
  // ============================================

  /**
   * Add a single object to the set
   */
  add(object: AdkObject): this {
    if (!this.objects.includes(object)) {
      this.objects.push(object);
    }
    return this;
  }

  /**
   * Add multiple objects to the set
   */
  addAll(objects: AdkObject[]): this {
    for (const obj of objects) {
      this.add(obj);
    }
    return this;
  }

  /**
   * Remove an object from the set
   */
  remove(object: AdkObject): this {
    const index = this.objects.indexOf(object);
    if (index !== -1) {
      this.objects.splice(index, 1);
    }
    return this;
  }

  /**
   * Clear all objects from the set
   */
  clear(): this {
    this.objects.length = 0;
    return this;
  }

  /**
   * Get all objects in the set
   */
  getAll(): AdkObject[] {
    return [...this.objects];
  }

  /**
   * Get number of objects in the set
   */
  get size(): number {
    return this.objects.length;
  }

  /**
   * Check if set is empty
   */
  get isEmpty(): boolean {
    return this.objects.length === 0;
  }

  /**
   * Filter objects by type
   */
  filterByType(type: string): AdkObject[] {
    return this.objects.filter((obj) => obj.type === type);
  }

  /**
   * Filter objects by kind
   */
  filterByKind(kind: string): AdkObject[] {
    return this.objects.filter((obj) => obj.kind === kind);
  }

  /**
   * Iterate over objects
   */
  [Symbol.iterator](): Iterator<AdkObject> {
    return this.objects[Symbol.iterator]();
  }

  // ============================================
  // Bulk Operations
  // ============================================

  /**
   * Save all objects in the set
   *
   * Saves each object individually, handling lock/unlock per object.
   * By default continues on error to save as many objects as possible.
   *
   * @param options - Save options (transport, inactive, continueOnError)
   * @returns Result with success/failure counts and details
   */
  async saveAll(options: BulkSaveOptions = {}): Promise<BulkSaveResult> {
    const { continueOnError = true, onProgress, ...saveOptions } = options;

    const result: BulkSaveResult = {
      success: 0,
      failed: 0,
      results: [],
    };

    const total = this.objects.length;
    let saved = 0;

    for (const obj of this.objects) {
      try {
        await obj.save(saveOptions);

        saved++;
        onProgress?.(saved, total, obj);

        result.success++;
        result.results.push({ object: obj, success: true });
      } catch (error) {
        result.failed++;
        result.results.push({
          object: obj,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });

        if (!continueOnError) {
          break;
        }
      }
    }

    return result;
  }

  /**
   * Activate all objects in the set (bulk activation)
   *
   * Uses SAP's bulk activation endpoint for efficiency.
   * All objects are activated in a single request.
   *
   * @param options - Activation options
   * @returns Activation result with success/failure counts
   */
  async activateAll(
    options: BulkActivateOptions = {},
  ): Promise<ActivationResult> {
    const { onProgress } = options;

    if (this.objects.length === 0) {
      return { success: 0, failed: 0, messages: [] };
    }

    onProgress?.(`Activating ${this.objects.length} objects...`);

    // Build activation request XML
    const objectRefs = this.objects
      .map(
        (obj) =>
          `<adtcore:objectReference adtcore:uri="${obj.objectUri}" adtcore:type="${obj.type}" adtcore:name="${obj.name}"/>`,
      )
      .join('\n  ');

    const activationXml = `<?xml version="1.0" encoding="UTF-8"?>
<adtcore:objectReferences xmlns:adtcore="http://www.sap.com/adt/core">
  ${objectRefs}
</adtcore:objectReferences>`;

    try {
      const response = await this.ctx.client.fetch('/sap/bc/adt/activation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
          Accept: 'application/xml',
        },
        body: activationXml,
      });

      // NOTE: Could parse actual response XML for detailed messages
      return {
        success: this.objects.length,
        failed: 0,
        messages: [],
        response: String(response),
      };
    } catch (error) {
      return {
        success: 0,
        failed: this.objects.length,
        messages: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * Save all objects as inactive, then bulk activate, then unlock
   *
   * This is the recommended pattern for deploying multiple objects:
   * 1. Save all objects as inactive (handles dependencies)
   * 2. Bulk activate all saved objects
   * 3. Unlock all objects
   *
   * @param options - Save options (transport required)
   * @returns Combined result of save and activation
   */
  async deploy(options: BulkSaveOptions & { activate?: boolean }): Promise<{
    save: BulkSaveResult;
    activation?: ActivationResult;
  }> {
    const { activate = true, ...saveOptions } = options;

    try {
      // Step 1: Save all as inactive
      const saveResult = await this.saveAll({
        ...saveOptions,
        inactive: true,
      });

      // Step 2: Bulk activate (only successfully saved objects)
      let activationResult: ActivationResult | undefined;

      if (activate && saveResult.success > 0) {
        // Create a temporary set with only saved objects for activation
        const savedSet = new AdkObjectSet(this.ctx);
        for (const r of saveResult.results) {
          if (r.success) {
            savedSet.add(r.object);
          }
        }

        activationResult = await savedSet.activateAll();
      }

      return {
        save: saveResult,
        activation: activationResult,
      };
    } finally {
      // Step 3: Always unlock all objects
      await this.unlockAll();
    }
  }

  /**
   * Lock all objects in the set
   *
   * @returns Array of lock handles
   */
  async lockAll(): Promise<LockHandle[]> {
    const handles: LockHandle[] = [];

    for (const obj of this.objects) {
      const handle = await obj.lock();
      handles.push(handle);
    }

    return handles;
  }

  /**
   * Unlock all objects in the set
   */
  async unlockAll(): Promise<void> {
    for (const obj of this.objects) {
      await obj.unlock();
    }
  }

  /**
   * Load all objects (fetch data from SAP)
   *
   * @param options - Load options
   * @returns This set (for chaining)
   */
  async loadAll(options: { parallel?: boolean } = {}): Promise<this> {
    const { parallel = false } = options;

    if (parallel) {
      await Promise.all(this.objects.map((obj) => obj.load()));
    } else {
      for (const obj of this.objects) {
        await obj.load();
      }
    }

    return this;
  }

  // ============================================
  // Static Factory Methods
  // ============================================

  /**
   * Create an object set from an array of objects
   */
  static from(objects: AdkObject[], ctx: AdkContext): AdkObjectSet {
    const set = new AdkObjectSet(ctx);
    set.addAll(objects);
    return set;
  }

  /**
   * Create an object set by collecting from an async generator
   *
   * Collects all objects yielded by the generator into the set.
   * Useful for collecting objects from format plugin export generators.
   *
   * @param generator - Async generator yielding AdkObject instances
   * @param ctx - ADK context for the set
   * @param options - Collection options
   * @returns Promise resolving to populated AdkObjectSet
   */
  static async fromGenerator(
    generator: AsyncGenerator<AdkObject>,
    ctx: AdkContext,
    options: {
      /** Filter function to include/exclude objects */
      filter?: (obj: AdkObject) => boolean;
      /** Callback for each object collected */
      onObject?: (obj: AdkObject) => void;
    } = {},
  ): Promise<AdkObjectSet> {
    const { filter, onObject } = options;
    const set = new AdkObjectSet(ctx);

    for await (const obj of generator) {
      // Apply filter if provided
      if (filter && !filter(obj)) {
        continue;
      }

      set.add(obj);
      onObject?.(obj);
    }

    return set;
  }
}
