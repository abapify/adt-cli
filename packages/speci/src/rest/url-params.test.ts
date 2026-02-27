/**
 * Test: URL Path Parameters
 *
 * Verifies that path parameters in template strings are correctly
 * interpolated into the final URL.
 */
import { describe, it, expect, expectTypeOf } from 'vitest';
import { http, createClient } from './index';
import type { HttpAdapter } from './client/types';

describe('URL Path Parameters', () => {
  interface User {
    id: string;
    name: string;
  }

  const UserSchema = {
    _infer: undefined as unknown as User,
  };

  describe('GET with path parameter', () => {
    it('should interpolate userId into URL', async () => {
      let capturedUrl: string | undefined;

      const testAdapter: HttpAdapter = {
        request: async <TResponse = any>(options?: any): Promise<TResponse> => {
          capturedUrl = options?.url;
          return { id: '123', name: 'Test User' } as TResponse;
        },
      };

      const contract = {
        getUser: (userId: string) =>
          http.get(`/users/${userId}`, {
            responses: { 200: UserSchema },
          }),
      };

      const client = createClient(contract, {
        baseUrl: 'http://test.com',
        adapter: testAdapter,
      });

      await client.getUser('user-456');

      // URL includes baseUrl + interpolated path
      expect(capturedUrl).toBe('http://test.com/users/user-456');
    });

    it('should have correct parameter type', () => {
      const contract = {
        getUser: (userId: string) =>
          http.get(`/users/${userId}`, {
            responses: { 200: UserSchema },
          }),
      };

      const client = createClient(contract, {
        baseUrl: 'http://test.com',
        adapter: { request: async () => ({}) as any },
      });

      // Type check: parameter should be string
      expectTypeOf(client.getUser).parameter(0).toEqualTypeOf<string>();
    });

    it('should work with multiple path parameters', async () => {
      let capturedUrl: string | undefined;

      const testAdapter: HttpAdapter = {
        request: async <TResponse = any>(options?: any): Promise<TResponse> => {
          capturedUrl = options?.url;
          return {} as TResponse;
        },
      };

      const contract = {
        getUserPost: (userId: string, postId: string) =>
          http.get(`/users/${userId}/posts/${postId}`, {
            responses: { 200: UserSchema },
          }),
      };

      const client = createClient(contract, {
        baseUrl: 'http://test.com',
        adapter: testAdapter,
      });

      await client.getUserPost('user-123', 'post-456');

      expect(capturedUrl).toBe('http://test.com/users/user-123/posts/post-456');
    });
  });

  describe('POST with path param, query, and body', () => {
    interface CreatePostRequest {
      title: string;
      content: string;
    }

    interface CreatePostResponse {
      id: string;
      title: string;
      content: string;
      createdAt: string;
    }

    const RequestSchema = {
      _infer: undefined as unknown as CreatePostRequest,
    };

    const ResponseSchema = {
      _infer: undefined as unknown as CreatePostResponse,
    };

    it('should pass path param, query, and body correctly', async () => {
      let capturedUrl: string | undefined;
      let capturedBody: any;
      let capturedQuery: any;

      const testAdapter: HttpAdapter = {
        request: async <TResponse = any>(options?: any): Promise<TResponse> => {
          capturedUrl = options?.url;
          capturedBody = options?.body;
          capturedQuery = options?.query;
          return {
            id: 'post-789',
            title: 'Test',
            content: 'Content',
            createdAt: '2024-01-01',
          } as TResponse;
        },
      };

      const contract = {
        createPost: (userId: string) =>
          http.post(`/users/${userId}/posts`, {
            body: RequestSchema,
            query: { draft: 'true' },
            responses: { 201: ResponseSchema },
          }),
      };

      const client = createClient(contract, {
        baseUrl: 'http://test.com',
        adapter: testAdapter,
      });

      const postData: CreatePostRequest = {
        title: 'My Post',
        content: 'Hello World',
      };

      await client.createPost('user-123', postData);

      // Verify URL has path param interpolated
      expect(capturedUrl).toBe('http://test.com/users/user-123/posts');

      // Verify query params passed
      expect(capturedQuery).toEqual({ draft: 'true' });

      // Verify body passed
      expect(capturedBody).toEqual(postData);
    });

    it('should have correct parameter types (path param + inferred body)', () => {
      const contract = {
        createPost: (userId: string) =>
          http.post(`/users/${userId}/posts`, {
            body: RequestSchema,
            responses: { 201: ResponseSchema },
          }),
      };

      const client = createClient(contract, {
        baseUrl: 'http://test.com',
        adapter: { request: async () => ({}) as any },
      });

      // Type check: should have 2 parameters - userId (string) and body (CreatePostRequest)
      expectTypeOf(client.createPost).parameters.toEqualTypeOf<
        [string, CreatePostRequest]
      >();
    });

    it('should infer correct response type', async () => {
      const contract = {
        createPost: (userId: string) =>
          http.post(`/users/${userId}/posts`, {
            body: RequestSchema,
            responses: { 201: ResponseSchema },
          }),
      };

      const client = createClient(contract, {
        baseUrl: 'http://test.com',
        adapter: {
          request: async <T>() =>
            ({
              id: 'post-789',
              title: 'Test',
              content: 'Content',
              createdAt: '2024-01-01',
            }) as T,
        },
      });

      // Type check: return type should be CreatePostResponse
      type CreatePostReturnType = Awaited<ReturnType<typeof client.createPost>>;
      expectTypeOf<CreatePostReturnType>().toEqualTypeOf<CreatePostResponse>();
    });
  });
});
