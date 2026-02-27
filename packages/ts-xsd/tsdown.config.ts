import { defineConfig } from 'tsdown';
import baseConfig from '../../tsdown.config.ts';

export default defineConfig({
  ...baseConfig,
  entry: ['src/index.ts', 'src/generators/index.ts', 'src/codegen/cli.ts'],
  external: [/^node:/],
});
