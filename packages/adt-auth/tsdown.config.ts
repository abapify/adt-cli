import { defineConfig } from 'tsdown';
import baseConfig from '../../tsdown.config.ts';

export default defineConfig({
  ...baseConfig,
  entry: {
    index: 'src/index.ts',
    'plugins/basic': 'src/plugins/basic.ts',
    basic: 'src/plugins/basic.ts',
  },
  tsconfig: 'tsconfig.lib.json',
});
