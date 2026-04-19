import { describe, it, expect } from 'vitest';
import { parse } from '../src/index';
import {
  walkAnnotations,
  walkAssociations,
  walkFields,
  walkParameters,
  walkViewElements,
  findAnnotation,
} from '../src/lib/ast/walker';

describe('AST walker', () => {
  const source = `
    @EndUserText.label: 'X'
    define view entity V
      with parameters p1 : abap.char(10)
      as select from tab as t
      {
        @UI.label: 'A'
        key t.a as A,
            t.b as B,
        association[0..1] to T2 as _t2 on t.a = _t2.a
      }
  `;

  it('walks annotations', () => {
    const r = parse(source);
    const annos = [...walkAnnotations(r.ast)];
    expect(annos.length).toBeGreaterThanOrEqual(2);
    expect(annos.some((a) => a.key === 'EndUserText.label')).toBe(true);
    expect(annos.some((a) => a.key === 'UI.label')).toBe(true);
  });

  it('walks view elements excluding associations', () => {
    const r = parse(source);
    const elements = [...walkViewElements(r.ast)];
    expect(elements).toHaveLength(2);
    expect(elements[0].element.alias).toBe('A');
  });

  it('walks associations', () => {
    const r = parse(source);
    const assocs = [...walkAssociations(r.ast)];
    expect(assocs).toHaveLength(1);
    expect(assocs[0].association.target).toBe('T2');
  });

  it('walks parameters', () => {
    const r = parse(source);
    const params = [...walkParameters(r.ast)];
    expect(params).toHaveLength(1);
    expect(params[0].parameter.name).toBe('p1');
  });

  it('walks fields on tables', () => {
    const r = parse(`
      define table z { key x : abap.char(10) not null; y : some_de; }
    `);
    const fields = [...walkFields(r.ast)];
    expect(fields).toHaveLength(2);
  });

  it('findAnnotation returns first match', () => {
    const r = parse(source);
    const v = r.ast.definitions[0];
    if ('annotations' in v) {
      const a = findAnnotation(v.annotations, 'EndUserText.label');
      expect(a?.value).toEqual({ kind: 'string', value: 'X' });
    }
  });
});
