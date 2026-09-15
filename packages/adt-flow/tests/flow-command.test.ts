import { describe, expect, it, vi } from 'vitest';
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
} from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { AdtClient } from '@abapify/adt-client';
import type {
  CliCommandPlugin,
  CliContext,
  FormatPlugin,
} from '@abapify/adt-plugin';
import { createFlowCommand } from '../src/commands/flow';

const format = {
  id: 'abapgit',
  description: 'test',
  supportedTypes: ['CLAS'],
  getHandler: vi.fn(),
} satisfies FormatPlugin;

function leaf(command: CliCommandPlugin): CliCommandPlugin {
  return command.subcommands?.[0]?.subcommands?.[0] as CliCommandPlugin;
}

const emptyCheckoutResult = {
  mode: 'head' as const,
  requestedTransports: ['DEVK900001'],
  scopeTransports: ['DEVK900001'],
  changed: [],
  moved: [],
  removed: [],
  unchanged: [],
  descriptors: [],
  skipped: [],
  sapCalls: { manifest: 1, metadata: 1, source: 1 },
  fastPath: 'none' as const,
};

function makeCheckout(
  overrides: Partial<typeof emptyCheckoutResult> = {},
): ReturnType<typeof vi.fn> {
  return vi.fn(async () => ({ ...emptyCheckoutResult, ...overrides }));
}

function makeCommand(checkout: ReturnType<typeof vi.fn>) {
  return createFlowCommand({
    getFormat: vi.fn(() => format),
    createService: vi.fn(() => ({ checkout })),
  });
}

function makeContext(root: string): CliContext {
  return {
    cwd: root,
    config: { flow: { format: { id: 'abapgit' } } },
    logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    getAdtClient: vi.fn(async () => ({}) as AdtClient),
  } satisfies CliContext;
}

