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
import {
  createHandler,
  unwrapData,
  type HandlerContext,
  type SerializedFile,
} from '../base';
import { shouldIncludeSource } from '../source-inclusion';
import { formatAbapGitXml } from '../xml-format';

type FugrObject = InstanceType<typeof AdkFunctionGroup>;
type FugrContext = HandlerContext<FugrObject>;
type SourceMap = Readonly<Record<string, string>> | undefined;

function buildMainXmlFile(
  obj: FugrObject,
  objectName: string,
  nameUpper: string,
  functions: Record<string, unknown>[],
  ctx: FugrContext,
): SerializedFile {
  const values: Record<string, unknown> = {
    AREAT: obj.description ?? '',
    INCLUDES: {
      SOBJ_NAME: [`L${nameUpper}TOP`, `SAPL${nameUpper}`],
    },
  };
  if (functions.length > 0) {
    values.FUNCTIONS = { item: functions };
  }
  const serializer = `LCL_OBJECT_${ctx.type}`;
  const fullPayload = {
    abapGit: {
      abap: { version: '1.0', values },
      version: 'v1.0.0',
      serializer,
      serializer_version: 'v1.0.0',
    },
  };
  const xmlContent = formatAbapGitXml(
    fugr.build(fullPayload, { pretty: true }),
  );
  return ctx.createFile(`${objectName}.${ctx.fileExtension}.xml`, xmlContent);
}

type FmList = {
  fmItems: FmDescriptor[];
  functions: Record<string, unknown>[];
};

function deriveFmList(suppliedSources: SourceMap, objectName: string): FmList {
  if (!suppliedSources) return { fmItems: [], functions: [] };
  const topKey = `l${objectName}top`;
  const lowerTopKey = topKey;
  const lowerSap = `sapl${objectName}`;
  const fmItems = Object.keys(suppliedSources)
    .filter((key) => {
      const lower = key.toLowerCase();
      return lower !== 'main' && lower !== lowerTopKey && lower !== lowerSap;
    })
    .map((key) => ({ key, name: key.toLowerCase() }));
  const functions = fmItems.map((fm) => ({
    FUNCNAME: fm.key.toUpperCase(),
  }));
  return { fmItems, functions };
}

async function buildTopSourceFile(
  obj: FugrObject,
  objectName: string,
  suppliedSources: SourceMap,
  ctx: FugrContext,
): Promise<SerializedFile | undefined> {
  const hasExplicitSources = suppliedSources !== undefined;
  const topKey = `l${objectName}top`;
  const suppliedTopSource = suppliedSources
    ? (suppliedSources.main ?? suppliedSources[topKey])
    : undefined;
  try {
    const topSource =
      suppliedTopSource !== undefined || !hasExplicitSources
        ? (suppliedTopSource ?? (await obj.getSource()))
        : undefined;
    if (shouldIncludeSource(topSource, suppliedTopSource)) {
      return ctx.createFile(
        `${objectName}.${ctx.fileExtension}.l${objectName}top.abap`,
        topSource,
      );
    }
  } catch {
    // Source not available — skip
  }
  return undefined;
}

function buildProgramFiles(
  objectName: string,
  nameUpper: string,
  fixpt: string,
  ctx: FugrContext,
): SerializedFile[] {
  const ext = ctx.fileExtension;
  return [
    ctx.createFile(
      `${objectName}.${ext}.l${objectName}top.xml`,
      buildProgdirXml(`L${nameUpper}TOP`, 'I', fixpt),
    ),
    ctx.createFile(
      `${objectName}.${ext}.sapl${objectName}.abap`,
      buildMainProgramSource(nameUpper),
    ),
    ctx.createFile(
      `${objectName}.${ext}.sapl${objectName}.xml`,
      buildProgdirXml(`SAPL${nameUpper}`, 'F', fixpt),
    ),
  ];
}

