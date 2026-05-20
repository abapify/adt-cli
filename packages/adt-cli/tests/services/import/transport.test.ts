/**
 * Unit tests for ImportService.importTransport()
 *
 * Covers:
 * - Comma-separated transport numbers (multi-TR positional arg)
 * - --save-tr-metadata writes .adt/tr/<TRKORR>.json (fixture, no SAP)
 *
 * The tests mock @abapify/adk and the format-loader to avoid real SAP calls.
 */

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type MockedObject,
} from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { AdkTransport } from '@abapify/adk';

// ──────────────────────────────────────────────────────────────────────
// Mock @abapify/adk
// ──────────────────────────────────────────────────────────────────────

const mockTaskObjects = [
  {
    pgmid: 'R3TR',
    type: 'CLAS',
    name: 'ZCL_ACTIVE',
    objFunc: '',
    uri: '/sap/bc/adt/oo/classes/zcl_active',
    description: 'Active class',
    key: 'R3TR/CLAS/ZCL_ACTIVE',
    isDeleted: false,
    raw: { pgmid: 'R3TR', type: 'CLAS', name: 'ZCL_ACTIVE', obj_func: '' },
  },
  {
    pgmid: 'R3TR',
    type: 'TABL',
    name: 'ZTABL_DEL',
    objFunc: 'D',
    uri: undefined,
    description: 'Table to delete',
    key: 'R3TR/TABL/ZTABL_DEL',
    isDeleted: true,
    raw: { pgmid: 'R3TR', type: 'TABL', name: 'ZTABL_DEL', obj_func: 'D' },
  },
];

function makeMockTransport(
  number: string,
  extraObjects: typeof mockTaskObjects = [],
) {
  const objects = [...mockTaskObjects, ...extraObjects];
  return {
    number,
    description: `Description for ${number}`,
    owner: 'DEV',
    status: 'D',
    statusText: 'Modifiable',
    target: 'PRD',
    tasks: [
      {
        number: `${number}T`,
        owner: 'DEV',
        description: 'Task 1',
        status: 'D',
        objects: objects,
      },
    ],
    objects,
  };
}

const mockTR1 = makeMockTransport('DEVK900001');
const mockTR2 = makeMockTransport('DEVK900002', [
  {
    pgmid: 'R3TR',
    type: 'PROG',
    name: 'ZPROG_ONLY_TR2',
    objFunc: '',
    uri: undefined,
    description: 'Prog only in TR2',
    key: 'R3TR/PROG/ZPROG_ONLY_TR2',
    isDeleted: false,
    raw: { pgmid: 'R3TR', type: 'PROG', name: 'ZPROG_ONLY_TR2', obj_func: '' },
  },
]);

