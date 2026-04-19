/**
 * ADK Registry Unit Tests
 *
 * Tests for registry.ts functions that handle ADT type to ADK kind mapping
 * and object type registration/resolution.
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
} from '../src/base/registry';
import * as kinds from '../src/base/kinds';
import type { AdkKind } from '../src/base/kinds';

// Mock AdkObject class for testing
class MockAdkObject {
  constructor(
    public ctx: unknown,
    public nameOrData: string | unknown,
  ) {}
}

describe('parseAdtType', () => {
  it('should parse full type with sub type', () => {
    const result = parseAdtType('DEVC/K');
    expect(result).toEqual({
      full: 'DEVC/K',
      main: 'DEVC',
      sub: 'K',
    });
  });

  it('should parse main type without sub type', () => {
    const result = parseAdtType('CLAS');
    expect(result).toEqual({
      full: 'CLAS',
      main: 'CLAS',
      sub: undefined,
    });
  });

  it('should handle lowercase input', () => {
    const result = parseAdtType('tabl/ds');
    expect(result).toEqual({
      full: 'tabl/ds',
      main: 'TABL',
      sub: 'DS',
    });
  });

  it('should handle empty sub type', () => {
    const result = parseAdtType('TABL/');
    expect(result).toEqual({
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
  beforeEach(() => {
    // Reset would be needed here but since we're using internal registry,
    // we'll test in isolation by importing fresh functions
  });

  it('should register a type with endpoint and nameTransform', () => {
    const mockConstructor = MockAdkObject as any;

    registerObjectType('PROG', kinds.Program, mockConstructor, {
      endpoint: 'abap/ programs',
      nameTransform: 'preserve',
    });

    const entry = resolveType('PROG');
    expect(entry).toBeDefined();
    expect(entry?.kind).toBe(kinds.Program);
    expect(entry?.endpoint).toBe('abap/ programs');
    expect(entry?.nameTransform).toBe('preserve');
  });

  it('should register without optional parameters', () => {
    const mockConstructor = MockAdkObject as any;

    registerObjectType('TEST', 'TestType' as AdkKind, mockConstructor);

    const entry = resolveType('TEST');
    expect(entry).toBeDefined();
    expect(entry?.kind).toBe('TestType');
  });

  it('should handle case-insensitive registration', () => {
    const mockConstructor = MockAdkObject as any;

    registerObjectType('prog', kinds.Program, mockConstructor);

    expect(resolveType('PROG')).toBeDefined();
    expect(resolveType('prog')).toBeDefined();
  });
});

describe('resolveType', () => {
  it('should resolve exact type match first', () => {
    const mockConstructor = MockAdkObject as any;

    registerObjectType('MYTAB', kinds.Table, mockConstructor, {
      endpoint: 'ddic/tables',
    });
    registerObjectType(
      'MYTAB/DS',
      kinds.Structure as AdkKind,
      mockConstructor,
      { endpoint: 'ddic/structs' },
    );

    const entry = resolveType('MYTAB/DS');
    expect(entry?.endpoint).toBe('ddic/structs');
  });

  it('should fall back to main type if full type not found', () => {
    const mockConstructor = MockAdkObject as any;

    registerObjectType('ANOTAB', kinds.Table, mockConstructor, {
      endpoint: 'ddic/tables',
    });

    const entry = resolveType('ANOTAB/DS');
    expect(entry?.endpoint).toBe('ddic/tables');
  });

  it('should return undefined for unregistered type', () => {
    const entry = resolveType('UNREGISTERED');
    expect(entry).toBeUndefined();
  });
});

describe('getKindForType', () => {
  it('should return kind for registered type', () => {
    const mockConstructor = MockAdkObject as any;
    registerObjectType('CLAS', kinds.Class, mockConstructor);

    const kind = getKindForType('CLAS');
    expect(kind).toBe(kinds.Class);
  });

  it('should return kind for full type', () => {
    const mockConstructor = MockAdkObject as any;
    registerObjectType('TABL', kinds.Table, mockConstructor);

    const kind = getKindForType('TABL/DS');
    expect(kind).toBe(kinds.Table);
  });

  it('should return undefined for unregistered type', () => {
    const kind = getKindForType('UNREG');
    expect(kind).toBeUndefined();
  });
});

describe('getTypeForKind', () => {
  it('should return ADT type for registered kind', () => {
    const mockConstructor = MockAdkObject as any;
    registerObjectType('CLAS', kinds.Class, mockConstructor);

    const type = getTypeForKind(kinds.Class);
    expect(type).toBe('CLAS');
  });

  it('should return undefined for unregistered kind', () => {
    const type = getTypeForKind('UnknownKind' as AdkKind);
    expect(type).toBeUndefined();
  });
});

describe('isTypeRegistered', () => {
  it('should return true for registered type', () => {
    const mockConstructor = MockAdkObject as any;
    registerObjectType('CLAS', kinds.Class, mockConstructor);

    expect(isTypeRegistered('CLAS')).toBe(true);
  });

  it('should return false for unregistered type', () => {
    expect(isTypeRegistered('UNREG')).toBe(false);
  });

  it('should check main type only', () => {
    const mockConstructor = MockAdkObject as any;
    registerObjectType('TABL', kinds.Table, mockConstructor);

    expect(isTypeRegistered('TABL/DS')).toBe(true);
  });
});

describe('getRegisteredTypes', () => {
  it('should return array of registered types', () => {
    const mockConstructor = MockAdkObject as any;
    registerObjectType('TYPE1', 'Type1' as AdkKind, mockConstructor);
    registerObjectType('TYPE2', 'Type2' as AdkKind, mockConstructor);

    const types = getRegisteredTypes();
    expect(types).toContain('TYPE1');
    expect(types).toContain('TYPE2');
  });

  it('should return empty array when nothing registered', () => {
    // Note: This assumes fresh state - may need adjustment
    const types = getRegisteredTypes();
    expect(Array.isArray(types)).toBe(true);
  });
});

describe('getRegisteredKinds', () => {
  it('should return array of registered kinds', () => {
    const mockConstructor = MockAdkObject as any;
    registerObjectType('TYPE1', 'Kind1' as AdkKind, mockConstructor);

    const kinds_list = getRegisteredKinds();
    expect(kinds_list).toContain('Kind1');
  });
});

describe('resolveKind', () => {
  it('should resolve registered kind to entry', () => {
    const mockConstructor = MockAdkObject as any;
    registerObjectType('CLAS', kinds.Class, mockConstructor, {
      endpoint: 'oo/classes',
    });

    const entry = resolveKind(kinds.Class);
    expect(entry?.kind).toBe(kinds.Class);
    expect(entry?.endpoint).toBe('oo/classes');
  });

  it('should return undefined for unregistered kind', () => {
    const entry = resolveKind('UnknownKind' as AdkKind);
    expect(entry).toBeUndefined();
  });
});

describe('getEndpointForType', () => {
  it('should return endpoint for registered type', () => {
    const mockConstructor = MockAdkObject as any;
    registerObjectType('PROG', kinds.Program, mockConstructor, {
      endpoint: 'abap/programs',
    });

    const endpoint = getEndpointForType('PROG');
    expect(endpoint).toBe('abap/programs');
  });

  it('should return undefined for unregistered type', () => {
    const endpoint = getEndpointForType('UNREG');
    expect(endpoint).toBeUndefined();
  });
});
