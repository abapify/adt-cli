import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import {
  AdkGenericObject,
  AdkPackage,
  AdkTransport,
  AdkTransportObjectRef,
} from '@abapify/adk';
import { abapGitPlugin } from '@abapify/adt-plugin-abapgit';

const { mockTransportGet, mockPackageGet, mockPlugin } = vi.hoisted(() => ({
  mockTransportGet: vi.fn(),
  mockPackageGet: vi.fn(),
  mockPlugin: {
    name: 'abapGit',
    description: 'abapGit import test plugin',
    instance: {
      name: 'abapGit',
      description: 'abapGit import test plugin',
      registry: { isSupported: vi.fn() },
      format: { import: vi.fn(), delete: vi.fn() },
      hooks: {},
    },
  },
}));

vi.mock('../../../src/utils/format-loader', () => ({
  loadFormatPlugin: vi.fn(async () => mockPlugin),
  parseFormatSpec: vi.fn((spec: string) => ({
    package: spec,
    preset: undefined,
  })),
}));

vi.mock('../../../src/utils/destinations', () => ({
  getConfig: vi.fn(async () => ({ raw: {} })),
}));

describe('legacy ImportService generic transport acquisition', () => {
  let outputPath: string;

  beforeEach(async () => {
    outputPath = await mkdtemp(join(tmpdir(), 'legacy-generic-import-'));
    vi.spyOn(AdkPackage, 'get').mockImplementation(mockPackageGet);
    vi.spyOn(AdkTransport, 'get').mockImplementation(mockTransportGet);
    mockPackageGet.mockReset().mockResolvedValue({ superPackage: undefined });
    mockTransportGet.mockReset();
    mockPlugin.instance.registry.isSupported
      .mockReset()
      .mockImplementation((type: string) =>
        abapGitPlugin.registry.isSupported(type),
      );
    mockPlugin.instance.format.import
      .mockReset()
      .mockImplementation((object: unknown, target: string, context: unknown) =>
        abapGitPlugin.format.import(object as never, target, context as never),
      );
    mockPlugin.instance.format.delete
      .mockReset()
      .mockResolvedValue({ success: true, filesRemoved: [] });
  });

  afterEach(async () => {
    await rm(outputPath, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('fails unloaded saved TOBJ and PDTS entries while importing the typed CLAS method owner', async () => {
    const className = 'ZCL_VIM_DI3_UTILS';
    const classSource =
      'CLASS zcl_vim_di3_utils DEFINITION PUBLIC.\nPUBLIC SECTION.\nMETHODS get_po_items_for_docid.\nENDCLASS.\nCLASS zcl_vim_di3_utils IMPLEMENTATION.\nMETHOD get_po_items_for_docid.\nENDMETHOD.\nENDCLASS.\n';
    const classGet = vi.fn(async (name: string) => ({
      abapClass: {
        name,
        language: 'EN',
        include: [{ includeType: 'main' }],
      },
    }));
    const classSourceGet = vi.fn(async () => classSource);
    const genericReads: string[] = [];
    const adt = new Proxy(
      {
        oo: {
          classes: {
            get: classGet,
            source: { main: { get: classSourceGet } },
          },
        },
      },
      {
        get(target, key, receiver) {
          if (key === 'oo') return Reflect.get(target, key, receiver);
          genericReads.push(String(key));
          return undefined;
        },
      },
    );
    const client = { adt };
    const objects = [
      new AdkTransportObjectRef({ client } as never, {
        pgmid: 'R3TR',
        type: 'TOBJ',
        name: 'ZVIM_DI3_CHKBLNKS',
        obj_func: '',
      }),
      new AdkTransportObjectRef({ client } as never, {
        pgmid: 'R3TR',
        type: 'PDTS',
        wbtype: 'PDTS/MA',
        name: '91000229',
        obj_func: '',
      }),
      new AdkTransportObjectRef({ client } as never, {
        pgmid: 'R3TR',
        type: 'CLAS',
        wbtype: 'CLAS',
        name: className,
        obj_func: '',
      }),
      new AdkTransportObjectRef({ client } as never, {
        pgmid: 'LIMU',
        type: 'METH',
        wbtype: 'CLAS/OM',
        name: `${className.padEnd(30)}GET_PO_ITEMS_FOR_DOCID`,
        obj_func: '',
      }),
    ];
    setTransport(objects);

    const tobjPath = join(outputPath, 'src', 'zvim_di3_chkblnks.tobj.xml');
    const pdtsPath = join(outputPath, 'src', '91000229.pdts.xml');
    await mkdir(join(outputPath, 'src'), { recursive: true });
    await writeFile(tobjPath, 'previous TOBJ bytes');
    await writeFile(pdtsPath, 'previous PDTS bytes');

    const { ImportService } =
      await import('../../../src/services/import/service');
    const result = await new ImportService().importTransport({
      transportNumber: 'S0DK958193',
      outputPath,
      format: 'abapgit',
      removeMissingObjects: true,
      saveTrMetadata: true,
    });

    expect(result.results).toEqual({
      success: 2,
      skipped: 0,
      failed: 2,
      deleted: 0,
    });
    expect(result.objectsByType).toEqual({ CLAS: 1, METH: 1 });
    expect(classGet).toHaveBeenCalledTimes(1);
    expect(classSourceGet).toHaveBeenCalledTimes(1);
    expect(genericReads).toEqual([]);
    expect(mockPlugin.instance.format.import).toHaveBeenCalledTimes(1);
    expect(mockPlugin.instance.format.delete).not.toHaveBeenCalled();
    expect(await readFile(tobjPath, 'utf8')).toBe('previous TOBJ bytes');
    expect(await readFile(pdtsPath, 'utf8')).toBe('previous PDTS bytes');
    expect(
      await readFile(
        join(outputPath, 'src', 'zcl_vim_di3_utils.clas.abap'),
        'utf8',
      ),
    ).toBe(classSource);

    const files = await listFiles(outputPath);
    const genericFiles = files
      .filter(
        (file) => file.endsWith('.tobj.xml') || file.endsWith('.pdts.xml'),
      )
      .sort();
    expect(genericFiles).toEqual(
      ['src/91000229.pdts.xml', 'src/zvim_di3_chkblnks.tobj.xml'].sort(),
    );

    const metadataPath = join(outputPath, '.adt', 'tr', 'S0DK958193.json');
    const metadata = JSON.parse(await readFile(metadataPath, 'utf8')) as {
      import: {
        success: number;
        skipped: number;
        failed: number;
        deleted: number;
      };
    };
    expect(metadata.import).toEqual({
      format: 'abapgit',
      success: 2,
      skipped: 0,
      failed: 2,
      deleted: 0,
    });
  });

  it('allows a populated generic fallback object to reach the real serializer', async () => {
    const client = { adt: {} };
    const ref = new AdkTransportObjectRef({ client } as never, {
      pgmid: 'R3TR',
      type: 'TOBJ',
      name: 'ZVIM_DI3_CHKBLNKS',
      obj_func: '',
    });
    const populated = (await ref.load()) as AdkGenericObject;
    expect(populated).toBeInstanceOf(AdkGenericObject);
    populated.setData({
      name: 'ZVIM_DI3_CHKBLNKS',
      description: 'loaded input',
    });
    expect(populated.isLoaded).toBe(true);
    vi.spyOn(ref, 'load').mockResolvedValue(populated);
    setTransport([ref]);

    const { ImportService } =
      await import('../../../src/services/import/service');
    const result = await new ImportService().importTransport({
      transportNumber: 'S0DK958193',
      outputPath,
      format: 'abapgit',
    });

    expect(result.results).toEqual({
      success: 1,
      skipped: 0,
      failed: 0,
      deleted: 0,
    });
    expect(mockPlugin.instance.format.import).toHaveBeenCalledTimes(1);
    const serialized = await readFile(
      join(outputPath, 'src', 'zvim_di3_chkblnks.tobj.xml'),
      'utf8',
    );
    expect(serialized).toContain('ZVIM_DI3_CHKBLNKS');
  });

  it('imports a registered typed DDLS source object without a shared isLoaded flag', async () => {
    const metadataGet = vi.fn(async (name: string) => ({
      ddlSource: {
        description: `${name} test source`,
        masterLanguage: 'EN',
        packageRef: { name: 'ZPKG' },
      },
    }));
    const sourceGet = vi.fn(
      async () => 'define view entity ZI_TEST as select from dummy { key id }',
    );
    const client = {
      adt: {
        ddic: {
          ddl: {
            sources: {
              get: metadataGet,
              source: { main: { get: sourceGet } },
            },
          },
        },
      },
    };
    const ref = new AdkTransportObjectRef({ client } as never, {
      pgmid: 'R3TR',
      type: 'DDLS',
      wbtype: 'DDLS',
      name: 'ZI_TEST',
      obj_func: '',
    });
    const load = ref.load.bind(ref);
    vi.spyOn(ref, 'load').mockImplementation(async () => {
      const object = await load();
      expect(object).toBeDefined();
      expect('isLoaded' in (object as object)).toBe(false);
      return object;
    });
    setTransport([ref]);

    const { ImportService } =
      await import('../../../src/services/import/service');
    const result = await new ImportService().importTransport({
      transportNumber: 'S0DK958193',
      outputPath,
      format: 'abapgit',
    });

    expect(result.results).toEqual({
      success: 1,
      skipped: 0,
      failed: 0,
      deleted: 0,
    });
    expect(metadataGet).toHaveBeenCalledWith('ZI_TEST');
    expect(sourceGet).toHaveBeenCalled();
    expect(mockPlugin.instance.format.import).toHaveBeenCalledTimes(1);
  });

  function setTransport(objects: AdkTransportObjectRef[]): void {
    const task = {
      number: 'S0DK958193',
      owner: 'DEV',
      description: 'Saved task inventory',
      status: 'D',
      statusText: 'Modifiable',
      objects,
    };
    mockTransportGet.mockResolvedValue({
      number: 'S0DK958193',
      owner: 'DEV',
      description: 'Saved parent scope',
      status: 'D',
      statusText: 'Modifiable',
      target: 'PRD',
      tasks: [task],
      objects,
    });
  }

  async function listFiles(root: string, base = root): Promise<string[]> {
    const entries = await readdir(root, { withFileTypes: true });
    const files = await Promise.all(
      entries.map(async (entry) => {
        const path = join(root, entry.name);
        if (entry.isDirectory()) return listFiles(path, base);
        return [relative(base, path)];
      }),
    );
    return files.flat();
  }
});
