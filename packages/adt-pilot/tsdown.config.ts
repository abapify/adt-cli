import { defineConfig } from 'tsdown';
import baseConfig from '../../tsdown.config.ts';

export default defineConfig({
  ...baseConfig,
  entry: {
    index: 'src/index.ts',
  },
  tsconfig: 'tsconfig.lib.json',
  // @mastra/core has extremely complex generics + Zod schemas cannot be annotated
  // for isolatedDeclarations. DTS generation is disabled to avoid OOM (same
  // pattern as adt-mcp typecheck). TypeScript users can reference the source
  // directly via moduleResolution:bundler.
  dts: false,
});
