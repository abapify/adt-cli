import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { loadSpec, normalizeSpec } from '../src/oas/index';
import type { NormalizedSpec } from '../src/oas/types';
import { planTypes } from '../src/types/plan';
import {
  emitTypesInterface,
  PolymorphismConflictError,
} from '../src/emit/types-interface';
import { print } from '@abapify/abap-ast';
import * as abaplint from '@abaplint/core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PETSTORE_PATH = resolve(
  __dirname,
  '../../../samples/petstore3-client/spec/openapi.json',
);

function buildSpec(
  schemas: Record<string, Record<string, unknown>>,
): NormalizedSpec {
  return normalizeSpec(
    {
      openapi: '3.0.3',
      info: { title: 'T', version: '1' },
      paths: {},
      components: { schemas },
    },
    schemas,
  );
}

describe('emitTypesInterface (Petstore v3)', () => {
  it('emits one TypeDef per component schema, in topological order', async () => {
    const spec = await loadSpec(PETSTORE_PATH);
    const plan = planTypes(spec, { typePrefix: '' });
    const result = emitTypesInterface(spec, plan, {
      name: 'ZIF_PETSTORE_TYPES',
    });

    expect(result.interface.kind).toBe('InterfaceDef');
    expect(result.interface.name).toBe('ZIF_PETSTORE_TYPES');

    const namesInOrder = result.typeDefs.map((d) => d.name);
    for (const expected of [
      'pet',
      'category',
      'tag',
      'order',
      'user',
      'api_response',
    ]) {
      expect(namesInOrder).toContain(expected);
    }
    // Topological ordering: Category and Tag precede Pet.
    expect(namesInOrder.indexOf('category')).toBeLessThan(
      namesInOrder.indexOf('pet'),
    );
    expect(namesInOrder.indexOf('tag')).toBeLessThan(
      namesInOrder.indexOf('pet'),
    );

    // @openapi-schema ABAPDoc on every component-derived typedef.
    for (const [abapName, original] of [
      ['pet', 'Pet'],
      ['category', 'Category'],
      ['tag', 'Tag'],
      ['order', 'Order'],
      ['user', 'User'],
      ['api_response', 'ApiResponse'],
    ] as const) {
      const def = result.typeDefs.find((d) => d.name === abapName);
      expect(def, `missing typedef ${abapName}`).toBeDefined();
      const doc = def!.abapDoc ?? [];
      expect(doc.some((l) => l === `@openapi-schema ${original}`)).toBe(true);
    }

    // Pet references Category and Tag by name.
    const pet = result.typeDefs.find((d) => d.name === 'pet')!;
    const petStruct = pet.type as {
      kind: string;
      fields: readonly {
        name: string;
        type: { kind: string; name?: string; rowType?: { name?: string } };
      }[];
    };
    expect(petStruct.kind).toBe('StructureType');
    const catField = petStruct.fields.find((f) => f.name === 'category');
    expect(catField).toBeDefined();
    expect(catField!.type.kind).toBe('NamedTypeRef');
    expect((catField!.type as { name: string }).name).toBe('category');

    const tagsField = petStruct.fields.find((f) => f.name === 'tags');
    expect(tagsField).toBeDefined();
    // Inline array: NamedTypeRef whose name is the full inline table expression.
    expect(tagsField!.type.kind).toBe('NamedTypeRef');
    expect((tagsField!.type as { name: string }).name).toBe(
      'STANDARD TABLE OF tag WITH EMPTY KEY',
    );
  });
});

