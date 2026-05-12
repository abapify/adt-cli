import { describe, expect, it } from 'vitest';
import {
  buildPreset,
  detectMethodBoundary,
  extractDependencies,
  lintAndFix,
  lintSource,
  listRules,
  stripToPublicApi,
} from '../src';

describe('adt-lint', () => {
  it('lintSource reports diagnostics', () => {
    const diagnostics = lintSource('report zfoo.');
    expect(diagnostics.some((d) => d.key === 'keyword_case')).toBe(true);
  });

  it('lintAndFix applies auto-fixes', () => {
    const result = lintAndFix('report zfoo.');
    expect(result.source).toContain('REPORT zfoo.');
  });

  it('listRules returns cloud_types with enabled flag', () => {
    const rules = listRules({ systemType: 'btp' });
    const cloud = rules.find((r) => r.key === 'cloud_types');
    expect(cloud?.enabled).toBe(true);
  });

  it('buildPreset disables cloud_types for onpremise', () => {
    const preset = buildPreset('onpremise') as {
      rules?: Record<string, unknown>;
    };
    expect(preset.rules?.cloud_types).toBeUndefined();
  });

  it('stripToPublicApi strips class implementation and private sections', () => {
    const source = `
CLASS zcl_demo DEFINITION PUBLIC CREATE PUBLIC.
  PUBLIC SECTION.
    METHODS m.
  PRIVATE SECTION.
    DATA mv_i TYPE i.
ENDCLASS.

CLASS zcl_demo IMPLEMENTATION.
  METHOD m.
    mv_i = 1.
  ENDMETHOD.
ENDCLASS.
`;

    const result = stripToPublicApi(source, 'CLAS');
    expect(result.fallback).toBe(false);
    expect(result.source).toContain('PUBLIC SECTION.');
    expect(result.source).not.toContain('PRIVATE SECTION.');
    expect(result.source).not.toContain('CLASS zcl_demo IMPLEMENTATION');
  });

  it('extractDependencies finds custom symbols', () => {
    const source = `
CLASS zcl_demo DEFINITION PUBLIC CREATE PUBLIC.
  PUBLIC SECTION.
    INTERFACES zif_contract.
ENDCLASS.
CLASS zcl_demo IMPLEMENTATION.
  METHOD run.
    DATA lo_dep TYPE REF TO zcl_dep.
    lo_dep = NEW zcl_dep( ).
    lo_dep->do( ).
    zcl_static=>call( ).
  ENDMETHOD.
ENDCLASS.
`;
    const deps = extractDependencies(source);
    expect(deps).toEqual(
      expect.arrayContaining(['ZCL_DEP', 'ZCL_STATIC', 'ZIF_CONTRACT']),
    );
  });

  it('detectMethodBoundary finds method boundaries', () => {
    const source = `
CLASS zcl_demo IMPLEMENTATION.
  METHOD run.
    WRITE 'X'.
  ENDMETHOD.
ENDCLASS.
`;
    const boundary = detectMethodBoundary(source, 'run');
    expect(boundary).toEqual({ startLine: 3, endLine: 5 });
  });

  it('detectMethodBoundary handles inline comments', () => {
    const source = `
CLASS zcl_demo IMPLEMENTATION.
  METHOD run. " entry point
    WRITE 'X'.
  ENDMETHOD. " run
ENDCLASS.
`;
    const boundary = detectMethodBoundary(source, 'run');
    expect(boundary).toEqual({ startLine: 3, endLine: 5 });
  });

  it('detectMethodBoundary returns null for ambiguous matches', () => {
    const source = `
CLASS zcl_demo IMPLEMENTATION.
  METHOD run.
    WRITE 'X'.
  ENDMETHOD.
ENDCLASS.
CLASS lcl_test IMPLEMENTATION.
  METHOD run.
    WRITE 'Y'.
  ENDMETHOD.
ENDCLASS.
`;
    const boundary = detectMethodBoundary(source, 'run');
    expect(boundary).toBeNull();
  });
});
