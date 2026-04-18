/**
 * DEVC (package) handler for gCTS / AFF format.
 *
 * Packages use a fixed filename (`package.devc.json`) — same convention as
 * abapGit's `package.devc.xml`.
 */
import { AdkPackage } from '@abapify/adk';
import { createHandler, PACKAGE_FILENAME } from '../base';

export const packageHandler = createHandler(AdkPackage, {
  metadataFileName: PACKAGE_FILENAME,

  toMetadata(pkg) {
    return {
      header: {
        formatVersion: '1.0',
        description: pkg.description ?? '',
        originalLanguage:
          pkg.dataSync?.language ?? pkg.dataSync?.masterLanguage,
      },
      package: {
        // DEVCLASS is carried by filename/directory, not by metadata.
        softwareComponent: pkg.dataSync?.transport?.softwareComponent?.name,
        applicationComponent: pkg.dataSync?.applicationComponent?.name,
        packageType: pkg.dataSync?.attributes?.packageType,
      },
    };
  },

  fromMetadata: (meta: any) => ({
    name: '',
    description: meta?.header?.description,
  }),
});
