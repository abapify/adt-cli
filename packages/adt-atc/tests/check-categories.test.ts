/**
 * Check category enrichment tests
 *
 * parseCheckCategoryIndex: checkId -> category name index from a parsed
 * check variant form template document.
 * fetchCheckCategoryIndex: best-effort fetch (never throws).
 * enrichFindingsWithCategories / enrichResultWithCategories: in-place
 * enrichment.
 * Formatters: check_category passthrough (GitLab) and rule properties
 * category (SARIF).
 */

import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, it } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import {
  parseCheckCategoryIndex,
  fetchCheckCategoryIndex,
  enrichFindingsWithCategories,
  enrichResultWithCategories,
  type FormTemplateDocument,
} from '../src/check-categories';
import {
  parseCheckClassFromDocumentation,
  resolveCategoriesViaDocumentation,
} from '../src/documentation-bridge';
import { outputGitLabCodeQuality } from '../src/formatters/gitlab';
import { outputSarifReport } from '../src/formatters/sarif';
import type { AtcFinding, AtcResult } from '../src/types';

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

/** Structural parsed form template modeled after the sanitized fixture. */
function formTemplateDocument(): FormTemplateDocument {
  return {
    formTemplate: {
      availableCheckCategories: {
        availableCheckCategory: [
          {
            checkCategoryObject: {
              name: 'CI_PERFORMANCE',
              description: 'Performance',
            },
            check: [
              {
                checkObject: {
                  name: 'CI_ANALYZE_WHERE',
                  content: {
                    category: { name: 'CI_PERFORMANCE' },
                    implementingClass: { name: 'CL_CI_TEST_SELECT_TAW_A' },
                    remoteEnabled: true,
                  },
                },
              },
              {
                checkObject: {
                  name: 'CI_SELECT_TAW_BYBUF',
                  content: {
                    category: { name: 'CI_PERFORMANCE' },
                    implementingClass: { name: 'CL_CI_TEST_SELECT_TAW_BYBUF' },
                  },
                },
              },
            ],
          },
          {
            checkCategoryObject: {
              name: 'ZEXAMPLE_CI_CATEGORY',
              description: 'Example custom category',
            },
            check: [
              {
                checkObject: {
                  name: 'ZEXAMPLE_CI_CHECK',
                  content: {
                    category: { name: 'ZEXAMPLE_CI_CATEGORY' },
                    implementingClass: { name: 'ZEXAMPLE_CL_CHECK_IMPL' },
                  },
                },
              },
            ],
          },
          {
            // Malformed entry: no category name, no checks
            checkCategoryObject: { description: 'Broken entry' },
            check: [],
          },
        ],
      },
    },
  };
}

function finding(
  checkId: string,
  overrides: Partial<AtcFinding> = {},
): AtcFinding {
  return {
    checkId,
    checkTitle: `Check ${checkId}`,
    messageId: '001',
    priority: 3,
    messageText: 'Some message',
    objectUri: '/sap/bc/adt/oo/classes/zcl_sample',
    objectType: 'CLAS',
    objectName: 'ZCL_SAMPLE',
    ...overrides,
  };
}

describe('parseCheckCategoryIndex', () => {
  it('maps implementing classes to category names', () => {
    const index = parseCheckCategoryIndex(formTemplateDocument());
    assert.equal(index.size, 3);
    assert.equal(index.get('CL_CI_TEST_SELECT_TAW_A'), 'CI_PERFORMANCE');
    assert.equal(index.get('CL_CI_TEST_SELECT_TAW_BYBUF'), 'CI_PERFORMANCE');
    assert.equal(index.get('ZEXAMPLE_CL_CHECK_IMPL'), 'ZEXAMPLE_CI_CATEGORY');
  });

  it('returns an empty index for missing or malformed documents', () => {
    assert.equal(parseCheckCategoryIndex(null).size, 0);
    assert.equal(parseCheckCategoryIndex(undefined).size, 0);
    assert.equal(parseCheckCategoryIndex({}).size, 0);
    assert.equal(parseCheckCategoryIndex({ formTemplate: {} }).size, 0);
    assert.equal(
      parseCheckCategoryIndex({
        formTemplate: { availableCheckCategories: {} },
      }).size,
      0,
    );
  });
});

