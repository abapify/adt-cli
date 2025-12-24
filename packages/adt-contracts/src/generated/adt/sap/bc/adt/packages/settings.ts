/**
 * Package Settings
 *
 * Endpoint: /sap/bc/adt/packages/settings
 * Category: settings
 *
 * @generated - DO NOT EDIT MANUALLY
 */

import { http, contract } from '#base';
import { packagesV1 } from '#schemas';

export const settingsContract = contract({
  /**
   * GET Package Settings
   */
  get: () =>
    http.get('/sap/bc/adt/packages/settings', {
      responses: { 200: packagesV1 },
      headers: { Accept: 'application/xml' },
    }),
});

export type SettingsContract = typeof settingsContract;
