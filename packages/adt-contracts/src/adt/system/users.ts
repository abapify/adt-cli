/**
 * ADT System Users Contract
 *
 * User lookup and search operations.
 * Path: /sap/bc/adt/system/users
 */

import { http } from '../../base';
import { atomFeed } from '../../schemas';

export const usersContract = {
  /**
   * Search for users by query string
   *
   * @param options.querystring - Search query (supports wildcards like *)
   * @param options.maxcount - Maximum number of results
   * @returns Atom feed with matching user entries (id = username, title = full name)
   *
   * @example
   * const results = await client.system.users.search({ querystring: 'DEV*', maxcount: 10 });
   */
  search: (options: { querystring: string; maxcount?: number }) =>
    http.get('/sap/bc/adt/system/users', {
      query: {
        querystring: options.querystring,
        ...(options.maxcount !== undefined && { maxcount: options.maxcount }),
      },
      responses: {
        200: atomFeed,
      },
      headers: {
        Accept: 'application/atom+xml;type=feed',
      },
    }),

  /**
   * Get a specific user by username
   *
   * @param username - SAP username (e.g., 'DEVELOPER')
   * @returns Atom feed with a single user entry
   *
   * @example
   * const user = await client.system.users.get('DEVELOPER');
   */
  get: (username: string) =>
    http.get(`/sap/bc/adt/system/users/${encodeURIComponent(username)}`, {
      responses: {
        200: atomFeed,
      },
      headers: {
        Accept: 'application/atom+xml;type=feed',
      },
    }),
};

export type UsersContract = typeof usersContract;