describe('fetchCheckCategoryIndex', () => {
  it('builds the index through the client', async () => {
    const client = {
      adt: {
        atc: {
          checkvariants: {
            formtemplate: async () => formTemplateDocument(),
          },
        },
      },
    };
    const index = await fetchCheckCategoryIndex(client, 'DEFAULT');
    assert.equal(index.get('CL_CI_TEST_SELECT_TAW_A'), 'CI_PERFORMANCE');
  });

  it('never throws: client failures return an empty index', async () => {
    const warnings: string[] = [];
    const client = {
      adt: {
        atc: {
          checkvariants: {
            formtemplate: async () => {
              throw new Error('HTTP 404');
            },
          },
        },
      },
    };
    const index = await fetchCheckCategoryIndex(client, 'DEFAULT', {
      warn: (message) => warnings.push(message),
    });
    assert.equal(index.size, 0);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /Check category enrichment unavailable/);
  });
});

describe('enrichFindingsWithCategories', () => {
  it('enriches findings with known checkIds and skips unknown ones', () => {
    const index = parseCheckCategoryIndex(formTemplateDocument());
    const findings = [
      finding('CL_CI_TEST_SELECT_TAW_A'),
      finding('CL_UNKNOWN_CHECK'),
      finding('ZEXAMPLE_CL_CHECK_IMPL'),
    ];
    const enriched = enrichFindingsWithCategories(findings, index);
    assert.equal(enriched, 2);
    assert.equal(findings[0].checkCategory, 'CI_PERFORMANCE');
    assert.equal(findings[1].checkCategory, undefined);
    assert.equal(findings[2].checkCategory, 'ZEXAMPLE_CI_CATEGORY');
  });

  it('enriches a result in place', () => {
    const index = parseCheckCategoryIndex(formTemplateDocument());
    const result: AtcResult = {
      checkVariant: 'DEFAULT',
      totalFindings: 1,
      errorCount: 0,
      warningCount: 0,
      infoCount: 1,
      findings: [finding('CL_CI_TEST_SELECT_TAW_A')],
    };
    const enriched = enrichResultWithCategories(result, index);
    assert.equal(enriched, 1);
    assert.equal(result.findings[0].checkCategory, 'CI_PERFORMANCE');
  });
});

describe('resolveCategoriesViaDocumentation', () => {
  /** Live documentation page shape (2026-10-22), abridged. */
  const documentationHtml = `<h3>Appl. Comp. Check / Check Class / Message Code</h3><p>BC-ABA-LA / CL_CI_TEST_SELECT_TAW_A / 0501<br> </p><h3>Details of Analysis</h3><ul><li>Large table MARA: No WHERE condition</li></ul>`;

  it('parses the check class from the documentation page header line', () => {
    assert.equal(
      parseCheckClassFromDocumentation(documentationHtml),
      'CL_CI_TEST_SELECT_TAW_A',
    );
    assert.equal(
      parseCheckClassFromDocumentation('<p>no header</p>'),
      undefined,
    );
    // Namespaced implementing classes keep their namespace prefix
    assert.equal(
      parseCheckClassFromDocumentation(
        documentationHtml.replaceAll(
          'CL_CI_TEST_SELECT_TAW_A',
          '/NSP/CL_CI_EXAMPLE',
        ),
      ),
      '/NSP/CL_CI_EXAMPLE',
    );
  });

  it('bridges GUID checkIds to categories through the documentation page', async () => {
    const fetched: string[] = [];
    const client = {
      readTextBounded: async (uri: string) => {
        fetched.push(uri);
        // The out-of-catalog finding's page names a different class.
        if (uri.endsWith('/CCC/index/2')) {
          return documentationHtml.replaceAll(
            'CL_CI_TEST_SELECT_TAW_A',
            'CL_SOME_UNCATALOGUED_CLASS',
          );
        }
        return documentationHtml;
      },
    };
    const classToCategory = new Map([
      ['CL_CI_TEST_SELECT_TAW_A', 'CI_PERFORMANCE'],
    ]);
    const findings = [
      {
        // The real worklist shape: a GUID checkId, not a class name.
        checkId: '2C3E62BB1A9457158CC55162E1BF7932',
        documentationUri:
          '/sap/bc/adt/documentation/atc/documents/itemid/AAA/index/698',
      },
      {
        // Same documentation URI: the fetch is deduplicated.
        checkId: '2C3E62BB1A9457158CC55162E1BF7932',
        documentationUri:
          '/sap/bc/adt/documentation/atc/documents/itemid/AAA/index/698',
      },
      {
        // Already categorized: never re-fetched.
        checkId: 'CL_KNOWN_CLASS',
        checkCategory: 'CI_SYNTAX',
        documentationUri:
          '/sap/bc/adt/documentation/atc/documents/itemid/BBB/index/1',
      },
      {
        // Class outside the catalog: stays uncategorized.
        checkId: 'OTHER',
        documentationUri:
          '/sap/bc/adt/documentation/atc/documents/itemid/CCC/index/2',
      },
    ];
    const enriched = await resolveCategoriesViaDocumentation(
      client,
      findings,
      classToCategory,
    );
    assert.equal(enriched, 2);
    assert.equal(findings[0]!.checkCategory, 'CI_PERFORMANCE');
    assert.equal(findings[1]!.checkCategory, 'CI_PERFORMANCE');
    assert.equal(findings[3]!.checkCategory, undefined);
    // The deduplicated + skipped fetches: AAA once + CCC once (BBB skipped).
    assert.deepEqual(fetched.sort(), [
      '/sap/bc/adt/documentation/atc/documents/itemid/AAA/index/698',
      '/sap/bc/adt/documentation/atc/documents/itemid/CCC/index/2',
    ]);
  });

  it('skips the bridge without readTextBounded and never fails on fetch errors', async () => {
    const withoutRead = await resolveCategoriesViaDocumentation(
      {},
      [
        {
          checkId: 'X',
          documentationUri:
            '/sap/bc/adt/documentation/atc/documents/itemid/ABC/index/1',
        },
      ],
      new Map([['CL_X', 'CI_PERFORMANCE']]),
    );
    assert.equal(withoutRead, 0);

    const warnings: string[] = [];
    const failing = await resolveCategoriesViaDocumentation(
      {
        readTextBounded: async () => {
          throw new Error('HTTP 404');
        },
      },
      [
        {
          checkId: 'X',
          documentationUri:
            '/sap/bc/adt/documentation/atc/documents/itemid/ABC/index/1',
        },
      ],
      new Map([['CL_X', 'CI_PERFORMANCE']]),
      { logger: { warn: (message) => warnings.push(message) } },
    );
    assert.equal(failing, 0);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0]!, /documentation read failed/);
  });
});

