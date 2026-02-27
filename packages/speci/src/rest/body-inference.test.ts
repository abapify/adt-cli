/**
 * Body Parameter Inference Test
 *
 * Tests that body parameters can be inferred from Inferrable schemas
 * AND that manual parameter typing still works correctly
 */

import { describe, it, expect, expectTypeOf } from 'vitest';
import { http, createClient } from './index';
import { createInferrable } from './types';
import type { HttpAdapter } from './client/types';

describe('Body Parameter Inference', () => {
  interface User {
    id: number;
    name: string;
    email: string;
  }

  const UserSchema = createInferrable<User>();

  const mockAdapter: HttpAdapter<User> = {
    request: async <TResponse = User>(): Promise<TResponse> =>
      ({ id: 1, name: 'Test', email: 'test@example.com' }) as TResponse,
  };

  describe('Pattern 1: Manual Parameter Typing (current working pattern)', () => {
    it('should work with explicit parameter type and body value', () => {
      const contract = {
        createUser: (userData: User) =>
          http.post('/users', {
            body: userData, // Pass the actual value
            responses: { 201: UserSchema },
          }),
      };

      const client = createClient(contract, {
        baseUrl: 'http://test.com',
        adapter: mockAdapter,
      });

      // Type check: parameter should be User
      expectTypeOf(client.createUser).parameter(0).toEqualTypeOf<User>();
    });
  });

  describe('Pattern 2: Automatic Inference from Schema (desired pattern)', () => {
    it('should infer parameter type from Inferrable body schema', () => {
      const contract = {
        createUser: () =>
          http.post('/users', {
            body: UserSchema, // Schema, not value - parameter type inferred!
            responses: { 201: UserSchema },
          }),
      };

      const client = createClient(contract, {
        baseUrl: 'http://test.com',
        adapter: mockAdapter,
      });

      // Type check: parameter should be inferred as User from UserSchema
      expectTypeOf(client.createUser).parameter(0).toEqualTypeOf<User>();
    });

    it('should work with path parameters AND inferred body (PUT uses Partial)', () => {
      const contract = {
        updateUser: (id: number) =>
          http.put(`/users/${id}`, {
            body: UserSchema, // Body type inferred as Partial<User> for PUT
            responses: { 200: UserSchema },
          }),
      };

      const client = createClient(contract, {
        baseUrl: 'http://test.com',
        adapter: mockAdapter,
      });

      // Type check: should have 2 parameters: id (number) and body (Partial<User>)
      // PUT/PATCH methods use Partial<T> since updates typically send partial data
      expectTypeOf(client.updateUser).parameters.toEqualTypeOf<
        [number, Partial<User>]
      >();
    });

    it('should work with plain string body type', () => {
      // For plain type assertions, you need to manually add the body parameter
      const contract = {
        updateSource: (className: string, source: string) =>
          http.put(`/classes/${className}/source`, {
            body: source, // Pass the value
            responses: { 200: undefined as unknown as void },
          }),
      };

      const client = createClient(contract, {
        baseUrl: 'http://test.com',
        adapter: mockAdapter,
      });

      // Type check: should have 2 parameters as declared
      expectTypeOf(client.updateSource).parameters.toEqualTypeOf<
        [string, string]
      >();
    });
  });

  describe('Pattern 3: Mixed - Path params with manual body typing', () => {
    it('should work with path params and explicit body parameter', () => {
      const contract = {
        updateUser: (id: number, userData: User) =>
          http.put(`/users/${id}`, {
            body: userData, // Explicit value
            responses: { 200: UserSchema },
          }),
      };

      const client = createClient(contract, {
        baseUrl: 'http://test.com',
        adapter: mockAdapter,
      });

      // Type check: should have 2 parameters as declared
      expectTypeOf(client.updateUser).parameters.toEqualTypeOf<
        [number, User]
      >();
    });
  });

  describe('Edge Cases', () => {
    it('should handle no body parameter', () => {
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

      // Type check: should have only 1 parameter
      expectTypeOf(client.getUser).parameters.toEqualTypeOf<[number]>();
    });

    it('should handle no parameters at all', () => {
      const contract = {
        getUsers: () =>
          http.get('/users', {
            responses: { 200: createInferrable<User[]>() },
          }),
      };

      const client = createClient(contract, {
        baseUrl: 'http://test.com',
        adapter: mockAdapter,
      });

      // Type check: should have no parameters
      expectTypeOf(client.getUsers).parameters.toEqualTypeOf<[]>();
    });
  });

  describe('Runtime Behavior', () => {
    it('should pass body data correctly with inferred schema', async () => {
      let capturedBody: any;

      const testAdapter: HttpAdapter = {
        request: async <TResponse = any>(options?: any): Promise<TResponse> => {
          capturedBody = options?.body;
          return {
            id: 1,
            name: 'Test',
            email: 'test@example.com',
          } as TResponse;
        },
      };

      const contract = {
        createUser: () =>
          http.post('/users', {
            body: UserSchema,
            responses: { 201: UserSchema },
          }),
      };

      const client = createClient(contract, {
        baseUrl: 'http://test.com',
        adapter: testAdapter,
      });

      const userData: User = { id: 1, name: 'Test', email: 'test@example.com' };
      await client.createUser(userData);

      expect(capturedBody).toEqual(userData);
    });

    it('should pass body data correctly with manual typing', async () => {
      let capturedBody: any;

      const testAdapter: HttpAdapter = {
        request: async <TResponse = any>(options?: any): Promise<TResponse> => {
          capturedBody = options?.body;
          return {
            id: 1,
            name: 'Test',
            email: 'test@example.com',
          } as TResponse;
        },
      };

      const contract = {
        createUser: (userData: User) =>
          http.post('/users', {
            body: userData,
            responses: { 201: UserSchema },
          }),
      };

      const client = createClient(contract, {
        baseUrl: 'http://test.com',
        adapter: testAdapter,
      });

      const userData: User = { id: 1, name: 'Test', email: 'test@example.com' };
      await client.createUser(userData);

      expect(capturedBody).toEqual(userData);
    });
  });
});
