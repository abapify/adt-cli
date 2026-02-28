// tsdown.config.ts
import { defineConfig } from 'tsdown';
import baseConfig from '../../tsdown.config.ts';

export default defineConfig({
  ...baseConfig,
  entry: ['./src/index.ts', './src/bin/adt.ts'],
  tsconfig: 'tsconfig.lib.json',
  // Force bundle these packages instead of marking as external
  deps: { alwaysBundle: ['@abapify/adt-plugin-abapgit'] },
});
