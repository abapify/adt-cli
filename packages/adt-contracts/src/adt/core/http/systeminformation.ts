/**
 * SAP ADT System Information Contract
 *
 * Returns system information including SAP release, client, user details.
 * Path: /sap/bc/adt/core/http/systeminformation
 */

import { http } from '../../../base';
import { systeminformationSchema } from '../../../schemas';

export const systeminformationContract: {
  getSystemInfo: () => ReturnType<typeof http.get>;
} = {
  /**
   * Get system information
   *
   * @returns System information (systemID, client, userName, etc.)
   */
  getSystemInfo: () =>
    http.get('/sap/bc/adt/core/http/systeminformation', {
      responses: {
        200: systeminformationSchema,
      },
      headers: {
        Accept: 'application/json',
      },
    }),
};

export type SystemInformationContract = typeof systeminformationContract;
