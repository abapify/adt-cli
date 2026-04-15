import { describe, it, expect } from 'vitest';
import { toSonarXml } from '../../src/formatters/sonar';
import type { AunitResult } from '../../src/types';

// ── fixtures ──────────────────────────────────────────────────────────────────

function makeResult(overrides: Partial<AunitResult> = {}): AunitResult {
  return {
    programs: [],
    totalTests: 0,
    passCount: 0,
    failCount: 0,
    errorCount: 0,
    skipCount: 0,
    totalTime: 0,
    ...overrides,
  };
}

const PASSING_METHOD = {
  name: 'test_always_passes',
  executionTime: 0.012,
  status: 'pass' as const,
  alerts: [],
};

const FAILING_METHOD = {
  name: 'test_always_fails',
  executionTime: 0.008,
  status: 'fail' as const,
  alerts: [
    {
      kind: 'failedAssertion',
      severity: 'critical',
      title: 'Assertion failed: 1 = 2',
      details: ['Expected: 1', 'Actual: 2'],
      stack: [
        {
          uri: '/sap/bc/adt/oo/classes/zcl_example',
          name: 'ZCL_EXAMPLE',
          description: 'ZCL_EXAMPLE=>TEST_ALWAYS_FAILS',
        },
      ],
    },
  ],
};

const ERROR_METHOD = {
  name: 'test_with_error',
  executionTime: 0,
  status: 'error' as const,
  alerts: [
    {
      kind: 'warning',
      severity: 'critical',
      title: 'Unexpected exception',
      details: [],
      stack: [],
    },
  ],
};

const SKIP_METHOD = {
  name: 'test_skipped',
  executionTime: 0,
  status: 'skip' as const,
  alerts: [],
};

// ── tests ─────────────────────────────────────────────────────────────────────

