import { defineConfig } from 'tsdown';

/** Base config options - spread into package configs */
export const baseOptions = {
  platform: 'node' as const,
  target: 'esnext' as const,
  format: ['esm'] as ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  exports: {
    devExports: 'abapify',
  },
  shims: true,
};

export default defineConfig(baseOptions);
