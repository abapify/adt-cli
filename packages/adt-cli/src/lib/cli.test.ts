import { describe, it, expect, beforeAll } from 'vitest';
import { createCLI } from './cli';
import type { Command } from 'commander';

describe('ADT CLI', () => {
  // createCLI() registers Commander.js singleton instances, so each
  // subsequent call would fail with "cannot add command X as already have command X".
  // Share a single program instance across all assertions in this suite.
  let program: Command;

  beforeAll(async () => {
    program = await createCLI();
  });

  it('should create CLI program', () => {
    expect(program).toBeDefined();
    expect(program.name()).toBe('adt');
  });

  it('should register user command', () => {
    const commandNames = program.commands.map((c) => c.name());
    expect(commandNames).toContain('user');
  });

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

  it('should register interface command', () => {
    const commandNames = program.commands.map((c) => c.name());
    expect(commandNames).toContain('interface');
  });

  it('should register program command', () => {
    const commandNames = program.commands.map((c) => c.name());
    expect(commandNames).toContain('program');
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
