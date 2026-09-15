/**
 * Generic AFF handler stubs for the remaining object types.
 *
 * Wave 2 mass-generates handlers for all AFF types that have JSON schemas
 * but no dedicated handler. Each stub emits the minimal AFF contract:
 *   { formatVersion: "1", header: { description, originalLanguage } }
 *
 * Type-specific fields can be added later by promoting a stub to a
 * dedicated handler file (like clas.ts, ddls.ts, etc.) when the ADK
 * object model exposes richer data for that type.
 *
 * All types here are registered via the string-type form of
 * `createHandler` — no ADK class required.
 */

import { createHandler } from '../base';

/** Minimal AFF metadata shape shared by all types. */
interface MinimalAff {
  formatVersion: string;
  header: {
    description: string;
    originalLanguage: string;
    abapLanguageVersion?: string;
  };
  [key: string]: unknown;
}

type GenericLike = {
  name: string;
  description?: string;
  originalLanguage?: string;
  abapLanguageVersion?: string;
  getSource?: () => Promise<string> | string;
};

function toMetadata(obj: GenericLike): MinimalAff {
  const lang = (obj.originalLanguage ?? '').toLowerCase();
  const meta: MinimalAff = {
    formatVersion: '1',
    header: {
      description: obj.description ?? obj.name ?? '',
      originalLanguage: lang,
    },
  };
  if (obj.abapLanguageVersion) {
    meta.header.abapLanguageVersion = obj.abapLanguageVersion;
  }
  return meta;
}

function fromMetadata(meta: MinimalAff) {
  return {
    name: '',
    description: meta.header.description,
    language: meta.header.originalLanguage?.toUpperCase(),
    masterLanguage: meta.header.originalLanguage?.toUpperCase(),
  };
}

function getSource(obj: GenericLike): string | Promise<string> {
  return typeof obj.getSource === 'function' ? obj.getSource() : '';
}

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
    toMetadata,
    getSource,
    fromMetadata,
  });
}
