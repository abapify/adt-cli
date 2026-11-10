import baseConfig from '../../tsdown.config.ts';

export default {
  ...baseConfig,
  entry: ['src/index.ts'],
  tsconfig: 'tsconfig.lib.json',
};
