import { describe, it, expect } from 'vitest';
import { parse } from '../../src/index';
import type { TableDefinition, ViewEntityDefinition } from '../../src/ast';

describe('annotations', () => {
  it('parses top-level annotation stack', () => {
    const r = parse(`
      @EndUserText.label: 'X'
      @AbapCatalog.viewEnhancementCategory: [#NONE]
      @AccessControl.authorizationCheck: #CHECK
      define view entity V as select from t { key a as A }
    `);
    expect(r.errors).toHaveLength(0);
    const v = r.ast.definitions[0] as ViewEntityDefinition;
    expect(v.annotations).toHaveLength(3);
  });

  it('parses bare boolean annotation', () => {
    const r = parse(`
      @Metadata.ignorePropagatedAnnotations
      define view entity V as select from t { key a as A }
    `);
    expect(r.errors).toHaveLength(0);
    const v = r.ast.definitions[0] as ViewEntityDefinition;
    expect(v.annotations[0].value).toEqual({ kind: 'boolean', value: true });
  });

  it('parses array value', () => {
    const r = parse(`
      @Scope: [#VIEW, #ASSOCIATION]
      define view entity V as select from t { key a as A }
    `);
    expect(r.errors).toHaveLength(0);
    const v = r.ast.definitions[0] as ViewEntityDefinition;
    const val = v.annotations[0].value;
    expect(val.kind).toBe('array');
    if (val.kind === 'array') {
      expect(val.items).toHaveLength(2);
    }
  });

  it('parses object value', () => {
    const r = parse(`
      @UI.lineItem: { position: 10, label: 'Order' }
      define view entity V as select from t { key a as A }
    `);
    expect(r.errors).toHaveLength(0);
    const v = r.ast.definitions[0] as ViewEntityDefinition;
    const val = v.annotations[0].value;
    expect(val.kind).toBe('object');
  });

  it('parses dotted property key in objects', () => {
    const r = parse(`
      @UI: { lineItem.position: 10 }
      define view entity V as select from t { key a as A }
    `);
    expect(r.errors).toHaveLength(0);
    const v = r.ast.definitions[0] as ViewEntityDefinition;
    const val = v.annotations[0].value;
    if (val.kind === 'object') {
      expect(val.properties[0].key).toBe('lineItem.position');
    }
  });

  it('still parses old TABL annotation stack', () => {
    const r = parse(`
      @EndUserText.label : 'Test table'
      @AbapCatalog.tableCategory : #TRANSPARENT
      define table z { key x : abap.char(1) not null; }
    `);
    expect(r.errors).toHaveLength(0);
    const t = r.ast.definitions[0] as TableDefinition;
    expect(t.annotations).toHaveLength(2);
  });
});
