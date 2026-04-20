import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { print } from '@abapify/abap-ast';
import { Registry, MemoryFile } from '@abaplint/core';
import { loadSpec, normalizeSpec } from '../src/oas/index';
import { planTypes } from '../src/types/index';
import {
  emitOperationsInterface,
  type EmitOperationsInterfaceResult,
  type OperationMapping,
} from '../src/emit/operations-interface';
import type { MethodDef, MethodParam, TypeRef } from '@abapify/abap-ast';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PETSTORE_PATH = resolve(
  __dirname,
  '../../../samples/petstore3-client/spec/openapi.json',
);

function parseWithAbaplint(name: string, source: string): string[] {
  const reg = new Registry();
  reg.addFile(new MemoryFile(`${name.toLowerCase()}.intf.abap`, source));
  reg.parse();
  return reg
    .findIssues()
    .filter((i) => i.getKey() === 'parser_error')
    .map((i) => `${i.getKey()}: ${i.getMessage()}`);
}

function methodByName(
  result: EmitOperationsInterfaceResult,
  name: string,
): MethodDef {
  const m = result.interface.members.find(
    (x): x is MethodDef => x.kind === 'MethodDef' && x.name === name,
  );
  if (!m) {
    throw new Error(`method "${name}" not found in emitted interface`);
  }
  return m;
}

function paramByName(method: MethodDef, name: string): MethodParam | undefined {
  return method.params.find((p) => p.name === name);
}

function typeName(ref: TypeRef): string {
  switch (ref.kind) {
    case 'BuiltinType':
    case 'NamedTypeRef':
      return ref.name;
    default:
      return ref.kind;
  }
}

