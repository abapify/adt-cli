import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { loadSpec, normalizeSpec } from '../src/oas/index';
import {
  emitTypeSection,
  makeNameAllocator,
  mapPrimitive,
  planTypes,
  sanitizeIdent,
} from '../src/types/index';
import { getProfile } from '../src/profiles/index';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PETSTORE_PATH = resolve(
  __dirname,
  '../../../samples/petstore3-client/spec/openapi.json',
);

describe('sanitizeIdent', () => {
  it('lowercases snake_case for type kind', () => {
    expect(sanitizeIdent('Pet', 'type')).toBe('pet');
    expect(sanitizeIdent('ApiResponse', 'type')).toBe('api_response');
  });

  it('converts CamelCase → snake_case', () => {
    expect(sanitizeIdent('FindPetsByStatus', 'method')).toBe(
      'find_pets_by_status',
    );
  });

  it('uppercase snake_case for class kind', () => {
    expect(sanitizeIdent('PetClient', 'class')).toBe('PET_CLIENT');
  });

  it('truncates long names with a deterministic hash', () => {
    const name = sanitizeIdent(
      'ThisIsAnExtremelyLongIdentifierThatExceedsTheSapLimitBy20Chars',
      'type',
    );
    expect(name.length).toBeLessThanOrEqual(30);
    // Deterministic — same input yields same output.
    const again = sanitizeIdent(
      'ThisIsAnExtremelyLongIdentifierThatExceedsTheSapLimitBy20Chars',
      'type',
    );
    expect(name).toBe(again);
    // Trailing 5 chars: `_` + 4 hex digits.
    expect(name.slice(-5)).toMatch(/^_[0-9a-f]{4}$/);
  });

  it('NameAllocator appends _2, _3 deterministically on collisions', () => {
    const used = new Set<string>();
    const alloc = makeNameAllocator(used);
    expect(alloc('Pet', 'type')).toBe('pet');
    expect(alloc('Pet', 'type')).toBe('pet_2');
    expect(alloc('Pet', 'type')).toBe('pet_3');
  });
});

describe('mapPrimitive', () => {
  const cases: Array<[Record<string, unknown>, string]> = [
    [{ type: 'boolean' }, 'abap_bool'],
    [{ type: 'integer' }, 'i'],
    [{ type: 'integer', format: 'int64' }, 'int8'],
    [{ type: 'number' }, 'decfloat34'],
    [{ type: 'number', format: 'float' }, 'f'],
    [{ type: 'number', format: 'double' }, 'f'],
    [{ type: 'string' }, 'string'],
    [{ type: 'string', format: 'date' }, 'd'],
    [{ type: 'string', format: 'date-time' }, 'timestampl'],
    [{ type: 'string', format: 'uuid' }, 'sysuuid_x16'],
    [{ type: 'string', format: 'byte' }, 'xstring'],
    [{ type: 'string', format: 'binary' }, 'xstring'],
  ];
  for (const [schema, expected] of cases) {
    it(`maps ${JSON.stringify(schema)} → ${expected}`, () => {
      expect(mapPrimitive(schema)).toBe(expected);
    });
  }
});

describe('planTypes (Petstore v3)', () => {
  it('produces one entry per named component schema and orders Pet after Category/Tag', async () => {
    const spec = await loadSpec(PETSTORE_PATH);
    const plan = planTypes(spec, { typePrefix: 'ps3_' });

    const expectedNamed = [
      'Pet',
      'Category',
      'Tag',
      'Order',
      'User',
      'ApiResponse',
    ];
    for (const name of expectedNamed) {
      const entry = plan.byId.get(`components.schemas.${name}`);
      expect(entry, `missing plan entry for ${name}`).toBeDefined();
    }

    const order = plan.entries.map((e) => e.id);
    const idxOf = (name: string) => order.indexOf(`components.schemas.${name}`);
    expect(idxOf('Category')).toBeLessThan(idxOf('Pet'));
    expect(idxOf('Tag')).toBeLessThan(idxOf('Pet'));

    // Pet's dependencies include Category and Tag.
    const pet = plan.byId.get('components.schemas.Pet');
    expect(pet!.dependencies).toContain('components.schemas.Category');
    expect(pet!.dependencies).toContain('components.schemas.Tag');

    // ABAP names use the prefix.
    expect(pet!.abapName).toBe('ty_ps3_pet');
    expect(plan.byId.get('components.schemas.Category')!.abapName).toBe(
      'ty_ps3_category',
    );
  });

  it('emitTypeSection returns TypeDef AST nodes', async () => {
    const spec = await loadSpec(PETSTORE_PATH);
    const plan = planTypes(spec, { typePrefix: 'ps3_' });
    const defs = emitTypeSection(plan, getProfile('s4-cloud'));
    expect(defs.length).toBeGreaterThan(0);
    for (const d of defs) {
      expect(d.kind).toBe('TypeDef');
    }
  });
});

