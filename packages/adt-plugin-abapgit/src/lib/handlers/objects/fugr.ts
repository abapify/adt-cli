/**
 * Function Group (FUGR) object handler for abapGit format
 */

import { AdkFunctionGroup } from '../adk';
import { fugr } from '../../../schemas/generated';
import { createHandler } from '../base';

export const functionGroupHandler = createHandler(AdkFunctionGroup, {
  schema: fugr,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_FUGR',
  serializer_version: 'v1.0.0',

  // SAP → Git: Map ADK object to abapGit values
  toAbapGit: (obj) => ({
    AREAT: obj.description ?? '',
  }),

  // Single source file (top-include)
  getSource: (obj) => obj.getSource(),

  // Git → SAP: Map abapGit values to ADK data
  // Note: FUGR doesn't have the group name in AREAT field; name comes from filename
  fromAbapGit: ({ AREAT } = {}) => ({
    name: '', // Function group name must be set by deserializer from filename
    type: 'FUGR/F',
    description: AREAT,
    language: 'EN',
    masterLanguage: 'EN',
  }),

  // Git → SAP: Set source files on ADK object
  // Note: `_pendingSource` is not declared on the public ADK interface —
  // it is an implementation detail for deferred source saving.
  // The `as unknown as` double cast is the established pattern in this codebase.
  setSources: (obj, sources) => {
    if (sources.main) {
      (obj as unknown as { _pendingSource: string })._pendingSource =
        sources.main;
    }
  },
});
