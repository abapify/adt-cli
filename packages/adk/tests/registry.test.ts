/**
 * ADK Registry Unit Tests
 *
 * Tests for registry.ts functions that handle ADT type to ADK kind mapping
 * and object type registration/resolution.
 *
 * NOTE: The registry is module-level singleton state (`registry`, `adtToKind`,
 * `kindToAdt` Maps in `src/base/registry.ts`). Each test resets it via
 * `__resetRegistryForTests()` so ordering and import side effects from other
 * modules cannot leak in. Do not remove the `beforeEach` call below.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseAdtType,
  getMainType,
  registerObjectType,
  resolveType,
  resolveKind,
  getKindForType,
  getTypeForKind,
  isTypeRegistered,
  getRegisteredTypes,
  getRegisteredKinds,
  getEndpointForType,
  __resetRegistryForTests,
  type AdkObjectConstructor,
} from '../src/base/registry';
import * as kinds from '../src/base/kinds';
import type { AdkKind } from '../src/base/kinds';

// Minimal stand-in for an AdkObject constructor; tests only care about
// identity round-tripping through the registry, not the object shape.
class MockAdkObject {
  constructor(
    public ctx: unknown,
    public nameOrData: unknown,
  ) {}
}

// Single typed cast — the mock intentionally does not implement the full
// AdkObject contract, so we bridge through `unknown` once here rather than
// sprinkling `as any` at every call site.
const mockCtor = MockAdkObject as unknown as AdkObjectConstructor;

beforeEach(() => {
  __resetRegistryForTests();
});

describe('parseAdtType', () => {
  it('should parse full type with sub type', () => {
    expect(parseAdtType('DEVC/K')).toEqual({
      full: 'DEVC/K',
      main: 'DEVC',
      sub: 'K',
    });
  });

  it('should parse main type without sub type', () => {
    expect(parseAdtType('CLAS')).toEqual({
      full: 'CLAS',
      main: 'CLAS',
      sub: undefined,
    });
  });

  it('should handle lowercase input', () => {
    expect(parseAdtType('tabl/ds')).toEqual({
      full: 'tabl/ds',
      main: 'TABL',
      sub: 'DS',
    });
  });

  it('should handle empty sub type', () => {
    expect(parseAdtType('TABL/')).toEqual({
      full: 'TABL/',
      main: 'TABL',
      sub: '',
    });
  });
});

describe('getMainType', () => {
  it('should return main type from full type', () => {
    expect(getMainType('DEVC/K')).toBe('DEVC');
  });

  it('should return type as-is for main type', () => {
    expect(getMainType('CLAS')).toBe('CLAS');
  });

  it('should handle lowercase input', () => {
    expect(getMainType('prog')).toBe('PROG');
  });
});

describe('registerObjectType', () => {
  it('should register a type with endpoint and nameTransform', () => {
    registerObjectType('PROG', kinds.Program, mockCtor, {
      endpoint: 'abap/programs',
      nameTransform: 'preserve',
    });

    const entry = resolveType('PROG');
    expect(entry).toBeDefined();
    expect(entry?.kind).toBe(kinds.Program);
    expect(entry?.endpoint).toBe('abap/programs');
    expect(entry?.nameTransform).toBe('preserve');
  });

  it('should register without optional parameters', () => {
    registerObjectType('TEST', 'TestType' as AdkKind, mockCtor);

    const entry = resolveType('TEST');
    expect(entry).toBeDefined();
    expect(entry?.kind).toBe('TestType');
  });

  it('should handle case-insensitive registration', () => {
    registerObjectType('prog', kinds.Program, mockCtor);

    expect(resolveType('PROG')).toBeDefined();
    expect(resolveType('prog')).toBeDefined();
  });
});

describe('resolveType', () => {
  it('should resolve exact type match first', () => {
    registerObjectType('MYTAB', kinds.Table, mockCtor, {
      endpoint: 'ddic/tables',
    });
    registerObjectType('MYTAB/DS', kinds.Structure as AdkKind, mockCtor, {
      endpoint: 'ddic/structs',
    });

    expect(resolveType('MYTAB/DS')?.endpoint).toBe('ddic/structs');
  });

  it('should fall back to main type if full type not found', () => {
    registerObjectType('ANOTAB', kinds.Table, mockCtor, {
      endpoint: 'ddic/tables',
    });

    expect(resolveType('ANOTAB/DS')?.endpoint).toBe('ddic/tables');
  });

  it('should return undefined for unregistered type', () => {
    expect(resolveType('UNREGISTERED')).toBeUndefined();
  });
});

describe('getKindForType', () => {
  it('should return kind for registered type', () => {
    registerObjectType('CLAS', kinds.Class, mockCtor);
    expect(getKindForType('CLAS')).toBe(kinds.Class);
  });

  it('should return kind for full type', () => {
    registerObjectType('TABL', kinds.Table, mockCtor);
    expect(getKindForType('TABL/DS')).toBe(kinds.Table);
  });

  it('should return undefined for unregistered type', () => {
    expect(getKindForType('UNREG')).toBeUndefined();
  });
});

describe('getTypeForKind', () => {
  it('should return ADT type for registered kind', () => {
    registerObjectType('CLAS', kinds.Class, mockCtor);
    expect(getTypeForKind(kinds.Class)).toBe('CLAS');
  });

  it('should return undefined for unregistered kind', () => {
    expect(getTypeForKind('UnknownKind' as AdkKind)).toBeUndefined();
  });
});

describe('isTypeRegistered', () => {
  it('should return true for registered main type', () => {
    registerObjectType('CLAS', kinds.Class, mockCtor);
    expect(isTypeRegistered('CLAS')).toBe(true);
  });

  it('should return false for unregistered type', () => {
    expect(isTypeRegistered('UNREG')).toBe(false);
  });

  it('should treat full types as registered when main type is registered', () => {
    registerObjectType('TABL', kinds.Table, mockCtor);
    expect(isTypeRegistered('TABL/DS')).toBe(true);
  });
});

describe('getRegisteredTypes', () => {
  it('should return array of registered types', () => {
    registerObjectType('TYPE1', 'Type1' as AdkKind, mockCtor);
    registerObjectType('TYPE2', 'Type2' as AdkKind, mockCtor);

    const types = getRegisteredTypes();
    expect(types).toContain('TYPE1');
    expect(types).toContain('TYPE2');
  });

  it('should return empty array when nothing registered', () => {
    // Registry was cleared in beforeEach; no registrations have occurred in
    // this test yet, so the list must be empty (not just array-shaped).
    expect(getRegisteredTypes()).toEqual([]);
  });
});

describe('getRegisteredKinds', () => {
  it('should return array of registered kinds', () => {
    registerObjectType('TYPE1', 'Kind1' as AdkKind, mockCtor);

    const kindsList = getRegisteredKinds();
    expect(kindsList).toContain('Kind1');
  });
});

describe('resolveKind', () => {
  it('should resolve registered kind to entry', () => {
    registerObjectType('CLAS', kinds.Class, mockCtor, {
      endpoint: 'oo/classes',
    });

    const entry = resolveKind(kinds.Class);
    expect(entry?.kind).toBe(kinds.Class);
    expect(entry?.endpoint).toBe('oo/classes');
  });

  it('should return undefined for unregistered kind', () => {
    expect(resolveKind('UnknownKind' as AdkKind)).toBeUndefined();
  });
});

describe('getEndpointForType', () => {
  it('should return endpoint for registered type', () => {
    registerObjectType('PROG', kinds.Program, mockCtor, {
      endpoint: 'abap/programs',
    });

    expect(getEndpointForType('PROG')).toBe('abap/programs');
  });

  it('should return undefined for unregistered type', () => {
    expect(getEndpointForType('UNREG')).toBeUndefined();
  });
});
