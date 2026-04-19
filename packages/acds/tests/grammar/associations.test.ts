import { describe, it, expect } from 'vitest';
import { parse } from '../../src/index';
import type {
  AssociationDeclaration,
  ViewEntityDefinition,
} from '../../src/ast';

function getAssoc(src: string, index = 0): AssociationDeclaration {
  const r = parse(src);
  expect(r.errors).toHaveLength(0);
  const v = r.ast.definitions[0] as ViewEntityDefinition;
  const a = v.members.find(
    (m, i) => 'associationKind' in m && i >= index,
  ) as AssociationDeclaration;
  return a;
}

describe('associations', () => {
  it('parses plain association to target', () => {
    const a = getAssoc(`
      define view entity V as select from t {
        key id as Id,
        association to T2 as _t2
      }
    `);
    expect(a.associationKind).toBe('association');
    expect(a.target).toBe('T2');
    expect(a.alias).toBe('_t2');
  });

  it('parses cardinality [0..*]', () => {
    const a = getAssoc(`
      define view entity V as select from t {
        key id as Id,
        association[0..*] to T2 as _t2
      }
    `);
    expect(a.cardinality).toEqual({ min: 0, max: '*' });
  });

  it('parses cardinality [0..1]', () => {
    const a = getAssoc(`
      define view entity V as select from t {
        key id as Id,
        association[0..1] to T2 as _t2
      }
    `);
    expect(a.cardinality).toEqual({ min: 0, max: 1 });
  });

  it('parses cardinality [*]', () => {
    const a = getAssoc(`
      define view entity V as select from t {
        key id as Id,
        association[*] to T2 as _t2
      }
    `);
    expect(a.cardinality).toEqual({ max: '*' });
  });

  it('parses cardinality [5]', () => {
    const a = getAssoc(`
      define view entity V as select from t {
        key id as Id,
        association[5] to T2 as _t2
      }
    `);
    expect(a.cardinality).toEqual({ max: 5 });
  });

  it('parses composition of target', () => {
    const a = getAssoc(`
      define view entity V as select from t {
        key id as Id,
        composition[0..*] of T2 as _t2
      }
    `);
    expect(a.associationKind).toBe('composition');
    expect(a.target).toBe('T2');
  });

  it('captures on-condition as expression', () => {
    const a = getAssoc(`
      define view entity V as select from t {
        key id as Id,
        association[0..*] to T2 as _t2 on t.id = _t2.id
      }
    `);
    expect(a.on).toBeDefined();
    expect(a.on?.source).toContain('=');
  });

  it('carries annotations', () => {
    const a = getAssoc(`
      define view entity V as select from t {
        key id as Id,
        @ObjectModel.association.type: [#TO_COMPOSITION_PARENT]
        association to T2 as _t2
      }
    `);
    expect(a.annotations).toHaveLength(1);
    expect(a.annotations[0].key).toBe('ObjectModel.association.type');
  });
});
