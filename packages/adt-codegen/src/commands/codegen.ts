/**
 * Codegen Command Plugin
 *
 * CLI-agnostic command for code generation from ADT discovery data.
 * This is the main plugin command with subcommands like 'contracts'.
 *
 * NOTE: This plugin expects config to be loaded by the CLI and passed via ctx.config.
 * It does NOT load config itself - that's the CLI's responsibility.
 */

import type { CliCommandPlugin } from '@abapify/adt-plugin';
import { contractsCommand } from './contracts';

/**
 * Codegen command - main entry point for code generation
 */
export const codegenCommand: CliCommandPlugin = {
  name: 'codegen',
  description: 'Generate code from ADT discovery data',

  options: [],

  // Contracts is a subcommand of codegen
  subcommands: [contractsCommand],

  async execute(_args, ctx) {
    // Run full codegen framework
    ctx.logger.info('🔄 Running codegen framework...\n');

    const { CodegenFramework } = await import('../framework');

    // Config is loaded by CLI and passed via context
    const codegenConfig = ctx.config.codegen;

    if (!codegenConfig) {
      ctx.logger.error('❌ No codegen config found in adt.config.ts');
      ctx.logger.error(
        '   Add a "codegen" section with framework configuration',
      );
      process.exit(1);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const framework = new CodegenFramework(codegenConfig as any);
    await framework.run();

    ctx.logger.info('\n✅ Codegen complete!');
  },
};

export default codegenCommand;
