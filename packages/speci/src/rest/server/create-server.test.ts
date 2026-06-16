import { describe, it, expect } from 'vitest';
import { createServer } from './create-server';
import { createHttp } from '../helpers';

const http = createHttp();

// Simple test contract
const testContract = {
  users: {
    list: () =>
      http.get('/users', {
        responses: {
          200: {
            parse: (s: string) => JSON.parse(s),
            _infer: undefined as unknown as any[],
          },
        },
      }),
    get: (id: string) =>
      http.get(`/users/${id}`, {
        responses: {
          200: {
            parse: (s: string) => JSON.parse(s),
            _infer: undefined as unknown as any,
          },
        },
      }),
    create: (user: any) =>
      http.post('/users', {
        body: {
          parse: (s: string) => JSON.parse(s),
          build: (d: any) => JSON.stringify(d),
          _infer: undefined as unknown as any,
        },
        responses: {
          201: {
            parse: (s: string) => JSON.parse(s),
            _infer: undefined as unknown as any,
          },
        },
      }),
  },
  posts: {
    get: (userId: string, postId: string) =>
      http.get(`/users/${userId}/posts/${postId}`, {
        responses: {
          200: {
            parse: (s: string) => JSON.parse(s),
            _infer: undefined as unknown as any,
          },
        },
      }),
  },
};

describe('createServer', () => {
  describe('route extraction', () => {
    it('should extract routes from a nested contract', () => {
      const server = createServer(testContract);
      expect(server.routes).toHaveLength(4);
    });

    it('should extract correct HTTP methods', () => {
      const server = createServer(testContract);
      const methods = server.routes.map((r) => r.method);
      expect(methods).toContain('GET');
      expect(methods).toContain('POST');
    });

    it('should extract path parameter names', () => {
      const server = createServer(testContract);
      // Path with one param: /users/${id} → template /users/${p1}
      const getRoute = server.routes.find(
        (r) => r.pathTemplate === '/users/${p1}',
      );
      expect(getRoute).toBeDefined();
      expect(getRoute!.pathParamNames).toEqual(['p1']);
    });

    it('should extract multiple path parameters', () => {
      const server = createServer(testContract);
      // Path with two params: /users/${userId}/posts/${postId} → template /users/${p1}/posts/${p2}
      const postRoute = server.routes.find(
        (r) => r.pathTemplate === '/users/${p1}/posts/${p2}',
      );
      expect(postRoute).toBeDefined();
      expect(postRoute!.pathParamNames).toEqual(['p1', 'p2']);
    });

    it('should extract body schemas', () => {
      const server = createServer(testContract);
      const createRoute = server.routes.find(
        (r) => r.pathTemplate === '/users' && r.method === 'POST',
      );
      expect(createRoute).toBeDefined();
      expect(createRoute!.bodySchema).toBeDefined();
      expect(typeof createRoute!.bodySchema!.parse).toBe('function');
      expect(typeof createRoute!.bodySchema!.build).toBe('function');
    });

    it('should extract response schemas', () => {
      const server = createServer(testContract);
      const listRoute = server.routes.find(
        (r) => r.pathTemplate === '/users' && r.method === 'GET',
      );
      expect(listRoute).toBeDefined();
      expect(listRoute!.responseSchemas[200]).toBeDefined();
      expect(typeof listRoute!.responseSchemas[200].parse).toBe('function');
    });
  });

  describe('route matching', () => {
    it('should match exact paths', () => {
      const server = createServer(testContract);
      const match = server.match('GET', '/users');
      expect(match).not.toBeNull();
      expect(match!.route.method).toBe('GET');
      expect(match!.route.pathTemplate).toBe('/users');
    });

    it('should match paths with parameters', () => {
      const server = createServer(testContract);
      const match = server.match('GET', '/users/123');
      expect(match).not.toBeNull();
      expect(match!.params).toEqual({ p1: '123' });
    });

    it('should match paths with multiple parameters', () => {
      const server = createServer(testContract);
      const match = server.match('GET', '/users/456/posts/789');
      expect(match).not.toBeNull();
      expect(match!.params).toEqual({ p1: '456', p2: '789' });
    });

    it('should return null for unmatched paths', () => {
      const server = createServer(testContract);
      const match = server.match('GET', '/unknown');
      expect(match).toBeNull();
    });

    it('should return null for wrong HTTP method', () => {
      const server = createServer(testContract);
      const match = server.match('DELETE', '/users');
      expect(match).toBeNull();
    });

    it('should strip query strings', () => {
      const server = createServer(testContract);
      const match = server.match('GET', '/users?active=true');
      expect(match).not.toBeNull();
    });

    it('should match with basePath prefix', () => {
      const server = createServer(testContract);
      const match = server.match('GET', '/api/v1/users/123', '/api/v1');
      expect(match).not.toBeNull();
      expect(match!.params).toEqual({ p1: '123' });
    });
  });
});
