import { defineConfig } from 'tsdown';
import baseConfig from '../../tsdown.config.ts';

export default defineConfig({
  ...baseConfig,
  entry: {
    index: 'src/index.ts',
    'plugins/basic': 'src/plugins/basic.ts',
    basic: 'src/plugins/basic.ts',
    'plugins/service-key': 'src/plugins/service-key.ts',
    'service-key': 'src/plugins/service-key.ts',
    'utils/env': 'src/utils/env.ts',
  },
  tsconfig: 'tsconfig.lib.json',
});
