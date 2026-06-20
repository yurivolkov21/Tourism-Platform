/* eslint-disable */
// E2E config — separate from the unit `test` target so it never runs in the CI
// gate (it boots the app + hits the seeded local DB). Run: `nx run @tourism/api:e2e`.
const base = require('./jest.config.cts');

module.exports = {
  ...base,
  testMatch: ['<rootDir>/test/**/*.e2e.ts'],
  testTimeout: 30000,
  // AppModule pulls in `jose` (ESM-only, via SupabaseJwtGuard). Let SWC transpile
  // it; pnpm stores it under node_modules/.pnpm/jose@x/.
  transformIgnorePatterns: ['/node_modules/\\.pnpm/(?!jose@)'],
};
