/**
 * @abapify/adt-rfc — SOAP-over-HTTP RFC transport for SAP.
 *
 * This package lives OUTSIDE the `/sap/bc/adt/*` URL space — RFC is a
 * separate transport. See `docs/roadmap/epics/e13-startrfc.md`.
 */

export { createRfcClient } from './lib/client/rfc-client';
export type {
  RfcClient,
  RfcClientConfig,
  RawFetcher,
} from './lib/client/rfc-client';

export {
  buildRfcSoapEnvelope,
  parseRfcSoapResponse,
  RFC_SOAP_NS,
  SOAP_ENV_NS,
} from './lib/transport/soap-rfc';

export { RfcSoapFault, RfcTransportUnavailable } from './lib/transport/types';
export type {
  RfcCallOptions,
  RfcParams,
  RfcResponse,
  RfcScalar,
  RfcStructure,
  RfcTable,
} from './lib/transport/types';
