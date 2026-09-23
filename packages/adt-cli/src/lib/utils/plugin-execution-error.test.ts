import { describe, expect, it } from 'vitest';
import { formatPluginExecutionError } from './plugin-execution-error';

describe('formatPluginExecutionError', () => {
  it('renders a typed domain failure without its stack', () => {
    const error = Object.assign(
      new Error('Source history did not prove an exact transport boundary.'),
      { code: 'manifest_inexact' },
    );
    error.stack = 'internal stack that must not reach CI logs';

    expect(formatPluginExecutionError(error)).toBe(
      '❌ Command failed [manifest_inexact]: Source history did not prove an exact transport boundary.',
    );
  });

  it('renders allow-listed diagnostic details without leaking arbitrary fields', () => {
    const error = Object.assign(
      new Error('An indexed file differs from its recorded content hash.'),
      {
        code: 'working_tree_diverged',
        details: {
          object: 'CLAS/ZCL_SAMPLE',
          path: 'src/feature/zcl_sample.clas.abap',
          token: 'must-not-be-logged',
        },
      },
    );

    const rendered = formatPluginExecutionError(error);

    expect(rendered).toContain('object=CLAS/ZCL_SAMPLE');
    expect(rendered).toContain('path=src/feature/zcl_sample.clas.abap');
    expect(rendered).not.toContain('must-not-be-logged');
  });

  it('does not stringify an arbitrary thrown value', () => {
    expect(formatPluginExecutionError({ token: 'must-not-be-logged' })).toBe(
      '❌ Command failed: unexpected failure',
    );
  });

  it('does not leak messages from untyped errors', () => {
    const error = new Error('/secret/path token=abc123');

    expect(formatPluginExecutionError(error)).toBe(
      '❌ Command failed: unexpected failure',
    );
  });

  it('strips newlines and terminal control sequences from typed messages', () => {
    const error = Object.assign(
      new Error('line one\n\x1b[31mforged log line\x1b[0m\nline two'),
      { code: 'invalid_input' },
    );

    const rendered = formatPluginExecutionError(error);

    expect(rendered).toBe(
      '❌ Command failed [invalid_input]: line one forged log line line two',
    );
    expect(rendered).not.toContain('\n');
    expect(rendered).not.toContain('\x1b');
  });

  it('rejects codes that are not single-line identifiers', () => {
    const error = Object.assign(new Error('boom'), {
      code: 'fake_code\n❌ Command failed [forged]: injected',
    });

    expect(formatPluginExecutionError(error)).toBe(
      '❌ Command failed: unexpected failure',
    );
  });
});
