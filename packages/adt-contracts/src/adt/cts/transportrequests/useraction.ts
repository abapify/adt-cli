/**
 * /sap/bc/adt/cts/transportrequests - user-action body endpoints
 *
 * SAP ADT uses POST with a `<tm:root tm:useraction="...">` XML body for
 * release / changeowner / newrequest actions. This file exposes typed
 * endpoints that wrap those three operations.
 *
 *   release       → POST /{trkorr}
 *   changeowner   → POST /{trkorr}    (requires tm:targetuser, optional tm:recursive)
 *   newrequest    → POST /            (creates a new transport request)
 *
 * All three share the same namespace and content-type but differ in
 * request shape and URL, so we expose them as separate methods with
 * strongly-typed options while sharing a single schema.
 */

import { http } from '../../../base';
import {
  transportUseraction,
  transportmanagmentSingle,
} from '../../../schemas';

/** Options for {@link useraction.reassign} */
export interface ReassignOptions {
  /** SAP user who should become the new owner */
  targetUser: string;
  /** Cascade the change to all modifiable tasks (default: false) */
  recursive?: boolean;
}

/** Options for {@link useraction.create} (useraction=newrequest) */
export interface CreateRequestOptions {
  /** Transport short description */
  description: string;
  /** Transport type (default: K = workbench) */
  type?: string;
  /** Transport target system (default: LOCAL) */
  target?: string;
  /** CTS project (optional) */
  project?: string;
  /** SAP user who should own the created request / task */
  owner: string;
}

const CONTENT_TYPE = 'application/vnd.sap.adt.transportorganizer.v1+xml';

export const useraction = {
  /**
   * POST /{trkorr} with useraction="release"
   *
   * Releases the transport or task.
   */
  release: (trkorr: string) =>
    http.post(`/sap/bc/adt/cts/transportrequests/${trkorr}`, {
      body: transportUseraction,
      responses: { 200: transportmanagmentSingle },
      headers: {
        Accept: CONTENT_TYPE,
        'Content-Type': CONTENT_TYPE,
      },
    }),

  /**
   * POST /{trkorr} with useraction="changeowner"
   *
   * Reassigns ownership of a transport (and optionally all of its tasks).
   */
  reassign: (trkorr: string, _options: ReassignOptions) =>
    http.post(`/sap/bc/adt/cts/transportrequests/${trkorr}`, {
      body: transportUseraction,
      responses: { 200: transportmanagmentSingle },
      headers: {
        Accept: CONTENT_TYPE,
        'Content-Type': CONTENT_TYPE,
      },
    }),

  /**
   * POST / with useraction="newrequest"
   *
   * Creates a brand-new transport request. Body carries the nested
   * tm:request / tm:task with desc / type / target / owner.
   */
  create: (_options: CreateRequestOptions) =>
    http.post('/sap/bc/adt/cts/transportrequests', {
      body: transportUseraction,
      responses: { 200: transportmanagmentSingle },
      headers: {
        Accept: CONTENT_TYPE,
        'Content-Type': CONTENT_TYPE,
      },
    }),
};

export type UseractionContract = typeof useraction;
