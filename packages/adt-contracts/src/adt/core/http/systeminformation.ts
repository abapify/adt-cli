/**
 * SAP ADT System Information Contract
 *
 * Returns system information including SAP release, client, user details.
 * Path: /sap/bc/adt/core/http/systeminformation
 */

import { http, contract } from '../../../base';
import { systeminformation } from '../../../schemas';

export const systeminformationContract = contract({
  /**
   * Get system information
   *
   * @returns System information (systemID, client, userName, etc.)
   */
  getSystemInfo: () =>
    http.get('/sap/bc/adt/core/http/systeminformation', {
      responses: {
        200: systeminformation,
      },
      headers: {
        Accept: 'application/vnd.sap.adt.core.http.systeminformation.v1+json',
      },
    }),
});

export type SystemInformationContract = typeof systeminformationContract;
