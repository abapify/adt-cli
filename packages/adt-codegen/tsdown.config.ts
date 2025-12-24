import { defineConfig } from 'tsdown';
import baseConfig from '../../tsdown.config.ts';

export default defineConfig({
  ...baseConfig,
  entry: [
    'src/index.ts',
    'src/cli.ts',
    'src/plugins/index.ts',
    'src/commands/codegen.ts',
  ],
  shims: true,
});
