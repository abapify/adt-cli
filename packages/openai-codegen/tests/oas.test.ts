import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  loadSpec,
  normalizeSpec,
  operationKey,
  walkSchemas,
} from '../src/oas/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PETSTORE_PATH = resolve(
  __dirname,
  '../../../samples/petstore3-client/spec/openapi.json',
);

describe('loadSpec (Petstore v3)', () => {
  it('loads and normalizes the vendored Petstore spec', async () => {
    const spec = await loadSpec(PETSTORE_PATH);

    expect(spec.openapiVersion).toMatch(/^3\.0\./);
    expect(spec.info.title).toContain('Petstore');

    const opIds = spec.operations.map((o) => o.operationId);
    for (const expected of [
      'findPetsByStatus',
      'getPetById',
      'addPet',
      'updatePet',
      'deletePet',
    ]) {
      expect(opIds).toContain(expected);
    }
  });

  it('findPetsByStatus has a single query parameter `status`', async () => {
    const spec = await loadSpec(PETSTORE_PATH);
    const op = spec.operations.find(
      (o) => o.operationId === 'findPetsByStatus',
    );
    expect(op).toBeDefined();
    expect(op!.parameters).toHaveLength(1);
    const p = op!.parameters[0];
    expect(p.name).toBe('status');
    expect(p.in).toBe('query');
    expect(p.schema.type).toBe('string');
  });

  it('addPet has a required requestBody with a dereferenced JSON schema', async () => {
    const spec = await loadSpec(PETSTORE_PATH);
    const op = spec.operations.find((o) => o.operationId === 'addPet');
    expect(op).toBeDefined();
    expect(op!.requestBody).toBeDefined();
    expect(op!.requestBody!.required).toBe(true);
    const json = op!.requestBody!.content['application/json'];
    expect(json).toBeDefined();
    // After dereferencing the $ref should be gone and the Pet schema inlined.
    expect(json.schema.$ref).toBeUndefined();
    const isObject =
      json.schema.type === 'object' ||
      (typeof json.schema.properties === 'object' &&
        json.schema.properties !== null);
    expect(isObject).toBe(true);
  });

  it('every operation has at least one success response', async () => {
    const spec = await loadSpec(PETSTORE_PATH);
    for (const op of spec.operations) {
      const successes = op.responses.filter((r) => r.isSuccess);
      expect(
        successes.length,
        `${operationKey(op)} has no success response`,
      ).toBeGreaterThan(0);
    }
  });

  it('captures named component schemas', async () => {
    const spec = await loadSpec(PETSTORE_PATH);
    for (const name of ['Pet', 'Category', 'Tag', 'Order', 'User']) {
      expect(spec.schemas).toHaveProperty(name);
    }
  });

  it('walkSchemas visits component schemas and operation schemas', async () => {
    const spec = await loadSpec(PETSTORE_PATH);
    const paths: string[][] = [];
    walkSchemas(spec, ({ path }) => paths.push(path));
    expect(paths.some((p) => p[0] === 'components' && p[2] === 'Pet')).toBe(
      true,
    );
    expect(paths.some((p) => p[0] === 'operations')).toBe(true);
  });
});

describe('normalizeSpec (in-memory)', () => {
  it('merges path-level parameters into operations', () => {
    const spec = normalizeSpec({
      openapi: '3.0.3',
      info: { title: 'T', version: '1' },
      paths: {
        '/pet/{petId}': {
          parameters: [
            {
              name: 'petId',
              in: 'path',
              required: true,
              schema: { type: 'integer' },
            },
          ],
          get: {
            operationId: 'getPet',
            responses: { '200': { description: 'ok' } },
          },
          delete: {
            operationId: 'deletePet',
            responses: { '204': { description: 'gone' } },
          },
        },
      },
    });

    expect(spec.operations).toHaveLength(2);
    for (const op of spec.operations) {
      const petId = op.parameters.find((p) => p.name === 'petId');
      expect(petId, `${op.operationId} missing petId`).toBeDefined();
      expect(petId!.in).toBe('path');
      expect(petId!.required).toBe(true);
    }
  });

  it('operation-level parameters override path-level on (name,in) conflicts', () => {
    const spec = normalizeSpec({
      openapi: '3.0.3',
      info: { title: 'T', version: '1' },
      paths: {
        '/x/{id}': {
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer' },
              description: 'path-level',
            },
          ],
          get: {
            operationId: 'getX',
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'string' },
                description: 'op-level',
              },
            ],
            responses: { '200': { description: 'ok' } },
          },
        },
      },
    });

    const op = spec.operations[0];
    expect(op.parameters).toHaveLength(1);
    expect(op.parameters[0].description).toBe('op-level');
    expect(op.parameters[0].schema.type).toBe('string');
  });

  it('synthesizes a deterministic operationId when missing', () => {
    const spec = normalizeSpec({
      openapi: '3.0.3',
      info: { title: 'T', version: '1' },
      paths: {
        '/pet/{petId}/uploadImage': {
          post: {
            responses: { '200': { description: 'ok' } },
          },
        },
      },
    });

    expect(spec.operations[0].operationId).toBe('post_pet_petId_uploadImage');
  });

  it('classifies default response as success when no 2xx exists', () => {
    const spec = normalizeSpec({
      openapi: '3.0.3',
      info: { title: 'T', version: '1' },
      paths: {
        '/a': {
          get: {
            operationId: 'a',
            responses: { default: { description: 'fallback' } },
          },
        },
      },
    });
    const resp = spec.operations[0].responses[0];
    expect(resp.isSuccess).toBe(true);
    expect(resp.isError).toBe(false);
  });

  it('classifies default response as error when 2xx also present', () => {
    const spec = normalizeSpec({
      openapi: '3.0.3',
      info: { title: 'T', version: '1' },
      paths: {
        '/a': {
          get: {
            operationId: 'a',
            responses: {
              '200': { description: 'ok' },
              default: { description: 'err' },
            },
          },
        },
      },
    });
    const byCode = Object.fromEntries(
      spec.operations[0].responses.map((r) => [r.statusCode, r]),
    );
    expect(byCode['200'].isSuccess).toBe(true);
    expect(byCode.default.isSuccess).toBe(false);
    expect(byCode.default.isError).toBe(true);
  });
});
