/**
 * SAP ADT Sessions Contract
 *
 * HTTP session management and CSRF token initialization.
 * Path: /sap/bc/adt/core/http/sessions
 */

import { http as httpMethod } from '../../../base';
import { http as httpSchema } from '../../../schemas';

export const sessionsContract = {
  /**
   * Get or create an HTTP session
   * Also initializes CSRF token for subsequent requests
   *
   * Uses x-sap-security-session: create to establish a proper security session.
   * All subsequent operations should use x-sap-security-session: use to stay
   * within the same security session (required for lock/unlock).
   *
   * @returns Session information with CSRF token and links
   */
  getSession: () =>
    httpMethod.get('/sap/bc/adt/core/http/sessions', {
      responses: {
        200: httpSchema,
      },
      headers: {
        Accept: 'application/vnd.sap.adt.core.http.session.v3+xml',
        'x-csrf-token': 'Fetch',
        'X-sap-adt-sessiontype': 'stateful',
        'x-sap-security-session': 'create',
      },
    }),
};

export type SessionsContract = typeof sessionsContract;
