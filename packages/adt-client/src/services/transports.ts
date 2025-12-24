/**
 * Transport Service - Business logic layer for CTS operations
 *
 * Bridges the gap between:
 * - Contracts (granular HTTP operations)
 * - ADK (object-focused logic)
 *
 * Provides orchestrated transport operations for CLI and SDK consumers.
 */

import type { AdtClientType } from '@abapify/adt-contracts';

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
  tasks?: TransportTask[];
}

export interface TransportTask {
  number: string;
  owner?: string;
  status?: string;
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
    const response = await this.adt.cts.transportrequests.get(trkorr);

    // Single transport response has root/request structure
    const request = (response as Record<string, unknown>)?.request ?? response;
    return this.mapToTransport(request);
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
      number: String(data.trkorr ?? data.number ?? ''),
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
        number: String(t.trkorr ?? t.number ?? ''),
        owner:
          (t.as4user as string | undefined) ?? (t.owner as string | undefined),
        status:
          (t.trstatus as string | undefined) ??
          (t.status as string | undefined),
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
