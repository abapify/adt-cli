/**
 * RAP Behavior Definition Contract
 *
 * ADT endpoint: /sap/bc/adt/rap/behaviours
 * Content-Type: application/vnd.sap.adt.rap.behaviours.v1+xml
 * Object type: BDEF
 *
 * Supports CRUD operations for RAP Behavior Definitions which define
 * the behavior of RAP business objects.
 */

import { crud } from '../../helpers/crud';
import { http } from '../../base';
import { adtcore, type InferTypedSchema } from '../../schemas';

const basePath = '/sap/bc/adt/rap/behaviours';
const contentType = 'application/vnd.sap.adt.rap.behaviours.v1+xml';
const accept = contentType;

export type BehaviorDefinitionResponse = InferTypedSchema<typeof adtcore>;

export const behaviourDefinitionsContract = {
  ...crud({
    basePath,
    schema: adtcore,
    contentType,
    accept,
  }),

  source: {
    get: (name: string) =>
      http.get(`${basePath}/${name.toLowerCase()}/source/main`, {
        responses: { 200: undefined as unknown as string },
        headers: { Accept: 'text/plain' },
      }),
    put: (name: string, options?: { lockHandle?: string; corrNr?: string }) =>
      http.put(`${basePath}/${name.toLowerCase()}/source/main`, {
        body: undefined as unknown as string,
        responses: { 200: undefined as unknown as string },
        headers: { Accept: 'text/plain', 'Content-Type': 'text/plain' },
        query: {
          ...(options?.lockHandle && { lockHandle: options.lockHandle }),
          ...(options?.corrNr && { corrNr: options.corrNr }),
        },
      }),
  },
};

export type BehaviourDefinitionsContract = typeof behaviourDefinitionsContract;

export const behaviourdefinitionContract = behaviourDefinitionsContract;
