/**
 * ADT System Security / STRUST Contracts
 *
 * Contract surface for SAP STRUST (SSL Personal Security Environment)
 * over the ADT REST API. Paths under `/sap/bc/adt/system/security/pses`.
 *
 * NOTE: sapcli (jfilak/sapcli) drives STRUST via RFC function modules
 * (`sap/rfc/strust.py`), not ADT. The paths below follow the
 * `/sap/bc/adt/system/...` convention used elsewhere in the SAP ADT
 * REST surface (see `system/users`). See the accompanying TODO-synthetic
 * fixtures in `@abapify/adt-fixtures` — replace with real captures when
 * available.
 */

import { http } from '../../../base';
import { atomFeed } from '../../../schemas';

/**
 * Inferrable schema wrapper for a PEM (plain-text) request body.
 * Makes `uploadCertificate` accept a `pem: string` argument at the client
 * call-site — speci's `BuildParams` only appends a body parameter when
 * the body is marked Inferrable via the `_infer` tag.
 */
const pemBody = { _infer: undefined as unknown as string } as const;

/** Options for {@link psesContract.uploadCertificate}. */
export interface UploadCertificateOptions {
  /** PEM-encoded certificate (may contain multiple concatenated certs). */
  pem: string;
}

export const psesContract = {
  /**
   * List all Personal Security Environments (identities).
   *
   * `GET /sap/bc/adt/system/security/pses`
   */
  list: () =>
    http.get('/sap/bc/adt/system/security/pses', {
      responses: { 200: atomFeed },
      headers: { Accept: 'application/atom+xml;type=feed' },
    }),

  /**
   * Get a single PSE identified by `{context}/{applic}`.
   *
   * `GET /sap/bc/adt/system/security/pses/{context}/{applic}`
   */
  get: (context: string, applic: string) =>
    http.get(
      `/sap/bc/adt/system/security/pses/${encodeURIComponent(
        context,
      )}/${encodeURIComponent(applic)}`,
      {
        responses: { 200: atomFeed },
        headers: { Accept: 'application/atom+xml;type=feed' },
      },
    ),

  /**
   * List certificates inside a PSE.
   *
   * `GET /sap/bc/adt/system/security/pses/{context}/{applic}/certificates`
   */
  listCertificates: (context: string, applic: string) =>
    http.get(
      `/sap/bc/adt/system/security/pses/${encodeURIComponent(
        context,
      )}/${encodeURIComponent(applic)}/certificates`,
      {
        responses: { 200: atomFeed },
        headers: { Accept: 'application/atom+xml;type=feed' },
      },
    ),

  /**
   * Fetch the PEM of a single certificate in a PSE.
   *
   * `GET /sap/bc/adt/system/security/pses/{context}/{applic}/certificates/{id}`
   */
  getCertificate: (context: string, applic: string, id: string) =>
    http.get(
      `/sap/bc/adt/system/security/pses/${encodeURIComponent(
        context,
      )}/${encodeURIComponent(applic)}/certificates/${encodeURIComponent(id)}`,
      {
        responses: { 200: undefined as unknown as string },
        headers: { Accept: 'application/x-pem-file' },
      },
    ),

  /**
   * Upload a PEM certificate into a PSE. The body is the PEM text.
   *
   * `POST /sap/bc/adt/system/security/pses/{context}/{applic}/certificates`
   */
  uploadCertificate: (context: string, applic: string) =>
    http.post(
      `/sap/bc/adt/system/security/pses/${encodeURIComponent(
        context,
      )}/${encodeURIComponent(applic)}/certificates`,
      {
        body: pemBody,
        responses: { 200: atomFeed },
        headers: {
          Accept: 'application/atom+xml;type=feed',
          'Content-Type': 'application/x-pem-file',
        },
      },
    ),

  /**
   * Delete a certificate from a PSE.
   *
   * `DELETE /sap/bc/adt/system/security/pses/{context}/{applic}/certificates/{id}`
   */
  deleteCertificate: (context: string, applic: string, id: string) =>
    http.delete(
      `/sap/bc/adt/system/security/pses/${encodeURIComponent(
        context,
      )}/${encodeURIComponent(applic)}/certificates/${encodeURIComponent(id)}`,
      {
        responses: { 204: undefined },
      },
    ),
};

export type PsesContract = typeof psesContract;
