/**
 * `adt strust` — SAP STRUST (SSL PSE) certificate management.
 *
 * Subcommands:
 *   adt strust list                              List all PSE identities
 *   adt strust get <ctx> <applic>                List certificates of one PSE
 *   adt strust put <ctx> <applic> <pem-file>     Upload a PEM certificate
 *   adt strust delete <ctx> <applic> <cert-id>   Delete a certificate
 *
 * sapcli's equivalent (`sap strust`) talks to STRUST via RFC. We use the
 * ADT `/sap/bc/adt/system/security/pses` surface instead so every call
 * flows through typed contracts (@abapify/adt-contracts) with no
 * third-party XML parser involved.
 */

export { strustCommand } from './command';
