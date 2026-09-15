import { describe, expect, it, vi } from 'vitest';
import type { AdtClient } from '@abapify/adt-client';
import {
  createCtsTransportMetadataCommand,
  type CtsTransportMetadataCommandDependencies,
} from './metadata';

describe('cts tr metadata', () => {
  it('writes only the typed JSON result to stdout', async () => {
    const lines: string[] = [];
    const dependencies: Partial<CtsTransportMetadataCommandDependencies> = {
      getClient: vi.fn(async () => ({}) as AdtClient),
      createService: vi.fn(() => ({
        get: vi.fn(async () => ({
          requestedTransport: 'DEVK900001',
          units: [
            {
              kind: 'request' as const,
              number: 'DEVK900001',
              status: 'R',
              type: 'K',
            },
          ],
        })),
      })),
      writeLine: (line) => lines.push(line),
      writeError: vi.fn(),
      setExitCode: vi.fn(),
    };

    await createCtsTransportMetadataCommand(dependencies).parseAsync(
      ['devk900001', '--json'],
      { from: 'user' },
    );

    expect(JSON.parse(lines[0] ?? '{}')).toEqual({
      requestedTransport: 'DEVK900001',
      units: [
        { kind: 'request', number: 'DEVK900001', status: 'R', type: 'K' },
      ],
    });
  });
});
