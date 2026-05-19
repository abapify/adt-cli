/**
 * AdkTransport - Simplified transport for import operations
 *
 * Focused on the import use case:
 * - Get transport by number
 * - Iterate objects
 * - Load each object as proper ADK type
 *
 * Architecture:
 * - Uses ADT contracts via ctx.client.adt.cts.transportrequests.get()
 * - No business logic beyond object iteration
 * - Object loading delegated to ADK registry
 */

import type { AdkContext } from '../../base/context';
import { getGlobalContext } from '../../base/global-context';
import type { TransportGetResponse } from '../../base/adt';
import type { TransportData } from './transport/transport.types';

// Types from the transport schema
// These match the structure in transportmanagment-single.types.ts
interface TransportObjectData {
  pgmid?: string;
  type?: string;
  name?: string;
  wbtype?: string;
  uri?: string;
  obj_desc?: string;
  obj_info?: string;
  lock_status?: string;
  /** Object function code (e.g. 'D' = deletion, 'K' = key, '' = modification) */
  obj_func?: string;
}

/**
 * Selector for filtering transport objects.
 *
 * All specified dimensions are ANDed together.
 * Use '*' for a wildcard that matches any non-empty value.
 */
export interface TransportObjectSelector {
  /**
   * Filter by object function code.
   * 'D' = deletion only, 'K' = key only, '*' = any non-empty value, '' = empty (normal)
   */
  objFunc?: string | string[];
  /**
   * Filter by program ID.
   * 'R3TR' = repository objects, 'LIMU' = sub-objects, '*' = any
   */
  pgmid?: string | string[];
  /**
   * Filter by object type (e.g. 'CLAS', 'TABL', '*' = any)
   */
  type?: string | string[];
}

interface TransportTaskData {
  number?: string;
  owner?: string;
  desc?: string;
  status?: string;
  status_text?: string;
  abap_object?: TransportObjectData | TransportObjectData[];
}

// Re-export the response type for consumers
export type { TransportGetResponse as TransportResponse };

/**
 * Helper to normalize array/single value to array
 */
function asArray<T>(val: T | T[] | undefined): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

/**
 * Check if a value matches a selector dimension.
 *
 * - If `expected` is undefined → no filter (always matches).
 * - If `expected` is '*' → matches any truthy value.
 * - If `expected` is an array → value must be in the array.
 * - Otherwise exact match (case-insensitive).
 */
function matchesDimension(
  value: string,
  expected: string | string[] | undefined,
): boolean {
  if (expected === undefined) return true;
  if (Array.isArray(expected)) {
    return expected.some((e) =>
      e === '*' ? !!value : e.toUpperCase() === value.toUpperCase(),
    );
  }
  if (expected === '*') return !!value;
  return expected.toUpperCase() === value.toUpperCase();
}

/**
 * Check if an object ref matches all dimensions of a {@link TransportObjectSelector}.
 *
 * Exported so that consumers (e.g. import service) can reuse the same logic
 * without duplicating it.
 */
export function matchesSelector(
  obj: AdkTransportObjectRef,
  selector: TransportObjectSelector,
): boolean {
  return (
    matchesDimension(obj.objFunc, selector.objFunc) &&
    matchesDimension(obj.pgmid, selector.pgmid) &&
    matchesDimension(obj.type, selector.type)
  );
}

/**
 * Transport object reference - lightweight wrapper
 *
 * Contains metadata about an object in the transport.
 * Call load() to get the full ADK object.
 */
export class AdkTransportObjectRef {
  constructor(
    private readonly ctx: AdkContext,
    private readonly data: TransportObjectData,
  ) {}

  /** Program ID (R3TR, LIMU, etc.) */
  get pgmid(): string {
    return this.data.pgmid ?? '';
  }

  /** Object type (CLAS, INTF, DOMA, etc.) */
  get type(): string {
    return this.data.type ?? '';
  }

  /** Object name */
  get name(): string {
    return this.data.name ?? '';
  }

  /** Workbench type (more specific type) */
  get wbtype(): string | undefined {
    return this.data.wbtype;
  }

  /** Object URI for direct access */
  get uri(): string | undefined {
    return this.data.uri;
  }

  /** Object description */
  get description(): string | undefined {
    return this.data.obj_desc;
  }

  /**
   * Object function code (SAP OBJFUNC).
   * 'D' = marked for deletion, 'K' = key entry, '' = regular modification.
   */
  get objFunc(): string {
    return this.data.obj_func ?? '';
  }

  /** Whether this object is marked for deletion (obj_func === 'D') */
  get isDeleted(): boolean {
    return this.data.obj_func === 'D';
  }

  /** Full object key (PGMID/TYPE/NAME) */
  get key(): string {
    return `${this.pgmid}/${this.type}/${this.name}`;
  }

