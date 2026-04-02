/**
 * Function Group (FUGR) object handler for abapGit format
 *
 * FUGR is a compound object — abapGit serializes it as multiple files:
 *   {name}.fugr.xml                      — Main metadata (AREAT + INCLUDES + FUNCTIONS)
 *   {name}.fugr.l{name}top.abap          — TOP-include source (editable)
 *   {name}.fugr.l{name}top.xml           — TOP-include PROGDIR metadata
 *   {name}.fugr.sapl{name}.abap          — Main program source (system-generated)
 *   {name}.fugr.sapl{name}.xml           — Main program PROGDIR metadata
 *   {name}.fugr.{funcname}.abap          — Function module source (per FM)
 *
 * Note: FM metadata is stored INSIDE the main XML under <FUNCTIONS>,
 * NOT in separate per-FM XML files (that's how abapGit works).
 */

import { AdkFunctionGroup } from '../adk';
import { fugr } from '../../../schemas/generated';
import { createHandler } from '../base';
import { formatAbapGitXml } from '../xml-format';

/**
 * Map ADT processingType to abapGit REMOTE_CALL flag
 */
function processingTypeToRemoteCall(
  processingType?: string,
): string | undefined {
  switch (processingType) {
    case 'rfc':
      return 'R';
    case 'update':
      return undefined; // UPDATE_TASK handles this
    default:
      return undefined;
  }
}

/**
 * Map abapGit REMOTE_CALL flag to ADT processingType
 */
function remoteCallToProcessingType(
  remoteCall?: string,
  updateTask?: string,
): string {
  if (remoteCall === 'R') return 'rfc';
  if (updateTask && updateTask !== '' && updateTask !== ' ') return 'update';
  return 'normal';
}

