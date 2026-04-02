/**
 * Package (DEVC) object handler for abapGit format
 */

import { AdkPackage } from '../adk';
import { devc } from '../../../schemas/generated';
import { createHandler } from '../base';

/**
 * Package handler for abapGit serialization
 *
 * Note: Packages in abapGit use "package.devc.xml" as filename,
 * not "$packagename.devc.xml"
 */
export const packageHandler = createHandler(AdkPackage, {
  schema: devc,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_DEVC',
  serializer_version: 'v1.0.0',

  // Packages use fixed filename, not object name
  xmlFileName: 'package.devc.xml',

  // Only return the values - base class wraps in full AbapGitType
  toAbapGit: (pkg) => ({
    DEVC: {
      // Note: DEVCLASS is not included in abapGit package.devc.xml files (only CTEXT)
      CTEXT: pkg.description ?? '',
    },
  }),

  // Git → SAP: Map abapGit values to ADK data (type inferred from AdkPackage)
  // Note: DEVC doesn't have DEVCLASS in abapGit XML, name comes from filename
  fromAbapGit: ({ DEVC }) => ({
    name: '', // Package name must be set by deserializer from filename
    description: DEVC?.CTEXT,
  }),
  // Note: DEVC has no source files, so no setSources needed
});
