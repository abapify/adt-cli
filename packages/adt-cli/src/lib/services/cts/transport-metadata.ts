import type { AdtClient } from '@abapify/adt-client';

export interface CtsTransportMetadataUnit {
  kind: 'request' | 'task';
  number: string;
  description?: string;
  owner?: string;
  status?: string;
  type?: string;
  parent?: string;
  lastChangedTimestamp?: string;
}

export interface CtsTransportMetadataResult {
  requestedTransport: string;
  units: CtsTransportMetadataUnit[];
}

/**
 * Typed CTS metadata projection shared by CLI and MCP. The ADT client owns
 * protocol decoding; this service deliberately has no XML or console logic.
 */
export class CtsTransportMetadataService {
  constructor(private readonly client: AdtClient) {}

  async get(transport: string): Promise<CtsTransportMetadataResult> {
    const requestedTransport = transport.trim().toUpperCase();
    if (!requestedTransport)
      throw new Error('Transport identifier is required');
    const request =
      await this.client.services.transports.get(requestedTransport);
    const units: CtsTransportMetadataUnit[] = [
      {
        kind: request.parent ? 'task' : 'request',
        number: request.number,
        description: request.desc,
        owner: request.owner,
        status: request.status,
        type: request.type,
        parent: request.parent,
        lastChangedTimestamp: request.lastChangedTimestamp,
      },
      ...(request.tasks ?? []).map((task) => ({
        kind: 'task' as const,
        number: task.number,
        description: task.desc,
        owner: task.owner,
        status: task.status,
        type: task.type,
        parent: task.parent || request.number,
        lastChangedTimestamp: task.lastChangedTimestamp,
      })),
    ];
    return { requestedTransport, units };
  }
}
