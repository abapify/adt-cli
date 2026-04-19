import { describe, it, expect } from 'vitest';
import { parse } from '../../src/index';
import type { ViewEntityDefinition } from '../../src/ast';

describe('parameters clause', () => {
  it('parses single parameter', () => {
    const r = parse(`
      define view entity V
        with parameters p1 : abap.char(10)
        as select from t { key a as A }
    `);
    expect(r.errors).toHaveLength(0);
    const v = r.ast.definitions[0] as ViewEntityDefinition;
    expect(v.parameters).toHaveLength(1);
    expect(v.parameters[0].name).toBe('p1');
  });

  it('parses multiple parameters', () => {
    const r = parse(`
      define view entity V
        with parameters p1 : abap.char(10),
                        p2 : abap.int4,
                        p3 : some_data_element
        as select from t { key a as A }
    `);
    expect(r.errors).toHaveLength(0);
    const v = r.ast.definitions[0] as ViewEntityDefinition;
    expect(v.parameters).toHaveLength(3);
    expect(v.parameters[1].name).toBe('p2');
    expect(v.parameters[2].type).toEqual({
      kind: 'named',
      name: 'some_data_element',
    });
  });

  it('parses parameter with default string', () => {
    const r = parse(`
      define view entity V
        with parameters p1 : abap.dats default '99991231'
        as select from t { key a as A }
    `);
    expect(r.errors).toHaveLength(0);
    const v = r.ast.definitions[0] as ViewEntityDefinition;
    expect(v.parameters[0].defaultValue).toEqual({
      kind: 'string',
      value: '99991231',
    });
  });

  it('parses parameter with default number', () => {
    const r = parse(`
      define view entity V
        with parameters p1 : abap.int4 default 42
        as select from t { key a as A }
    `);
    expect(r.errors).toHaveLength(0);
    const v = r.ast.definitions[0] as ViewEntityDefinition;
    expect(v.parameters[0].defaultValue).toEqual({ kind: 'number', value: 42 });
  });

  it('parses annotated parameter', () => {
    const r = parse(`
      define view entity V
        with parameters
          @Environment.systemField: #CLIENT
          p_client : abap.clnt
        as select from t { key a as A }
    `);
    expect(r.errors).toHaveLength(0);
    const v = r.ast.definitions[0] as ViewEntityDefinition;
    expect(v.parameters[0].annotations).toHaveLength(1);
    expect(v.parameters[0].annotations[0].key).toBe('Environment.systemField');
  });
});
