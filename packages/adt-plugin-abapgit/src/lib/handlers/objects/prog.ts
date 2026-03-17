/**
 * Program (PROG) object handler for abapGit format
 */

import { AdkProgram } from '../adk';
import { prog } from '../../../schemas/generated';
import { createHandler } from '../base';

export const programHandler = createHandler(AdkProgram, {
  schema: prog,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_PROG',
  serializer_version: 'v1.0.0',

  // SAP → Git: Map ADK object to abapGit values
  toAbapGit: (obj) => ({
    PROGDIR: {
      NAME: obj.name ?? '',
      STATE: 'A',
      SUBC: '1',
      FIXPT: 'X',
      UNICODE: 'X',
    },
  }),

  // Single source file
  getSource: (obj) => obj.getSource(),

  // Git → SAP: Map abapGit values to ADK data
  // Returns data matching AbapProgramSchema structure
  fromAbapGit: ({ PROGDIR, TPOOL } = {}) => {
    // Extract description from TPOOL (text pool) if available
    // TPOOL.item can be a single object or an array
    let descriptionEntry: { ID?: string; ENTRY?: string } | undefined;
    if (Array.isArray(TPOOL?.item)) {
      descriptionEntry = TPOOL.item.find((t: { ID?: string }) => t.ID === 'R');
    } else if (TPOOL?.item?.ID === 'R') {
      descriptionEntry = TPOOL.item;
    }

    // SUBC can be parsed as number or string depending on XML parser
    const subc = String(PROGDIR?.SUBC ?? '');

    return {
      name: (PROGDIR?.NAME ?? '').toUpperCase(),
      type: 'PROG/P',
      description: descriptionEntry?.ENTRY ?? 'Program',
      fixPointArithmetic: PROGDIR?.FIXPT === 'X',
      activeUnicodeCheck: PROGDIR?.UNICODE === 'X',
      programType: subc === '1' ? 'executableProgram' : 'subroutinePool',
    };
  },

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
