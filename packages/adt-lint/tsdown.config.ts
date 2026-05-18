import { defineConfig } from 'tsdown';
import baseConfig from '../../tsdown.config.ts';

export default defineConfig({
  ...baseConfig,
  entry: ['src/index.ts'],
  tsconfig: 'tsconfig.lib.json',
  dts: true,
});