vi.mock('@abapify/adk', () => {
  const adkTransportGetFn = vi.fn(async (number: string) => {
    if (number === 'DEVK900001') return mockTR1;
    if (number === 'DEVK900002') return mockTR2;
    throw new Error(`Transport ${number} not found`);
  });

  class FakeMergedTransportView {
    transports: unknown[];
    _objects: (typeof mockTaskObjects)[number][];
    constructor(transports: { objects: (typeof mockTaskObjects)[number][] }[]) {
      this.transports = transports;
      const seen = new Set<string>();
      const all: (typeof mockTaskObjects)[number][] = [];
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
    get objects() {
      return this._objects;
    }
  }

  return {
    initializeAdk: vi.fn(),
    getGlobalContext: vi.fn(() => ({ client: {} })),
    createAdkFactory: vi.fn(),
    AdkTransport: { get: adkTransportGetFn },
    AdkPackage: { get: vi.fn() },
    MergedTransportView: FakeMergedTransportView,
    matchesSelector: (
      obj: { objFunc: string; pgmid: string },
      sel: { objFunc?: string; pgmid?: string },
    ) => {
      if (sel.objFunc !== undefined && obj.objFunc !== sel.objFunc)
        return false;
      if (sel.pgmid !== undefined && obj.pgmid !== sel.pgmid) return false;
      return true;
    },
  };
});

// ──────────────────────────────────────────────────────────────────────
// Mock format-loader
// ──────────────────────────────────────────────────────────────────────

const mockPlugin = {
  name: 'mock-plugin',
  description: 'Mock plugin for testing',
  instance: {
    name: 'mock-plugin',
    description: 'Mock plugin for testing',
    registry: {
      isSupported: vi.fn(() => false), // skip all objects (treat as unsupported → skipped)
    },
    format: {
      import: vi.fn(async () => ({ success: true })),
      delete: vi.fn(async () => ({ success: true, filesRemoved: [] })),
    },
    hooks: {},
  },
};

vi.mock('../../../src/lib/utils/format-loader', () => ({
  loadFormatPlugin: vi.fn(async () => mockPlugin),
  parseFormatSpec: vi.fn((spec: string) => ({
    package: spec,
    preset: undefined,
  })),
}));

// ──────────────────────────────────────────────────────────────────────
// Mock config
// ──────────────────────────────────────────────────────────────────────

vi.mock('../../../src/lib/utils/destinations', () => ({
  getConfig: vi.fn(async () => ({ raw: {} })),
}));

async function runImport(
  opts: import('../../../src/lib/services/import/service').TransportImportOptions,
) {
  const { ImportService } =
    await import('../../../src/lib/services/import/service');
  return new ImportService().importTransport(opts);
}

// ──────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────

describe('ImportService.importTransport()', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'import-transport-test-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('accepts a single transport number', async () => {
    const result = await runImport({
      transportNumber: 'DEVK900001',
      outputPath: tmpDir,
      format: 'mock',
    });
    expect(result.transportNumber).toBe('DEVK900001');
    expect(result.totalObjects).toBe(mockTR1.objects.length);
  });

  it('accepts comma-separated transport numbers (multi-TR)', async () => {
    const result = await runImport({
      transportNumber: 'DEVK900001,DEVK900002',
      outputPath: tmpDir,
      format: 'mock',
    });

    // Returns the first TR as primary
    expect(result.transportNumber).toBe('DEVK900001');

    // totalObjects = union of TR1 objects + extra object from TR2 (deduplicated by key)
    const tr2Extra = mockTR2.objects.filter(
      (o) => !mockTR1.objects.some((tr1o) => tr1o.key === o.key),
    );
    expect(result.totalObjects).toBe(mockTR1.objects.length + tr2Extra.length);
  });

  it('deduplicates transport numbers when repeated', async () => {
    // 'DEVK900001,DEVK900001' should be deduped to a single load
    const result = await runImport({
      transportNumber: 'DEVK900001, DEVK900001 ', // duplicate with whitespace
      outputPath: tmpDir,
      format: 'mock',
    });

    // Result should be same as single-TR import (no double-counting)
    expect(result.transportNumber).toBe('DEVK900001');
    expect(result.totalObjects).toBe(mockTR1.objects.length);
  });

  it('writes .adt/tr/<TRKORR>.json when saveTrMetadata is true', async () => {
    const result = await runImport({
      transportNumber: 'DEVK900001',
      outputPath: tmpDir,
      format: 'mock',
      saveTrMetadata: true,
    });

    expect(result.metadataFiles).toBeDefined();
    expect(result.metadataFiles).toHaveLength(1);

    const metaPath = join(tmpDir, '.adt', 'tr', 'DEVK900001.json');
    const raw = await readFile(metaPath, 'utf-8');
    const meta = JSON.parse(raw) as {
      number: string;
      owner: string;
      desc: string;
      status: string;
      tasks: Array<{
        number: string;
        objects: Array<{ pgmid: string; type: string; obj_func: string }>;
      }>;
      fetchedAt: string;
      import: { format: string; success: number };
    };

    expect(meta.number).toBe('DEVK900001');
    expect(meta.owner).toBe('DEV');
    expect(meta.desc).toBe('Description for DEVK900001');
    expect(meta.status).toBe('D');
    expect(Array.isArray(meta.tasks)).toBe(true);
    expect(meta.tasks[0].objects.length).toBeGreaterThan(0);
    // obj_func field is present
    expect('obj_func' in meta.tasks[0].objects[0]).toBe(true);
    // fetchedAt is an ISO date string
    expect(new Date(meta.fetchedAt).toISOString()).toBe(meta.fetchedAt);
    // import block is present
    expect(meta.import.format).toBe('mock');
  });

  it('writes one metadata file per TR when multiple transports are used', async () => {
    const result = await runImport({
      transportNumber: 'DEVK900001,DEVK900002',
      outputPath: tmpDir,
      format: 'mock',
      saveTrMetadata: true,
    });

    expect(result.metadataFiles).toBeDefined();
    expect(result.metadataFiles).toHaveLength(2);

    const meta1Path = join(tmpDir, '.adt', 'tr', 'DEVK900001.json');
    const meta2Path = join(tmpDir, '.adt', 'tr', 'DEVK900002.json');

    const meta1 = JSON.parse(await readFile(meta1Path, 'utf-8')) as {
      number: string;
    };
    const meta2 = JSON.parse(await readFile(meta2Path, 'utf-8')) as {
      number: string;
    };

    expect(meta1.number).toBe('DEVK900001');
    expect(meta2.number).toBe('DEVK900002');
  });

  it('does NOT write metadata files when saveTrMetadata is false (default)', async () => {
    const result = await runImport({
      transportNumber: 'DEVK900001',
      outputPath: tmpDir,
      format: 'mock',
      // saveTrMetadata not set (defaults to false)
    });

    expect(result.metadataFiles).toBeUndefined();
  });

  it('calls format.delete() for objects that cannot be fetched from SAP when removeMissingObjects is true', async () => {
    // Object is in TR but load() returns null → simulate "not found in SAP"
    const missingObj = {
      pgmid: 'R3TR',
      type: 'PROG',
      name: 'ZPROG_MISSING',
      objFunc: '',
      uri: undefined,
      description: 'Missing program',
      key: 'R3TR/PROG/ZPROG_MISSING',
      isDeleted: false,
      raw: { pgmid: 'R3TR', type: 'PROG', name: 'ZPROG_MISSING', obj_func: '' },
      load: vi.fn(async () => null),
    };

    const mockTRmissing = {
      number: 'DEVK900003',
      description: 'Transport with missing object',
      owner: 'DEV',
      status: 'D',
      statusText: 'Modifiable',
      target: 'PRD',
      tasks: [
        {
          number: 'DEVK900003T',
          owner: 'DEV',
          description: 'Task',
          status: 'D',
          objects: [missingObj],
        },
      ],
      objects: [missingObj],
    };

    vi.mocked(AdkTransport.get).mockResolvedValueOnce(mockTRmissing as any);
    // PROG is "supported" for this test so the service proceeds past the isSupported check
    mockPlugin.instance.registry.isSupported.mockReturnValueOnce(true);
    // Delete reports one removed file
    mockPlugin.instance.format.delete.mockResolvedValueOnce({
      success: true,
      filesRemoved: [`${tmpDir}/src/zprog_missing.prog.abap`],
    });

    const result = await runImport({
      transportNumber: 'DEVK900003',
      outputPath: tmpDir,
      format: 'mock',
      removeMissingObjects: true,
    });

    expect(result.results.deleted).toBe(1);
    expect(result.filesRemoved).toEqual([
      `${tmpDir}/src/zprog_missing.prog.abap`,
    ]);
    expect(mockPlugin.instance.format.delete).toHaveBeenCalledWith(
      { pgmid: 'R3TR', type: 'PROG', name: 'ZPROG_MISSING' },
      tmpDir,
      expect.any(Object),
    );
  });

  it('counts missing objects as skipped (not deleted) when removeMissingObjects is false (default)', async () => {
    const missingObj = {
      pgmid: 'R3TR',
      type: 'PROG',
      name: 'ZPROG_MISSING2',
      objFunc: '',
      uri: undefined,
      description: 'Missing program 2',
      key: 'R3TR/PROG/ZPROG_MISSING2',
      isDeleted: false,
      raw: {
        pgmid: 'R3TR',
        type: 'PROG',
        name: 'ZPROG_MISSING2',
        obj_func: '',
      },
      load: vi.fn(async () => null),
    };

    const mockTRmissing2 = {
      number: 'DEVK900004',
      description: 'Transport with missing object 2',
      owner: 'DEV',
      status: 'D',
      statusText: 'Modifiable',
      target: 'PRD',
      tasks: [
        {
          number: 'DEVK900004T',
          owner: 'DEV',
          description: 'Task',
          status: 'D',
          objects: [missingObj],
        },
      ],
      objects: [missingObj],
    };

    vi.mocked(AdkTransport.get).mockResolvedValueOnce(mockTRmissing2 as any);
    mockPlugin.instance.registry.isSupported.mockReturnValueOnce(true);

    const result = await runImport({
      transportNumber: 'DEVK900004',
      outputPath: tmpDir,
      format: 'mock',
      // removeMissingObjects not set → default false
    });

    // Missing object → skipped, not deleted
    expect(result.results.deleted).toBe(0);
    expect(result.results.skipped).toBeGreaterThan(0);
    expect(result.filesRemoved).toBeUndefined();
  });
});