describe('toSonarXml', () => {
  it('produces valid XML declaration and root element for empty result', () => {
    const xml = toSonarXml(makeResult());
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<testExecutions version="1">');
    expect(xml).toContain('</testExecutions>');
  });

  it('produces no <file> elements when there are no programs', () => {
    const xml = toSonarXml(makeResult());
    expect(xml).not.toContain('<file');
  });

  it('produces no <file> element when program has no test classes', () => {
    const result = makeResult({
      programs: [
        {
          name: 'ZCL_EMPTY',
          type: 'CLAS/OC',
          testClasses: [],
        },
      ],
    });
    const xml = toSonarXml(result);
    expect(xml).not.toContain('<file');
  });

  it('maps CLAS type to src/<name>.clas.abap path', () => {
    const result = makeResult({
      programs: [
        {
          name: 'ZCL_EXAMPLE',
          type: 'CLAS/OC',
          testClasses: [
            {
              name: 'LTCL_TEST',
              methods: [PASSING_METHOD],
            },
          ],
        },
      ],
    });
    const xml = toSonarXml(result);
    expect(xml).toContain('path="src/zcl_example.clas.abap"');
  });

  it('maps PROG type to src/<name>.prog.abap path', () => {
    const result = makeResult({
      programs: [
        {
          name: 'ZMYPROGRAM',
          type: 'PROG/P',
          testClasses: [
            {
              name: 'LTCL_TEST',
              methods: [PASSING_METHOD],
            },
          ],
        },
      ],
    });
    const xml = toSonarXml(result);
    expect(xml).toContain('path="src/zmyprogram.prog.abap"');
  });

  it('maps unknown type to src/<name>.abap fallback path', () => {
    const result = makeResult({
      programs: [
        {
          name: 'ZSOME_OBJ',
          type: 'TABL',
          testClasses: [{ name: 'LTCL_T', methods: [PASSING_METHOD] }],
        },
      ],
    });
    const xml = toSonarXml(result);
    expect(xml).toContain('path="src/zsome_obj.abap"');
  });

  it('emits self-closing <testCase> for passing tests', () => {
    const result = makeResult({
      programs: [
        {
          name: 'ZCL_EXAMPLE',
          type: 'CLAS/OC',
          testClasses: [{ name: 'LTCL_TEST', methods: [PASSING_METHOD] }],
        },
      ],
    });
    const xml = toSonarXml(result);
    expect(xml).toContain(
      '<testCase name="LTCL_TEST.test_always_passes" duration="12" />',
    );
  });

  it('emits self-closing <testCase> for skipped tests', () => {
    const result = makeResult({
      programs: [
        {
          name: 'ZCL_EXAMPLE',
          type: 'CLAS/OC',
          testClasses: [{ name: 'LTCL_TEST', methods: [SKIP_METHOD] }],
        },
      ],
    });
    const xml = toSonarXml(result);
    expect(xml).toContain(
      '<testCase name="LTCL_TEST.test_skipped" duration="0" />',
    );
  });

  it('emits <failure> element for failing tests', () => {
    const result = makeResult({
      programs: [
        {
          name: 'ZCL_EXAMPLE',
          type: 'CLAS/OC',
          testClasses: [{ name: 'LTCL_TEST', methods: [FAILING_METHOD] }],
        },
      ],
    });
    const xml = toSonarXml(result);
    expect(xml).toContain('<failure message="Assertion failed: 1 = 2"');
    expect(xml).toContain('</failure>');
  });

  it('emits <error> element for errored tests', () => {
    const result = makeResult({
      programs: [
        {
          name: 'ZCL_EXAMPLE',
          type: 'CLAS/OC',
          testClasses: [{ name: 'LTCL_TEST', methods: [ERROR_METHOD] }],
        },
      ],
    });
    const xml = toSonarXml(result);
    expect(xml).toContain('<error message="Unexpected exception"');
    expect(xml).toContain('</error>');
  });

  it('rounds execution time to milliseconds', () => {
    const result = makeResult({
      programs: [
        {
          name: 'ZCL_EXAMPLE',
          type: 'CLAS/OC',
          testClasses: [
            {
              name: 'LTCL_TEST',
              methods: [{ ...PASSING_METHOD, executionTime: 1.2345 }],
            },
          ],
        },
      ],
    });
    const xml = toSonarXml(result);
    // 1.2345s * 1000 = 1234.5 → round = 1235
    expect(xml).toContain('duration="1235"');
  });

  it('escapes XML special characters in test names', () => {
    const result = makeResult({
      programs: [
        {
          name: 'ZCL_EXAMPLE',
          type: 'CLAS/OC',
          testClasses: [
            {
              name: 'LTCL_TEST',
              methods: [
                {
                  ...PASSING_METHOD,
                  name: 'test_with_<special>&chars"',
                },
              ],
            },
          ],
        },
      ],
    });
    const xml = toSonarXml(result);
    expect(xml).toContain(
      'name="LTCL_TEST.test_with_&lt;special&gt;&amp;chars&quot;"',
    );
  });

  it('escapes XML special characters in failure message', () => {
    const result = makeResult({
      programs: [
        {
          name: 'ZCL_EXAMPLE',
          type: 'CLAS/OC',
          testClasses: [
            {
              name: 'LTCL_TEST',
              methods: [
                {
                  ...FAILING_METHOD,
                  alerts: [
                    {
                      kind: 'failedAssertion',
                      severity: 'critical',
                      title: 'Expected <foo> but got <bar>',
                      details: [],
                      stack: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    const xml = toSonarXml(result);
    expect(xml).toContain('message="Expected &lt;foo&gt; but got &lt;bar&gt;"');
  });

  it('handles multiple programs and classes correctly', () => {
    const result = makeResult({
      programs: [
        {
          name: 'ZCL_A',
          type: 'CLAS/OC',
          testClasses: [{ name: 'LTCL_A', methods: [PASSING_METHOD] }],
        },
        {
          name: 'ZCL_B',
          type: 'CLAS/OC',
          testClasses: [{ name: 'LTCL_B', methods: [FAILING_METHOD] }],
        },
      ],
    });
    const xml = toSonarXml(result);
    expect(xml).toContain('path="src/zcl_a.clas.abap"');
    expect(xml).toContain('path="src/zcl_b.clas.abap"');
    expect(xml).toContain('LTCL_A.test_always_passes');
    expect(xml).toContain('LTCL_B.test_always_fails');
  });

  it('includes stack trace details in failure body', () => {
    const result = makeResult({
      programs: [
        {
          name: 'ZCL_EXAMPLE',
          type: 'CLAS/OC',
          testClasses: [{ name: 'LTCL_TEST', methods: [FAILING_METHOD] }],
        },
      ],
    });
    const xml = toSonarXml(result);
    expect(xml).toContain('ZCL_EXAMPLE=&gt;TEST_ALWAYS_FAILS');
  });
});
