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
}
