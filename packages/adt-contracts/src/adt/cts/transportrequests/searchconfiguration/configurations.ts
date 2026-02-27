/**
 * /sap/bc/adt/cts/transportrequests/searchconfiguration/configurations
 * @schema configurations.xsd, configuration.xsd
 */

import { http, contract } from '../../../../base';
import {
  configurations as configurationsSchema,
  configuration as configurationSchema,
} from '../../../../schemas';

export const configurations = contract({
  /** GET list of search configurations */
  get: () =>
    http.get(
      '/sap/bc/adt/cts/transportrequests/searchconfiguration/configurations',
      {
        responses: { 200: configurationsSchema },
        headers: { Accept: 'application/vnd.sap.adt.configurations.v1+xml' },
      },
    ),

  /** GET a specific configuration by ID */
  getById: (configId: string) =>
    http.get(
      '/sap/bc/adt/cts/transportrequests/searchconfiguration/configurations/${configId}',
      {
        responses: { 200: configurationSchema },
        headers: { Accept: 'application/vnd.sap.adt.configuration.v1+xml' },
      },
    ),

  /** PUT update a specific configuration by ID - body type inferred from schema
   *  Note: If-Match header is automatically added by the adapter from cached ETag
   */
  put: (configId: string) =>
    http.put(
      '/sap/bc/adt/cts/transportrequests/searchconfiguration/configurations/${configId}',
      {
        responses: { 200: configurationSchema },
        headers: {
          'Content-Type': 'application/vnd.sap.adt.configuration.v1+xml',
          Accept: 'application/vnd.sap.adt.configuration.v1+xml',
        },
        body: configurationSchema, // Body type inferred from schema - becomes second parameter!
      },
    ),
});
