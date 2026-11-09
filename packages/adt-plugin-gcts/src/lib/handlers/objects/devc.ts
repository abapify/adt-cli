/**
 * DEVC (package) handler for gCTS / AFF format.
 *
 * Packages use a fixed filename (`package.devc.json`) — same convention as
 * abapGit's `package.devc.xml`.
 *
 * Note: DEVC has no AFF schema in SAP/abap-file-formats — this handler
 * uses a gCTS-compatible shape with formatVersion "1". If AFF adds a DEVC
 * schema later, align here.
 */
import { AdkPackage } from '@abapify/adk';
import { createHandler, PACKAGE_FILENAME } from '../base';

export const packageHandler = createHandler(AdkPackage, {
  metadataFileName: PACKAGE_FILENAME,

  toMetadata(pkg) {
    return {
      formatVersion: '1',
      header: {
        description: (pkg as any).description ?? '',
        originalLanguage: (
          (pkg as any).dataSync?.language ??
          (pkg as any).dataSync?.masterLanguage ??
          ''
        ).toLowerCase(),
        ...((pkg as any).dataSync?.abapLanguageVersion &&
        (pkg as any).dataSync.abapLanguageVersion !== 'standard'
          ? { abapLanguageVersion: (pkg as any).dataSync.abapLanguageVersion }
          : {}),
      },
      package: {
        // DEVCLASS is carried by filename/directory, not by metadata.
        softwareComponent: (pkg as any).dataSync?.transport?.softwareComponent
          ?.name,
        applicationComponent: (pkg as any).dataSync?.applicationComponent?.name,
        packageType: (pkg as any).dataSync?.attributes?.packageType,
      },
    };
  },

  fromMetadata: (meta: any) => ({
    name: '',
    description: meta?.header?.description,
    language: meta?.header?.originalLanguage?.toUpperCase(),
    masterLanguage: meta?.header?.originalLanguage?.toUpperCase(),
    abapLanguageVersion: meta?.header?.abapLanguageVersion,
  }),
});
