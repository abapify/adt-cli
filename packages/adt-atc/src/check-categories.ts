/**
 * Check Category Enrichment
 *
 * Resolves ATC findings to their check category (e.g., 'CI_PERFORMANCE',
 * 'CI_SECURITY') through the check variant form template
 * (GET /sap/bc/adt/atc/checkvariants/formtemplate?chkvName={name}).
 *
 * The form template is the check catalog of the run's check variant: every
 * available check category lists its checks, and each check carries its
 * implementing class. When a finding's checkId matches a catalog
 * implementing class, the index resolves it directly. Live worklist
 * checkIds are check-instance GUIDs (observed on a live S/4 system,
 * 2026-10-22); those resolve through the documentation bridge in
 * ./documentation-bridge.ts.
 *
 * Enrichment is best-effort by design: without the form template, or for a
 * checkId outside the catalog, findings keep no category and the run still
 * succeeds.
 */

/**
 * Structural shape of the parsed check variant form template document
 * (GET /sap/bc/adt/atc/checkvariants/formtemplate).
 *
 * Only the fields needed for the checkId -> category index are declared.
 */
export interface FormTemplateDocument {
  formTemplate?: {
    availableCheckCategories?: {
      availableCheckCategory?: FormTemplateCategoryEntry[];
    };
  };
}

/** One available check category with the checks it contains. */
export interface FormTemplateCategoryEntry {
  checkCategoryObject?: {
    /** Category name (the enrichment key, e.g., 'CI_PERFORMANCE') */
    name?: string;
    /** Category display title (e.g., 'Performance') */
    description?: string;
  };
  check?: FormTemplateCheckEntry[];
}

/** One check entry of a category. */
export interface FormTemplateCheckEntry {
  checkObject?: {
    /** Check name (e.g., 'CI_ANALYZE_WHERE') */
    name?: string;
    content?: {
      /** The check's category assignment (the category name) */
      category?: { name?: string };
      /**
       * Implementing class of the check (e.g., 'CL_CI_TEST_SELECT_TAW_A').
       * Worklist findings carry a check-instance GUID instead; the
       * documentation bridge resolves that GUID to this class name.
       */
      implementingClass?: { name?: string };
    };
  };
}

/**
 * Build a checkId -> check category name index from a parsed check variant
 * form template document.
 *
 * The checkId key is the implementing class name; the value is the category
 * object name (a stable key like 'CI_PERFORMANCE', not the display title).
 *
 * @param doc - Parsed form template document (nullable for convenience)
 * @returns Map of checkId -> category name; empty when the document is
 *   missing or malformed
 */
export function parseCheckCategoryIndex(
  doc: FormTemplateDocument | null | undefined,
): Map<string, string> {
  const index = new Map<string, string>();
  const categories =
    doc?.formTemplate?.availableCheckCategories?.availableCheckCategory ?? [];
  for (const category of categories) {
    collectCategoryChecks(category, index);
  }
  return index;
}

/** Index every check of one category under the category's name. */
function collectCategoryChecks(
  category: FormTemplateCategoryEntry,
  index: Map<string, string>,
): void {
  const categoryName = category.checkCategoryObject?.name;
  if (!categoryName) return;
  const checkIds = (category.check ?? [])
    .map((check) => check.checkObject?.content?.implementingClass?.name)
    .filter((checkId): checkId is string => !!checkId);
  for (const checkId of checkIds) {
    index.set(checkId, categoryName);
  }
}

/** Structural client surface needed to fetch a form template. */
export interface FormTemplateClient {
  adt: {
    atc: {
      checkvariants: {
        /** GET /sap/bc/adt/atc/checkvariants/formtemplate{?chkvName} */
        formtemplate: (params?: {
          chkvName?: string;
        }) => Promise<FormTemplateDocument>;
      };
    };
  };
}

/**
 * Fetch the check variant form template and build the checkId -> category
 * name index for a run.
 *
 * Best-effort: any error (network, 404, malformed document) is swallowed
 * and reported through the optional logger so a failed enrichment never
 * fails the ATC run itself.
 *
 * @param client - ADT client with the checkvariants.formtemplate surface
 * @param checkVariant - The check variant name of the run (e.g., 'DEFAULT')
 * @param logger - Optional CLI logger for diagnostics
 * @returns checkId -> category name index; empty when unavailable
 */
export async function fetchCheckCategoryIndex(
  client: FormTemplateClient,
  checkVariant: string,
  logger?: {
    warn: (message: string) => void;
    info?: (message: string) => void;
  },
): Promise<Map<string, string>> {
  try {
    const doc = await client.adt.atc.checkvariants.formtemplate({
      chkvName: checkVariant,
    });
    return parseCheckCategoryIndex(doc);
  } catch (error) {
    logger?.warn?.(
      `⚠️ Check category enrichment unavailable: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return new Map();
  }
}

/**
 * Enrich findings with their check category in place.
 *
 * Generic over any finding shape carrying a checkId (and an optional
 * checkCategory field), so both the CLI plugin's AtcFinding and other
 * canonical finding types can be enriched with the same index.
 *
 * @param findings - Findings to enrich (mutated in place)
 * @param index - checkId -> category name index
 * @returns Number of findings that received a category
 */
export function enrichFindingsWithCategories<
  T extends { checkId: string; checkCategory?: string },
>(findings: T[], index: Map<string, string>): number {
  let enriched = 0;
  for (const finding of findings) {
    const checkCategory = index.get(finding.checkId);
    if (checkCategory) {
      finding.checkCategory = checkCategory;
      enriched++;
    }
  }
  return enriched;
}

/**
 * Enrich an ATC result with check categories in place.
 *
 * @param result - The run result (findings mutated in place)
 * @param index - checkId -> category name index
 * @returns Number of findings that received a category
 */
export function enrichResultWithCategories<
  T extends { checkId: string; checkCategory?: string },
>(result: { findings?: T[] }, index: Map<string, string>): number {
  return enrichFindingsWithCategories(result.findings ?? [], index);
}
