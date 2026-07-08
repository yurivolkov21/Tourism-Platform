/* eslint-disable */
const { readFileSync } = require('fs');

// Reading the SWC compilation config for the spec files
const swcJestConfig = JSON.parse(
  readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8'),
);

// Disable .swcrc look-up by SWC core because we're passing in swcJestConfig ourselves
swcJestConfig.swcrc = false;

module.exports = {
  displayName: '@tourism/api',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  // Under a full-parallel `nx affected/run-many` the shared machine starves
  // jest workers and async specs blow the 5s default (same flake class as
  // mobile CI run #371) — give them the same headroom as the mobile suites.
  testTimeout: 20000,
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', swcJestConfig],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: 'test-output/jest/coverage',
};
