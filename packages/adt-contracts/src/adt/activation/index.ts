/**
 * ADT Activation Contract
 *
 * Manually-defined endpoint for ABAP object activation.
 *
 * Structure mirrors URL tree:
 * - /sap/bc/adt/activation → activation.activate (POST with body)
 *
 * NOTE: Not in SAP discovery - manually defined
 */

import { http, contract } from '../../base';
import { adtcore } from '../../schemas';

/**
 * /sap/bc/adt/activation
 *
 * Activate one or more ABAP objects.
 * Request body: adtcore:objectReferences  (AdtcoreSchema variant)
 */
const activate = contract({
  /**
   * POST /sap/bc/adt/activation{?method,preauditRequested}
   *
   * Submit an objectReferences body to activate the listed objects.
   * The `method` query param selects the action (default: "activate").
   * The response XML is not strictly typed here – callers may ignore it.
   */
  post: (params?: { method?: string; preauditRequested?: boolean }) =>
    http.post('/sap/bc/adt/activation', {
      query: params,
      body: adtcore,
      responses: { 200: adtcore },
      headers: {
        Accept: 'application/xml',
        'Content-Type': 'application/xml',
      },
    }),
});

/**
 * Combined Activation contract
 */
export const activationContract = {
  activate,
};

export type ActivationContract = typeof activationContract;