describe('emitTypesInterface polymorphism', () => {
  it('allOf merges fields from sub-objects into a single union', () => {
    const spec = buildSpec({
      Combined: {
        allOf: [
          { type: 'object', properties: { a: { type: 'string' } } },
          { type: 'object', properties: { b: { type: 'integer' } } },
        ],
      },
    });
    const plan = planTypes(spec, { typePrefix: '' });
    const result = emitTypesInterface(spec, plan, {
      name: 'ZIF_TYPES',
    });
    const combined = result.typeDefs.find((d) => d.name === 'combined');
    expect(combined).toBeDefined();
    const fields = (
      combined!.type as { fields: readonly { name: string }[] }
    ).fields.map((f) => f.name);
    expect(fields).toEqual(expect.arrayContaining(['a', 'b']));
  });

  it('oneOf variants merge into union of fields', () => {
    const spec = buildSpec({
      Animal: {
        oneOf: [
          { type: 'object', properties: { bark: { type: 'string' } } },
          { type: 'object', properties: { meow: { type: 'string' } } },
        ],
      },
    });
    const plan = planTypes(spec, { typePrefix: '' });
    const result = emitTypesInterface(spec, plan, { name: 'ZIF_TYPES' });
    const animal = result.typeDefs.find((d) => d.name === 'animal')!;
    const fields = (
      animal.type as { fields: readonly { name: string }[] }
    ).fields.map((f) => f.name);
    expect(fields).toEqual(expect.arrayContaining(['bark', 'meow']));
  });

  it('throws PolymorphismConflictError when allOf variants disagree on a field type', () => {
    const spec = buildSpec({
      Conflicted: {
        allOf: [
          { type: 'object', properties: { id: { type: 'string' } } },
          { type: 'object', properties: { id: { type: 'integer' } } },
        ],
      },
    });
    const plan = planTypes(spec, { typePrefix: '' });
    expect(() => emitTypesInterface(spec, plan, { name: 'ZIF_TYPES' })).toThrow(
      PolymorphismConflictError,
    );
  });
});

describe('emitTypesInterface cycles', () => {
  it('emits TYPE REF TO data on a back-edge in a mutual cycle and preserves @openapi-ref doc', () => {
    // A → B → A (indirect cycle)
    const schemaA: Record<string, unknown> = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        b: { $ref: '#/components/schemas/B' },
      },
    };
    const schemaB: Record<string, unknown> = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        a: { $ref: '#/components/schemas/A' },
      },
    };
    const spec = buildSpec({ A: schemaA, B: schemaB });
    const plan = planTypes(spec, { typePrefix: '' });
    const result = emitTypesInterface(spec, plan, { name: 'ZIF_TYPES' });
    const src = print(result.interface);
    // At least one of the two sides must declare TYPE REF TO data.
    expect(src).toMatch(/TYPE\s+REF\s+TO\s+data/);
    // And the corresponding TypeDef must carry an @openapi-ref doc line.
    const withBack = result.typeDefs.find((d) =>
      (d.abapDoc ?? []).some((l) => l.startsWith('@openapi-ref')),
    );
    expect(withBack).toBeDefined();
  });

  it('self-referential schema emits REF TO data with @openapi-ref', () => {
    const node: Record<string, unknown> = {
      type: 'object',
      properties: {
        value: { type: 'string' },
        next: { $ref: '#/components/schemas/Node' },
      },
    };
    const spec = buildSpec({ Node: node });
    const plan = planTypes(spec, { typePrefix: '' });
    const result = emitTypesInterface(spec, plan, { name: 'ZIF_TYPES' });
    const n = result.typeDefs.find((d) => d.name === 'node')!;
    expect(n.abapDoc?.some((l) => l.startsWith('@openapi-ref next:Node'))).toBe(
      true,
    );
    const src = print(result.interface);
    expect(src).toMatch(/TYPE\s+REF\s+TO\s+data/);
  });
});

