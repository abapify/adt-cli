import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'commands/atc': 'src/commands/atc.ts',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['@abapify/adt-plugin', '@abapify/adt-contracts', 'chalk'],
});
