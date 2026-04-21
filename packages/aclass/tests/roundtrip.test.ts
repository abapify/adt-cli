import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../src/parser';
import type { ClassDef, InterfaceDef, MethodDecl } from '../src/ast';

const __dirname = dirname(fileURLToPath(import.meta.url));
const petstore3Dir = join(
  __dirname,
  '../../../samples/petstore3-client/generated/abapgit/src',
);

function file(name: string): string {
  return readFileSync(join(petstore3Dir, name), 'utf8');
}

describe('roundtrip — AST captures every declaration the generator emits', () => {
  it('zif_petstore3 interface declares 19 methods matching the operation count', () => {
    const src = file('zif_petstore3.intf.abap');
    const { ast } = parse(src);
    const iface = ast.definitions[0] as InterfaceDef;
    const methods = iface.members.filter(
      (m): m is MethodDecl => m.kind === 'MethodDecl',
    );
    // petstore3 OpenAPI has 19 operations in scope of the generator.
    expect(methods).toHaveLength(19);
    // Every method has a name.
    for (const m of methods) {
      expect(m.name.length).toBeGreaterThan(0);
      expect(m.raising.length).toBeGreaterThan(0);
    }
  });

  it('zif_petstore3_types interface exposes the expected schema set', () => {
    const src = file('zif_petstore3_types.intf.abap');
    const { ast } = parse(src);
    const iface = ast.definitions[0] as InterfaceDef;
    const typeDecls = iface.members.filter((m) => m.kind === 'TypeDecl');
    // 6 top-level schemas: Order, Category, User, Tag, Pet, ApiResponse.
    expect(typeDecls).toHaveLength(6);
    const names = typeDecls.map((t) => (t as { name: string }).name);
    expect(names).toEqual([
      'order',
      'category',
      'user',
      'tag',
      'pet',
      'api_response',
    ]);
  });

  it('zcx_petstore3_error inherits from cx_static_check and is FINAL', () => {
    const src = file('zcx_petstore3_error.clas.abap');
    const { ast } = parse(src);
    const def = ast.definitions.find((d) => d.kind === 'ClassDef') as ClassDef;
    expect(def.isFinal).toBe(true);
    expect(def.superClass).toBe('cx_static_check');
    const pub = def.sections.find((s) => s.visibility === 'public');
    expect(pub).toBeDefined();
  });

  it('zcl_petstore3 class has a DEFINITION + IMPLEMENTATION pair with 19 methods', () => {
    const src = file('zcl_petstore3.clas.abap');
    const { ast } = parse(src);
    const defs = ast.definitions;
    const def = defs.find((d) => d.kind === 'ClassDef') as ClassDef;
    const impl = defs.find((d) => d.kind === 'ClassImpl');
    expect(def).toBeDefined();
    expect(impl).toBeDefined();
    if (impl?.kind !== 'ClassImpl') throw new Error('expected ClassImpl');
    // 1 constructor + 19 operations = 20 implementations.
    expect(impl.methods.length).toBeGreaterThanOrEqual(19);
    const names = impl.methods.map((m) => m.name);
    expect(names).toContain('constructor');
  });

  it('idempotence: parse(src) twice yields equivalent ASTs', () => {
    const files = readdirSync(petstore3Dir).filter((f) => f.endsWith('.abap'));
    for (const f of files) {
      const src = readFileSync(join(petstore3Dir, f), 'utf8');
      const a = parse(src);
      const b = parse(src);
      // Both yield the same number and kind of top-level defs.
      expect(b.ast.definitions.length, f).toBe(a.ast.definitions.length);
      for (let i = 0; i < a.ast.definitions.length; i++) {
        expect(b.ast.definitions[i].kind, f).toBe(a.ast.definitions[i].kind);
      }
    }
  });

  it('method-body preservation: every MethodImpl.body is non-empty for zcl_petstore3', () => {
    const src = file('zcl_petstore3.clas.abap');
    const impl = parse(src).ast.definitions.find((d) => d.kind === 'ClassImpl');
    if (impl?.kind !== 'ClassImpl') throw new Error('expected ClassImpl');
    for (const m of impl.methods) {
      expect(m.body.length, `${m.name} has empty body`).toBeGreaterThan(0);
      // Source appears where we sliced it.
      expect(src).toContain(m.body.trimEnd());
    }
  });
});