async function buildFunctionModuleFiles(
  obj: FugrObject,
  fmItems: FmDescriptor[],
  suppliedSources: SourceMap,
  ctx: FugrContext,
): Promise<SerializedFile[]> {
  const objectName = ctx.getObjectName(obj);
  const files: SerializedFile[] = [];
  const hasExplicitSources = suppliedSources !== undefined;
  for (const fm of fmItems) {
    const sourceKey = fm.key ?? fm.name;
    const funcName = fm.name.toLowerCase();
    const suppliedFmSource = suppliedSources?.[sourceKey];
    if (hasExplicitSources && suppliedFmSource === undefined) {
      continue;
    }
    try {
      const source =
        suppliedFmSource !== undefined
          ? suppliedFmSource
          : await obj.client.adt.functions.groups.fmodules.source.main.get(
              obj.name,
              fm.name,
            );
      if (shouldIncludeSource(source, suppliedFmSource)) {
        files.push(
          ctx.createFile(
            `${objectName}.${ctx.fileExtension}.${funcName}.abap`,
            source,
          ),
        );
      }
    } catch {
      // Source not available — skip
    }
  }
  return files;
}

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

function createFunctionGroupHandler(type: 'FUGR' | 'FUGS') {
  return createHandler<FugrObject, typeof fugr>(type, {
    schema: fugr,
    version: 'v1.0.0',
    serializer: `LCL_OBJECT_${type}`,
    serializer_version: 'v1.0.0',

    // SAP → Git: Map ADK object to abapGit values
    // Note: FUNCTIONS are added dynamically in the custom serialize method
    toAbapGit: (raw) => {
      const obj = unwrapData<FugrObject>(raw);

      const name = obj.name.toUpperCase();
      return {
        AREAT: obj.description ?? '',
        INCLUDES: {
          SOBJ_NAME: [`L${name}TOP`, `SAPL${name}`],
        },
      };
    },

    // Custom serialize: generate the full multi-file structure including FMs.
    serialize: async (obj, ctx, options) => {
      const objectName = ctx.getObjectName(obj); // lowercase
      const nameUpper = obj.name.toUpperCase();
      const suppliedSources: SourceMap = options?.sources;
      const hasExplicitSources = suppliedSources !== undefined;

      let fmItems: FmDescriptor[];
      let functions: Record<string, unknown>[];
      if (hasExplicitSources) {
        ({ fmItems, functions } = deriveFmList(suppliedSources, objectName));
      } else {
        fmItems = await discoverFunctionModules(obj);
        functions = await serializeFunctions(obj, fmItems);
      }

      const data = ctx.getData(obj);
      const fixpt = data.fixPointArithmetic ? 'X' : '';

      const topFile = await buildTopSourceFile(
        obj,
        objectName,
        suppliedSources,
        ctx,
      );
      return [
        buildMainXmlFile(obj, objectName, nameUpper, functions, ctx),
        ...(topFile ? [topFile] : []),
        ...buildProgramFiles(objectName, nameUpper, fixpt, ctx),
        ...(await buildFunctionModuleFiles(obj, fmItems, suppliedSources, ctx)),
      ];
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
      const mainProgramKey = `sapl${name}`;
      for (const [suffix, content] of Object.entries(sources)) {
        if (
          suffix === 'main' ||
          suffix === topKey ||
          suffix === mainProgramKey
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
}

export const functionGroupHandler = createFunctionGroupHandler('FUGR');

// FUGS (function group with screens) inherits the full FUGR serializer
// upstream — same payload, same multi-file layout, .fugs extension.
export const functionGroupScreensHandler = createFunctionGroupHandler('FUGS');

// ============================================
// Serialization helpers
// ============================================

/**
 * Minimal FM descriptor discovered from object structure
 */
interface FmDescriptor {
  name: string;
  type?: string;
  /** Original source-map key when the list was derived from explicit sources. */
  key?: string;
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
      if (match?.[1] && !fmNames.some((f) => f.name === match[1])) {
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
    funcName: String((fm.FUNCNAME as string | undefined) ?? ''),
    shortText: fm.SHORT_TEXT
      ? String(fm.SHORT_TEXT as string | number | boolean)
      : undefined,
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
