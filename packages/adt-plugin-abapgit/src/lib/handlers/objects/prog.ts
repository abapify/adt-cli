/**
 * Program (PROG) object handler for abapGit format
 */

import { AdkInclude, AdkProgram } from '../adk';
import { prog } from '../../../schemas/generated';
import { createHandler } from '../base';

function programSubc(obj: AdkProgram | AdkInclude): string {
  if (obj.kind === AdkInclude.kind) return 'I';
  if (!obj.isLoaded) return '1';
  switch ((obj.dataSync as { programType?: string }).programType) {
    case 'modulePool':
      return 'M';
    case 'subroutinePool':
      return 'S';
    default:
      return '1';
  }
}

export const programHandler = createHandler<
  AdkProgram | AdkInclude,
  typeof prog
>('PROG', {
  schema: prog,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_PROG',
  serializer_version: 'v1.0.0',

  // SAP → Git: Map ADK object to abapGit values
  toAbapGit: (obj) => ({
    PROGDIR: {
      NAME: obj.name ?? '',
      STATE: 'A',
      SUBC: programSubc(obj),
      FIXPT: 'X',
      UNICODE: 'X',
    },
  }),

  // Single source file
  getSource: (obj) => obj.getSource(),

  // Git → SAP: Map abapGit values to ADK data
  // Returns data matching AbapProgramSchema structure
  fromAbapGit: ({ PROGDIR, TPOOL }) => {
    // Extract description from TPOOL (text pool) if available
    // TPOOL.item can be a single object or an array depending on XML parser
    const rawItems = TPOOL?.item ?? [];
    const items = Array.isArray(rawItems) ? rawItems : [rawItems];
    const descriptionEntry = items.find((t: any) => t.ID === 'R');

    // SUBC can be parsed as number or string depending on XML parser
    const subc = String(PROGDIR?.SUBC ?? '');

    const data = {
      name: (PROGDIR?.NAME ?? '').toUpperCase(),
      description: descriptionEntry?.ENTRY ?? 'Program',
      fixPointArithmetic: PROGDIR?.FIXPT === 'X',
      activeUnicodeCheck: PROGDIR?.UNICODE === 'X',
    };
    if (subc === 'I') return { ...data, type: 'PROG/I' };
    const baseProgramType =
      subc === 'S' ? 'subroutinePool' : 'executableProgram';
    return {
      ...data,
      type: 'PROG/P',
      programType: subc === 'M' ? 'modulePool' : baseProgramType,
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