describe('emitOperationsInterface (Petstore v3)', () => {
  it('emits one method per Petstore operation', async () => {
    const spec = await loadSpec(PETSTORE_PATH);
    const plan = planTypes(spec, { typePrefix: '' });
    const result = emitOperationsInterface(spec, plan, {
      name: 'ZIF_PETSTORE',
      typesInterfaceName: 'ZIF_PETSTORE_TYPES',
      exceptionClassName: 'ZCX_PETSTORE_ERROR',
    });

    const methods = result.interface.members.filter(
      (m) => m.kind === 'MethodDef',
    );
    expect(methods).toHaveLength(spec.operations.length);
    expect(methods).toHaveLength(19);
    expect(result.operations).toHaveLength(19);
  });

  it('maps getPetById signature exactly', async () => {
    const spec = await loadSpec(PETSTORE_PATH);
    const plan = planTypes(spec, { typePrefix: '' });
    const result = emitOperationsInterface(spec, plan, {
      name: 'ZIF_PETSTORE',
      typesInterfaceName: 'ZIF_PETSTORE_TYPES',
      exceptionClassName: 'ZCX_PETSTORE_ERROR',
    });

    const m = methodByName(result, 'get_pet_by_id');
    const petId = paramByName(m, 'pet_id');
    expect(petId).toBeDefined();
    expect(petId!.paramKind).toBe('importing');
    expect(typeName(petId!.typeRef)).toBe('int8');

    const ret = m.params.find((p) => p.paramKind === 'returning');
    expect(ret).toBeDefined();
    expect(ret!.name).toBe('pet');
    expect(typeName(ret!.typeRef)).toBe('zif_petstore_types=>pet');

    expect(m.raising).toHaveLength(1);
    expect(typeName(m.raising[0])).toBe('zcx_petstore_error');
  });

  it('maps addPet request body to `body` and RETURNING `pet`', async () => {
    const spec = await loadSpec(PETSTORE_PATH);
    const plan = planTypes(spec, { typePrefix: '' });
    const result = emitOperationsInterface(spec, plan, {
      name: 'ZIF_PETSTORE',
      typesInterfaceName: 'ZIF_PETSTORE_TYPES',
      exceptionClassName: 'ZCX_PETSTORE_ERROR',
    });
    const m = methodByName(result, 'add_pet');
    const body = paramByName(m, 'body');
    expect(body).toBeDefined();
    expect(body!.paramKind).toBe('importing');
    expect(typeName(body!.typeRef)).toBe('zif_petstore_types=>pet');

    const ret = m.params.find((p) => p.paramKind === 'returning');
    expect(ret!.name).toBe('pet');
    expect(typeName(ret!.typeRef)).toBe('zif_petstore_types=>pet');
  });

  it('maps findPetsByStatus to a named table alias in the ops interface', async () => {
    const spec = await loadSpec(PETSTORE_PATH);
    const plan = planTypes(spec, { typePrefix: '' });
    const result = emitOperationsInterface(spec, plan, {
      name: 'ZIF_PETSTORE',
      typesInterfaceName: 'ZIF_PETSTORE_TYPES',
      exceptionClassName: 'ZCX_PETSTORE_ERROR',
    });
    const m = methodByName(result, 'find_pets_by_status');
    const ret = m.params.find((p) => p.paramKind === 'returning');
    expect(ret!.name).toBe('pets');
    // Array return types MUST be named aliases declared inside the ops
    // interface — Steampunk rejects inline `STANDARD TABLE OF ...` in a
    // METHODS parameter slot with "An error occured during the save
    // operation". The alias lives at the head of the interface as a
    // TypeDef: `TYPES pet_list TYPE STANDARD TABLE OF zif_petstore_types=>pet`.
    expect(typeName(ret!.typeRef)).toBe('zif_petstore=>pet_list');
  });

  it('maps deletePet to RETURNING success TYPE abap_bool', async () => {
    const spec = await loadSpec(PETSTORE_PATH);
    const plan = planTypes(spec, { typePrefix: '' });
    const result = emitOperationsInterface(spec, plan, {
      name: 'ZIF_PETSTORE',
      typesInterfaceName: 'ZIF_PETSTORE_TYPES',
      exceptionClassName: 'ZCX_PETSTORE_ERROR',
    });
    const m = methodByName(result, 'delete_pet');
    const ret = m.params.find((p) => p.paramKind === 'returning');
    expect(ret!.name).toBe('success');
    expect(typeName(ret!.typeRef)).toBe('abap_bool');
  });

  it('emits ABAPDoc with @openapi-operation and @openapi-path on each method', async () => {
    const spec = await loadSpec(PETSTORE_PATH);
    const plan = planTypes(spec, { typePrefix: '' });
    const result = emitOperationsInterface(spec, plan, {
      name: 'ZIF_PETSTORE',
      typesInterfaceName: 'ZIF_PETSTORE_TYPES',
      exceptionClassName: 'ZCX_PETSTORE_ERROR',
    });
    for (const m of result.interface.members) {
      if (m.kind !== 'MethodDef') continue;
      const doc = m.abapDoc ?? [];
      const mapping = result.operations.find((o) => o.methodName === m.name);
      expect(mapping).toBeDefined();
      expect(doc.some((l) => l.startsWith('@openapi-operation '))).toBe(true);
      expect(doc.some((l) => l.startsWith('@openapi-path '))).toBe(true);
      const opLine = doc.find((l) => l.startsWith('@openapi-operation '))!;
      expect(opLine).toBe(`@openapi-operation ${mapping!.operationId}`);
      const pathLine = doc.find((l) => l.startsWith('@openapi-path '))!;
      expect(pathLine).toBe(
        `@openapi-path ${mapping!.method} ${mapping!.path}`,
      );
    }
  });

  it('populates the operations result array with accurate metadata', async () => {
    const spec = await loadSpec(PETSTORE_PATH);
    const plan = planTypes(spec, { typePrefix: '' });
    const result = emitOperationsInterface(spec, plan, {
      name: 'ZIF_PETSTORE',
      typesInterfaceName: 'ZIF_PETSTORE_TYPES',
      exceptionClassName: 'ZCX_PETSTORE_ERROR',
    });

    const byId = new Map<string, OperationMapping>();
    for (const o of result.operations) byId.set(o.operationId, o);

    const getPet = byId.get('getPetById')!;
    expect(getPet.methodName).toBe('get_pet_by_id');
    expect(getPet.method).toBe('GET');
    expect(getPet.path).toBe('/pet/{petId}');
    expect(getPet.hasBody).toBe(false);
    expect(getPet.successStatus).toBe(200);
    expect(getPet.successIsEmptyBody).toBe(false);
    expect(getPet.returningName).toBe('pet');
    expect(getPet.params.map((p) => p.name)).toEqual(['pet_id']);
    expect(getPet.params[0].location).toBe('path');

    const addPet = byId.get('addPet')!;
    expect(addPet.hasBody).toBe(true);
    expect(addPet.returningName).toBe('pet');
    expect(addPet.successIsEmptyBody).toBe(false);

    const deletePet = byId.get('deletePet')!;
    expect(deletePet.hasBody).toBe(false);
    expect(deletePet.successIsEmptyBody).toBe(true);
    expect(deletePet.returningName).toBe('success');
    // path + header (cookie none).
    const locs = deletePet.params.map((p) => p.location);
    expect(locs[0]).toBe('path');
    expect(locs).toContain('header');

    const find = byId.get('findPetsByStatus')!;
    expect(find.params).toHaveLength(1);
    expect(find.params[0].location).toBe('query');
    expect(find.params[0].required).toBe(true);
    expect(find.returningName).toBe('pets');

    // Error responses captured.
    expect(Object.keys(getPet.errorResponses)).toEqual(
      expect.arrayContaining(['400', '404']),
    );
  });

  it('printed interface parses cleanly through @abaplint/core', async () => {
    const spec = await loadSpec(PETSTORE_PATH);
    const plan = planTypes(spec, { typePrefix: '' });
    const result = emitOperationsInterface(spec, plan, {
      name: 'ZIF_PETSTORE',
      typesInterfaceName: 'ZIF_PETSTORE_TYPES',
      exceptionClassName: 'ZCX_PETSTORE_ERROR',
    });
    const source = print(result.interface);
    const errors = parseWithAbaplint('ZIF_PETSTORE', source);
    expect(errors).toEqual([]);
  });
});

