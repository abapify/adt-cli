import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'commands/aunit': 'src/commands/aunit.ts',
    'formatters/jacoco': 'src/formatters/jacoco.ts',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  deps: {
    skipNodeModulesBundle: true,
  },
  external: [
    '@abapify/adt-plugin',
    '@abapify/adt-contracts',
    '@abapify/adt-schemas',
    '@abapify/adt-plugin-abapgit',
  ],
});
