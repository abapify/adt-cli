import { describe, it, expect } from 'vitest';
import { parse } from '../../src/index';
import type { RoleDefinition } from '../../src/ast';

describe('DCL — role / grant', () => {
  it('parses role with single grant', () => {
    const r = parse(`
      define role R1 {
        grant select on Foo;
      }
    `);
    expect(r.errors).toHaveLength(0);
    const role = r.ast.definitions[0] as RoleDefinition;
    expect(role.kind).toBe('role');
    expect(role.name).toBe('R1');
    expect(role.grants).toHaveLength(1);
    expect(role.grants[0].privilege).toBe('select');
    expect(role.grants[0].entity).toBe('Foo');
  });

  it('parses role with where condition', () => {
    const r = parse(`
      define role R1 {
        grant select on Foo where Foo.carrid = 'LH';
      }
    `);
    expect(r.errors).toHaveLength(0);
    const role = r.ast.definitions[0] as RoleDefinition;
    expect(role.grants[0].where).toBeDefined();
    expect(role.grants[0].where?.source).toContain('carrid');
  });

  it('parses role with multiple grants', () => {
    const r = parse(`
      define role R1 {
        grant select on A;
        grant select on B where B.kind = 'X';
        grant select on pkg.qualified.Entity;
      }
    `);
    expect(r.errors).toHaveLength(0);
    const role = r.ast.definitions[0] as RoleDefinition;
    expect(role.grants).toHaveLength(3);
    expect(role.grants[2].entity).toBe('pkg.qualified.Entity');
  });
});
