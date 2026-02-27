/**
 * AdkTransportObject - Transport Object wrapper
 *
 * Lightweight wrapper around schema object data.
 * Objects don't have operations (no release, lock, etc.)
 */

import type { TransportObjectData } from './transport.types';

/**
 * Transport Object - wrapper for ABAP objects in a transport
 */
export class AdkTransportObject {
  constructor(private readonly data: TransportObjectData) {}

  get pgmid(): string {
    return this.data.pgmid || '';
  }
  get type(): string {
    return this.data.type || '';
  }
  get name(): string {
    return this.data.name || '';
  }
  get wbtype(): string | undefined {
    return this.data.wbtype;
  }
  get objectInfo(): string | undefined {
    return this.data.obj_info;
  }
  get objectDescription(): string | undefined {
    return this.data.obj_desc;
  }
  get lockStatus(): string | undefined {
    return this.data.lock_status;
  }
  get uri(): string | undefined {
    return this.data.uri;
  }

  /** Full object key (PGMID/TYPE/NAME) */
  get key(): string {
    return `${this.pgmid}/${this.type}/${this.name}`;
  }

  /** Raw schema data */
  get raw(): TransportObjectData {
    return this.data;
  }
}