describe('emitOperationsInterface (synthetic spec)', () => {
  const syntheticDoc = {
    openapi: '3.0.3',
    info: { title: 'Mini', version: '1' },
    paths: {
      '/items/{id}': {
        get: {
          operationId: 'getItem',
          summary: 'Fetch a single item.',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer', format: 'int64' },
            },
            {
              name: 'verbose',
              in: 'query',
              required: false,
              schema: { type: 'boolean' },
            },
            {
              name: 'X-Trace',
              in: 'header',
              required: false,
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: 'ok',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Item' },
                },
              },
            },
            '404': { description: 'missing' },
          },
        },
      },
      '/items': {
        post: {
          operationId: 'createItem',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Item' },
              },
            },
          },
          responses: {
            '200': {
              description: 'created',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Item' },
                },
              },
            },
            default: { description: 'oops' },
          },
        },
        delete: {
          operationId: 'clearItems',
          responses: {
            '204': { description: 'cleared' },
          },
        },
      },
    },
    components: {
      schemas: {
        Item: {
          type: 'object',
          properties: {
            id: { type: 'integer', format: 'int64' },
            label: { type: 'string' },
          },
        },
      },
    },
  } as const;

  it('renders the expected ABAP interface source', () => {
    const spec = normalizeSpec(JSON.parse(JSON.stringify(syntheticDoc)), {
      Item: syntheticDoc.components.schemas.Item as Record<string, unknown>,
    });
    const plan = planTypes(spec, { typePrefix: '' });
    const result = emitOperationsInterface(spec, plan, {
      name: 'ZIF_MINI',
      typesInterfaceName: 'ZIF_MINI_TYPES',
      exceptionClassName: 'ZCX_MINI_ERROR',
      interfaceAbapDoc: ['Generated client operations — Mini.'],
    });

    const source = print(result.interface);
    expect(source).toMatchInlineSnapshot(`
      ""! Generated client operations — Mini.
      INTERFACE zif_mini PUBLIC.
        "! @openapi-operation getItem
        "! @openapi-path GET /items/{id}
        "! Fetch a single item.
        METHODS get_item
          IMPORTING
            id TYPE int8
            verbose TYPE abap_bool OPTIONAL
            x_trace TYPE string OPTIONAL
          RETURNING VALUE(item) TYPE zif_mini_types=>item
          RAISING zcx_mini_error.
        "! @openapi-operation createItem
        "! @openapi-path POST /items
        METHODS create_item
          IMPORTING body TYPE zif_mini_types=>item
          RETURNING VALUE(item) TYPE zif_mini_types=>item
          RAISING zcx_mini_error.
        "! @openapi-operation clearItems
        "! @openapi-path DELETE /items
        METHODS clear_items
          RETURNING VALUE(success) TYPE abap_bool
          RAISING zcx_mini_error.
      ENDINTERFACE."
    `);

    expect(parseWithAbaplint('ZIF_MINI', source)).toEqual([]);
  });
});
