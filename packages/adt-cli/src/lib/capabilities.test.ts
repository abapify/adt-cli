import { describe, expect, it } from 'vitest';
import {
  assertRuntimeModules,
  collectCapabilityReport,
  RuntimeModuleMissingError,
  type RegistryLike,
} from './capabilities';

function registry(formats: Array<[string, string[]]>): RegistryLike {
  const plugins = new Map(
    formats.map(([format, types]) => [
      format,
      { getSupportedObjectTypes: () => types },
    ]),
  );
  return {
    getAvailableFormats: () => Array.from(plugins.keys()),
    getPlugin: (name: string) => plugins.get(name),
  };
}

describe('collectCapabilityReport', () => {
  it('produces a self-describing report without layout introspection', () => {
    const report = collectCapabilityReport({
      cli: { name: 'adt', version: '0.4.53' },
      registry: registry([['clas', ['CLAS']]]),
      lazyModules: [],
      resolveModule: () => true,
    });
    expect(report.schemaVersion).toBe(1);
    expect(report.cli).toEqual({ name: 'adt', version: '0.4.53' });
  });

  it('lists formats with their supported object types from the registry', () => {
    const report = collectCapabilityReport({
      cli: { name: 'adt', version: '0.4.53' },
      registry: registry([
        ['prog', ['PROG']],
        ['clas', ['CLAS', 'METH']],
      ]),
      lazyModules: [],
      resolveModule: () => true,
    });
    expect(report.formats).toEqual([
      { format: 'clas', objectTypes: ['CLAS', 'METH'] },
      { format: 'prog', objectTypes: ['PROG'] },
    ]);
  });

  it('keeps formats without object types honest', () => {
    const report = collectCapabilityReport({
      cli: { name: 'adt', version: '0.4.53' },
      registry: registry([['flow', []]]),
      lazyModules: [],
      resolveModule: () => true,
    });
    expect(report.formats).toEqual([{ format: 'flow', objectTypes: [] }]);
  });

  it('reports configured runtime module resolution facts', () => {
    const report = collectCapabilityReport({
      cli: { name: 'adt', version: '0.4.53' },
      registry: registry([]),
      lazyModules: ['@abapify/adt-flow', '@abapify/adt-plugin-abapgit'],
      resolveModule: (name: string) => name !== '@abapify/adt-plugin-abapgit',
    });
    expect(report.runtimeModules).toEqual([
      { name: '@abapify/adt-flow', resolved: true },
      { name: '@abapify/adt-plugin-abapgit', resolved: false },
    ]);
  });

  it('sorts runtime modules and formats deterministically', () => {
    const report = collectCapabilityReport({
      cli: { name: 'adt', version: '0.4.53' },
      registry: registry([
        ['prog', ['PROG']],
        ['clas', ['CLAS']],
      ]),
      lazyModules: ['b-dep', 'a-dep'],
      resolveModule: () => true,
    });
    expect(report.formats.map((format) => format.format)).toEqual([
      'clas',
      'prog',
    ]);
    expect(report.runtimeModules.map((module) => module.name)).toEqual([
      'a-dep',
      'b-dep',
    ]);
  });

  it('does not mutate registry or module inputs', () => {
    const reg = registry([['prog', ['PROG']]]);
    const modules = ['b-dep', 'a-dep'];
    const moduleSnapshot = structuredClone(modules);
    const formatSnapshot = reg.getAvailableFormats();
    collectCapabilityReport({
      cli: { name: 'adt', version: '0.4.53' },
      registry: reg,
      lazyModules: modules,
      resolveModule: () => true,
    });
    expect(modules).toEqual(moduleSnapshot);
    expect(reg.getAvailableFormats()).toEqual(formatSnapshot);
    expect(reg.getPlugin('prog')?.getSupportedObjectTypes()).toEqual(['PROG']);
  });

  it('reports diagnostic features as boolean facts', () => {
    const report = collectCapabilityReport({
      cli: { name: 'adt', version: '0.4.53' },
      registry: registry([]),
      lazyModules: [],
      resolveModule: () => true,
      features: { flow: true, deltaAnalysis: false },
    });
    expect(report.features).toEqual({ flow: true, deltaAnalysis: false });
  });

  it('yields an empty report body for an unconfigured installation', () => {
    const report = collectCapabilityReport({
      cli: { name: 'adt', version: '0.4.53' },
      registry: registry([]),
      lazyModules: [],
      resolveModule: () => true,
    });
    expect(report.formats).toEqual([]);
    expect(report.runtimeModules).toEqual([]);
    expect(report.features).toEqual({});
  });
});

describe('assertRuntimeModules', () => {
  it('accepts a fully resolved module list', () => {
    const report = collectCapabilityReport({
      cli: { name: 'adt', version: '0.4.53' },
      registry: registry([]),
      lazyModules: ['@abapify/adt-flow'],
      resolveModule: () => true,
    });
    expect(() => assertRuntimeModules(report)).not.toThrow();
  });

  it('throws a typed error naming the missing module without fallback', () => {
    const report = collectCapabilityReport({
      cli: { name: 'adt', version: '0.4.53' },
      registry: registry([]),
      lazyModules: ['@abapify/adt-flow', '@abapify/missing-module'],
      resolveModule: (name: string) => name !== '@abapify/missing-module',
    });
    expect(() => assertRuntimeModules(report)).toThrowError(
      RuntimeModuleMissingError,
    );
    try {
      assertRuntimeModules(report);
      expect.unreachable();
    } catch (error) {
      expect((error as RuntimeModuleMissingError).module).toBe(
        '@abapify/missing-module',
      );
    }
  });
});
