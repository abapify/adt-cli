import nx from '@nx/eslint-plugin';
import importPlugin from 'eslint-plugin-import';
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
  // Enforce extensionless internal imports and enable autofix for ADK sources
  {
    files: ['packages/adk/src/**/*.{ts,tsx,js,jsx}'],
    plugins: {
      import: importPlugin,
    },
    settings: {
      'import/resolver': {
        // Let ESLint resolve TS paths and respect tsconfig for DX
        typescript: {
          project: './tsconfig.base.json',
          alwaysTryTypes: true,
        },
        node: {
          extensions: ['.ts', '.tsx', '.js', '.jsx'],
        },
      },
    },
    rules: {
      // Remove file extensions from internal imports (autofixable)
      // Keeps package imports intact via "ignorePackages"
      'import/extensions': ['error', 'never'],
      // Additional helpful fix: cleans up needless "./index" patterns
      'import/no-useless-path-segments': ['error', { noUselessIndex: true }],
    },
  },
];