async function withTempRoot<T>(fn: (root: string) => Promise<T>): Promise<T> {
  const root = await mkdtemp(join(tmpdir(), 'adt-flow-command-'));
  try {
    return await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe('flow CLI command', () => {
  it('exposes an explicit flow checkout tr hierarchy and applies base mode', async () => {
    const checkout = vi.fn(async () => ({
      mode: 'base' as const,
      requestedTransports: ['DEVK900001', 'DEVK900002'],
      scopeTransports: ['DEVK900001', 'DEVK900002'],
      changed: ['src/zcl_sample.clas.abap'],
      moved: [],
      removed: [],
      unchanged: [],
      descriptors: [],
      skipped: [
        {
          object: 'TABD/PAYHX01',
          component: 'object',
          diagnostic: 'OBJECT_TYPE_UNSUPPORTED',
        },
      ],
      sapCalls: { manifest: 1, metadata: 1, source: 1 },
      fastPath: 'none' as const,
    }));
    const command = createFlowCommand({
      getFormat: vi.fn(() => format),
      createService: vi.fn(() => ({ checkout })),
    });
    const info = vi.fn();
    const warn = vi.fn();
    const ctx = {
      cwd: '/workspace',
      config: {
        flow: {
          format: { id: 'abapgit' },
          include: { objectTypes: ['CLAS'] },
        },
      },
      logger: { debug: vi.fn(), info, warn, error: vi.fn() },
      getAdtClient: vi.fn(async () => ({}) as AdtClient),
    } satisfies CliContext;

    expect(command.name).toBe('flow');
    expect(command.subcommands?.[0]?.name).toBe('checkout');
    expect(leaf(command).name).toBe('tr');
    await leaf(command).execute?.(
      { transport: 'DEVK900002, DEVK900001', base: true },
      ctx,
    );

    expect(checkout).toHaveBeenCalledWith({
      root: '/workspace',
      transports: ['DEVK900002', 'DEVK900001'],
      mode: 'base',
      partial: false,
      config: ctx.config.flow,
    });
    expect(info).toHaveBeenCalledWith(
      expect.stringContaining('1 changed, 0 moved, 0 removed'),
    );
    expect(warn).toHaveBeenCalledWith(
      'Skipped object TABD/PAYHX01 (object; OBJECT_TYPE_UNSUPPORTED).',
    );
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('rejects a missing flow config before requesting an ADT client', async () => {
    const getAdtClient = vi.fn(async () => ({}) as AdtClient);
    const command = createFlowCommand();
    const ctx = {
      cwd: '/workspace',
      config: {},
      logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
      getAdtClient,
    } satisfies CliContext;

    await expect(
      leaf(command).execute?.({ transport: 'DEVK900001' }, ctx),
    ).rejects.toMatchObject({ code: 'configuration_invalid' });
    expect(getAdtClient).not.toHaveBeenCalled();
  });

  it('writes a deterministic partial report only after a successful partial checkout', async () => {
    const report = 'tmp/analysis/import-gaps.json';
    const skipped = [
      {
        object: 'CLAS/ZCL_INEXACT',
        component: 'main',
        diagnostic: 'SOURCE_HISTORY_INTERVENING_VERSION',
        sourceTransport: 'DEVK900001',
      },
    ];
    const checkout = makeCheckout({
      changed: ['src/zcl_sample.clas.abap'],
      skipped,
    });
    const command = makeCommand(checkout);

    await withTempRoot(async (root) => {
      const ctx = makeContext(root);
      await leaf(command).execute?.(
        { transport: 'DEVK900001', partial: true, partialReport: report },
        ctx,
      );

      expect(checkout).toHaveBeenCalledWith(
        expect.objectContaining({ partial: true }),
      );
      expect(JSON.parse(await readFile(join(root, report), 'utf8'))).toEqual({
        schemaVersion: 1,
        requestedTransports: ['DEVK900001'],
        skipped,
      });
    });
  });

  it('rejects --partial-report targeting the checkout root directory', async () => {
    const checkout = makeCheckout();
    const command = makeCommand(checkout);

    await withTempRoot(async (root) => {
      const ctx = makeContext(root);
      await expect(
        leaf(command).execute?.(
          { transport: 'DEVK900001', partial: true, partialReport: '.' },
          ctx,
        ),
      ).rejects.toMatchObject({ code: 'invalid_input' });
      expect(checkout).not.toHaveBeenCalled();
    });
  });

  it('rejects an absolute --partial-report path', async () => {
    const checkout = makeCheckout();
    const command = makeCommand(checkout);

    await withTempRoot(async (root) => {
      const ctx = makeContext(root);
      await expect(
        leaf(command).execute?.(
          {
            transport: 'DEVK900001',
            partial: true,
            partialReport: join(root, 'escape.json'),
          },
          ctx,
        ),
      ).rejects.toMatchObject({ code: 'invalid_input' });
      expect(checkout).not.toHaveBeenCalled();
    });
  });

  it('serializes skipped records in deterministic order', async () => {
    const report = 'import-gaps.json';
    const checkout = makeCheckout({
      requestedTransports: ['DEVK900001', 'DEVK900002'],
      scopeTransports: ['DEVK900001', 'DEVK900002'],
      skipped: [
        {
          object: 'CLAS/ZCL_B',
          component: 'main',
          diagnostic: 'SOURCE_HISTORY_INTERVENING_VERSION',
          sourceTransport: 'DEVK900002',
        },
        {
          object: 'CLAS/ZCL_A',
          component: 'main',
          diagnostic: 'SOURCE_HISTORY_INTERVENING_VERSION',
          sourceTransport: 'DEVK900001',
        },
        {
          object: 'CLAS/ZCL_A',
          component: 'main',
          diagnostic: 'SOURCE_HISTORY_INTERVENING_VERSION',
          sourceTransport: 'DEVK900002',
        },
      ],
    });
    const command = makeCommand(checkout);

    await withTempRoot(async (root) => {
      const ctx = makeContext(root);
      await leaf(command).execute?.(
        {
          transport: 'DEVK900001,DEVK900002',
          partial: true,
          partialReport: report,
        },
        ctx,
      );
      const parsed = JSON.parse(await readFile(join(root, report), 'utf8'));
      expect(parsed.skipped).toEqual([
        {
          object: 'CLAS/ZCL_A',
          component: 'main',
          diagnostic: 'SOURCE_HISTORY_INTERVENING_VERSION',
          sourceTransport: 'DEVK900001',
        },
        {
          object: 'CLAS/ZCL_A',
          component: 'main',
          diagnostic: 'SOURCE_HISTORY_INTERVENING_VERSION',
          sourceTransport: 'DEVK900002',
        },
        {
          object: 'CLAS/ZCL_B',
          component: 'main',
          diagnostic: 'SOURCE_HISTORY_INTERVENING_VERSION',
          sourceTransport: 'DEVK900002',
        },
      ]);
    });
  });

  it('does not write a partial report when checkout rejects', async () => {
    const report = 'import-gaps.json';
    const checkout = vi.fn(async () => {
      throw new Error('checkout failed');
    });
    const command = makeCommand(checkout);

    await withTempRoot(async (root) => {
      const ctx = makeContext(root);
      await expect(
        leaf(command).execute?.(
          { transport: 'DEVK900001', partial: true, partialReport: report },
          ctx,
        ),
      ).rejects.toThrow('checkout failed');
      await expect(readFile(join(root, report), 'utf8')).rejects.toThrow();
      const tmpFiles = await readdir(root);
      expect(tmpFiles.filter((f) => f.endsWith('.tmp'))).toEqual([]);
    });
  });

  it('rejects --partial-report without --partial opt-in', async () => {
    const checkout = makeCheckout();
    const command = makeCommand(checkout);

    await withTempRoot(async (root) => {
      const ctx = makeContext(root);
      await expect(
        leaf(command).execute?.(
          { transport: 'DEVK900001', partialReport: 'report.json' },
          ctx,
        ),
      ).rejects.toMatchObject({ code: 'invalid_input' });
      expect(checkout).not.toHaveBeenCalled();
    });
  });

  it.skipIf(process.platform === 'win32')(
    'rejects --partial-report escaping via a dangling symlink',
    async () => {
      const checkout = makeCheckout();
      const command = makeCommand(checkout);

      const root = await mkdtemp(join(tmpdir(), 'adt-flow-command-'));
      const external = await mkdtemp(join(tmpdir(), 'adt-flow-external-'));
      const linkPath = join(root, 'linked');
      await symlink(external, linkPath);
      await rm(external, { recursive: true, force: true });

      try {
        const ctx = makeContext(root);
        await expect(
          leaf(command).execute?.(
            {
              transport: 'DEVK900001',
              partial: true,
              partialReport: 'linked/new/report.json',
            },
            ctx,
          ),
        ).rejects.toMatchObject({ code: 'invalid_input' });
        expect(checkout).not.toHaveBeenCalled();
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  );

  it.skipIf(process.platform === 'win32')(
    'rejects --partial-report when the target file is a symlink escaping the checkout',
    async () => {
      const checkout = makeCheckout();
      const command = makeCommand(checkout);

      const root = await mkdtemp(join(tmpdir(), 'adt-flow-command-'));
      const external = await mkdtemp(join(tmpdir(), 'adt-flow-external-'));
      const reportPath = join(root, 'report.json');
      // Pre-create the report file as a symlink pointing outside root.
      await symlink(join(external, 'evil.json'), reportPath);

      try {
        const ctx = makeContext(root);
        await expect(
          leaf(command).execute?.(
            {
              transport: 'DEVK900001',
              partial: true,
              partialReport: 'report.json',
            },
            ctx,
          ),
        ).rejects.toMatchObject({ code: 'invalid_input' });
        expect(checkout).not.toHaveBeenCalled();
      } finally {
        await rm(root, { recursive: true, force: true });
        await rm(external, { recursive: true, force: true });
      }
    },
  );

  it.skipIf(process.platform === 'win32')(
    'rejects --partial-report path containing a symlink loop',
    async () => {
      const checkout = makeCheckout();
      const command = makeCommand(checkout);

      const root = await mkdtemp(join(tmpdir(), 'adt-flow-command-'));
      // Create a symlink loop: root/loop/a -> root/loop/b, root/loop/b -> root/loop/a
      const loopDir = join(root, 'loop');
      await mkdir(loopDir);
      await symlink(join(loopDir, 'b'), join(loopDir, 'a'));
      await symlink(join(loopDir, 'a'), join(loopDir, 'b'));

      try {
        const ctx = makeContext(root);
        await expect(
          leaf(command).execute?.(
            {
              transport: 'DEVK900001',
              partial: true,
              partialReport: 'loop/a/report.json',
            },
            ctx,
          ),
        ).rejects.toMatchObject({ code: 'invalid_input' });
        expect(checkout).not.toHaveBeenCalled();
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  );
});
