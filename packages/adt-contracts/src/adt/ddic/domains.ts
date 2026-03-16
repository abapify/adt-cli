/**
 * DDIC Domain Contract
 *
 * ADT endpoint: /sap/bc/adt/ddic/domains
 * Content-Type: application/vnd.sap.adt.domains.v2+xml
 * Object type: DOMA/DD (domadd)
 */

import { crud } from '../../helpers/crud';
import { domain as domainSchema, type InferTypedSchema } from '../../schemas';

/**
 * Domain response type - exported for consumers (ADK, etc.)
 */
export type DomainResponse = InferTypedSchema<typeof domainSchema>;

export type DomainsContract = typeof domainsContract;

export const domainsContract = crud({
  basePath: '/sap/bc/adt/ddic/domains',
  schema: domainSchema,
  contentType: 'application/vnd.sap.adt.domains.v2+xml',
  accept:
    'application/vnd.sap.adt.domains.v2+xml, application/vnd.sap.adt.domains.v1+xml',
});
