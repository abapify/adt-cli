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
import type { DtelAff } from '../../../schemas/generated';

// TODO: Replace Record<string, unknown> with generated ADK DTEL types once
// adt-schemas exports a typed DataelementsSchema interface. Dynamic access is
// required because AdkDataElement.dataSync returns a generic record today.
// Cleanup issue: https://github.com/abapify/adt-cli/issues/195
function buildDataTypeInformation(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const typeKind = data.typeKind as string | undefined;
  if (typeKind === 'domain' && data.typeName) {
    return { domainName: data.typeName };
  }
  if (data.dataType) {
    const predefinedType: Record<string, unknown> = { dataType: data.dataType };
    if (typeof data.dataTypeLength === 'number') {
      predefinedType.length = data.dataTypeLength;
    }
    if (typeof data.dataTypeDecimals === 'number') {
      predefinedType.decimals = data.dataTypeDecimals;
    }
    return { predefinedType };
  }
  return {};
}

// TODO: Same as above — replace with typed access once ADK exports DTEL types.
function buildFieldLabels(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const labels: Record<string, unknown> = {};
  const fields: [string, string, string][] = [
    ['shortFieldLabel', 'short', 'shortFieldLength'],
    ['mediumFieldLabel', 'medium', 'mediumFieldLength'],
    ['longFieldLabel', 'long', 'longFieldLength'],
    ['headingFieldLabel', 'heading', 'headingFieldLength'],
  ];
  for (const [src, dst, lenKey] of fields) {
    if (data[src]) {
      labels[dst] = data[src];
      if (typeof data[lenKey] === 'number') {
        labels[`${dst}Length`] = data[lenKey];
      }
    }
  }
  return labels;
}

export const dataElementHandler = createHandler(AdkDataElement, {
  toMetadata(dtel): DtelAff {
    const data = dtel.dataSync as Record<string, unknown>;
    const lang = (
      (data.language as string) ??
      (data.masterLanguage as string) ??
      ''
    ).toLowerCase();

    const result: Record<string, unknown> = {
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

    return result as DtelAff;
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
