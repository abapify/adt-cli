import { defineConfig } from 'tsdown';
import baseConfig from '../../tsdown.config.ts';

export default defineConfig({
  ...baseConfig,
  entry: {
    '.': 'src/index.ts',
    './basic': 'src/plugins/basic.ts',
    './plugins/basic': 'src/plugins/basic.ts',
  },
  tsconfig: 'tsconfig.lib.json',
});