describe('combinators', () => {
  it('allOf flattens properties from sub-objects', () => {
    const spec = normalizeSpec(
      {
        openapi: '3.0.3',
        info: { title: 'T', version: '1' },
        paths: {},
        components: {
          schemas: {
            Combined: {
              allOf: [
                {
                  type: 'object',
                  properties: { a: { type: 'string' } },
                },
                {
                  type: 'object',
                  properties: { b: { type: 'integer' } },
                },
              ],
            },
          },
        },
      },
      {
        Combined: {
          allOf: [
            { type: 'object', properties: { a: { type: 'string' } } },
            { type: 'object', properties: { b: { type: 'integer' } } },
          ],
        } as Record<string, unknown>,
      },
    );
    const plan = planTypes(spec, { typePrefix: '' });
    const defs = emitTypeSection(plan, getProfile('s4-cloud'));
    const combined = defs.find((d) => d.name === 'ty_combined');
    expect(combined).toBeDefined();
    expect(combined!.type.kind).toBe('StructureType');
    const fields = (
      combined!.type as { fields: readonly { name: string }[] }
    ).fields.map((f) => f.name);
    expect(fields).toEqual(expect.arrayContaining(['a', 'b']));
  });

  it('oneOf with discriminator emits kind + variant fields', () => {
    const schema = {
      oneOf: [
        {
          type: 'object',
          title: 'Dog',
          properties: { bark: { type: 'string' } },
        },
        {
          type: 'object',
          title: 'Cat',
          properties: { meow: { type: 'string' } },
        },
      ],
      discriminator: { propertyName: 'kind' },
    } as Record<string, unknown>;
    const spec = normalizeSpec(
      {
        openapi: '3.0.3',
        info: { title: 'T', version: '1' },
        paths: {},
        components: { schemas: { Animal: schema } },
      },
      { Animal: schema },
    );
    const plan = planTypes(spec, { typePrefix: '' });
    const defs = emitTypeSection(plan, getProfile('s4-cloud'));
    const animal = defs.find((d) => d.name === 'ty_animal');
    expect(animal).toBeDefined();
    const fields = (
      animal!.type as { fields: readonly { name: string }[] }
    ).fields.map((f) => f.name);
    expect(fields).toContain('kind');
    expect(fields).toEqual(expect.arrayContaining(['dog', 'cat']));
  });

  it('oneOf without discriminator emits variant_kind and _is_set fields', () => {
    const schema = {
      oneOf: [
        { type: 'string', title: 'TextPayload' },
        { type: 'integer', title: 'IntPayload' },
      ],
    } as Record<string, unknown>;
    const spec = normalizeSpec(
      {
        openapi: '3.0.3',
        info: { title: 'T', version: '1' },
        paths: {},
        components: { schemas: { Value: schema } },
      },
      { Value: schema },
    );
    const plan = planTypes(spec, { typePrefix: '' });
    const defs = emitTypeSection(plan, getProfile('s4-cloud'));
    const value = defs.find((d) => d.name === 'ty_value');
    expect(value).toBeDefined();
    const fields = (
      value!.type as { fields: readonly { name: string }[] }
    ).fields.map((f) => f.name);
    expect(fields).toContain('variant_kind');
    expect(fields).toEqual(
      expect.arrayContaining([
        'text_payload',
        'text_payload_is_set',
        'int_payload',
        'int_payload_is_set',
      ]),
    );
  });

  it('nullable property adds an _is_null companion field', () => {
    const schema = {
      type: 'object',
      properties: {
        note: { type: 'string', nullable: true },
      },
    } as Record<string, unknown>;
    const spec = normalizeSpec(
      {
        openapi: '3.0.3',
        info: { title: 'T', version: '1' },
        paths: {},
        components: { schemas: { Thing: schema } },
      },
      { Thing: schema },
    );
    const plan = planTypes(spec, { typePrefix: '' });
    const defs = emitTypeSection(plan, getProfile('s4-cloud'));
    const thing = defs.find((d) => d.name === 'ty_thing');
    expect(thing).toBeDefined();
    const fields = (
      thing!.type as { fields: readonly { name: string }[] }
    ).fields.map((f) => f.name);
    expect(fields).toEqual(expect.arrayContaining(['note', 'note_is_null']));
  });

  it('self-referential schema is planned and flagged instead of throwing', () => {
    const nodeSchema = {
      type: 'object',
      properties: {
        value: { type: 'string' },
        next: { $ref: '#/components/schemas/Node' },
      },
    } as Record<string, unknown>;
    const spec = normalizeSpec(
      {
        openapi: '3.0.3',
        info: { title: 'T', version: '1' },
        paths: {},
        components: { schemas: { Node: nodeSchema } },
      },
      { Node: nodeSchema },
    );
    expect(() => planTypes(spec, { typePrefix: '' })).not.toThrow();
    const plan = planTypes(spec, { typePrefix: '' });
    const node = plan.byId.get('components.schemas.Node');
    expect(node).toBeDefined();
    expect(node!.selfReferential).toBe(true);
  });
});
