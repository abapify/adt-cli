import { describe, expect, it } from 'vitest';
import {
  buildProgram,
  buildGenerateOptions,
  type GenerateOptions,
} from '../src/cli';

function captureHelp(program: ReturnType<typeof buildProgram>): string {
  return program.helpInformation();
}

describe('openai-codegen CLI', () => {
  it('advertises every documented flag in --help output', () => {
    const program = buildProgram();
    const help = captureHelp(program);
    expect(help).toMatch(/--input <path>/);
    expect(help).toMatch(/--out <dir>/);
    expect(help).toMatch(/--base <name>/);
    expect(help).toMatch(/--types-interface <name>/);
    expect(help).toMatch(/--operations-interface <name>/);
    expect(help).toMatch(/--class-name <name>/);
    expect(help).toMatch(/--exception-class <name>/);
    expect(help).toMatch(/--format <list>/);
    expect(help).toMatch(/--target <profile>/);
    expect(help).toMatch(/--description <text>/);
  });

  it('rejects missing required flags', async () => {
    const program = buildProgram();
    program.configureOutput({
      writeOut: () => undefined,
      writeErr: () => undefined,
    });
    await expect(
      program.parseAsync(['node', 'cli', '--input', './spec.yaml']),
    ).rejects.toMatchObject({ code: 'commander.missingMandatoryOptionValue' });
  });

  it('buildGenerateOptions produces a valid shape from minimal args', () => {
    const opts: GenerateOptions = buildGenerateOptions({
      input: './spec.yaml',
      out: './out',
      base: 'petstore',
    });
    expect(opts.input).toBe('./spec.yaml');
    expect(opts.out).toBe('./out');
    expect(opts.target).toBe('s4-cloud');
    expect(opts.formats).toEqual(['abapgit']);
    expect(opts.names.implementationClass).toBe('ZCL_PETSTORE');
    expect(opts.names.typesInterface).toBe('ZIF_PETSTORE_TYPES');
  });

  it('parses a comma-separated --format list', () => {
    const opts = buildGenerateOptions({
      input: 'a',
      out: 'b',
      base: 'shop',
      format: 'abapgit,gcts',
    });
    expect(opts.formats).toEqual(['abapgit', 'gcts']);
  });

  it('rejects unknown --format values', () => {
    expect(() =>
      buildGenerateOptions({
        input: 'a',
        out: 'b',
        base: 'shop',
        format: 'unknown',
      }),
    ).toThrow(/unknown format "unknown"/);
  });

  it('rejects unknown --format values when provided via commander', async () => {
    const program = buildProgram();
    program.configureOutput({
      writeOut: () => undefined,
      writeErr: () => undefined,
    });
    await expect(
      program.parseAsync([
        'node',
        'cli',
        '--input',
        'a',
        '--out',
        'b',
        '--base',
        'shop',
        '--format',
        'bogus',
      ]),
    ).rejects.toBeTruthy();
  });

  it('produces non-default target when --target is supplied', () => {
    const opts = buildGenerateOptions({
      input: 'a',
      out: 'b',
      base: 'shop',
      target: 's4-onprem',
    });
    expect(opts.target).toBe('s4-onprem');
  });

  it('carries description through buildGenerateOptions', () => {
    const opts = buildGenerateOptions({
      input: 'a',
      out: 'b',
      base: 'shop',
      description: 'Petstore client',
    });
    expect(opts.description).toBe('Petstore client');
  });

  it('honours individual name overrides', () => {
    const opts = buildGenerateOptions({
      input: 'a',
      out: 'b',
      typesInterface: 'ZIF_X_TYPES',
      operationsInterface: 'ZIF_X',
      className: 'ZCL_X',
      exceptionClass: 'ZCX_X_ERROR',
    });
    expect(opts.names.implementationClass).toBe('ZCL_X');
    expect(opts.names.exceptionClass).toBe('ZCX_X_ERROR');
  });

  it('fails when neither --base nor name overrides are given', () => {
    expect(() => buildGenerateOptions({ input: 'a', out: 'b' })).toThrow(
      /base.*or.*overrides/i,
    );
  });
});
