/// <reference types="jest" />
/// <reference types="node" />
module.exports = {
  displayName: 'mobile-ui',
  preset: 'jest-expo',
  moduleFileExtensions: ['ts', 'js', 'html', 'tsx', 'jsx'],
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  // Same CI headroom as apps/mobile: cold jest-expo transform + first render
  // can exceed Jest's 5s default on the shared runner (CI run #371).
  testTimeout: 20000,
  moduleNameMapper: {
    '[.]svg$': '@nx/expo/plugins/jest/svg-mock',
    '^@tourism/tokens/theme$':
      '<rootDir>/../../shared/tokens/generated/theme.js',
  },
  transform: {
    '[.][jt]sx?$': [
      'babel-jest',
      {
        configFile: __dirname + '/.babelrc.js',
      },
    ],
    '^.+[.](bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp|ttf|otf|m4v|mov|mp4|mpeg|mpg|webm|aac|aiff|caf|m4a|mp3|wav|html|pdf|obj)$':
      require.resolve('jest-expo/src/preset/assetFileTransformer.js'),
  },
  coverageDirectory: '../../../coverage/libs/mobile/ui',
};
