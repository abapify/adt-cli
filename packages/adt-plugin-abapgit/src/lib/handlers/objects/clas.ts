/**
 * Class (CLAS) object handler for abapGit format
 */

import { AdkClass, type ClassIncludeType } from '../adk';
import { clas } from '../../../schemas/generated';
import { createHandler } from '../base';

/**
 * Map ADK ClassIncludeType to abapGit file suffix convention
 * Used for serialization (SAP → Git)
 */
const ABAPGIT_SUFFIX: Record<ClassIncludeType, string | undefined> = {
  main: undefined, // main has no suffix
  definitions: 'locals_def',
  implementations: 'locals_imp',
  localtypes: 'locals_types',
  macros: 'macros',
  testclasses: 'testclasses',
};

/**
 * Reverse mapping: abapGit file suffix to ADK source key
 * Derived from ABAPGIT_SUFFIX to avoid duplication
 */
const SUFFIX_TO_SOURCE_KEY = Object.fromEntries(
  Object.entries(ABAPGIT_SUFFIX)
    .filter(([, suffix]) => suffix !== undefined)
    .map(([key, suffix]) => [suffix, key]),
) as Record<string, ClassIncludeType>;

/**
 * Map visibility to EXPOSURE code (ADK → abapGit)
 */
const VISIBILITY_TO_EXPOSURE: Record<string, string> = {
  private: '0',
  protected: '1',
  public: '2',
};

/**
 * Reverse mapping: EXPOSURE code to visibility (abapGit → ADK)
 */
const EXPOSURE_TO_VISIBILITY = Object.fromEntries(
  Object.entries(VISIBILITY_TO_EXPOSURE).map(([k, v]) => [v, k]),
) as Record<string, 'private' | 'protected' | 'public'>;

export const classHandler = createHandler(AdkClass, {
  schema: clas,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_CLAS',
  serializer_version: 'v1.0.0',

  // Reverse mapping for deserialization (Git → SAP)
  suffixToSourceKey: SUFFIX_TO_SOURCE_KEY,

  toAbapGit: (cls) => {
    const data = cls.dataSync;
    const includes = data.include ?? [];
    const hasTestClasses = includes.some(
      (inc) => String(inc.includeType) === 'testclasses',
    );

    return {
      VSEOCLASS: {
        // Required
        CLSNAME: cls.name ?? '',

        // Basic metadata
        LANGU: data.language ?? 'E',
        DESCRIPT: data.description ?? '',
        STATE: '1', // Active

        // Class attributes - access via dataSync.*
        CATEGORY: data.category ?? '00',
        EXPOSURE: VISIBILITY_TO_EXPOSURE[data.visibility ?? 'public'] ?? '2',
        CLSFINAL: data.final ? 'X' : undefined,
        CLSABSTRCT: data.abstract ? 'X' : undefined,
        SHRM_ENABLED: data.sharedMemoryEnabled ? 'X' : undefined,

        // Source attributes
        CLSCCINCL: 'X', // Class constructor include
        FIXPT: data.fixPointArithmetic ? 'X' : undefined,
        UNICODE: data.activeUnicodeCheck ? 'X' : undefined,

        // References
        REFCLSNAME: data.superClassRef?.name,
        MSG_ID: data.messageClassRef?.name,

        // ABAP language version
        ABAP_LANGUAGE_VERSION: data.abapLanguageVersion,

        // Test classes flag
        ...(hasTestClasses ? { WITH_UNIT_TESTS: 'X' } : {}),
      },
    };
  },

  getSources: (cls) => {
    const includes = cls.dataSync.include ?? [];
    return includes.map((inc) => ({
      suffix:
        ABAPGIT_SUFFIX[String(inc.includeType ?? 'main') as ClassIncludeType],
      content: cls.getIncludeSource(
        String(inc.includeType ?? 'main') as ClassIncludeType,
      ),
    }));
  },

  // Git → SAP: Map abapGit values to ADK data (type inferred from AdkClass)
  fromAbapGit: ({ VSEOCLASS }) => ({
    // Required - uppercase for SAP
    name: (VSEOCLASS?.CLSNAME ?? '').toUpperCase(),
    type: 'CLAS/OC', // ADT object type

    // Basic metadata
    description: VSEOCLASS?.DESCRIPT,
    language: VSEOCLASS?.LANGU,

    // Class attributes
    category: VSEOCLASS?.CATEGORY,
    final: VSEOCLASS?.CLSFINAL === 'X',
    abstract: VSEOCLASS?.CLSABSTRCT === 'X',
    visibility: EXPOSURE_TO_VISIBILITY[VSEOCLASS?.EXPOSURE ?? '2'] ?? 'public',
    sharedMemoryEnabled: VSEOCLASS?.SHRM_ENABLED === 'X',

    // Source attributes
    fixPointArithmetic: VSEOCLASS?.FIXPT === 'X',
    activeUnicodeCheck: VSEOCLASS?.UNICODE === 'X',

    // References (name only - URI resolved by ADK)
    superClassRef: VSEOCLASS?.REFCLSNAME
      ? { name: VSEOCLASS.REFCLSNAME }
      : undefined,
    messageClassRef: VSEOCLASS?.MSG_ID ? { name: VSEOCLASS.MSG_ID } : undefined,

    // ABAP language version
    abapLanguageVersion: VSEOCLASS?.ABAP_LANGUAGE_VERSION,
  }),

  // Git → SAP: Set source files on ADK object (symmetric with getSources)
  // Stores sources as pending for later deploy via ADT
  setSources: (cls, sources) => {
    // Store all sources as pending (will be saved during deploy)
    (
      cls as unknown as { _pendingSources: Record<string, string> }
    )._pendingSources = sources;
    // Also set main source shortcut for simple access
    if (sources.main) {
      (cls as unknown as { _pendingSource: string })._pendingSource =
        sources.main;
    }
  },
});
