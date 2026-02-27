/**
 * ADT OO Classrun Contract
 *
 * Endpoint: /sap/bc/adt/oo/classrun
 * Execute console application classes implementing IF_OO_ADT_CLASSRUN.
 */

import { http, contract } from '../../base';

/**
 * /sap/bc/adt/oo/classrun
 * Execute console application classes (IF_OO_ADT_CLASSRUN)
 */
export const classrunContract = contract({
  /**
   * POST /sap/bc/adt/oo/classrun/{classname}{?profilerId}
   * Execute a class implementing IF_OO_ADT_CLASSRUN
   */
  post: (classname: string, params?: { profilerId?: string }) =>
    http.post(`/sap/bc/adt/oo/classrun/${classname.toLowerCase()}`, {
      query: params,
      responses: { 200: undefined as unknown as string },
      headers: { Accept: 'text/plain' },
    }),
});

export type ClassrunContract = typeof classrunContract;
