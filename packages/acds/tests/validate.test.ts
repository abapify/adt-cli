import { describe, it, expect } from 'vitest';
import { parse } from '../src/index';
import { validate } from '../src/lib/validate';

describe('semantic validators', () => {
  it('accepts valid cardinalities', () => {
    const r = parse(`
      define view entity V as select from t {
        key a as A,
        association[0..*] to T as _t on t.a = _t.a
      }
    `);
    expect(r.errors).toHaveLength(0);
    const diags = validate(r.ast);
    expect(diags).toEqual([]);
  });

  it('flags lower > upper cardinality (ACDS003)', () => {
    const r = parse(`
      define view entity V as select from t {
        key a as A,
        association[5..2] to T as _t
      }
    `);
    const diags = validate(r.ast);
    expect(diags.some((d) => d.code === 'ACDS003')).toBe(true);
  });

  it('flags zero upper bound (ACDS002)', () => {
    const r = parse(`
      define view entity V as select from t {
        key a as A,
        association[0] to T as _t
      }
    `);
    const diags = validate(r.ast);
    expect(diags.some((d) => d.code === 'ACDS002')).toBe(true);
  });

  it('flags virtual key (ACDS011)', () => {
    const r = parse(`
      define view entity V as select from t {
        key virtual a as A
      }
    `);
    const diags = validate(r.ast);
    expect(diags.some((d) => d.code === 'ACDS011')).toBe(true);
  });

  it('returns empty diagnostics for tables', () => {
    const r = parse(`
      define table z { key x : abap.char(10) not null; }
    `);
    const diags = validate(r.ast);
    expect(diags).toEqual([]);
  });
});
