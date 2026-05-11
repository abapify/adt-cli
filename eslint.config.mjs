import nx from '@nx/eslint-plugin';
import * as jsoncParser from 'jsonc-eslint-parser';

export default [
  {
    files: ['**/*.json'],
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          ignoredFiles: [
            '{projectRoot}/*.config.{js,ts,mjs,mts,cjs,cts}',
            '{projectRoot}/**/eslint.config.{js,ts,mjs,mts,cjs,cts}',
            '{projectRoot}/**/vitest.config.{js,ts,mjs,mts,cjs,cts}',
            '{projectRoot}/**/vite.config.{js,ts,mjs,mts,cjs,cts}',
          ],
          ignoredDependencies: [
            '@abapify/adt-aunit',
            '@abapify/adt-client',
            '@abapify/adt-config',
            '@abapify/adt-mcp',
            '@abapify/adt-plugin-abapgit',
            '@abapify/adt-plugin-gcts',
            '@abapify/adt-schemas',
            '@abapify/logger',
            '@docusaurus/core',
            '@docusaurus/plugin-content-docs',
            '@docusaurus/preset-classic',
            '@easyops-cn/docusaurus-search-local',
            '@nx/devkit',
            'commander',
            'fast-xml-parser',
            'ink',
            'ink-select-input',
            'ink-spinner',
            'ink-text-input',
            'jsonc-eslint-parser',
            'nx',
            'open',
            'prism-react-renderer',
            'proxy-agent',
            'react',
            'react-dom',
            'tslib',
            'vitest',
            'zod',
          ],
        },
      ],
    },
    languageOptions: {
      parser: jsoncParser,
    },
  },

  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      '**/vite.config.*.timestamp*',
      '**/vitest.config.*.timestamp*',
      // Exclude scripts from dependency analysis to prevent false circular dependencies
      'scripts/**',
      'e2e/**',
      // Generated contracts use package imports intentionally (not relative)
      'packages/adt-contracts/src/generated/**',
      // Fixture payloads are captured SAP responses, not source code
      'packages/adt-fixtures/src/fixtures/**',
      // Generated schemas/types across packages
      '**/src/schemas/generated/**',
      '**/src/generated/**',
      // Config files are build-time only, not runtime dependencies
      '**/*.config.ts',
      '**/*.config.mts',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: [
            '^.*/eslint(\\.base)?\\.config\\.[cm]?js$',
            '^.*/tsdown\\.config\\.(ts|js|mjs)$',
            '^.*/samples/.*',
            '^.*\\.config\\..*\\.ts$',
          ],
          depConstraints: [
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*'],
            },
          ],
        },
      ],
    },
  },
  {
    // Disable module boundaries for config files (not runtime code)
    files: [
      '**/*.config.ts',
      '**/*.config.*.ts',
      '**/*.config.js',
      '**/*.config.mjs',
      '**/samples/**',
    ],
    rules: {
      '@nx/enforce-module-boundaries': 'off',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    // Override or add rules here
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    // In tests, non-null assertions and `any` are idiomatic: test data shape is
    // known, mocks deliberately use loose typing, and type-inference tests
    // intentionally assign client handles just to type-check.
    files: [
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/tests/**/*.ts',
      '**/tests/**/*.tsx',
    ],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
