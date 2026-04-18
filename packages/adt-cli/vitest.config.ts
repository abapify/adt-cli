import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Default test run: everything EXCEPT the real-SAP e2e tests. Those
    // live under `tests/real-e2e/` and are run via the separate
    // `vitest.real.config.ts` / Nx `test:real` target.
    exclude: [...configDefaults.exclude, 'tests/real-e2e/**'],
  },
});