export const functionGroupHandler = createHandler(AdkFunctionGroup, {
  schema: fugr,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_FUGR',
  serializer_version: 'v1.0.0',

  // SAP → Git: Map ADK object to abapGit values
  // Note: FUNCTIONS are added dynamically in the custom serialize method
  toAbapGit: (obj) => {
    const name = obj.name.toUpperCase();
    return {
      AREAT: obj.description ?? '',
      INCLUDES: {
        SOBJ_NAME: [`L${name}TOP`, `SAPL${name}`],
      },
    };
  },

  // Custom serialize: generate the full multi-file structure including FMs
  serialize: async (obj, ctx) => {
    const objectName = ctx.getObjectName(obj); // lowercase
    const nameUpper = obj.name.toUpperCase();
    const files = [];

    // Discover child function modules via object structure
    const fmItems = await discoverFunctionModules(obj);

    // Build FUNCTIONS array for main XML
    const functions = await serializeFunctions(obj, fmItems);

    // 1. Main XML metadata (AREAT + INCLUDES + FUNCTIONS)
    // Build values manually to include FUNCTIONS
    const values: Record<string, unknown> = {
      AREAT: obj.description ?? '',
      INCLUDES: {
        SOBJ_NAME: [`L${nameUpper}TOP`, `SAPL${nameUpper}`],
      },
    };
    if (functions.length > 0) {
      values.FUNCTIONS = { item: functions };
    }

    // Build full payload and generate XML via schema
    const fullPayload = {
      abapGit: {
        abap: { version: '1.0', values },
        version: 'v1.0.0',
        serializer: 'LCL_OBJECT_FUGR',
        serializer_version: 'v1.0.0',
      },
    };
    let xmlContent = fugr.build(fullPayload, { pretty: true });

    xmlContent = formatAbapGitXml(xmlContent);

    files.push(ctx.createFile(`${objectName}.fugr.xml`, xmlContent));

    // 2. TOP-include source — the editable source from ADT
    try {
      const topSource = await obj.getSource();
      if (topSource) {
        files.push(
          ctx.createFile(
            `${objectName}.fugr.l${objectName}top.abap`,
            topSource,
          ),
        );
      }
    } catch {
      // Source not available — skip
    }

    // 3. TOP-include PROGDIR metadata (best-effort defaults)
    const data = ctx.getData(obj);
    const fixpt = data.fixPointArithmetic ? 'X' : '';
    files.push(
      ctx.createFile(
        `${objectName}.fugr.l${objectName}top.xml`,
        buildProgdirXml(`L${nameUpper}TOP`, 'I', fixpt),
      ),
    );

    // 4. Main program source (system-generated INCLUDE template)
    files.push(
      ctx.createFile(
        `${objectName}.fugr.sapl${objectName}.abap`,
        buildMainProgramSource(nameUpper),
      ),
    );

    // 5. Main program PROGDIR metadata
    files.push(
      ctx.createFile(
        `${objectName}.fugr.sapl${objectName}.xml`,
        buildProgdirXml(`SAPL${nameUpper}`, 'F', fixpt),
      ),
    );

    // 6. Function module source files (one per FM)
    for (const fm of fmItems) {
      const funcName = fm.name.toLowerCase();
      try {
        const source =
          await obj.client.adt.functions.groups.fmodules.source.main.get(
            obj.name,
            fm.name,
          );
        if (source) {
          files.push(
            ctx.createFile(`${objectName}.fugr.${funcName}.abap`, source),
          );
        }
      } catch {
        // Source not available — skip
      }
    }

    return files;
  },

  // Git → SAP: Map abapGit values to ADK data
  fromAbapGit: ({ AREAT, FUNCTIONS }) => ({
    name: '', // Resolved from filename by deserializer
    type: 'FUGR/F',
    description: AREAT,
    language: 'EN',
    masterLanguage: 'EN',
    // Store FUNCTIONS metadata for the deserializer to extract child FMs
    _functions: FUNCTIONS,
  }),

  // Git → SAP: Set source files on ADK object
  // FUGR sources arrive with dynamic suffixes like l{name}top and sapl{name}.
  // The TOP-include (l{name}top) is the main editable source.
  // FM sources arrive with the FM name as suffix key.
  setSources: (obj, sources) => {
    const name = obj.name.toLowerCase();
    // Find the TOP-include source — this is the editable source for the function group
    const topKey = `l${name}top`;
    const mainSource = sources.main ?? sources[topKey];
    if (mainSource) {
      (obj as unknown as { _pendingSource: string })._pendingSource =
        mainSource;
    }

    // Collect FM sources — these are sources where the suffix is NOT an include name
    const fmSources: Record<string, string> = {};
    for (const [suffix, content] of Object.entries(sources)) {
      if (
        suffix === 'main' ||
        suffix === topKey ||
        suffix.startsWith(`l${name}`) ||
        suffix.startsWith(`sapl${name}`)
      ) {
        continue; // Skip FUGR includes
      }
      // This is an FM source — key is the function name (lowercase)
      fmSources[suffix] = content;
    }

    // Store FM sources on the object for the deserializer to extract later
    if (Object.keys(fmSources).length > 0) {
      (
        obj as unknown as { _pendingFmSources: Record<string, string> }
      )._pendingFmSources = fmSources;
    }
    // Note: sapl{name} (main program) is system-generated and not deployed via ADT
  },
});

// ============================================
// Serialization helpers
// ============================================

/**
 * Minimal FM descriptor discovered from object structure
 */
interface FmDescriptor {
  name: string;
  type?: string;
}

/**
 * Discover child function modules via object structure endpoint.
 * Falls back to empty list if the endpoint is unavailable.
 */
async function discoverFunctionModules(
  obj: InstanceType<typeof AdkFunctionGroup>,
): Promise<FmDescriptor[]> {
  try {
    const response = await obj.client.adt.functions.groups.objectstructure(
      obj.name,
    );

    // Parse object structure XML to extract FM entries
    // The response contains <objectStructureElement> items with type="FUGR/FF"
    const responseStr = String(response);
    const fmNames: FmDescriptor[] = [];
    const regex = /type="FUGR\/FF"[^>]*adtcore:name="([^"]+)"/g;
    let match;
    while ((match = regex.exec(responseStr)) !== null) {
      fmNames.push({ name: match[1] });
    }

    // Also try alternate attribute order
    const regex2 = /adtcore:name="([^"]+)"[^>]*type="FUGR\/FF"/g;
    while ((match = regex2.exec(responseStr)) !== null) {
      if (!fmNames.some((f) => f.name === match![1])) {
        fmNames.push({ name: match[1] });
      }
    }

    return fmNames;
  } catch {
    return [];
  }
}

/**
 * Serialize function module metadata into abapGit FUNCTIONS format.
 * Fetches each FM's metadata via the ADT fmodules contract.
 */
