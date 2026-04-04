/**
 * ADT RAP Generator Workspace Contract
 *
 * Endpoint: /sap/bc/adt/rap/generator
 *
 * RAP Generator is used to generate RAP artifacts from CDS views.
 * It can create:
 * - Business object (BO) projections
 * - Behavior definitions
 * - Service bindings
 * - OData services
 *
 * The generator workspace manages the generation process
 * and tracks which artifacts have been generated.
 */

import { http } from '../../base';
import { classes as classesSchema } from '../../schemas';

export const generatorContract = {
  /**
   * GET /sap/bc/adt/rap/generator - List generator workspace contents
   */
  list: () =>
    http.get('/sap/bc/adt/rap/generator', {
      responses: { 200: classesSchema },
      headers: {
        Accept:
          'application/vnd.sap.adt.rap.generator.v1+xml, application/vnd.sap.adt.rap.generator+xml',
      },
    }),

  /**
   * GET /sap/bc/adt/rap/generator/{name} - Get generator workspace item
   */
  get: (name: string) =>
    http.get(`/sap/bc/adt/rap/generator/${name.toLowerCase()}`, {
      responses: { 200: classesSchema },
      headers: {
        Accept:
          'application/vnd.sap.adt.rap.generator.v1+xml, application/vnd.sap.adt.rap.generator+xml',
      },
    }),

  /**
   * POST /sap/bc/adt/rap/generator - Create generator workspace item
   */
  create: (options?: { corrNr?: string }) =>
    http.post('/sap/bc/adt/rap/generator', {
      body: classesSchema,
      responses: { 200: classesSchema },
      headers: {
        Accept:
          'application/vnd.sap.adt.rap.generator.v1+xml, application/vnd.sap.adt.rap.generator+xml',
        'Content-Type': 'application/vnd.sap.adt.rap.generator.v1+xml',
      },
      query: options?.corrNr ? { corrNr: options.corrNr } : undefined,
    }),

  /**
   * PUT /sap/bc/adt/rap/generator/{name} - Update generator workspace item
   */
  update: (name: string, options?: { corrNr?: string; lockHandle?: string }) =>
    http.put(`/sap/bc/adt/rap/generator/${name.toLowerCase()}`, {
      body: classesSchema,
      responses: { 200: classesSchema },
      headers: {
        Accept:
          'application/vnd.sap.adt.rap.generator.v1+xml, application/vnd.sap.adt.rap.generator+xml',
        'Content-Type': 'application/vnd.sap.adt.rap.generator.v1+xml',
      },
      query: {
        ...(options?.corrNr ? { corrNr: options.corrNr } : {}),
        ...(options?.lockHandle ? { lockHandle: options.lockHandle } : {}),
      },
    }),

  /**
   * DELETE /sap/bc/adt/rap/generator/{name} - Delete generator workspace item
   */
  delete: (name: string, options?: { corrNr?: string; lockHandle?: string }) =>
    http.delete(`/sap/bc/adt/rap/generator/${name.toLowerCase()}`, {
      responses: { 204: undefined },
      query: {
        ...(options?.corrNr ? { corrNr: options.corrNr } : {}),
        ...(options?.lockHandle ? { lockHandle: options.lockHandle } : {}),
      },
    }),

  /**
   * POST /sap/bc/adt/rap/generator/{name}?_action=LOCK - Lock for editing
   */
  lock: (name: string, options?: { corrNr?: string }) =>
    http.post(`/sap/bc/adt/rap/generator/${name.toLowerCase()}`, {
      responses: { 200: undefined },
      headers: {
        'X-sap-adt-sessiontype': 'stateful',
        'x-sap-security-session': 'use',
        Accept:
          'application/*,application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.lock.result',
      },
      query: {
        _action: 'LOCK',
        accessMode: 'MODIFY',
        ...(options?.corrNr ? { corrNr: options.corrNr } : {}),
      },
    }),

  /**
   * POST /sap/bc/adt/rap/generator/{name}?_action=UNLOCK - Unlock
   */
  unlock: (name: string, lockHandle: string) =>
    http.post(`/sap/bc/adt/rap/generator/${name.toLowerCase()}`, {
      responses: { 200: undefined },
      headers: {
        'X-sap-adt-sessiontype': 'stateful',
        'x-sap-security-session': 'use',
      },
      query: {
        _action: 'UNLOCK',
        accessMode: 'MODIFY',
        lockHandle,
      },
    }),

  /**
   * GET /sap/bc/adt/rap/generator/{name}/source/main - Get source code
   */
  getSource: (name: string) =>
    http.get(`/sap/bc/adt/rap/generator/${name.toLowerCase()}/source/main`, {
      responses: { 200: undefined as unknown as string },
      headers: { Accept: 'text/plain' },
    }),

  /**
   * PUT /sap/bc/adt/rap/generator/{name}/source/main - Update source code
   */
  putSource: (
    name: string,
    options?: { corrNr?: string; lockHandle?: string },
  ) =>
    http.put(`/sap/bc/adt/rap/generator/${name.toLowerCase()}/source/main`, {
      body: undefined as unknown as string,
      responses: { 200: undefined as unknown as string },
      headers: {
        Accept: 'text/plain',
        'Content-Type': 'text/plain',
      },
      query: {
        ...(options?.corrNr ? { corrNr: options.corrNr } : {}),
        ...(options?.lockHandle ? { lockHandle: options.lockHandle } : {}),
      },
    }),
};

export type GeneratorContract = typeof generatorContract;
