/**
 * ADT RAP Service Binding (SRVB) Contract
 *
 * Endpoint: /sap/bc/adt/businessservices/bindings
 * Content-Type: application/vnd.sap.adt.businessservices.servicebinding.v1+xml
 * Object type: SRVB/SVB
 *
 * RAP Service Binding — binds a Service Definition (SRVD) to a runtime
 * protocol (OData V2/V4, INA, SQL). Unlike BDEF/SRVD, SRVB is **metadata
 * only** — there is no `.abdl`/`.asrvd`-style source text. The binding
 * XML carries the service + protocol references.
 *
 * Extra operations vs plain `crud()`:
 *   - publish   → POST   {basePath}/{name}/publishedstates
 *   - unpublish → DELETE {basePath}/{name}/publishedstates
 *
 * Reference: abapGit handler zcl_abapgit_object_srvb.
 */

import { http } from '@abapify/speci/rest';
import type { RestEndpointDescriptor } from '@abapify/speci/rest';
import { crud, type CrudContract } from '../../helpers/crud';
import {
  servicebinding as servicebindingSchema,
  type InferTypedSchema,
} from '../../schemas';

export type ServiceBindingResponse = InferTypedSchema<
  typeof servicebindingSchema
>;

const basePath = '/sap/bc/adt/businessservices/bindings';
const nameTransform = (n: string) => n.toLowerCase();

const baseContract = crud({
  basePath,
  schema: servicebindingSchema,
  contentType: 'application/vnd.sap.adt.businessservices.servicebinding.v1+xml',
  accept: 'application/vnd.sap.adt.businessservices.servicebinding.v1+xml',
});

/**
 * Publish/unpublish extension for SRVB.
 *
 *  - publish:   POST {basePath}/{name}/publishedstates
 *               Activates the binding in the SAP Gateway.
 *  - unpublish: DELETE {basePath}/{name}/publishedstates
 *               Deactivates the binding.
 */
export const bindingsContract: CrudContract<typeof servicebindingSchema> & {
  publish: (
    name: string,
  ) => RestEndpointDescriptor<'POST', string, never, { 200: undefined }>;
  unpublish: (
    name: string,
  ) => RestEndpointDescriptor<'DELETE', string, never, { 204: undefined }>;
} = {
  ...baseContract,
  publish: (name: string) =>
    http.post(`${basePath}/${nameTransform(name)}/publishedstates`, {
      responses: { 200: undefined },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    }),
  unpublish: (name: string) =>
    http.delete(`${basePath}/${nameTransform(name)}/publishedstates`, {
      responses: { 204: undefined },
      headers: { Accept: 'application/json' },
    }),
};

export type BindingsContract = typeof bindingsContract;