describe('emitTypesInterface additionalProperties', () => {
  it('emits <name>_map_entry and <name>_map for objects with additionalProperties: $ref', () => {
    const spec = buildSpec({
      Foo: { type: 'object', properties: { id: { type: 'string' } } },
      Container: {
        type: 'object',
        additionalProperties: { $ref: '#/components/schemas/Foo' },
      },
    });
    const plan = planTypes(spec, { typePrefix: '' });
    const result = emitTypesInterface(spec, plan, { name: 'ZIF_TYPES' });
    const names = result.typeDefs.map((d) => d.name);
    expect(names).toContain('container_map_entry');
    expect(names).toContain('container_map');
    // Container is emitted with an `entries TYPE container_map` field.
    const container = result.typeDefs.find((d) => d.name === 'container')!;
    const fields = (
      container.type as {
        fields: readonly { name: string; type: { name?: string } }[];
      }
    ).fields;
    const entries = fields.find((f) => f.name === 'entries');
    expect(entries).toBeDefined();
    expect(entries!.type.name).toBe('container_map');
    // container_map_entry.value references `foo`.
    const entry = result.typeDefs.find(
      (d) => d.name === 'container_map_entry',
    )!;
    const valueField = (
      entry.type as {
        fields: readonly { name: string; type: { name?: string } }[];
      }
    ).fields.find((f) => f.name === 'value');
    expect(valueField!.type.name).toBe('foo');
  });
});

describe('emitTypesInterface null flags', () => {
  it('default: no <field>_is_null sibling', () => {
    const spec = buildSpec({
      Thing: {
        type: 'object',
        properties: { note: { type: 'string', nullable: true } },
      },
    });
    const plan = planTypes(spec, { typePrefix: '' });
    const result = emitTypesInterface(spec, plan, { name: 'ZIF_TYPES' });
    const thing = result.typeDefs.find((d) => d.name === 'thing')!;
    const names = (
      thing.type as { fields: readonly { name: string }[] }
    ).fields.map((f) => f.name);
    expect(names).toContain('note');
    expect(names).not.toContain('note_is_null');
  });

  it('emitNullFlags: true emits <field>_is_null siblings', () => {
    const spec = buildSpec({
      Thing: {
        type: 'object',
        properties: { note: { type: 'string', nullable: true } },
      },
    });
    const plan = planTypes(spec, { typePrefix: '' });
    const result = emitTypesInterface(spec, plan, {
      name: 'ZIF_TYPES',
      emitNullFlags: true,
    });
    const thing = result.typeDefs.find((d) => d.name === 'thing')!;
    const names = (
      thing.type as { fields: readonly { name: string }[] }
    ).fields.map((f) => f.name);
    expect(names).toEqual(expect.arrayContaining(['note', 'note_is_null']));
  });
});

describe('emitTypesInterface snapshot (synthetic 3 schemas + array + map)', () => {
  it('matches snapshot', () => {
    const spec = buildSpec({
      Tag: {
        type: 'object',
        properties: {
          id: { type: 'integer', format: 'int64' },
          name: { type: 'string' },
        },
      },
      Pet: {
        type: 'object',
        properties: {
          id: { type: 'integer', format: 'int64' },
          name: { type: 'string' },
          tags: {
            type: 'array',
            items: { $ref: '#/components/schemas/Tag' },
          },
        },
      },
      Dictionary: {
        type: 'object',
        additionalProperties: { type: 'string' },
      },
    });
    const plan = planTypes(spec, { typePrefix: '' });
    const result = emitTypesInterface(spec, plan, {
      name: 'ZIF_DEMO_TYPES',
    });
    const src = print(result.interface);
    expect(src).toMatchSnapshot();
  });
});

describe('emitTypesInterface abaplint parse', () => {
  it('the emitted interface parses cleanly under abaplint (no parser errors)', async () => {
    const spec = await loadSpec(PETSTORE_PATH);
    const plan = planTypes(spec, { typePrefix: '' });
    const result = emitTypesInterface(spec, plan, {
      name: 'ZIF_PETSTORE_TYPES',
    });
    const src = print(result.interface);
    const file = new abaplint.MemoryFile('zif_petstore_types.intf.abap', src);
    const reg = new abaplint.Registry().addFile(file).parse();
    const issues = reg.findIssues();
    const parserErrors = issues.filter(
      (i) =>
        i.getKey() === 'parser_error' ||
        i.getKey() === 'statement_parser_error',
    );
    if (parserErrors.length > 0) {
      const detail = parserErrors
        .slice(0, 5)
        .map((i) => `${i.getStart().getRow()}: ${i.getMessage()}`)
        .join('\n');
      throw new Error(`abaplint parser errors:\n${detail}\n---\n${src}`);
    }
  });
});
