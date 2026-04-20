import { defineConfig } from 'tsdown';
import baseConfig from '../../tsdown.config.ts';

export default defineConfig({
  ...baseConfig,
  entry: {
    index: 'src/index.ts',
    mock: 'src/lib/mock/index.ts',
    'bin/adt-mcp': 'src/bin/adt-mcp.ts',
  },
});
