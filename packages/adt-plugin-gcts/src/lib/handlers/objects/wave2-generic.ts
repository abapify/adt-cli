/**
 * Generic AFF handler stubs for the remaining object types.
 *
 * Wave 2 mass-registers handlers for all AFF types that have JSON schemas
 * but no dedicated handler. Each stub runs the schema-aware generic
 * emit/parse from `../../aff/generic`: the `{formatVersion, header}`
 * envelope at the type's latest schema version plus every top-level body
 * property present in the payload — schema-valid whenever the payload is.
 *
 * Types needing semantic mapping, source companions, or special file
 * shapes graduate to a dedicated file (like clas.ts, ddls.ts, …).
 *
 * All types here are registered via the string-type form of
 * `createHandler` — no ADK class required.
 */

import { createHandler } from '../base';
import {
  genericFromMetadata,
  genericGetExtraFiles,
  genericGetSources,
  genericSetSources,
  genericToMetadata,
  type GenericAffLike,
  type MinimalAff,
} from '../../aff/generic';

type GenericLike = GenericAffLike;

/**
 * Remaining AFF types with schemas but no dedicated handler.
 * Each is registered with the same minimal toMetadata/fromMetadata.
 */
const WAVE2_TYPES = [
  'ADVC',
  'AIFA',
  'AIFD',
  'AIFF',
  'AIFI',
  'AIFN',
  'AIFP',
  'AIFR',
  'AOBJ',
  'APIC',
  'APLO',
  'APOB',
  'BGQC',
  'CDBO',
  'CFDF',
  'CHDO',
  'CHKC',
  'CHKO',
  'CHKV',
  'COTA',
  'CSNM',
  'DCAT',
  'DDLA',
  'DDLX',
  'DESD',
  'DMON',
  'DOBJ',
  'DRAS',
  'DRTY',
  'DSFD',
  'DSFI',
  'DTDC',
  'DTEB',
  'DTIX',
  'DTSC',
  'EDCC',
  'EDCK',
  'EDCR',
  'EDOI',
  'EEEC',
  'ENHO',
  'ENHS',
  'ENQU',
  'EVTB',
  'EVTO',
  'GSMP',
  'HTTP',
  'ILMB',
  'INTM',
  'INTS',
  'IWNG',
  'NONT',
  'NROB',
  'NTTA',
  'NTTY',
  'RONT',
  'RVBC',
  'SAIA',
  'SAJC',
  'SAJT',
  'SCP1',
  'SFPF',
  'SIAD',
  'SITO',
  'SMBC',
  'SMTG',
  'SPRV',
  'SRVC',
  'SUCO',
  'SUSI',
  'SWCR',
  'SXTG',
  'UIAD',
  'UIPG',
  'UIST',
];

for (const type of WAVE2_TYPES) {
  createHandler<GenericLike, MinimalAff>(type, {
    toMetadata: genericToMetadata(type.toLowerCase()),
    getSources: genericGetSources,
    getExtraFiles: genericGetExtraFiles(type.toLowerCase()),
    fromMetadata: genericFromMetadata,
    setSources: genericSetSources,
  });
}
