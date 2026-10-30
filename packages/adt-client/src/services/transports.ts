/**
 * Transport Service - Business logic layer for CTS operations
 *
 * Bridges the gap between:
 * - Contracts (granular HTTP operations)
 * - ADK (object-focused logic)
 *
 * Provides orchestrated transport operations for CLI and SDK consumers.
 */

import type { AdtClientType, TransportResponse } from '@abapify/adt-contracts';

/**
 * Transport data structure (simplified for service consumers)
 */
export interface Transport {
  number: string;
  desc?: string;
  owner?: string;
  status?: string;
  type?: string;
  target?: string;
  parent?: string;
  lastChangedTimestamp?: string;
  tasks?: TransportTask[];
}

export interface TransportTask {
  number: string;
  desc?: string;
  owner?: string;
  status?: string;
  type?: string;
  parent?: string;
  lastChangedTimestamp?: string;
}

/**
 * Options for creating a transport
 */
export interface CreateTransportOptions {
  description: string;
  type?: 'K' | 'W'; // K = Workbench, W = Customizing
  target?: string;
  project?: string;
  owner?: string;
}

/**
 * Options for listing transports
 */
export interface ListTransportsOptions {
  targets?: string;
  configUri?: string;
}

/**
 * Transport Service - orchestrates CTS operations
 */
export class TransportService {
  constructor(private readonly adt: AdtClientType) {}

  /**
   * List transport requests
   */
  async list(options?: ListTransportsOptions): Promise<Transport[]> {
    const response = await this.adt.cts.transportrequests.list(options);

    // Transform contract response to service format
    // The response structure is: { request: [...] } or single request
    const requests = this.extractRequests(response);

    return requests.map((req) => this.mapToTransport(req));
  }

  /**
   * Get a single transport by number
   */
  async get(trkorr: string): Promise<Transport> {
    const response: TransportResponse =
      await this.adt.cts.transportrequests.get(trkorr);

    // Single transport response may be shaped as
    //   { root: { request: { ... }, task: [...] } }   (XML — ts-xsd keeps the root wrapper)
    //   { request: { ... }, task: [...] }             (when the root is already unwrapped)
    //   { ... }                                      (flat)
    const root =
      response && typeof response === 'object' && 'root' in response
        ? (response as { root?: Record<string, unknown> }).root
        : (response as Record<string, unknown>);
    const data = (root ?? response) as Record<string, unknown>;

    // SAP returns the parent request and the requested task as siblings
    // (e.g. GET .../DEVK900002 yields root.request=DEVK900001 and
    // root.task=DEVK900002). Prefer the unit whose number matches the
    // requested trkorr so a task fetch does not map its parent request.
    const wanted = trkorr.trim().toUpperCase();
    const siblingRequest =
      (Array.isArray(data?.request)
        ? (data.request as Record<string, unknown>[])[0]
        : (data?.request as Record<string, unknown> | undefined)) ?? undefined;
    const siblingRequestNumber = siblingRequest
      ? String(siblingRequest.number ?? '').toUpperCase()
      : '';

    const selected =
      this.findUnit(data?.task, wanted) ??
      this.findUnit(data?.request, wanted) ??
      (data?.request as Record<string, unknown> | undefined) ??
      (Array.isArray(data?.task)
        ? (data.task as unknown[])[0]
        : (data?.task as Record<string, unknown> | undefined)) ??
      data;

    // Preserve the sibling request number as parent when a task lacks an
    // explicit parent field (SAP sometimes omits it on task siblings).
    if (selected && typeof selected === 'object') {
      const sel = selected as Record<string, unknown>;
      const hasParent = Boolean(sel.parent);
      // Only patch when selected came from the task sibling list. Normalize a
      // single task node to an array so the fallback also applies to
      // single-object task responses.
      const taskNodes = Array.isArray(data?.task)
        ? (data.task as unknown[])
        : data?.task
          ? [data.task]
          : [];
      const fromTaskList = taskNodes.includes(selected);
      if (fromTaskList && !hasParent && siblingRequestNumber) {
        sel.parent = siblingRequestNumber;
      }
    }

    return this.mapToTransport(selected);
  }

