// tsdown.config.ts
import { defineConfig } from 'tsdown';
import baseConfig from '../../tsdown.config.ts';

export default defineConfig({
  ...baseConfig,
  entry: ['./src/index.ts', './src/bin/adt.ts', './src/bin/adt-all.ts'],
  tsconfig: 'tsconfig.lib.json',
});
