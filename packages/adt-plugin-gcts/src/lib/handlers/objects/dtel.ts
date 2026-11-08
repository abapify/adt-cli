/**
 * DTEL (data element) handler for gCTS / AFF format.
 *
 * Projects ADK data element data to the AFF dtel-v1.json schema shape:
 *
 *   {
 *     formatVersion: "1",
 *     header: { description, originalLanguage, abapLanguageVersion? },
 *     dataTypeInformation: { domainName? } | { predefinedType: { dataType, length?, decimals? } },
 *     fieldLabels?: { short, shortLength, medium, mediumLength, long, longLength, heading, headingLength }
 *   }
 */

import { AdkDataElement } from '@abapify/adk';
import { createHandler } from '../base';
import { affDataType } from './ddic-data-type';
import type { DtelAff } from '../../../schemas/generated';

// Dynamic access is required because AdkDataElement.dataSync returns a
// generic record today; replacing Record<string, unknown> with generated
// ADK DTEL types is blocked on adt-schemas exporting a typed
// DataelementsSchema interface. Tracked in
// https://github.com/abapify/adt-cli/issues/195
function buildDataTypeInformation(
  data: Record<string, unknown>,
): DtelAff['dataTypeInformation'] {
  const typeKind = data.typeKind;
  if (
    typeKind === 'domain' &&
    typeof data.typeName === 'string' &&
    data.typeName
  ) {
    return { domainName: data.typeName };
  }
  if (data.dataType) {
    if (typeof data.dataTypeLength !== 'number') {
      throw new TypeError('AFF predefined DDIC type requires a length');
    }
    const predefinedType: NonNullable<
      DtelAff['dataTypeInformation']['predefinedType']
    > = { dataType: affDataType(data.dataType), length: data.dataTypeLength };
    if (typeof data.dataTypeDecimals === 'number') {
      predefinedType.decimals = data.dataTypeDecimals;
    }
    return { predefinedType };
  }
  return {};
}

// Dynamic access for the same reason as above (ADK does not yet export DTEL
// types).
function buildFieldLabels(
  data: Record<string, unknown>,
): NonNullable<DtelAff['fieldLabels']> {
  const labels: NonNullable<DtelAff['fieldLabels']> = {};
  const fields: [string, 'short' | 'medium' | 'long' | 'heading', string][] = [
    ['shortFieldLabel', 'short', 'shortFieldLength'],
    ['mediumFieldLabel', 'medium', 'mediumFieldLength'],
    ['longFieldLabel', 'long', 'longFieldLength'],
    ['headingFieldLabel', 'heading', 'headingFieldLength'],
  ];
  for (const [src, dst, lenKey] of fields) {
    const label = data[src];
    const length = data[lenKey];
    if (typeof label === 'string' && label) {
      labels[dst] = label;
      if (typeof length === 'number') {
        labels[`${dst}Length`] = length;
      }
    }
  }
  return labels;
}

export const dataElementHandler = createHandler(AdkDataElement, {
  toMetadata(dtel: AdkDataElement): DtelAff {
    const data = dtel.dataSync as Record<string, unknown>;
    const lang = (
      (data.language as string) ??
      (data.masterLanguage as string) ??
      ''
    ).toLowerCase();

    const result: DtelAff = {
      formatVersion: '1',
      header: {
        description: dtel.description ?? '',
        originalLanguage: lang,
      },
      dataTypeInformation: buildDataTypeInformation(data),
    };

    const fieldLabels = buildFieldLabels(data);
    if (Object.keys(fieldLabels).length > 0) {
      result.fieldLabels = fieldLabels;
    }

    return result;
  },

  fromMetadata: (meta: DtelAff) => {
    const dti = meta.dataTypeInformation ?? {};
    const result: Record<string, unknown> = {
      name: '',
      description: meta.header.description,
      language: meta.header.originalLanguage?.toUpperCase(),
      masterLanguage: meta.header.originalLanguage?.toUpperCase(),
    };
    if (dti.domainName) {
      result.typeKind = 'domain';
      result.typeName = dti.domainName;
    } else if (dti.predefinedType) {
      result.typeKind = 'predefinedAbapType';
      result.dataType = dti.predefinedType.dataType;
      result.dataTypeLength = dti.predefinedType.length;
      result.dataTypeDecimals = dti.predefinedType.decimals;
    }
    const fl = meta.fieldLabels;
    if (fl) {
      result.shortFieldLabel = fl.short;
      result.shortFieldLength = fl.shortLength;
      result.mediumFieldLabel = fl.medium;
      result.mediumFieldLength = fl.mediumLength;
      result.longFieldLabel = fl.long;
      result.longFieldLength = fl.longLength;
      result.headingFieldLabel = fl.heading;
      result.headingFieldLength = fl.headingLength;
    }
    return result as { name: string } & Record<string, unknown>;
  },
});
