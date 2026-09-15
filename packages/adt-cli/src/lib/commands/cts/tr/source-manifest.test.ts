import { describe, expect, it, vi } from 'vitest';
import type { AdtClient } from '@abapify/adt-client';
import {
  createCtsSourceManifestCommand,
  type SourceManifestCommandDependencies,
} from './source-manifest';
import type {
  BuildTransportManifestInput,
  BuildTransportManifestResult,
} from '../../../services/source-history';

const client = {} as AdtClient;

function createDependencies(
  buildTransportManifest: (
    input: BuildTransportManifestInput,
  ) => Promise<BuildTransportManifestResult>,
): {
  dependencies: Partial<SourceManifestCommandDependencies>;
  lines: string[];
  errors: string[];
  exitCodes: number[];
} {
  const lines: string[] = [];
  const errors: string[] = [];
  const exitCodes: number[] = [];
  return {
    dependencies: {
      getClient: vi.fn(async () => client),
      createService: vi.fn(() => ({ buildTransportManifest })),
      writeLine: (content) => lines.push(content),
      writeError: (content) => errors.push(content),
      setExitCode: (code) => exitCodes.push(code),
    },
    lines,
    errors,
    exitCodes,
  };
}

describe('cts tr source-manifest', () => {
  it('normalizes one and multiple ordered transport inputs for JSON output', async () => {
    const buildTransportManifest = vi.fn(
      async (input: { transports: string[] }) => ({
        requestedTransports: input.transports,
        scopeTransports: input.transports,
        inventory: [],
        entries: [],
      }),
    );
    const state = createDependencies(buildTransportManifest);

    await createCtsSourceManifestCommand(state.dependencies).parseAsync(
      [
        'devk900001, DEVK900002',
        '--also-transport',
        'devk900002,devk900003',
        '--json',
      ],
      { from: 'user' },
    );

    expect(buildTransportManifest).toHaveBeenCalledWith({
      transports: ['DEVK900001', 'DEVK900002', 'DEVK900003'],
    });
    expect(JSON.parse(state.lines[0] ?? '{}')).toMatchObject({
      requestedTransports: ['DEVK900001', 'DEVK900002', 'DEVK900003'],
    });
    expect(state.errors).toEqual([]);
    expect(state.exitCodes).toEqual([]);
  });

  it('prints a manifest but sets a failing exit status for failed entries', async () => {
    const buildTransportManifest = vi.fn(async () => ({
      requestedTransports: ['DEVK900001'],
      scopeTransports: ['DEVK900001', 'DEVK900011'],
      inventory: [],
      entries: [
        {
          object: { pgmid: 'R3TR', type: 'CLAS', name: 'ZCL_TEST' },
          component: { id: 'main' },
          sourceTransport: 'DEVK900011',
          changeKind: 'failed' as const,
          exact: false,
          diagnostic: {
            code: 'SOURCE_HISTORY_RETRIEVAL_FAILED' as const,
            message: 'SAP ADT rejected source-history metadata retrieval.',
          },
        },
      ],
    }));
    const state = createDependencies(buildTransportManifest);

    await createCtsSourceManifestCommand(state.dependencies).parseAsync(
      ['DEVK900001', '--json'],
      { from: 'user' },
    );

    expect(JSON.parse(state.lines[0] ?? '{}').entries[0]).toMatchObject({
      changeKind: 'failed',
      exact: false,
    });
    expect(state.exitCodes).toEqual([1]);
  });

  it('keeps ambiguous and unsupported entries successful and explicit', async () => {
    const buildTransportManifest = vi.fn(async () => ({
      requestedTransports: ['DEVK900001'],
      scopeTransports: ['DEVK900001'],
      inventory: [],
      entries: [
        {
          object: { pgmid: 'R3TR', type: 'PROG', name: 'ZTEST' },
          component: { id: 'main' },
          sourceTransport: 'DEVK900001',
          changeKind: 'ambiguous' as const,
          exact: false,
          diagnostic: {
            code: 'SOURCE_HISTORY_INTERVENING_VERSION' as const,
            message: 'An unrelated source version intervenes.',
          },
        },
        {
          object: { pgmid: 'R3TR', type: 'TABL', name: 'ZTEST_TABLE' },
          component: { id: 'object' },
          sourceTransport: 'DEVK900001',
          changeKind: 'unsupported' as const,
          exact: false,
          diagnostic: {
            code: 'SOURCE_COMPONENTS_UNAVAILABLE' as const,
            message: 'The object has no source component.',
          },
        },
      ],
    }));
    const state = createDependencies(buildTransportManifest);

    await createCtsSourceManifestCommand(state.dependencies).parseAsync(
      ['DEVK900001'],
      { from: 'user' },
    );

    expect(state.lines.join('\n')).toContain('ambiguous (not exact)');
    expect(state.lines.join('\n')).toContain('unsupported (not exact)');
    expect(state.exitCodes).toEqual([]);
  });
});
