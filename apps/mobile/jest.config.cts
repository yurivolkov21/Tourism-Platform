/// <reference types="jest" />
/// <reference types="node" />

// SDK 57 added `import 'react-native/Libraries/Core/InitializeCore'` to the
// expo winter runtime. This top-level native import cannot be resolved in a
// pnpm workspace's virtual-store layout, causing jest to throw "outside scope".
//
// Our only tests (auth-helpers) are pure TS utility functions with no RN/expo
// dependencies. We skip the full jest-expo preset here and use a plain
// babel-jest + node environment instead.  When component/hook tests are added
// they should live in a separate jest "project" with the expo preset.
module.exports = {
  displayName: '@tourism/mobile',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  moduleNameMapper: {
    '[.]svg$': '@nx/expo/plugins/jest/svg-mock',
  },
  transform: {
    '^.+\\.[jt]sx?$': [
      'babel-jest',
      {
        configFile: __dirname + '/.babelrc.js',
      },
    ],
  },
  coverageDirectory: '../../coverage/apps/mobile',
};
