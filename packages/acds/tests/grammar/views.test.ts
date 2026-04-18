import { describe, it, expect } from 'vitest';
import { parse } from '../../src/index';
import type {
  ViewEntityDefinition,
  AssociationDeclaration,
  ViewElement,
} from '../../src/ast';

describe('view entity — as select from', () => {
  it('parses minimal view entity', () => {
    const r = parse(`
      define view entity V1 as select from tab1 {
        key a as A
      }
    `);
    expect(r.errors).toHaveLength(0);
    const v = r.ast.definitions[0] as ViewEntityDefinition;
    expect(v.kind).toBe('viewEntity');
    expect(v.name).toBe('V1');
    expect(v.sourceKind).toBe('select');
    expect(v.source.name).toBe('tab1');
    expect(v.members).toHaveLength(1);
    const el = v.members[0] as ViewElement;
    expect(el.isKey).toBe(true);
    expect(el.expression).toBe('a');
    expect(el.alias).toBe('A');
  });

  it('accepts comma-separated elements', () => {
    const r = parse(`
      define view entity V as select from t {
        key x as X,
            y as Y,
            z as Z
      }
    `);
    expect(r.errors).toHaveLength(0);
    const v = r.ast.definitions[0] as ViewEntityDefinition;
    expect(v.members).toHaveLength(3);
  });

  it('captures source alias', () => {
    const r = parse(`
      define view entity V as select from tab as t {
        key t.a as A
      }
    `);
    expect(r.errors).toHaveLength(0);
    const v = r.ast.definitions[0] as ViewEntityDefinition;
    expect(v.source.name).toBe('tab');
    expect(v.source.alias).toBe('t');
  });

  it('supports virtual elements', () => {
    const r = parse(`
      define view entity V as select from t {
        virtual descr as Description
      }
    `);
    expect(r.errors).toHaveLength(0);
    const el = (r.ast.definitions[0] as ViewEntityDefinition)
      .members[0] as ViewElement;
    expect(el.isVirtual).toBe(true);
  });

  it('preserves element-level annotations', () => {
    const r = parse(`
      define view entity V as select from t {
        @UI.label: 'X'
        key a as A
      }
    `);
    expect(r.errors).toHaveLength(0);
    const el = (r.ast.definitions[0] as ViewEntityDefinition)
      .members[0] as ViewElement;
    expect(el.annotations).toHaveLength(1);
    expect(el.annotations[0].key).toBe('UI.label');
  });

  it('captures top-level view where clause', () => {
    const r = parse(`
      define view entity V as select from t {
        key a as A
      } where a = 'X'
    `);
    expect(r.errors).toHaveLength(0);
    const v = r.ast.definitions[0] as ViewEntityDefinition;
    expect(v.where).toBeDefined();
    expect(v.where?.source).toContain('=');
  });
});

describe('projection view — as projection on', () => {
  it('parses projection view', () => {
    const r = parse(`
      define view entity P as projection on I_Base {
        key a as A
      }
    `);
    expect(r.errors).toHaveLength(0);
    const v = r.ast.definitions[0] as ViewEntityDefinition;
    expect(v.sourceKind).toBe('projection');
    expect(v.source.name).toBe('I_Base');
  });

  it('allows redirected associations', () => {
    const r = parse(`
      define view entity P as projection on I_Base {
        key id as Id,
        association[0..*] to redirected to parent.Child as _Child on id = _Child.id
      }
    `);
    expect(r.errors).toHaveLength(0);
    const v = r.ast.definitions[0] as ViewEntityDefinition;
    const assoc = v.members[1] as AssociationDeclaration;
    expect(assoc.kind).toBe('association');
    expect(assoc.redirected).toBe(true);
    expect(assoc.target).toBe('parent.Child');
  });
});

describe('abstract / custom entities', () => {
  it('parses abstract entity', () => {
    const r = parse(`
      define abstract entity AE {
        key id : abap.char(10) not null;
            name : abap.char(40);
      }
    `);
    expect(r.errors).toHaveLength(0);
    const ae = r.ast.definitions[0];
    expect(ae.kind).toBe('abstractEntity');
  });

  it('parses custom entity with parameter', () => {
    const r = parse(`
      define custom entity CE
        with parameters p1 : abap.char(10)
      {
        key id : abap.char(10);
      }
    `);
    expect(r.errors).toHaveLength(0);
    const ce = r.ast.definitions[0];
    expect(ce.kind).toBe('customEntity');
  });
});