async function serializeFunctions(
  obj: InstanceType<typeof AdkFunctionGroup>,
  fmItems: FmDescriptor[],
): Promise<Record<string, unknown>[]> {
  const functions: Record<string, unknown>[] = [];

  for (const fm of fmItems) {
    try {
      const response = await obj.client.adt.functions.groups.fmodules.get(
        obj.name,
        fm.name,
      );
      const fmData = (response as Record<string, unknown>)
        ?.abapFunctionModule as Record<string, unknown> | undefined;
      if (!fmData) continue;

      // Map ADT metadata to abapGit FUNCTIONS format
      const item: Record<string, unknown> = {
        FUNCNAME: fm.name.toUpperCase(),
        SHORT_TEXT: fmData.description ?? '',
      };

      // Map processing type flags
      const remoteCall = processingTypeToRemoteCall(
        fmData.processingType as string | undefined,
      );
      if (remoteCall) item.REMOTE_CALL = remoteCall;
      if (fmData.basXMLEnabled) item.REMOTE_BASXML = 'X';

      functions.push(item);
    } catch {
      // FM metadata not available — add minimal entry
      functions.push({ FUNCNAME: fm.name.toUpperCase() });
    }
  }

  return functions;
}

// ============================================
// Exported helpers (used by deserializer)
// ============================================

/**
 * Extract function module descriptors from parsed abapGit FUNCTIONS data.
 * Used by the deserializer to create child AdkFunctionModule objects.
 */
export interface FugrFunctionDescriptor {
  funcName: string;
  shortText?: string;
  processingType: string;
  basXMLEnabled: boolean;
}

export function extractFunctionDescriptors(
  functions: unknown,
): FugrFunctionDescriptor[] {
  if (!functions) return [];

  // Handle both { item: [...] } and direct array forms
  const items = Array.isArray(functions)
    ? functions
    : Array.isArray((functions as Record<string, unknown>)?.item)
      ? ((functions as Record<string, unknown>).item as Record<
          string,
          unknown
        >[])
      : (functions as Record<string, unknown>)?.item
        ? [
            (functions as Record<string, unknown>).item as Record<
              string,
              unknown
            >,
          ]
        : [];

  return (items as Array<Record<string, unknown>>).map((fm) => ({
    funcName: String(fm.FUNCNAME ?? ''),
    shortText: fm.SHORT_TEXT ? String(fm.SHORT_TEXT) : undefined,
    processingType: remoteCallToProcessingType(
      fm.REMOTE_CALL as string | undefined,
      fm.UPDATE_TASK as string | undefined,
    ),
    basXMLEnabled: fm.REMOTE_BASXML === 'X',
  }));
}

// ============================================
// XML building helpers
// ============================================

/**
 * Build PROGDIR XML for an include program (best-effort defaults).
 * PROGDIR is SAP-internal metadata that abapGit stores but ADT doesn't expose.
 */
function buildProgdirXml(
  programName: string,
  subc: 'I' | 'F',
  fixpt: string,
): string {
  // SUBC: I = Include, F = Function pool
  // RLOAD: E = only for function pool (main program)
  const rload = subc === 'F' ? '\n    <RLOAD>E</RLOAD>' : '';
  return `<?xml version="1.0" encoding="utf-8"?>
<abapGit version="v1.0.0">
 <asx:abap xmlns:asx="http://www.sap.com/abapxml" version="1.0">
  <asx:values>
   <PROGDIR>
    <NAME>${programName}</NAME>
    <SUBC>${subc}</SUBC>${rload}
    <FIXPT>${fixpt}</FIXPT>
    <UCCHECK>X</UCCHECK>
   </PROGDIR>
  </asx:values>
 </asx:abap>
</abapGit>
`;
}

/**
 * Build the standard main program source (SAPL{NAME}).
 * This is system-generated and contains INCLUDE declarations.
 */
function buildMainProgramSource(nameUpper: string): string {
  return `*******************************************************************
*   System-defined Include-files.                                 *
*******************************************************************
  INCLUDE L${nameUpper}TOP.                    " Global Declarations
  INCLUDE L${nameUpper}UXX.                    " Function Modules

*******************************************************************
*   User-defined Include-files (if necessary).                    *
*******************************************************************
* INCLUDE L${nameUpper}F...                    " Subroutines
* INCLUDE L${nameUpper}O...                    " PBO-Modules
* INCLUDE L${nameUpper}I...                    " PAI-Modules
* INCLUDE L${nameUpper}E...                    " Events
* INCLUDE L${nameUpper}P...                    " Local class implement.
* INCLUDE L${nameUpper}T99.                    " ABAP Unit tests
`;
}
