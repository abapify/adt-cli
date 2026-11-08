/**
 * DDLS (CDS view) handler for gCTS / AFF format.
 *
 * Source-driven: emits `<name>.ddls.asddls` (source) + `<name>.ddls.json`
 * (metadata per ddls-v1.json schema).
 *
 *   {
 *     formatVersion: "1",
 *     header: { description, originalLanguage, abapLanguageVersion? },
 *     sourceOrigin: "abapDevelopmentTools" (required),
 *     sourceType: "unknown" (required),
 *     parentName?: string
 *   }
 */

import { createHandler } from '../base';
import type { DdlsAff } from '../../../schemas/generated';

type DdlsLike = {
  name: string;
  description?: string;
  originalLanguage?: string;
  abapLanguageVersion?: DdlsAff['header']['abapLanguageVersion'];
  sourceOrigin: DdlsAff['sourceOrigin'];
  sourceType?: DdlsAff['sourceType'];
  getSource?: () => Promise<string> | string;
};

type DdlsLanguageVersion = NonNullable<
  DdlsAff['header']['abapLanguageVersion']
>;

// Exhaustive runtime mirrors of the closed AFF enums: `satisfies` fails to
// compile when the generated schema gains or drops a value.
const languageVersions = {
  standard: true,
  keyUser: true,
  cloudDevelopment: true,
} satisfies Record<DdlsLanguageVersion, true>;

const sourceOrigins = {
  abapDevelopmentTools: true,
  customCdsViews: true,
  customAnalyticalQueries: true,
  customBusinessObject: true,
  customCodeList: true,
  customCdsViewsVariantConfg: true,
  customFields: true,
  extensionsForDataSources: true,
  customSearchModeler: true,
  serviceConsumptionModel: true,
} satisfies Record<DdlsAff['sourceOrigin'], true>;

const sourceTypes = {
  ddicBasedView: true,
  viewEntity: true,
  viewExtend: true,
  viewEntityExtend: true,
  tableFunction: true,
  tableEntity: true,
  abstractEntity: true,
  customEntity: true,
  hierarchy: true,
  projectionView: true,
  externalEntity: true,
  unknown: true,
} satisfies Record<DdlsAff['sourceType'], true>;

/**
 * ADK exposes these fields as open strings, so the compile-time enum types do
 * not protect the serialized output. Reject values outside the AFF enum.
 * Non-strings are rejected before property lookup: an array such as
 * `['viewEntity']` would otherwise coerce to a valid key and be emitted.
 */
function isAffEnumValue<T extends string>(
  allowed: Record<T, true>,
  value: unknown,
): value is T {
  return typeof value === 'string' && Object.hasOwn(allowed, value);
}

function mismatchDetail(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function affEnum<T extends string>(
  allowed: Record<T, true>,
  field: string,
  value: unknown,
): T {
  if (isAffEnumValue(allowed, value)) return value;
  throw new Error(`Unsupported AFF DDLS ${field}: ${mismatchDetail(value)}`);
}

export const ddlSourceHandler = createHandler('DDLS', {
  toMetadata(obj: DdlsLike): DdlsAff {
    const lang = (obj.originalLanguage ?? '').toLowerCase();
    const meta: DdlsAff = {
      formatVersion: '1',
      header: {
        description: obj.description ?? obj.name ?? '',
        originalLanguage: lang,
        ...(obj.abapLanguageVersion
          ? {
              abapLanguageVersion: affEnum(
                languageVersions,
                'abapLanguageVersion',
                obj.abapLanguageVersion,
              ),
            }
          : {}),
      },
      sourceOrigin: affEnum(
        sourceOrigins,
        'sourceOrigin',
        obj.sourceOrigin ?? 'abapDevelopmentTools',
      ),
      sourceType: affEnum(
        sourceTypes,
        'sourceType',
        obj.sourceType ?? 'unknown',
      ),
    };
    return meta;
  },

  getSource: (obj: DdlsLike) =>
    typeof obj.getSource === 'function' ? obj.getSource() : '',

  fromMetadata: (meta: DdlsAff) => ({
    name: '',
    description: meta.header.description,
    language: meta.header.originalLanguage?.toUpperCase(),
    masterLanguage: meta.header.originalLanguage?.toUpperCase(),
    sourceOrigin: meta.sourceOrigin,
    sourceType: meta.sourceType,
  }),
});
