import { describe, it, expect } from 'vitest';
import { createCLI } from './cli';

describe('ADT CLI', () => {
  it('should create CLI program', async () => {
    const program = await createCLI();
    expect(program).toBeDefined();
    expect(program.name()).toBe('adt');
  });

  it('should register user command', async () => {
    const program = await createCLI();
    const commandNames = program.commands.map((c) => c.name());
    expect(commandNames).toContain('user');
  });
});
