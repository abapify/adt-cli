import { describe, expect, it } from 'vitest';
import { Registry, MemoryFile, Issue } from '@abaplint/core';
import {
  mapResponseHandling,
  type ResponseMapperOptions,
} from '../src/emit/response-mapper';
import type { NormalizedOperation, NormalizedResponse } from '../src/oas/types';

function makeOp(responses: NormalizedResponse[]): NormalizedOperation {
  return {
    operationId: 'test_op',
    method: 'get',
    path: '/t',
    tags: [],
    deprecated: false,
    parameters: [],
    responses,
    security: [],
  };
}

function resp(
  statusCode: string,
  overrides: Partial<NormalizedResponse> = {},
): NormalizedResponse {
  const isSuccess = /^2\d\d$/.test(statusCode);
  const isError = /^(4|5)\d\d$/.test(statusCode);
  return {
    statusCode,
    isSuccess,
    isError,
    content: {},
    headers: {},
    ...overrides,
  };
}

const baseOpts: ResponseMapperOptions = {
  exceptionClassName: 'zcx_petstore_error',
  localJsonClassName: 'json',
  successBody: { kind: 'json', returningName: 'result' },
};

function parseErrors(source: string): readonly Issue[] {
  // Wrap the CASE block in a probe class so abaplint can parse it.
  const probe = `CLASS zcl_probe DEFINITION PUBLIC CREATE PUBLIC.
  PUBLIC SECTION.
    METHODS run.
ENDCLASS.
CLASS zcl_probe IMPLEMENTATION.
  METHOD run.
${source
  .split('\n')
  .map((l) => '    ' + l)
  .join('\n')}
  ENDMETHOD.
ENDCLASS.
`;
  const reg = new Registry().addFile(
    new MemoryFile('zcl_probe.clas.abap', probe),
  );
  reg.parse();
  return reg.findIssues().filter((i) => i.getKey() === 'parser_error');
}

describe('mapResponseHandling', () => {
  it('emits CASE with 200 JSON, 400/404 errors and default → WHEN OTHERS', () => {
    const op = makeOp([
      resp('200', { isSuccess: true }),
      resp('400', { description: 'Bad request' }),
      resp('404', { description: 'Not found' }),
      resp('default', {
        isSuccess: false,
        isError: true,
        description: 'Unexpected error',
      }),
    ]);
    const result = mapResponseHandling(op, baseOpts);
    expect(result.source).toMatchInlineSnapshot(`
      "CASE response->status( ).
        WHEN 200.
          json=>parse( response->body( ) )->to( REF #( result ) ).
        WHEN 400.
          RAISE EXCEPTION NEW zcx_petstore_error(
            status      = 400
            description = 'Bad request'
            body        = response->body( ) ).
        WHEN 404.
          RAISE EXCEPTION NEW zcx_petstore_error(
            status      = 404
            description = 'Not found'
            body        = response->body( ) ).
        WHEN OTHERS.
          RAISE EXCEPTION NEW zcx_petstore_error(
            status      = response->status( )
            description = 'Unexpected error'
            body        = response->body( ) ).
      ENDCASE."
    `);
    // statement AST round-trip
    expect(result.statement.kind).toBe('Raw');
    expect(parseErrors(result.source)).toEqual([]);
  });

  it('empty-body 204 success emits abap_true and a fallback WHEN OTHERS', () => {
    const op = makeOp([resp('204', { isSuccess: true })]);
    const result = mapResponseHandling(op, {
      ...baseOpts,
      successBody: { kind: 'empty', returningName: 'success' },
    });
    expect(result.source).toContain('WHEN 204.');
    expect(result.source).toContain('success = abap_true.');
    expect(result.source).toContain('WHEN OTHERS.');
    expect(parseErrors(result.source)).toEqual([]);
  });

  it('binary 200 assigns response->body( ) directly', () => {
    const op = makeOp([resp('200', { isSuccess: true })]);
    const result = mapResponseHandling(op, {
      ...baseOpts,
      successBody: { kind: 'binary', returningName: 'result' },
    });
    expect(result.source).toContain('WHEN 200.');
    expect(result.source).toContain('result = response->body( ).');
    expect(parseErrors(result.source)).toEqual([]);
  });

  it('escapes single quotes in error descriptions', () => {
    const op = makeOp([
      resp('200', { isSuccess: true }),
      resp('418', { description: "Don't panic" }),
    ]);
    const result = mapResponseHandling(op, baseOpts);
    expect(result.source).toContain("description = 'Don''t panic'");
    expect(parseErrors(result.source)).toEqual([]);
  });
});