  /**
   * Load the full ADK object
   *
   * Uses the ADK factory to create the appropriate object type
   * (AdkClass, AdkInterface, AdkPackage, etc.)
   *
   * @returns The loaded ADK object, or undefined if type not supported
   */
  async load(): Promise<unknown> {
    // Import dynamically to avoid circular dependency
    const { createAdk } = await import('../../factory');
    const adk = createAdk(this.ctx.client);

    // Use the factory to get the object
    // The factory handles type resolution and loading
    try {
      const obj = adk.get(this.name, this.type);
      // Check if object has load method (AdkGenericObject doesn't)
      if ('load' in obj && typeof obj.load === 'function') {
        await obj.load();
      }
      return obj;
    } catch {
      // Type not supported or object not found
      return undefined;
    }
  }

  /** Raw data from API */
  get raw(): TransportObjectData {
    return this.data;
  }
}

/**
 * Transport task reference
 */
export class AdkTransportTaskRef {
  constructor(
    private readonly ctx: AdkContext,
    private readonly data: TransportTaskData,
  ) {}

  get number(): string {
    return this.data.number ?? '';
  }
  get owner(): string {
    return this.data.owner ?? '';
  }
  get description(): string {
    return this.data.desc ?? '';
  }
  get status(): string {
    return this.data.status ?? '';
  }
  get statusText(): string {
    return this.data.status_text ?? '';
  }

  /** Objects in this task */
  get objects(): AdkTransportObjectRef[] {
    return asArray(this.data.abap_object).map(
      (obj) => new AdkTransportObjectRef(this.ctx, obj),
    );
  }
}

/**
 * AdkTransport - Transport request for import operations
 *
 * Simple, focused API for importing transport objects:
 *
 * @example
 * ```typescript
 * const transport = await AdkTransport.get('DEVK900001');
 *
 * for (const objRef of transport.objects) {
 *   console.log(`${objRef.type} ${objRef.name}`);
 *   const adkObject = await objRef.load();
 *   if (adkObject) {
 *     // Serialize with plugin
 *     await plugin.serialize(adkObject);
 *   }
 * }
 * ```
 */
export class AdkTransport {
  private _objects?: AdkTransportObjectRef[];
  private _tasks?: AdkTransportTaskRef[];

  private constructor(
    private readonly ctx: AdkContext,
    private readonly data: TransportData,
  ) {}

  // ===========================================================================
  // Properties
  // ===========================================================================

  /** Transport number */
  get number(): string {
    return this.data.name ?? this.data.request?.number ?? '';
  }

  /** Transport description */
  get description(): string {
    return this.data.request?.desc ?? '';
  }

  /** Transport owner */
  get owner(): string {
    return this.data.request?.owner ?? '';
  }

  /** Transport status (D=Modifiable, R=Released) */
  get status(): string {
    return this.data.request?.status ?? '';
  }

  /** Transport status text */
  get statusText(): string {
    return this.data.request?.status_text ?? '';
  }

  /** Transport target system */
  get target(): string {
    return this.data.request?.target ?? '';
  }

  /** Object type (K=Request, T=Task) */
  get objectType(): string {
    return this.data.object_type ?? 'K';
  }

  // ===========================================================================
  // Tasks
  // ===========================================================================

  /** Tasks belonging to this transport */
  get tasks(): AdkTransportTaskRef[] {
    if (!this._tasks) {
      const requestTasks = asArray(this.data.request?.task);
      const rootTasks = asArray(this.data.task);
      const allTasks = [...requestTasks, ...rootTasks];
      this._tasks = allTasks.map((t) => new AdkTransportTaskRef(this.ctx, t));
    }
    return this._tasks;
  }

  // ===========================================================================
  // Objects - Aggregated from all sources
  // ===========================================================================

  /**
   * All objects in this transport
   *
   * Collects objects from:
   * - Direct objects on request
   * - Objects from all tasks
   * - all_objects container (if present)
   */
  get objects(): AdkTransportObjectRef[] {
    if (!this._objects) {
      this._objects = this.collectObjects();
    }
    return this._objects;
  }

  private collectObjects(): AdkTransportObjectRef[] {
    const objects: AdkTransportObjectRef[] = [];
    const seen = new Set<string>();

    const addObject = (obj: TransportObjectData) => {
      const key = `${obj.pgmid}/${obj.type}/${obj.name}`;
      if (!seen.has(key)) {
        seen.add(key);
        objects.push(new AdkTransportObjectRef(this.ctx, obj));
      }
    };

    // Direct objects on request
    for (const obj of asArray(this.data.request?.abap_object)) {
      addObject(obj);
    }

    // Objects from all_objects container
    for (const obj of asArray(this.data.request?.all_objects?.abap_object)) {
      addObject(obj);
    }

    // Objects from tasks (both request.task and root task)
    for (const task of this.tasks) {
      for (const objRef of task.objects) {
        addObject(objRef.raw);
      }
    }

    return objects;
  }

  // ===========================================================================
  // Filtering helpers
  // ===========================================================================

