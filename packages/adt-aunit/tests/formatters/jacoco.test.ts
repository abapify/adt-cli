import { describe, it, expect } from 'vitest';
import { fixtures } from '@abapify/adt-fixtures';
import { acoverageResult, acoverageStatements } from '@abapify/adt-schemas';
import {
  toJacocoXml,
  toSonarGenericCoverageXml,
} from '../../src/formatters/jacoco';

// Load parsed fixtures once.
async function loadCoverage() {
  const [mxml, sxml] = await Promise.all([
    fixtures.aunit.coverageMeasurements.load(),
    fixtures.aunit.coverageStatements.load(),
  ]);
  const measurements = acoverageResult.parse(mxml);
  const statements = acoverageStatements.parse(sxml);
  return { measurements, statements };
}

describe('toJacocoXml', () => {
  it('emits JaCoCo XML with DOCTYPE and root <report>', async () => {
    const { measurements, statements } = await loadCoverage();
    const xml = toJacocoXml({ measurements, statements });

    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain(
      '<!DOCTYPE report PUBLIC "-//JACOCO//DTD Report 1.1//EN" "report.dtd">',
    );
    expect(xml).toContain('<report name="ABAP Coverage">');
    expect(xml).toContain('</report>');
  });

  it('emits <package> nodes with the DEVC name', async () => {
    const { measurements, statements } = await loadCoverage();
    const xml = toJacocoXml({ measurements, statements });
    expect(xml).toContain('<package name="TEST_EXAMPLE_PACKAGE">');
  });

  it('emits JaCoCo counter rollups for branch/procedure/statement', async () => {
    const { measurements, statements } = await loadCoverage();
    const xml = toJacocoXml({ measurements, statements });

    expect(xml).toContain('<counter type="BRANCH"');
    expect(xml).toContain('<counter type="METHOD"');
    expect(xml).toContain('<counter type="INSTRUCTION"');
  });

  it('emits <sourcefile> with abapGit path convention', async () => {
    const { measurements, statements } = await loadCoverage();
    const xml = toJacocoXml({ measurements, statements });

    // Classes in the fixture are CL_EXAMPLE_CLASS and LCL_STUB_DECORATOR
    // (the latter is a testclass include).
    expect(xml).toContain('sourcefilename="cl_example_class.clas.abap"');
  });

  it('emits no <sourcefile> children when statements are missing', async () => {
    const { measurements } = await loadCoverage();
    const xml = toJacocoXml({ measurements });

    expect(xml).toContain('<report');
    // No per-line data because statements were not provided.
    expect(xml).not.toContain('<line nr=');
  });

  it('emits <line> entries with mi/ci/mb/cb attributes when data overlaps', async () => {
    // Build a synthetic input that aligns measurements (class name)
    // with statements (class in bulk response name). The shipped
    // sapcli fixtures intentionally come from two different systems,
    // so their class names don't overlap – we inject a minimal
    // measurements tree that references the same class ("FOO") as
    // the statements fixture.
    const { statements } = await loadCoverage();

    const injected = {
      result: {
        name: 'ADT_ROOT_NODE',
        nodes: {
          node: [
            {
              objectReference: { name: 'TEST_PKG', type: 'DEVC/K' },
              coverages: {
                coverage: [
                  { type: 'branch', total: 2, executed: 1 },
                  { type: 'procedure', total: 1, executed: 1 },
                  { type: 'statement', total: 10, executed: 8 },
                ],
              },
              nodes: {
                node: [
                  {
                    objectReference: {
                      uri: '/sap/bc/adt/oo/classes/foo/source/main#start=1,1',
                      name: 'FOO',
                      type: 'CLAS/OC',
                    },
                    coverages: {
                      coverage: [
                        { type: 'branch', total: 2, executed: 1 },
                        { type: 'procedure', total: 1, executed: 1 },
                        { type: 'statement', total: 10, executed: 8 },
                      ],
                    },
                    nodes: {
                      node: [
                        {
                          objectReference: {
                            uri: '/sap/bc/adt/oo/classes/foo/source/main#start=52,1',
                            name: 'METHOD_A',
                            type: 'CLAS/OM',
                          },
                          coverages: {
                            coverage: [
                              { type: 'statement', total: 6, executed: 6 },
                            ],
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    } as const;

    const xml = toJacocoXml({
      measurements: injected as never,
      statements,
    });

    // Now lines come through because class=FOO matches.
    expect(xml).toMatch(
      /<line nr="\d+" mi="(0|1)" ci="(0|1)" mb="0" cb="0"\/>/,
    );
    expect(xml).toContain('<sourcefile name="foo.clas.abap">');
  });

  it('honours an override reportName', async () => {
    const { measurements, statements } = await loadCoverage();
    const xml = toJacocoXml({
      measurements,
      statements,
      reportName: 'Parity Test',
    });
    expect(xml).toContain('<report name="Parity Test">');
  });
});

describe('toSonarGenericCoverageXml', () => {
  it('emits Sonar Generic Coverage XML with abapGit paths', async () => {
    const { statements } = await loadCoverage();

    const injected = {
      result: {
        name: 'ADT_ROOT_NODE',
        nodes: {
          node: [
            {
              objectReference: { name: 'TEST_PKG', type: 'DEVC/K' },
              nodes: {
                node: [
                  {
                    objectReference: {
                      uri: '/sap/bc/adt/oo/classes/foo/source/main#start=1,1',
                      name: 'FOO',
                      type: 'CLAS/OC',
                    },
                    nodes: {
                      node: [
                        {
                          objectReference: {
                            uri: '/sap/bc/adt/oo/classes/foo/source/main#start=52,1',
                            name: 'METHOD_A',
                            type: 'CLAS/OM',
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    } as const;

    const xml = toSonarGenericCoverageXml({
      measurements: injected as never,
      statements,
    });

    expect(xml).toContain('<coverage version="1">');
    expect(xml).toContain('<file path="src/foo.clas.abap">');
    expect(xml).toMatch(
      /<lineToCover lineNumber="\d+" covered="(true|false)"\/>/,
    );
    expect(xml).toContain('</coverage>');
  });
});
