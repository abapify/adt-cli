/**
 * Interface (INTF) object handler for abapGit format
 */

import { AdkInterface } from '../adk';
import { intf } from '../../../schemas/generated';
import { createHandler } from '../base';

export const interfaceHandler = createHandler(AdkInterface, {
  schema: intf,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_INTF',
  serializer_version: 'v1.0.0',

  toAbapGit: (obj) => ({
    VSEOINTERF: {
      CLSNAME: obj.name ?? '',
      LANGU: 'E',
      DESCRIPT: obj.description ?? '',
      EXPOSURE: '2', // 2 = Public
      STATE: '1', // 1 = Active
      UNICODE: 'X',
    },
  }),

  getSource: (obj) => obj.getSource(),

  // Git → SAP: Map abapGit values to ADK data (type inferred from AdkInterface)
  fromAbapGit: ({ VSEOINTERF }) => ({
    name: (VSEOINTERF?.CLSNAME ?? '').toUpperCase(),
    type: 'INTF/OI', // ADT object type
    description: VSEOINTERF?.DESCRIPT,
  }),

  // Git → SAP: Set source files on ADK object (symmetric with getSource)
  // Stores sources as pending for later deploy via ADT
  setSources: (intf, sources) => {
    if (sources.main) {
      (intf as unknown as { _pendingSource: string })._pendingSource =
        sources.main;
    }
  },
});
