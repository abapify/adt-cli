import { describe, it, expect } from 'vitest';
import { parse } from '../../src/index';

describe('named call arguments', () => {
  it('parses currency_conversion with named args', () => {
    const r = parse(
      `define view entity V as select from t { currency_conversion(amount => price, source_currency => currency) as x }`,
    );
    expect(r.errors).toHaveLength(0);
    const v = r.ast.definitions[0] as any;
    expect(v.members[0].expression).toBe(
      'currency_conversion(amount => price, source_currency => currency)',
    );
  });

  it('parses nested call as argument value', () => {
    const r = parse(
      `define view entity V as select from t { foo(bar => baz(qux => 1)) as x }`,
    );
    expect(r.errors).toHaveLength(0);
    const v = r.ast.definitions[0] as any;
    expect(v.members[0].expression).toBe('foo(bar => baz(qux => 1))');
  });

  it('parses positional call', () => {
    const r = parse(`define view entity V as select from t { foo(a, b) as x }`);
    expect(r.errors).toHaveLength(0);
  });
});

describe('namespace-qualified names and division', () => {
  it('parses compact division chain', () => {
    const r = parse(`define view entity V as select from t { a/b/c as ratio }`);
    expect(r.errors).toHaveLength(0);
  });

  it('parses namespace-qualified source', () => {
    const r = parse(
      `define view entity V as select from /NS/CLASS { key a as A }`,
    );
    expect(r.errors).toHaveLength(0);
    const v = r.ast.definitions[0] as any;
    expect(v.source.name).toBe('/NS/CLASS');
  });

  it('parses digit-leading namespace', () => {
    const r = parse(
      `define view entity V as select from /1BCDWB/NAME { key a as A }`,
    );
    expect(r.errors).toHaveLength(0);
    const v = r.ast.definitions[0] as any;
    expect(v.source.name).toBe('/1BCDWB/NAME');
  });
});
