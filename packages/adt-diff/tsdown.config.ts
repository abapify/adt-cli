import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/commands/diff.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: [/^@abapify\//, 'chalk', 'diff', 'fast-xml-parser'],
});
