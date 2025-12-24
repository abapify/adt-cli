/**
 * AdkTransportRequest & AdkTransportTask
 *
 * Simplified 2-layer structure:
 * - AdkTransportRequest: full transport request with tasks, CRUD, etc.
 * - AdkTransportTask: extends request with task-specific overrides
 *
 * Both share the same API response structure, just different data sources.
 * Kept in one file to avoid circular dependency issues.
 *
 * Architecture:
 * - Uses ADT contracts directly via ctx.client.adt.cts.*
 * - No intermediate "service" layer - ADK objects ARE the service layer
 * - Raw fetch for operations not covered by contracts (create, release, lock)
 */

import type { AdkContext } from '../../../base/context';
import { getGlobalContext } from '../../../base/global-context';
import { AdkObject } from '../../../base/model';
import { TransportRequest as TransportRequestKind } from '../../../base/kinds';
import { requiresLock, parseSapTimestamp } from '../../../decorators';
import type {
  TransportData,
  TransportRequestData,
  TransportTaskData,
  TransportObjectData,
  TransportCreateOptions,
  TransportUpdateOptions,
  ReleaseResult,
  LockHandle,
} from './transport.types';
import { AdkTransportObject } from './transport-object';

// =============================================================================
// Helpers
// =============================================================================

const STATUS_TEXT: Record<string, string> = {
  D: 'Modifiable',
  R: 'Released',
  N: 'Not released',
};

function asArray<T>(val: T | T[] | undefined): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

/** Escape XML special characters */
function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// =============================================================================
// Config Cache (module-level for efficiency)
// =============================================================================

let cachedConfigUri: string | undefined;

async function getConfigUri(ctx: AdkContext): Promise<string> {
  if (cachedConfigUri) return cachedConfigUri;

  const response =
    await ctx.client.adt.cts.transportrequests.searchconfiguration.configurations.get();
  const configs = response?.configurations;
  if (!configs) throw new Error('No search configuration found');

  const configArray = Array.isArray(configs) ? configs : [configs];
  if (configArray.length === 0)
    throw new Error('No search configuration found');

  const uri = configArray[0]?.link?.href;
  if (!uri) throw new Error('No search configuration URI found');

  cachedConfigUri = uri;
  return uri;
}

/** Clear config cache (for testing) */
export function clearConfigCache(): void {
  cachedConfigUri = undefined;
}

// =============================================================================
// Response Normalization Helpers
// =============================================================================

interface RawRequest {
  number?: string;
  owner?: string;
  desc?: string;
  status?: string;
  uri?: string;
  task?: unknown;
  abap_object?: unknown;
}

/**
 * Collect all requests from the transport response structure
 * The schema has requests in multiple places:
 * - workbench.modifiable.request[]
 * - workbench.relstarted.request[]
 * - workbench.released.request[]
 * - workbench.target[].modifiable.request[]
 * - customizing.* (same structure)
 */
function collectAllRequests(result: unknown): RawRequest[] {
  const requests: RawRequest[] = [];

  if (!result || typeof result !== 'object') return requests;

  const data = result as Record<string, unknown>;

  // Helper to extract requests from a container (modifiable, relstarted, released)
  const extractFromContainer = (container: unknown) => {
    if (!container || typeof container !== 'object') return;
    const c = container as Record<string, unknown>;
    const reqs = c.request;
    if (reqs) {
      const reqArray = Array.isArray(reqs) ? reqs : [reqs];
      requests.push(...(reqArray as RawRequest[]));
    }
  };

  // Helper to process workbench or customizing section
  const processSection = (section: unknown) => {
    if (!section || typeof section !== 'object') return;
    const s = section as Record<string, unknown>;

    // Direct containers
    extractFromContainer(s.modifiable);
    extractFromContainer(s.relstarted);
    extractFromContainer(s.released);

    // Target-specific containers
    const targets = s.target;
    if (targets) {
      const targetArray = Array.isArray(targets) ? targets : [targets];
      for (const target of targetArray) {
        if (target && typeof target === 'object') {
          const t = target as Record<string, unknown>;
          extractFromContainer(t.modifiable);
          extractFromContainer(t.relstarted);
          extractFromContainer(t.released);
        }
      }
    }
  };

  processSection(data.workbench);
  processSection(data.customizing);

  return requests;
}

// =============================================================================
// Internal Data Type
// =============================================================================

interface TransportObjectDataInternal {
  name: string;
  type: string;
  response: TransportData;
}

// =============================================================================
// AdkTransportRequest
// =============================================================================

/**
 * Transport Request - main transport object
 *
 * Handles both requests (K) and can be extended for tasks (T).
 * Uses ADT contracts directly - no intermediate service layer.
 */
