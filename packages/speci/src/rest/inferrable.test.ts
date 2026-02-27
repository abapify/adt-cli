/**
 * Inferrable Type System Test
 *
 * Tests that Inferrable<T> works correctly for both response and request body type inference
 */

import { describe, it, expect } from 'vitest';
import { http, createClient } from './index';
import {
  createInferrable,
  type Inferrable,
  type Serializable,
  type InferSchema,
} from './types';
import type { HttpAdapter } from './client/types';

// Test InferSchema with complex conditional types (like InferXsd)
describe('InferSchema with complex types', () => {
  // Simulate InferXsd - a complex conditional type
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  type SimulatedInferXsd<T> = T extends { root: string; elements: infer E }
    ? E extends Record<string, unknown>
      ? { data: string }
      : never
    : {};

  // Simulate SpeciSchema - like adt-schemas does
  type SimulatedSpeciSchema<T> = T & Serializable<SimulatedInferXsd<T>>;

  it('should infer type from Serializable with complex generic', () => {
    // This simulates what adt-schemas does
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    type Schema = SimulatedSpeciSchema<{ root: 'test'; elements: { foo: {} } }>;

    // InferSchema should extract the type from _infer
    type Inferred = InferSchema<Schema>;

    // Should be { data: string }, not {}
    const test: Inferred = { data: 'hello' };
    expect(test.data).toBe('hello');
  });

  it('should work with Inferrable directly', () => {
    type MyType = { id: number; name: string };
    type Schema = Inferrable<MyType>;

    type Inferred = InferSchema<Schema>;

    const test: Inferred = { id: 1, name: 'test' };
    expect(test.id).toBe(1);
  });

  it('should work with Serializable (which extends Inferrable)', () => {
    type MyType = { id: number; name: string };
    type Schema = Serializable<MyType>;

    type Inferred = InferSchema<Schema>;

    const test: Inferred = { id: 1, name: 'test' };
    expect(test.id).toBe(1);
  });
});

describe('Inferrable Type System', () => {
  // Mock schema with Inferrable support
  interface User {
    id: number;
    name: string;
    email: string;
  }

  const UserSchema = createInferrable<User>();

  // Mock adapter for tests - returns User type by default
  const mockAdapter = {
    request: async <TResponse = User>(): Promise<TResponse> => {
      return { id: 1, name: 'Test', email: 'test@example.com' } as TResponse;
    },
  } as HttpAdapter<User>;

  describe('Response Type Inference', () => {
    it('should infer response type from schema', () => {
      const contract = {
        getUser: (id: number) =>
          http.get(`/users/${id}`, {
            responses: { 200: UserSchema },
          }),
      };

      const client = createClient(contract, {
        baseUrl: 'http://test.com',
        adapter: mockAdapter,
      });

      // Type test: response should be typed as User
      type ResponseType = Awaited<ReturnType<typeof client.getUser>>;

      // This should compile - ResponseType should be User, not unknown
      const typeTest: ResponseType = {
        id: 1,
        name: 'Test',
        email: 'test@example.com',
      };

      expect(typeTest.id).toBe(1);
    });
  });

  describe('Request Body Type Inference', () => {
    it('should infer request body type from schema', () => {
      const contract = {
        createUser: (userData: User) =>
          http.post('/users', {
            body: UserSchema,
            responses: { 201: UserSchema },
          }),
      };

      const client = createClient(contract, {
        baseUrl: 'http://test.com',
        adapter: mockAdapter,
      });

      // Type test: parameter should be typed as User
      type ParamType = Parameters<typeof client.createUser>[0];

      // This should compile - ParamType should be User, not never
      const typeTest: ParamType = {
        id: 1,
        name: 'Test',
        email: 'test@example.com',
      };

      expect(typeTest.id).toBe(1);
    });

    it('should infer nested schema types', () => {
      interface Address {
        street: string;
        city: string;
      }

      interface UserWithAddress {
        id: number;
        name: string;
        address: Address;
      }

      const UserWithAddressSchema = createInferrable<UserWithAddress>();

      const contract = {
        createUser: (userData: UserWithAddress) =>
          http.post('/users', {
            body: UserWithAddressSchema,
            responses: { 201: UserWithAddressSchema },
          }),
      };

      const client = createClient(contract, {
        baseUrl: 'http://test.com',
        adapter: mockAdapter,
      });

      // Type test: nested types should work
      type ParamType = Parameters<typeof client.createUser>[0];

      const typeTest: ParamType = {
        id: 1,
        name: 'Test',
        address: {
          street: '123 Main St',
          city: 'Test City',
        },
      };

      expect(typeTest.address.city).toBe('Test City');
    });
  });

  describe('Type Inference Without Manual Typing', () => {
    it('should infer parameter type from body schema automatically', () => {
      // No manual parameter typing - inferred from body schema!
      const contract = {
        createUser: () =>
          http.post('/users', {
            body: UserSchema, // Parameter type inferred from this
            responses: { 201: UserSchema },
          }),
      };

      const client = createClient(contract, {
        baseUrl: 'http://test.com',
        adapter: mockAdapter,
      });

      // Type test: parameter type should be inferred as User
      type ParamType = Parameters<typeof client.createUser>[0];

      // This should compile - ParamType is User (inferred from UserSchema)
      const typeTest: ParamType = {
        id: 1,
        name: 'Test',
        email: 'test@example.com',
      };

      expect(typeTest.id).toBe(1);
    });

    it('current workaround - manual parameter typing works correctly', () => {
      // Current best practice: manually type the parameter
      const contract = {
        createUser: (userData: User) =>
          http.post('/users', {
            body: UserSchema,
            responses: { 201: UserSchema },
          }),
      };

      const client = createClient(contract, {
        baseUrl: 'http://test.com',
        adapter: mockAdapter,
      });

      // Type test: parameter is correctly typed
      type ParamType = Parameters<typeof client.createUser>[0];

      const typeTest: ParamType = {
        id: 1,
        name: 'Test',
        email: 'test@example.com',
      };

      expect(typeTest.id).toBe(1);
    });
  });
});