describe('formatters', () => {
  it('GitLab Code Quality exports check_category when enriched', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'adt-atc-categories-'));
    temporaryDirectories.push(directory);
    const output = join(directory, 'gl-code-quality.json');
    const result: AtcResult = {
      checkVariant: 'DEFAULT',
      totalFindings: 2,
      errorCount: 0,
      warningCount: 0,
      infoCount: 2,
      findings: [
        finding('CL_CI_TEST_SELECT_TAW_A'),
        finding('CL_UNKNOWN_CHECK'),
      ],
    };
    enrichResultWithCategories(
      result,
      parseCheckCategoryIndex(formTemplateDocument()),
    );

    await outputGitLabCodeQuality(result, output);
    const report = JSON.parse(readFileSync(output, 'utf-8'));
    assert.equal(report.length, 2);
    assert.equal(report[0].check_category, 'CI_PERFORMANCE');
    assert.equal('check_category' in report[1], false);
    // The stable check identifier travels alongside the display title
    assert.equal(report[0].check_id, 'CL_CI_TEST_SELECT_TAW_A');
    assert.equal(report[1].check_id, 'CL_UNKNOWN_CHECK');
  });

  it('SARIF rule properties carry the category when enriched', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'adt-atc-categories-'));
    temporaryDirectories.push(directory);
    const output = join(directory, 'report.sarif');
    const result: AtcResult = {
      checkVariant: 'DEFAULT',
      totalFindings: 1,
      errorCount: 0,
      warningCount: 0,
      infoCount: 1,
      findings: [finding('CL_CI_TEST_SELECT_TAW_A')],
    };
    enrichResultWithCategories(
      result,
      parseCheckCategoryIndex(formTemplateDocument()),
    );

    await outputSarifReport(result, output);
    const sarif = JSON.parse(readFileSync(output, 'utf-8'));
    const rule = sarif.runs[0].tool.driver.rules[0];
    assert.equal(rule.id, 'CL_CI_TEST_SELECT_TAW_A');
    assert.equal(rule.properties.category, 'CI_PERFORMANCE');
  });

  it('SARIF rule properties omit the category when not enriched', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'adt-atc-categories-'));
    temporaryDirectories.push(directory);
    const output = join(directory, 'report.sarif');
    const result: AtcResult = {
      checkVariant: 'DEFAULT',
      totalFindings: 1,
      errorCount: 0,
      warningCount: 0,
      infoCount: 1,
      findings: [finding('CL_CI_TEST_SELECT_TAW_A')],
    };

    await outputSarifReport(result, output);
    const sarif = JSON.parse(readFileSync(output, 'utf-8'));
    const rule = sarif.runs[0].tool.driver.rules[0];
    assert.equal('category' in rule.properties, false);
  });
});
