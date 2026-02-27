/**
 * Test: XSD Schema Body Inference
 *
 * Verifies that ts-xsd schemas wrapped with speci's Serializable interface
 * correctly support automatic body type inference.
 */
import { describe, it, expect, expectTypeOf } from 'vitest';
import { http, createClient } from './index';
import type { HttpAdapter } from './client/types';
import type { Serializable } from './types';

describe('XSD Schema Body Inference', () => {
  // Simulate a ts-xsd schema wrapped with speci's schema() function
  // This mimics what adt-schemas/src/speci.ts does
  interface TransportCreate {
    useraction: string;
    request: Array<{
      desc: string;
      type: string;
      target: string;
      cts_project: string;
      task: Array<{ owner: string }>;
    }>;
  }

  // Mock schema that mimics transportmanagmentCreate
  const mockXsdSchema: Serializable<TransportCreate> = {
    _infer: undefined as unknown as TransportCreate,
    parse: (xml: string) => ({}) as TransportCreate,
    build: (data: TransportCreate) => '<xml/>',
  };

  const mockAdapter: HttpAdapter<TransportCreate> = {
    request: async <TResponse = TransportCreate>(): Promise<TResponse> =>
      ({ useraction: 'test', request: [] }) as unknown as TResponse,
  };

  describe('Pattern: No-param contract with Inferrable body schema', () => {
    it('should infer body parameter type from Serializable schema', () => {
      const contract = {
        create: () =>
          http.post('/sap/bc/adt/cts/transportrequests', {
            body: mockXsdSchema,
            responses: { 200: mockXsdSchema },
          }),
      };

      const client = createClient(contract, {
        baseUrl: 'http://test.com',
        adapter: mockAdapter,
      });

      // Type check: parameter should be inferred as TransportCreate
      expectTypeOf(client.create).parameter(0).toEqualTypeOf<TransportCreate>();
    });

    it('should pass body data to adapter at runtime', async () => {
      let capturedBody: any;
      let capturedBodySchema: any;

      const testAdapter: HttpAdapter = {
        request: async <TResponse = any>(options?: any): Promise<TResponse> => {
          capturedBody = options?.body;
          capturedBodySchema = options?.bodySchema;
          return { useraction: 'test', request: [] } as TResponse;
        },
      };

      const contract = {
        create: () =>
          http.post('/sap/bc/adt/cts/transportrequests', {
            body: mockXsdSchema,
            responses: { 200: mockXsdSchema },
          }),
      };

      const client = createClient(contract, {
        baseUrl: 'http://test.com',
        adapter: testAdapter,
      });

      const bodyData: TransportCreate = {
        useraction: 'newrequest',
        request: [
          {
            desc: 'Test TR',
            type: 'K',
            target: 'LOCAL',
            cts_project: '',
            task: [],
          },
        ],
      };

      await client.create(bodyData);

      expect(capturedBody).toEqual(bodyData);
      expect(capturedBodySchema).toBeDefined();
      expect(capturedBodySchema.build).toBeDefined();
    });
  });
});
