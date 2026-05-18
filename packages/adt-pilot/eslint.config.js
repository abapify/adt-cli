import baseConfig from '../../eslint.config.mjs';
import * as jsoncParser from 'jsonc-eslint-parser';

export default [
  ...baseConfig,
  {
    files: ['package.json'],
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
            '@ai-sdk/openai',
            '@mastra/core',
            '@mastra/mcp',
            '@modelcontextprotocol/sdk',
            'ai',
            'zod',
          ],
        },
      ],
    },
    languageOptions: {
      parser: jsoncParser,
    },
  },
];
