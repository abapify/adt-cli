import { describe, expect, it } from 'vitest';
import { print } from '@abapify/abap-ast';
import { Registry, MemoryFile } from '@abaplint/core';
import {
  emitExceptionClass,
  type EmitExceptionClassResult,
} from '../src/emit/exception-class';

function parseWithAbaplint(name: string, source: string): string[] {
  const reg = new Registry();
  reg.addFile(new MemoryFile(`${name.toLowerCase()}.clas.abap`, source));
  reg.parse();
  return reg
    .findIssues()
    .filter((i) => i.getKey() === 'parser_error')
    .map((i) => `${i.getKey()}: ${i.getMessage()}`);
}

describe('emitExceptionClass', () => {
  const result: EmitExceptionClassResult = emitExceptionClass({
    name: 'ZCX_PETSTORE_ERROR',
  });

  it('produces a global ClassDef with the expected shape', () => {
    expect(result.class.kind).toBe('ClassDef');
    expect(result.class.name).toBe('ZCX_PETSTORE_ERROR');
    expect(result.class.isFinal).toBe(true);
    expect(result.class.isAbstract).toBeFalsy();
    expect(result.class.isCreatePrivate).toBeFalsy();
    expect(result.class.superclass).toBe('cx_static_check');
  });

  it('declares four READ-ONLY public attributes with correct types', () => {
    const publicSection = result.class.sections.find(
      (s) => s.visibility === 'public',
    );
    expect(publicSection).toBeDefined();

    const attrs = publicSection!.members.filter(
      (m) => m.kind === 'AttributeDef',
    ) as Array<{
      readonly name: string;
      readonly readOnly?: boolean;
      readonly type: { readonly kind: string; readonly name?: string };
    }>;

    expect(attrs).toHaveLength(4);
    for (const a of attrs) {
      expect(a.readOnly).toBe(true);
    }

    const byName = new Map(attrs.map((a) => [a.name, a]));
    expect(byName.get('status')!.type).toMatchObject({
      kind: 'BuiltinType',
      name: 'i',
    });
    expect(byName.get('description')!.type).toMatchObject({
      kind: 'BuiltinType',
      name: 'string',
    });
    expect(byName.get('body')!.type).toMatchObject({
      kind: 'BuiltinType',
      name: 'xstring',
    });
    expect(byName.get('headers')!.type).toMatchObject({
      kind: 'NamedTypeRef',
      name: 'kvs',
    });
  });

  it('declares a constructor with status required and the rest OPTIONAL', () => {
    const publicSection = result.class.sections.find(
      (s) => s.visibility === 'public',
    )!;
    const ctor = publicSection.members.find(
      (m) => m.kind === 'MethodDef' && m.name === 'constructor',
    ) as {
      readonly params: ReadonlyArray<{
        readonly name: string;
        readonly paramKind: string;
        readonly optional?: boolean;
        readonly typeRef: { readonly kind: string; readonly name?: string };
      }>;
    };

    expect(ctor).toBeDefined();
    expect(ctor.params).toHaveLength(4);

    const params = new Map(ctor.params.map((p) => [p.name, p]));
    expect(params.get('status')!.paramKind).toBe('importing');
    expect(params.get('status')!.optional).toBeFalsy();
    expect(params.get('status')!.typeRef).toMatchObject({
      kind: 'BuiltinType',
      name: 'i',
    });

    for (const name of ['description', 'body', 'headers']) {
      expect(params.get(name)!.optional).toBe(true);
    }
    expect(params.get('headers')!.typeRef).toMatchObject({
      kind: 'NamedTypeRef',
      name: 'kvs',
    });
  });

  it('has a MethodImpl for constructor calling super and assigning fields', () => {
    expect(result.class.implementations).toHaveLength(1);
    const impl = result.class.implementations[0];
    expect(impl.name).toBe('constructor');
    expect(impl.body.length).toBe(5);

    const first = impl.body[0] as { kind: string; method?: string };
    expect(first.kind).toBe('Call');
    expect(first.method).toBe('constructor');

    const assignTargets = impl.body.slice(1).map((s) => {
      const st = s as {
        kind: string;
        target?: { name?: string };
        value?: { name?: string };
      };
      return { kind: st.kind, t: st.target?.name, v: st.value?.name };
    });
    expect(assignTargets).toEqual([
      { kind: 'Assign', t: 'me->status', v: 'status' },
      { kind: 'Assign', t: 'me->description', v: 'description' },
      { kind: 'Assign', t: 'me->body', v: 'body' },
      { kind: 'Assign', t: 'me->headers', v: 'headers' },
    ]);
  });

  it('prints ABAP source containing the expected header, DATA line and super call', () => {
    const source = print(result.class);
    expect(source).toContain(
      'CLASS ZCX_PETSTORE_ERROR DEFINITION PUBLIC FINAL INHERITING FROM cx_static_check CREATE PUBLIC.',
    );
    expect(source).toContain('DATA status TYPE i READ-ONLY.');
    expect(source).toContain('super->constructor( ).');
    expect(source).toContain('CLASS ZCX_PETSTORE_ERROR IMPLEMENTATION.');
  });

  it('parses without fatal parser errors via @abaplint/core', () => {
    const source = print(result.class);
    const errors = parseWithAbaplint('ZCX_PETSTORE_ERROR', source);
    expect(errors).toEqual([]);
  });

  it('renames the class consistently in DEFINITION and IMPLEMENTATION', () => {
    const renamed = emitExceptionClass({ name: 'ZCX_ORDER_FAILED' });
    expect(renamed.class.name).toBe('ZCX_ORDER_FAILED');

    const source = print(renamed.class);
    expect(source).toContain('CLASS ZCX_ORDER_FAILED DEFINITION');
    expect(source).toContain('CLASS ZCX_ORDER_FAILED IMPLEMENTATION.');
    expect(source).not.toContain('ZCX_PETSTORE_ERROR');

    const errors = parseWithAbaplint('ZCX_ORDER_FAILED', source);
    expect(errors).toEqual([]);
  });
});
