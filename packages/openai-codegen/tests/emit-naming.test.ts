import { describe, expect, it } from 'vitest';
import {
  resolveNames,
  NamesConfigError,
  type ResolvedNames,
} from '../src/emit/naming';

describe('resolveNames', () => {
  it('derives all four global names from --base petstore', () => {
    const names = resolveNames({ base: 'petstore' });
    expect(names.typesInterface).toBe('ZIF_PETSTORE_TYPES');
    expect(names.operationsInterface).toBe('ZIF_PETSTORE');
    expect(names.implementationClass).toBe('ZCL_PETSTORE');
    expect(names.exceptionClass).toBe('ZCX_PETSTORE_ERROR');
  });

  it('returns the expected local class defaults', () => {
    const names = resolveNames({ base: 'petstore' });
    expect(names.localHttpClass).toBe('lcl_http');
    expect(names.localResponseClass).toBe('lcl_response');
    expect(names.localJsonClass).toBe('json');
    expect(names.localJsonParserClass).toBe('lcl_json_parser');
  });

  it('uppercases a mixed-case base', () => {
    const names = resolveNames({ base: 'MyShop' });
    expect(names.implementationClass).toBe('ZCL_MYSHOP');
    expect(names.typesInterface).toBe('ZIF_MYSHOP_TYPES');
  });

  it('allows individual overrides to win over base-derived names', () => {
    const names = resolveNames({
      base: 'petstore',
      implementationClass: 'ZCL_CUSTOM_IMPL',
      typesInterface: 'ZIF_CUSTOM_TYPES',
      operationsInterface: 'ZIF_CUSTOM_OPS',
      exceptionClass: 'ZCX_CUSTOM_ERR',
    });
    expect(names.implementationClass).toBe('ZCL_CUSTOM_IMPL');
    expect(names.typesInterface).toBe('ZIF_CUSTOM_TYPES');
    expect(names.operationsInterface).toBe('ZIF_CUSTOM_OPS');
    expect(names.exceptionClass).toBe('ZCX_CUSTOM_ERR');
  });

  it('accepts only overrides with no base', () => {
    const names = resolveNames({
      typesInterface: 'ZIF_ONLY_TYPES',
      operationsInterface: 'ZIF_ONLY',
      implementationClass: 'ZCL_ONLY',
      exceptionClass: 'ZCX_ONLY_ERROR',
    });
    expect(names.implementationClass).toBe('ZCL_ONLY');
  });

  it('throws NamesConfigError when neither base nor overrides given', () => {
    expect(() => resolveNames({})).toThrow(NamesConfigError);
    try {
      resolveNames({});
    } catch (err) {
      expect(err).toBeInstanceOf(NamesConfigError);
      expect((err as Error).message).toMatch(/at least "base" or/);
    }
  });

  it('throws NamesConfigError for a global name starting with "A"', () => {
    expect(() =>
      resolveNames({
        base: 'petstore',
        implementationClass: 'ACL_BAD',
      }),
    ).toThrow(/implementationClass.*ACL_BAD/);
  });

  it('throws NamesConfigError for lowercase in a global name', () => {
    expect(() => resolveNames({ typesInterface: 'Zif_lower' })).toThrow(
      NamesConfigError,
    );
  });

  it('throws NamesConfigError when a global name is longer than 30 chars', () => {
    const longName = 'Z' + 'X'.repeat(40);
    expect(() =>
      resolveNames({ base: 'petstore', implementationClass: longName }),
    ).toThrow(/exceeds 30/);
  });

  it('throws NamesConfigError for an uppercase local class name', () => {
    expect(() =>
      resolveNames({ base: 'petstore', localHttpClass: 'LCL_HTTP' }),
    ).toThrow(/localHttpClass/);
  });

  it('honours custom local class names when valid', () => {
    const names: ResolvedNames = resolveNames({
      base: 'petstore',
      localHttpClass: 'lcl_my_http',
      localJsonClass: 'lcl_json',
    });
    expect(names.localHttpClass).toBe('lcl_my_http');
    expect(names.localJsonClass).toBe('lcl_json');
  });

  it('rejects an empty base', () => {
    expect(() => resolveNames({ base: '   ' })).toThrow(NamesConfigError);
  });

  it('rejects a base with invalid characters', () => {
    expect(() => resolveNames({ base: 'pet-store' })).toThrow(
      /base.*pet-store/,
    );
  });
});