  /**
   * Get objects filtered by type
   *
   * @param types - Object types to include (e.g., ['CLAS', 'INTF'])
   */
  getObjectsByType(...types: string[]): AdkTransportObjectRef[] {
    const typeSet = new Set(types.map((t) => t.toUpperCase()));
    return this.objects.filter((obj) => typeSet.has(obj.type.toUpperCase()));
  }

  /**
   * Get objects filtered by a {@link TransportObjectSelector}.
   *
   * All dimensions specified in the selector are ANDed together.
   *
   * @example
   * ```typescript
   * // Get only deletion objects with pgmid=R3TR
   * const deleted = transport.getObjectsBySelector({ objFunc: 'D', pgmid: 'R3TR' });
   * ```
   */
  getObjectsBySelector(
    selector: TransportObjectSelector,
  ): AdkTransportObjectRef[] {
    return this.objects.filter((obj) => matchesSelector(obj, selector));
  }

  /**
   * Convenience accessor for objects marked for deletion (obj_func === 'D').
   *
   * Equivalent to `getObjectsBySelector({ objFunc: 'D' })`.
   */
  get deletionObjects(): AdkTransportObjectRef[] {
    return this.getObjectsBySelector({ objFunc: 'D' });
  }

  /**
   * Get unique object types in this transport
   */
  getObjectTypes(): string[] {
    const types = new Set(this.objects.map((obj) => obj.type));
    return Array.from(types).sort();
  }

  /**
   * Get object count by type
   */
  getObjectCountByType(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const obj of this.objects) {
      counts[obj.type] = (counts[obj.type] || 0) + 1;
    }
    return counts;
  }

  // ===========================================================================
  // Raw data access
  // ===========================================================================

  /** Raw API response (unwrapped) */
  get raw(): TransportData {
    return this.data;
  }

  // ===========================================================================
  // Static Factory
  // ===========================================================================

  /**
   * Get a transport by number
   *
   * @param number - Transport number (e.g., 'DEVK900001')
   * @param ctx - Optional ADK context (uses global context if not provided)
   *
   * @example
   * ```typescript
   * const transport = await AdkTransport.get('DEVK900001');
   * console.log(`${transport.description} - ${transport.objects.length} objects`);
   * ```
   */
  static async get(number: string, ctx?: AdkContext): Promise<AdkTransport> {
    const context = ctx ?? getGlobalContext();
    const response = await context.client.adt.cts.transportrequests.get(number);
    // Unwrap the root element from the response
    return new AdkTransport(context, response.root);
  }

  /**
   * Load multiple transports and merge their objects into a single view.
   *
   * De-duplication key is `pgmid/type/name`. When the same key appears in
   * multiple transports the **first** occurrence wins (first transport in the
   * `numbers` array).  The source transport number is available via
   * `AdkTransportObjectRef.sourceTransport`.
   *
   * @param numbers - Transport numbers to load and merge
   * @param ctx     - Optional ADK context
   *
   * @example
   * ```typescript
   * const merged = await AdkTransport.merge(['DEVK900001', 'DEVK900002']);
   * const deletions = merged.getObjectsBySelector({ objFunc: 'D' });
   * ```
   */
  static async merge(
    numbers: string[],
    ctx?: AdkContext,
  ): Promise<MergedTransportView> {
    const transports = await Promise.all(
      numbers.map((n) => AdkTransport.get(n, ctx)),
    );
    return new MergedTransportView(transports);
  }
}

/**
 * Merged view of objects from multiple transports.
 *
 * De-duplicates by `pgmid/type/name`; first occurrence wins.
 */
export class MergedTransportView {
  private readonly _objects: AdkTransportObjectRef[];
  readonly transports: AdkTransport[];

  constructor(transports: AdkTransport[]) {
    this.transports = transports;
    const seen = new Set<string>();
    const all: AdkTransportObjectRef[] = [];
    for (const tr of transports) {
      for (const obj of tr.objects) {
        if (!seen.has(obj.key)) {
          seen.add(obj.key);
          all.push(obj);
        }
      }
    }
    this._objects = all;
  }

  /** All objects across transports (deduplicated) */
  get objects(): AdkTransportObjectRef[] {
    return this._objects;
  }

  /** Objects matching a selector across all transports */
  getObjectsBySelector(
    selector: TransportObjectSelector,
  ): AdkTransportObjectRef[] {
    return this._objects.filter((obj) => matchesSelector(obj, selector));
  }

  /** Convenience: objects marked for deletion (obj_func === 'D') */
  get deletionObjects(): AdkTransportObjectRef[] {
    return this.getObjectsBySelector({ objFunc: 'D' });
  }

  /**
   * Load multiple transports and return a merged view.
   *
   * @param numbers - Transport numbers to load and merge
   * @param ctx     - Optional ADK context
   */
  static async create(
    numbers: string[],
    ctx?: AdkContext,
  ): Promise<MergedTransportView> {
    const transports = await Promise.all(
      numbers.map((n) => AdkTransport.get(n, ctx)),
    );
    return new MergedTransportView(transports);
  }
}