export class AdkTransportRequest extends AdkObject<
  typeof TransportRequestKind,
  TransportObjectDataInternal
> {
  readonly kind = TransportRequestKind;
  protected _tasks?: AdkTransportTask[];
  protected _objects?: AdkTransportObject[];

  constructor(ctx: AdkContext, dataOrNumber: TransportData | string) {
    if (typeof dataOrNumber === 'string') {
      super(ctx, dataOrNumber);
    } else {
      super(ctx, {
        name: dataOrNumber.name || dataOrNumber.request?.number || '',
        type: dataOrNumber.object_type === 'T' ? 'RQTQ' : 'RQRQ',
        response: dataOrNumber,
      });
    }
  }

  // ===========================================================================
  // Response Access
  // ===========================================================================

  protected get response(): TransportData {
    return this.dataSync.response;
  }

  /** The item's data - override in subclass for different source */
  protected get itemData(): TransportRequestData {
    return this.response.request || ({} as TransportRequestData);
  }

  get objectUri(): string {
    return `/sap/bc/adt/cts/transportrequests/${this.name}`;
  }

  override async load(): Promise<this> {
    const rawResponse = await this.ctx.client.adt.cts.transportrequests.get(
      this.name,
    );
    // Unwrap the root element from the response
    const response = rawResponse.root;
    this.setData({
      name: this.name,
      type: response.object_type === 'T' ? 'RQTQ' : 'RQRQ',
      response,
    });
    return this;
  }

  // Note: save() not supported - no crudContract defined
  // Transport requests are managed via CTS APIs (release, import, etc.)

  // ===========================================================================
  // Properties (shared by request and task)
  // ===========================================================================

  get itemType(): 'request' | 'task' {
    return this.response.object_type === 'T' ? 'task' : 'request';
  }

  get number(): string {
    return this.name;
  }
  get owner(): string {
    return this.itemData.owner || '';
  }
  override get description(): string {
    return this.itemData.desc || '';
  }
  get status(): string {
    return this.itemData.status || 'D';
  }
  get statusText(): string {
    return this.itemData.status_text || STATUS_TEXT[this.status] || this.status;
  }
  get target(): string {
    return this.itemData.target || '';
  }
  get targetDescription(): string {
    return this.itemData.target_desc || '';
  }
  get uri(): string {
    return this.itemData.uri || this.objectUri;
  }
  get parent(): string {
    return this.itemData.parent || '';
  }

  get lastChangedAt(): Date | undefined {
    return parseSapTimestamp(this.itemData.lastchanged_timestamp);
  }

  // ===========================================================================
  // Composition: Tasks (request only)
  // ===========================================================================

  /** Tasks belonging to this transport request */
  get tasks(): AdkTransportTask[] {
    if (!this._tasks) {
      const taskData = this.itemData.task;
      this._tasks = asArray(taskData).map((t) => {
        // Build response for task
        const { request, task: _existingTasks, ...rootProps } = this.response;
        const { task: _nestedTasks, ...requestWithoutTasks } = request || {};

        const taskResponse: TransportData = {
          ...rootProps,
          object_type: 'T',
          name: t.number || '',
          request: request
            ? (requestWithoutTasks as typeof request)
            : undefined,
          task: [t],
        };
        return new AdkTransportTask(this.ctx, taskResponse, this);
      });
    }
    return this._tasks;
  }

  // ===========================================================================
  // Composition: Objects
  // ===========================================================================

  /**
   * All objects in this request (aggregated from tasks)
   * Override in AdkTransportTask for direct objects
   */
  get objects(): AdkTransportObject[] {
    if (!this._objects) {
      // Direct objects in request
      const directObjects = asArray(this.itemData.abap_object).map(
        (o) => new AdkTransportObject(o),
      );
      // Objects from tasks
      const taskObjects = this.tasks.flatMap((t) => t.objects);
      this._objects = [...directObjects, ...taskObjects];
    }
    return this._objects;
  }

  // ===========================================================================
  // Actions
  // ===========================================================================

  async release(): Promise<ReleaseResult> {
    try {
      // SAP ADT requires namespace-prefixed attributes (non-standard XML)
      const xml = `<?xml version="1.0" encoding="UTF-8"?><tm:root xmlns:tm="http://www.sap.com/cts/adt/tm" tm:useraction="release"/>`;

      await this.ctx.client.fetch(
        `/sap/bc/adt/cts/transportrequests/${this.number}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/vnd.sap.adt.transportorganizer.v1+xml',
            Accept: 'application/vnd.sap.adt.transportorganizer.v1+xml',
          },
          body: xml,
        },
      );

      (this.itemData as { status?: string; status_text?: string }).status = 'R';
      (this.itemData as { status?: string; status_text?: string }).status_text =
        'Released';
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async releaseAll(): Promise<ReleaseResult> {
    for (const task of this.tasks) {
      if (task.status !== 'R') {
        const result = await task.release();
        if (!result.success) {
          return {
            success: false,
            message: `Failed to release task ${task.number}: ${result.message}`,
          };
        }
      }
    }
    return this.release();
  }

  // ===========================================================================
  // CRUD Operations (request only)
  // ===========================================================================

  @requiresLock()
  async update(changes: TransportUpdateOptions): Promise<void> {
    await this.ctx.client.adt.cts.transportrequests.put(this.number, {
      desc: changes.description ?? this.description,
      target: changes.target ?? this.target,
    } as Parameters<typeof this.ctx.client.adt.cts.transportrequests.put>[1]);

    if (changes.description !== undefined) {
      (this.itemData as { desc?: string }).desc = changes.description;
    }
    if (changes.target !== undefined) {
      (this.itemData as { target?: string }).target = changes.target;
    }
  }

  async delete(): Promise<void> {
    await this.ctx.client.adt.cts.transportrequests.delete(this.number);
  }

  // ===========================================================================
  // Static Factory
  // ===========================================================================

  /**
   * Create a new transport request
   *
   * @param options - Transport creation options
   * @param ctx - Optional ADK context (uses global context if not provided)
   */
  static async create(
    options: TransportCreateOptions,
    ctx?: AdkContext,
  ): Promise<AdkTransportRequest> {
    const context = ctx ?? getGlobalContext();

    // Get owner - use provided or auto-detect from system
    let owner = options.owner;
    if (!owner) {
      owner = await AdkTransportRequest.getCurrentUser(context);
    }

    // SAP ADT requires namespace-prefixed attributes (non-standard XML)
    const xml = `<?xml version="1.0" encoding="UTF-8"?><tm:root xmlns:tm="http://www.sap.com/cts/adt/tm" tm:useraction="newrequest"><tm:request tm:desc="${escapeXml(options.description)}" tm:type="${options.type || 'K'}" tm:target="${options.target || 'LOCAL'}" tm:cts_project="${options.project || ''}"><tm:task tm:owner="${owner}"/></tm:request></tm:root>`;

    const responseXml = await context.client.fetch(
      '/sap/bc/adt/cts/transportrequests',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/vnd.sap.adt.transportorganizer.v1+xml',
          Accept: 'application/vnd.sap.adt.transportorganizer.v1+xml',
        },
        body: xml,
      },
    );

    // Parse response - extract transport number from response XML
    const numberMatch = String(responseXml).match(/tm:number="([^"]+)"/);
    const number = numberMatch?.[1];
    if (!number)
      throw new Error('Failed to create transport - no number returned');

    return AdkTransportRequest.get(number, context);
  }

  /**
   * Get a transport request by number
   *
   * @param number - Transport number (e.g., 'S0DK900001')
   * @param ctx - Optional ADK context (uses global context if not provided)
   */
  static async get(
    number: string,
    ctx?: AdkContext,
  ): Promise<AdkTransportRequest> {
    const context = ctx ?? getGlobalContext();
    const rawResponse =
      await context.client.adt.cts.transportrequests.get(number);
    // Unwrap the root element from the response
    const response = rawResponse.root;
    // Return task or request based on object_type
    if (response.object_type === 'T') {
      return new AdkTransportTask(context, response);
    }
    return new AdkTransportRequest(context, response);
  }

  /**
   * List all transports for the current user
   *
   * @param ctx - Optional ADK context (uses global context if not provided)
   */
  static async list(ctx?: AdkContext): Promise<AdkTransportRequest[]> {
    const context = ctx ?? getGlobalContext();
    const configUri = await getConfigUri(context);

    const response = await context.client.adt.cts.transportrequests.list({
      targets: 'true',
      configUri: configUri,
    });

    const requests = collectAllRequests(response);
    // Wrap raw request data in TransportData structure expected by constructor
    return requests.map(
      (r) =>
        new AdkTransportRequest(context, {
          name: r.number || '',
          object_type: 'K',
          request: {
            number: r.number,
            owner: r.owner,
            desc: r.desc,
            status: r.status,
            uri: r.uri,
            task: r.task as TransportTaskData | TransportTaskData[] | undefined,
            abap_object: r.abap_object as
              | TransportObjectData
              | TransportObjectData[]
              | undefined,
          },
        } as TransportData),
    );
  }

  /**
   * Get current user from the system metadata
   *
   * @param ctx - Optional ADK context (uses global context if not provided)
   */
  static async getCurrentUser(ctx?: AdkContext): Promise<string> {
    const context = ctx ?? getGlobalContext();

    const xmlContent = await context.client.fetch(
      '/sap/bc/adt/cts/transportrequests/searchconfiguration/metadata',
      {
        headers: {
          Accept: 'application/vnd.sap.adt.configuration.metadata.v1+xml',
        },
      },
    );

    const userMatch = String(xmlContent).match(
      /<configuration:property key="User"[^>]*>([^<]+)</,
    );
    if (userMatch && userMatch[1]) {
      return userMatch[1].trim();
    }

    throw new Error('Could not detect current user from metadata response');
  }

  // ===========================================================================
  // Lock Operations (override base class)
  // ===========================================================================

  /**
   * Lock this transport for modification
   * Overrides base class to use transport-specific endpoint
   */
  override async lock(): Promise<LockHandle> {
    const response = await this.ctx.client.fetch(
      `/sap/bc/adt/cts/transportrequests/${this.number}?_action=LOCK&accessMode=MODIFY`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.sap.as+xml',
          'Content-Type': 'application/xml',
        },
      },
    );

    const handleMatch = String(response).match(
      /<LOCK_HANDLE>([^<]+)<\/LOCK_HANDLE>/,
    );
    if (!handleMatch?.[1]) {
      throw new Error(
        `Failed to acquire lock for ${this.number} - no handle returned`,
      );
    }

    // Store in base class for @requiresLock decorator
    this['_lockHandle'] = { handle: handleMatch[1] };
    return { handle: handleMatch[1] };
  }

  /**
   * Unlock this transport
   * Overrides base class to use transport-specific endpoint
   */
  override async unlock(): Promise<void> {
    const handle = this['_lockHandle'];
    if (!handle) return;

    await this.ctx.client.fetch(
      `/sap/bc/adt/cts/transportrequests/${this.number}?_action=UNLOCK&lockHandle=${encodeURIComponent(handle.handle)}`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.sap.as+xml',
        },
      },
    );

    this['_lockHandle'] = undefined;
  }
}

// =============================================================================
// AdkTransportTask
// =============================================================================

/**
 * Transport Task - child of a transport request
 *
 * Minimal overrides:
 * - itemData: from response.task instead of response.request
 * - objects: direct from task, not aggregated
 * - request: parent reference
 * - No tasks, no CRUD
 */
export class AdkTransportTask extends AdkTransportRequest {
  private _parentRequest?: AdkTransportRequest;
  private readonly parentRef?: AdkTransportRequest;

  constructor(
    ctx: AdkContext,
    dataOrNumber: TransportData | string,
    parentRef?: AdkTransportRequest,
  ) {
    super(ctx, dataOrNumber);
    this.parentRef = parentRef;
  }

  // ===========================================================================
  // Override: itemData from task element
  // ===========================================================================

  protected override get itemData(): TransportRequestData {
    const rootTask = this.response.task;
    if (rootTask) {
      const taskArr = Array.isArray(rootTask) ? rootTask : [rootTask];
      const found = taskArr.find((t) => t.number === this.name) || taskArr[0];
      if (found) return found as unknown as TransportRequestData;
    }
    return this.response.request || ({} as TransportRequestData);
  }

  // ===========================================================================
  // Override: No tasks
  // ===========================================================================

  override get tasks(): AdkTransportTask[] {
    return []; // Tasks don't have sub-tasks
  }

  // ===========================================================================
  // Override: Direct objects (not aggregated)
  // ===========================================================================

  override get objects(): AdkTransportObject[] {
    if (!this._objects) {
      const taskData = this.itemData as unknown as TransportTaskData;
      this._objects = asArray(taskData?.abap_object).map(
        (o) => new AdkTransportObject(o),
      );
    }
    return this._objects;
  }

  // ===========================================================================
  // Task-specific: Parent reference
  // ===========================================================================

  /** Parent transport request */
  get request(): AdkTransportRequest {
    if (this.parentRef) return this.parentRef;

    if (!this._parentRequest) {
      // Parent request number comes from response.request.number or task's parent attribute
      const parentNumber = this.response.request?.number || this.parent;
      this._parentRequest = new AdkTransportRequest(this.ctx, {
        ...this.response,
        name: parentNumber,
        object_type: 'K',
      });
    }
    return this._parentRequest;
  }

  // ===========================================================================
  // Static Factory
  // ===========================================================================

  /**
   * Get a transport task by number
   *
   * @param number - Task number (e.g., 'S0DK900001')
   * @param ctx - Optional ADK context (uses global context if not provided)
   */
  static override async get(
    number: string,
    ctx?: AdkContext,
  ): Promise<AdkTransportTask> {
    const context = ctx ?? getGlobalContext();
    const rawResponse =
      await context.client.adt.cts.transportrequests.get(number);
    // Unwrap the root element from the response
    return new AdkTransportTask(context, rawResponse.root);
  }
}
