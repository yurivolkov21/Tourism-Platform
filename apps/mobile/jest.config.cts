/// <reference types="jest" />
/// <reference types="node" />
module.exports = {
  displayName: '@tourism/mobile',
  preset: 'jest-expo',
  // Workspace source (@tourism/*) is authored under `moduleResolution:
  // nodenext` and uses explicit `.js` specifiers for its own relative
  // imports (resolved to sibling `.ts` files by tsc, not by Node/Jest).
  // The jest-expo preset doesn't know about that mapping, so borrow Nx's
  // resolver (falls back to TypeScript's own resolution) — same one the
  // Nx-authored jest preset uses (verified 2026-07-06).
  resolver: '@nx/jest/plugins/resolver',
  moduleFileExtensions: ['ts', 'js', 'html', 'tsx', 'jsx'],
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  // typecheck emits declaration artifacts to out-tsc/ — jest's default
  // `**/__tests__/**` pattern would pick up out-tsc/jest/src/__tests__/*.spec.d.ts
  // ("must contain at least one test").
  // (plain substring — separator-agnostic so it matches on Windows too)
  testPathIgnorePatterns: ['/node_modules/', 'out-tsc'],
  // RN component suites pay a cold jest-expo transform + first-render cost;
  // on the shared 2-core CI runner (9 projects in parallel) the first test in
  // a suite can blow Jest's 5s default (CI run #371, home.spec). 20s is the
  // per-test ceiling, not a slowdown — fast tests stay fast.
  testTimeout: 20000,
  moduleNameMapper: {
    '[.]svg$': '@nx/expo/plugins/jest/svg-mock',
    '^@tourism/core$': '<rootDir>/../../libs/shared/core/src/index.ts',
    '^@tourism/i18n$': '<rootDir>/../../libs/shared/i18n/src/index.ts',
    '^@tourism/tokens/theme$':
      '<rootDir>/../../libs/shared/tokens/generated/theme.js',
    '^@tourism/mobile-ui$': '<rootDir>/../../libs/mobile/ui/src/index.ts',
  },
  transformIgnorePatterns: [
    // `.pnpm` must be allow-listed too: under pnpm, real packages sit one
    // level deeper (node_modules/.pnpm/<pkg>@<ver>/node_modules/<pkg>/...),
    // so the classic pattern alone leaves react-native's own jest setup
    // untransformed. `expo-[^/]+` is needed too — unscoped Expo SDK
    // packages (expo-router, expo-modules-core, expo-image, ...) don't
    // match a bare `expo(nent)?` (verified 2026-07-06).
    'node_modules/(?!(\\.pnpm|react-native-url-polyfill|(jest-)?react-native|@react-native(-community)?|expo(nent)?|expo-[^/]+|@expo(-google-fonts)?|@expo/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|@tanstack)/)',
  ],
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
  coverageDirectory: '../../coverage/apps/mobile',
};
