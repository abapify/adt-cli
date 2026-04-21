import { describe, it, expect } from 'vitest';
import {
  print,
  builtinType,
  namedTypeRef,
  structureType,
  typeDef,
  methodParam,
  methodDef,
  interfaceDef,
} from '../src';

describe('printer — ABAPDoc on TypeDef', () => {
  it('emits tag-style ABAPDoc above a structure TYPES declaration', () => {
    const node = typeDef({
      name: 'ty_pet',
      type: structureType({
        fields: [
          { name: 'id', type: builtinType({ name: 'int8' }) },
          { name: 'name', type: builtinType({ name: 'string' }) },
        ],
      }),
      abapDoc: [
        '@openapi-schema Pet',
        'Pet entity used across the petstore API.',
      ],
    });
    expect(print(node)).toMatchInlineSnapshot(`
      ""! @openapi-schema Pet
      "! Pet entity used across the petstore API.
      TYPES: BEGIN OF ty_pet,
        id   TYPE int8,
        name TYPE string,
      END OF ty_pet."
    `);
  });

  it('does not emit anything when abapDoc is absent', () => {
    const node = typeDef({
      name: 'ty_num',
      type: builtinType({ name: 'i' }),
    });
    expect(print(node)).toMatchInlineSnapshot(`"TYPES ty_num TYPE i."`);
  });

  it('does not emit anything when abapDoc is an empty array', () => {
    const node = typeDef({
      name: 'ty_num',
      type: builtinType({ name: 'i' }),
      abapDoc: [],
    });
    expect(print(node)).toMatchInlineSnapshot(`"TYPES ty_num TYPE i."`);
  });
});

describe('printer — ABAPDoc on MethodDef inside InterfaceDef', () => {
  it('emits tag-style ABAPDoc above the METHODS declaration at method indent', () => {
    const node = interfaceDef({
      name: 'zif_petstore',
      members: [
        methodDef({
          name: 'get_pet_by_id',
          visibility: 'public',
          abapDoc: ['@openapi-operation getPetById'],
          params: [
            methodParam({
              paramKind: 'importing',
              name: 'pet_id',
              typeRef: builtinType({ name: 'int8' }),
            }),
            methodParam({
              paramKind: 'returning',
              name: 'pet',
              typeRef: namedTypeRef({ name: 'zif_petstore_types=>pet' }),
            }),
          ],
          raising: [namedTypeRef({ name: 'zcx_petstore_error' })],
        }),
      ],
    });
    expect(print(node)).toMatchInlineSnapshot(`
      "INTERFACE zif_petstore PUBLIC.
        "! @openapi-operation getPetById
        METHODS get_pet_by_id
          IMPORTING pet_id TYPE int8
          RETURNING VALUE(pet) TYPE zif_petstore_types=>pet
          RAISING zcx_petstore_error.
      ENDINTERFACE."
    `);
  });
});

describe('printer — ABAPDoc on InterfaceDef itself and children', () => {
  it('emits ABAPDoc above INTERFACE and above each documented member', () => {
    const node = interfaceDef({
      name: 'zif_petstore',
      abapDoc: [
        '@openapi-tag Petstore',
        'Public API surface exposed to partners.',
      ],
      members: [
        typeDef({
          name: 'ty_pet_id',
          type: builtinType({ name: 'int8' }),
          abapDoc: ['@openapi-schema PetId'],
        }),
        methodDef({
          name: 'ping',
          visibility: 'public',
          abapDoc: ['@openapi-operation ping'],
        }),
      ],
    });
    expect(print(node)).toMatchInlineSnapshot(`
      ""! @openapi-tag Petstore
      "! Public API surface exposed to partners.
      INTERFACE zif_petstore PUBLIC.
        "! @openapi-schema PetId
        TYPES ty_pet_id TYPE int8.
        "! @openapi-operation ping
        METHODS ping.
      ENDINTERFACE."
    `);
  });
});

describe('printer — ABAPDoc edge cases', () => {
  it('passes through tabs and special characters verbatim', () => {
    const node = typeDef({
      name: 'ty_num',
      type: builtinType({ name: 'i' }),
      abapDoc: ['\ttabbed content', 'special chars: <>&"\''],
    });
    expect(print(node)).toMatchInlineSnapshot(`
      ""! 	tabbed content
      "! special chars: <>&"'
      TYPES ty_num TYPE i."
    `);
  });

  it('emits a bare "! for an empty ABAPDoc line', () => {
    const node = typeDef({
      name: 'ty_num',
      type: builtinType({ name: 'i' }),
      abapDoc: ['first', '', 'third'],
    });
    expect(print(node)).toMatchInlineSnapshot(`
      ""! first
      "!
      "! third
      TYPES ty_num TYPE i."
    `);
  });
});
