/**
 * ADT Function Modules Contract
 *
 * Endpoint: /sap/bc/adt/functions/groups/{groupName}/fmodules/{fmName}
 * Sub-resource of function groups.
 *
 * Function modules are child objects of function groups. They have their own
 * lock lifecycle, source code, and metadata but are accessed through the
 * parent group's URL path.
 */

import { http, contract } from '../../base';
import { textPlain } from '../../helpers/text-schema';
import {
  fmodules as fmodulesSchema,
  type InferTypedSchema,
} from '../../schemas';

/**
 * Function module response type - exported for consumers (ADK, etc.)
 */
export type FunctionModuleResponse = InferTypedSchema<typeof fmodulesSchema>;

const contentType = 'application/vnd.sap.adt.functions.fmodules.v3+xml';
const accept =
  'application/vnd.sap.adt.functions.fmodules.v3+xml, application/vnd.sap.adt.functions.fmodules.v2+xml, application/vnd.sap.adt.functions.fmodules.v1+xml';

// Base path with speci path parameter (NOT a JS template literal!)
// eslint-disable-next-line no-template-curly-in-string
const basePath = '/sap/bc/adt/functions/groups/${groupName}/fmodules';

/**
 * /sap/bc/adt/functions/groups/{groupName}/fmodules
 * CRUD operations for function modules within a function group
 */
export const functionModulesContract = contract({
  /** GET .../fmodules/{fmName} - Get function module metadata */
  // eslint-disable-next-line no-template-curly-in-string
  get: (groupName: string, fmName: string) =>
    http.get(basePath + '/${fmName}', {
      responses: { 200: fmodulesSchema },
      headers: { Accept: accept },
    }),

  /** POST .../fmodules - Create function module */
  post: (groupName: string, queryOptions?: { corrNr?: string }) =>
    http.post(basePath, {
      body: fmodulesSchema,
      responses: { 200: fmodulesSchema },
      headers: { Accept: accept, 'Content-Type': contentType },
      query: queryOptions?.corrNr ? { corrNr: queryOptions.corrNr } : undefined,
    }),

  /** PUT .../fmodules/{fmName} - Update function module metadata */
  // eslint-disable-next-line no-template-curly-in-string
  put: (
    groupName: string,
    fmName: string,
    options?: { lockHandle?: string; corrNr?: string },
  ) =>
    http.put(basePath + '/${fmName}', {
      body: fmodulesSchema,
      responses: { 200: fmodulesSchema },
      headers: { Accept: accept, 'Content-Type': contentType },
      query: {
        ...(options?.lockHandle ? { lockHandle: options.lockHandle } : {}),
        ...(options?.corrNr ? { corrNr: options.corrNr } : {}),
      },
    }),

  /** DELETE .../fmodules/{fmName} - Delete function module */
  // eslint-disable-next-line no-template-curly-in-string
  delete: (
    groupName: string,
    fmName: string,
    options?: { lockHandle?: string; corrNr?: string },
  ) =>
    http.delete(basePath + '/${fmName}', {
      responses: { 204: undefined },
      query: {
        ...(options?.lockHandle ? { lockHandle: options.lockHandle } : {}),
        ...(options?.corrNr ? { corrNr: options.corrNr } : {}),
      },
    }),

  /** POST .../fmodules/{fmName}?_action=LOCK - Lock function module */
  // eslint-disable-next-line no-template-curly-in-string
  lock: (
    groupName: string,
    fmName: string,
    options?: { corrNr?: string; accessMode?: 'MODIFY' | 'SOURCE' },
  ) =>
    http.post(basePath + '/${fmName}', {
      responses: { 200: undefined },
      headers: {
        'X-sap-adt-sessiontype': 'stateful',
        'x-sap-security-session': 'use',
        Accept:
          'application/*,application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.lock.result',
      },
      query: {
        _action: 'LOCK',
        accessMode: options?.accessMode ?? 'MODIFY',
        ...(options?.corrNr ? { corrNr: options.corrNr } : {}),
      },
    }),

  /** POST .../fmodules/{fmName}?_action=UNLOCK - Unlock function module */
  // eslint-disable-next-line no-template-curly-in-string
  unlock: (
    groupName: string,
    fmName: string,
    options: { lockHandle: string },
  ) =>
    http.post(basePath + '/${fmName}', {
      responses: { 200: undefined },
      headers: {
        'X-sap-adt-sessiontype': 'stateful',
        'x-sap-security-session': 'use',
      },
      query: {
        _action: 'UNLOCK',
        accessMode: 'MODIFY',
        lockHandle: options.lockHandle,
      },
    }),

  /** Source code operations */
  source: {
    main: {
      /** GET .../fmodules/{fmName}/source/main - Get source code */
      // eslint-disable-next-line no-template-curly-in-string
      get: (groupName: string, fmName: string) =>
        http.get(basePath + '/${fmName}/source/main', {
          responses: { 200: undefined as unknown as string },
          headers: { Accept: 'text/plain' },
        }),

      /** PUT .../fmodules/{fmName}/source/main - Update source code */
      // eslint-disable-next-line no-template-curly-in-string
      put: (
        groupName: string,
        fmName: string,
        options?: { lockHandle?: string; corrNr?: string },
      ) =>
        http.put(basePath + '/${fmName}/source/main', {
          body: textPlain,
          responses: { 200: undefined as unknown as string },
          headers: { Accept: 'text/plain', 'Content-Type': 'text/plain' },
          query: {
            ...(options?.lockHandle ? { lockHandle: options.lockHandle } : {}),
            ...(options?.corrNr ? { corrNr: options.corrNr } : {}),
          },
        }),
    },
  },
});

export type FunctionModulesContract = typeof functionModulesContract;
