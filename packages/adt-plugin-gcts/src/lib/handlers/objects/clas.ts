/**
 * CLAS handler for gCTS / AFF format.
 *
 * Projects ADK class data to the AFF class-metadata shape:
 *
 *   {
 *     header: { formatVersion, description, originalLanguage, ... },
 *     class: { category, visibility, final, abstract, ... }
 *   }
 *
 * Sources are emitted per include (main, definitions, implementations, ...).
 * Abapgit suffix convention is reused for consistency — AFF does not
 * standardise include filenames, but using the same suffixes as abapGit
 * means downstream tooling (diff, round-trip) can treat both formats with
 * the same suffix map.
 */

import { AdkClass, type ClassIncludeType } from '@abapify/adk';
import { createHandler } from '../base';

const SUFFIX: Record<ClassIncludeType, string | undefined> = {
  main: undefined,
  definitions: 'locals_def',
  implementations: 'locals_imp',
  localtypes: 'locals_types',
  macros: 'macros',
  testclasses: 'testclasses',
};

const SUFFIX_TO_SOURCE_KEY = Object.fromEntries(
  Object.entries(SUFFIX)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => [v, k]),
) as Record<string, ClassIncludeType>;

export const classHandler = createHandler(AdkClass, {
  suffixToSourceKey: SUFFIX_TO_SOURCE_KEY,

  toMetadata(cls) {
    const data = cls.dataSync;
    return {
      header: {
        formatVersion: '1.0',
        description: cls.description ?? data.description ?? '',
        originalLanguage: data.language ?? data.masterLanguage,
        abapLanguageVersion: data.abapLanguageVersion,
      },
      class: {
        category: data.category,
        visibility: data.visibility ?? 'public',
        final: data.final === true,
        abstract: data.abstract === true,
        fixedPointArithmetic: data.fixPointArithmetic === true,
        unicodeChecksActive: data.activeUnicodeCheck !== false,
        sharedMemoryEnabled: data.sharedMemoryEnabled === true,
        superClass: data.superClassRef?.name,
      },
    };
  },

  getSources: (cls) => {
    const includes = cls.dataSync.include ?? [];
    return includes.map((inc) => ({
      suffix: SUFFIX[String(inc.includeType ?? 'main') as ClassIncludeType],
      content: () =>
        cls.getIncludeSource(
          String(inc.includeType ?? 'main') as ClassIncludeType,
        ),
    }));
  },

  fromMetadata: (meta: any) => ({
    name: (meta?.class?.name ?? '').toUpperCase(),
    type: 'CLAS/OC',
    description: meta?.header?.description,
    language: meta?.header?.originalLanguage,
    masterLanguage: meta?.header?.originalLanguage,
    category: meta?.class?.category,
    visibility: meta?.class?.visibility,
    final: meta?.class?.final === true,
    abstract: meta?.class?.abstract === true,
    abapLanguageVersion: meta?.header?.abapLanguageVersion,
  }),

  setSources: (cls, sources) => {
    (
      cls as unknown as { _pendingSources: Record<string, string> }
    )._pendingSources = sources;
    if (sources.main) {
      (cls as unknown as { _pendingSource: string })._pendingSource =
        sources.main;
    }
  },
});
