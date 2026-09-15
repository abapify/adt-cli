/**
 * CLAS handler for gCTS / AFF format.
 *
 * Projects ADK class data to the AFF clas-v1.json schema shape:
 *
 *   {
 *     formatVersion: "1",
 *     header: { description, originalLanguage, abapLanguageVersion? },
 *     category?,
 *     fixPointArithmetic?,
 *     messageClass?,
 *     descriptions?: { types?, attributes?, events?, methods? }
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
import type { ClasAff } from '../../../schemas/generated';

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

/**
 * ADK category enum → AFF category enum.
 * AFF uses a different, finer-grained set of category names.
 */
const CATEGORY_TO_AFF: Record<string, string> = {
  generalObjectType: 'generalObjectType',
  exitClass: 'exitClass',
  testClass: 'testclassAbapUnit',
  behaviorPool: 'behaviorClass',
  entityEventHandler: 'entityEventHandler',
  persistentClass: 'persistentClass',
  factoryClass: 'factoryForPersistentClass',
  rfcProxyClass: 'rfcProxyClass',
  communicationConnectionClass: 'communicationConnectionClass',
  exceptionClass: 'exceptionClass',
  areaClass: 'areaClassSharedObjects',
  bspClass: 'bspApplicationClass',
};

const CATEGORY_FROM_AFF: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_TO_AFF).map(([k, v]) => [v, k]),
);

export const classHandler = createHandler(AdkClass, {
  suffixToSourceKey: SUFFIX_TO_SOURCE_KEY,

  toMetadata(cls): ClasAff {
    const data = cls.dataSync;
    const lang = (data.language ?? data.masterLanguage ?? '').toLowerCase();
    return {
      formatVersion: '1',
      header: {
        description: cls.description ?? data.description ?? '',
        originalLanguage: lang,
        ...(data.abapLanguageVersion && data.abapLanguageVersion !== 'standard'
          ? {
              abapLanguageVersion:
                data.abapLanguageVersion as ClasAff['header']['abapLanguageVersion'],
            }
          : {}),
      },
      ...(data.category
        ? {
            category: (CATEGORY_TO_AFF[data.category] ??
              'generalObjectType') as ClasAff['category'],
          }
        : {}),
      ...(typeof data.fixPointArithmetic === 'boolean'
        ? { fixPointArithmetic: data.fixPointArithmetic }
        : {}),
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

  fromMetadata: (meta: ClasAff) => ({
    name: '', // AFF clas schema has no name field — set by filename context
    type: 'CLAS/OC',
    description: meta.header.description,
    language: meta.header.originalLanguage?.toUpperCase(),
    masterLanguage: meta.header.originalLanguage?.toUpperCase(),
    category: meta.category
      ? (CATEGORY_FROM_AFF[meta.category] ?? meta.category)
      : undefined,
    abapLanguageVersion: meta.header.abapLanguageVersion,
    fixPointArithmetic: meta.fixPointArithmetic,
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
