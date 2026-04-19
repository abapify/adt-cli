import { defineConfig } from 'vitest/config';

/**
 * Dedicated Vitest config for real-SAP end-to-end tests.
 *
 * These tests live under `tests/real-e2e/` and are EXCLUDED from the default
 * `vitest.config.ts` so `nx test adt-cli` never tries to reach SAP.
 *
 * Run via `bunx nx run adt-cli:test:real` or directly with
 * `npx vitest run --config ./vitest.real.config.ts`.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/real-e2e/**/*.test.ts'],
    // Real SAP calls (and OAuth refresh) need a generous budget.
    testTimeout: 120_000,
    hookTimeout: 120_000,
    // Serialize — we share a single AdtClient per file and hitting SAP
    // in parallel hurts more than it helps on a Trial system.
    pool: 'forks',
    // Vitest 4 removed nested `poolOptions.forks.*` — use the top-level
    // `fileParallelism: false` to force sequential file execution.
    fileParallelism: false,
  },
});