  /**
   * Create a new transport request
   *
   * Note: Full create implementation requires XML body building.
   * For now, this is a placeholder that throws a helpful error.
   * Use ADK's AdkTransportRequest.create() for full functionality.
   */
  async create(_options: CreateTransportOptions): Promise<Transport> {
    // NOTE: XML body building for transport creation not yet implemented
    // The contract exists but we need to build the request XML
    throw new Error(
      'Transport creation via service layer not yet implemented. ' +
        "Use ADK's AdkTransportRequest.create() for now.",
    );
  }

  /**
   * Delete a transport request
   */
  async delete(trkorr: string): Promise<void> {
    await this.adt.cts.transportrequests.delete(trkorr);
  }

  /**
   * Release a transport request
   *
   * Note: Release requires POST with specific action parameter.
   * This is a placeholder for the full implementation.
   */
  async release(_trkorr: string): Promise<void> {
    // NOTE: Release action not yet implemented via service layer
    throw new Error('Transport release via service layer not yet implemented.');
  }

  /**
   * Find a request/task unit whose number matches the wanted transport id.
   * Handles both single-object and array shapes from ts-xsd.
   */
  private findUnit(
    node: unknown,
    wanted: string,
  ): Record<string, unknown> | undefined {
    if (!node) return undefined;
    const arr = Array.isArray(node) ? node : [node];
    return arr.find((item) => {
      const u = item as Record<string, unknown>;
      return String(u?.trkorr ?? u?.number ?? '').toUpperCase() === wanted;
    }) as Record<string, unknown> | undefined;
  }

  /**
   * Extract requests array from various response formats
   */
  private extractRequests(response: unknown): unknown[] {
    if (!response) return [];

    const data = response as Record<string, unknown>;

    // Format 1: { request: [...] }
    if (Array.isArray(data.request)) {
      return data.request;
    }

    // Format 2: { request: { ... } } (single)
    if (data.request && typeof data.request === 'object') {
      return [data.request];
    }

    // Format 3: Direct array
    if (Array.isArray(response)) {
      return response;
    }

    // Format 4: Root wrapper { root: { request: [...] } }
    if (data.root && typeof data.root === 'object') {
      return this.extractRequests(data.root);
    }

    return [];
  }

  /**
   * Map raw request data to Transport interface
   */
  private mapToTransport(req: unknown): Transport {
    const data = req as Record<string, unknown>;

    return {
      number: String(
        (data.trkorr as string | undefined) ??
          (data.number as string | undefined) ??
          '',
      ),
      desc:
        (data.as4text as string | undefined) ??
        (data.desc as string | undefined),
      owner:
        (data.as4user as string | undefined) ??
        (data.owner as string | undefined),
      status:
        (data.trstatus as string | undefined) ??
        (data.status as string | undefined),
      type:
        (data.trfunction as string | undefined) ??
        (data.type as string | undefined),
      target:
        (data.tarsystem as string | undefined) ??
        (data.target as string | undefined),
      parent: data.parent as string | undefined,
      lastChangedTimestamp:
        (data.lastchanged_timestamp as string | undefined) ??
        (data.lastChangedTimestamp as string | undefined),
      tasks: this.extractTasks(data),
    };
  }

  /**
   * Extract tasks from transport data
   */
  private extractTasks(data: Record<string, unknown>): TransportTask[] {
    const tasks = data.task ?? data.tasks;

    if (!tasks) return [];

    const taskArray = Array.isArray(tasks) ? tasks : [tasks];

    return taskArray.map((task) => {
      const t = task as Record<string, unknown>;
      return {
        number: String(
          (t.trkorr as string | undefined) ??
            (t.number as string | undefined) ??
            '',
        ),
        owner:
          (t.as4user as string | undefined) ?? (t.owner as string | undefined),
        status:
          (t.trstatus as string | undefined) ??
          (t.status as string | undefined),
        desc:
          (t.as4text as string | undefined) ?? (t.desc as string | undefined),
        type:
          (t.trfunction as string | undefined) ??
          (t.type as string | undefined),
        parent: t.parent as string | undefined,
        lastChangedTimestamp:
          (t.lastchanged_timestamp as string | undefined) ??
          (t.lastChangedTimestamp as string | undefined),
      };
    });
  }
}

/**
 * Create transport service instance
 */
export function createTransportService(adt: AdtClientType): TransportService {
  return new TransportService(adt);
}
