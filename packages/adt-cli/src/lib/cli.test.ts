import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

import { createCLI, getResolvedConfigPath } from './cli';
import type { Command } from 'commander';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('ADT CLI', () => {
  // createCLI() registers Commander.js singleton instances, so each
  // subsequent call would fail with "cannot add command X as already have command X".
  // Share a single program instance across all assertions in this suite.
  let program: Command;
  const originalArgv = process.argv;
  const originalCwd = process.cwd();
  const testCwd = mkdtempSync(join(tmpdir(), 'adt-cli-config-'));
  const explicitConfigPath = join(testCwd, 'explicit.config.ts');
  const consoleError = vi
    .spyOn(console, 'error')
    .mockImplementation(() => undefined);

  beforeAll(async () => {
    writeFileSync(
      join(testCwd, 'adt.config.ts'),
      "throw new Error('cwd configuration must not be loaded');",
    );
    writeFileSync(explicitConfigPath, 'export default { commands: [] };');
    process.chdir(testCwd);
    process.argv = ['node', 'adt', '--config', explicitConfigPath];
    program = await createCLI();
  });

  afterAll(() => {
    process.argv = originalArgv;
    process.chdir(originalCwd);
    consoleError.mockRestore();
    rmSync(testCwd, { recursive: true, force: true });
  });

  it('should create CLI program', () => {
    expect(program).toBeDefined();
    expect(program.name()).toBe('adt');
  });

  it('uses the explicit config while registering static plugins', () => {
    expect(consoleError).not.toHaveBeenCalled();
  });

  it.each(['gcts', 'user', 'interface', 'program'])(
    'should register the %s command',
    (commandName) => {
      const commandNames = program.commands.map((c) => c.name());
      expect(commandNames).toContain(commandName);
    },
  );

  it('should register package command with subcommands', () => {
    const commandNames = program.commands.map((c) => c.name());
    expect(commandNames).toContain('package');
    const pkgCmd = program.commands.find((c) => c.name() === 'package');
    const subNames = pkgCmd!.commands.map((c) => c.name());
    expect(subNames).toContain('create');
    expect(subNames).toContain('list');
    expect(subNames).toContain('delete');
    expect(subNames).toContain('activate');
    expect(subNames).toContain('stat');
  });

  it('should register class command with CRUD subcommands', () => {
    const classCmd = program.commands.find((c) => c.name() === 'class');
    expect(classCmd).toBeDefined();
    const subNames = classCmd!.commands.map((c) => c.name());
    expect(subNames).toContain('create');
    expect(subNames).toContain('read');
    expect(subNames).toContain('write');
    expect(subNames).toContain('activate');
    expect(subNames).toContain('delete');
  });

  it('should register ddic commands (domain, dataelement, table, structure)', () => {
    const commandNames = program.commands.map((c) => c.name());
    expect(commandNames).toContain('domain');
    expect(commandNames).toContain('dataelement');
    expect(commandNames).toContain('table');
    expect(commandNames).toContain('structure');
  });

  it('should register ddl and dcl commands', () => {
    const commandNames = program.commands.map((c) => c.name());
    expect(commandNames).toContain('ddl');
    expect(commandNames).toContain('dcl');
  });

  it('should register datapreview command with osql subcommand', () => {
    const commandNames = program.commands.map((c) => c.name());
    expect(commandNames).toContain('datapreview');
    const dpCmd = program.commands.find((c) => c.name() === 'datapreview');
    const subNames = dpCmd!.commands.map((c) => c.name());
    expect(subNames).toContain('osql');
  });

  it('should register abap command with run subcommand', () => {
    const commandNames = program.commands.map((c) => c.name());
    expect(commandNames).toContain('abap');
    const abapCmd = program.commands.find((c) => c.name() === 'abap');
    const subNames = abapCmd!.commands.map((c) => c.name());
    expect(subNames).toContain('run');
  });

  it('should register checkout command with type subcommands', () => {
    const commandNames = program.commands.map((c) => c.name());
    expect(commandNames).toContain('checkout');
    const coCmd = program.commands.find((c) => c.name() === 'checkout');
    const subNames = coCmd!.commands.map((c) => c.name());
    expect(subNames).toContain('class');
    expect(subNames).toContain('interface');
    expect(subNames).toContain('program');
    expect(subNames).toContain('package');
    expect(subNames).toContain('ddl');
    expect(subNames).toContain('dcl');
  });
});

describe('getResolvedConfigPath', () => {
  it('resolves the space-separated config option value', () => {
    expect(
      getResolvedConfigPath(['node', 'adt', '--config', '/tmp/adt.config.ts']),
    ).toBe('/tmp/adt.config.ts');
  });

  it('resolves the inline config option value', () => {
    expect(
      getResolvedConfigPath(['node', 'adt', '--config=/tmp/adt.config.ts']),
    ).toBe('/tmp/adt.config.ts');
  });

  it.each([
    ['missing value', ['node', 'adt', '--config']],
    ['empty separated value', ['node', 'adt', '--config', '']],
    ['empty inline value', ['node', 'adt', '--config=']],
  ])('rejects a %s', (_description, argv) => {
    expect(() => getResolvedConfigPath(argv)).toThrow(
      "option '--config <path>' argument missing",
    );
  });

  it.each([
    ['separated', ['node', 'adt', '--', '--config', '/tmp/adt.config.ts']],
    ['inline', ['node', 'adt', '--', '--config=/tmp/adt.config.ts']],
  ])(
    'ignores the %s config option after the -- terminator',
    (_description, argv) => {
      expect(getResolvedConfigPath(argv)).toBeUndefined();
    },
  );

  it('resolves the config option before the -- terminator only', () => {
    expect(
      getResolvedConfigPath([
        'node',
        'adt',
        '--config',
        '/tmp/before.config.ts',
        '--',
        '--config=/tmp/after.config.ts',
      ]),
    ).toBe('/tmp/before.config.ts');
  });
});
