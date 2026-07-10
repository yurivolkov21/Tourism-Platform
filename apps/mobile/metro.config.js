const { withNxMetro } = require('@nx/expo');
const { getDefaultConfig } = require('@expo/metro-config');
const { mergeConfig } = require('metro-config');

const defaultConfig = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = defaultConfig.resolver;

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const customConfig = {
  cacheVersion: '@tourism/mobile',
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },
  resolver: {
    assetExts: assetExts.filter((ext) => ext !== 'svg'),
    sourceExts: [...sourceExts, 'cjs', 'mjs', 'svg'],
    unstable_conditionNames: [
      '@tourism/source',
      'react-native',
      'require',
      'import',
    ],
  },
};

const nxConfig = withNxMetro(mergeConfig(defaultConfig, customConfig), {
  // Change this to true to see debugging info.
  // Useful if you have issues resolving modules
  debug: false,
  // all the file extensions used for imports other than 'ts', 'tsx', 'js', 'jsx', 'json'
  extensions: [],
  // Specify folders to watch, in addition to Nx defaults (workspace libraries and node_modules)
  watchFolders: [],
});

// Windows: Nx emits the workspace root with a lowercase drive ("c:\…") while Expo's
// defaultConfig uses the real casing ("C:\…"). Metro then mixes projectRoot (lowercase)
// with serverRoot (uppercase) and bundling dies on paths like "c:\C:\…" ("Failed to get
// the SHA-1" / ENOENT for @expo/cli's metro-require runtime). Normalize the drive letter
// on every root withNxMetro produced.
const fixDriveCase = (p) =>
  typeof p === 'string' ? p.replace(/^[a-z]:/, (d) => d.toUpperCase()) : p;

module.exports = Promise.resolve(nxConfig).then((config) => {
  // withNxMetro sets projectRoot to the WORKSPACE root, which breaks expo-router:
  // the route context resolves `src/app` against projectRoot, finds nothing, and
  // the app ships only the "Welcome to Expo" onboarding screen (verified via
  // `expo export` — no route strings in the bundle). Expo's monorepo standard is
  // projectRoot = the app dir + watchFolders = the monorepo root; restore that.
  // projectRoot and serverRoot need the same normalization as watchFolders:
  // when nx spawns expo with a lowercase-drive cwd, @expo/cli joins the entry's
  // server-relative path onto serverRoot, and Metro's fileMap rejects the result
  // ("Failed to get the SHA-1") because the crawled roots are uppercase.
  config.projectRoot = fixDriveCase(__dirname);
  if (config.server?.unstable_serverRoot) {
    config.server.unstable_serverRoot = fixDriveCase(
      config.server.unstable_serverRoot,
    );
  }
  const workspaceRoot = fixDriveCase(
    require('node:path').resolve(__dirname, '../..'),
  );
  config.watchFolders = [
    ...(config.watchFolders ?? []).map(fixDriveCase),
    workspaceRoot,
  ];

  // Workspace source (@tourism/*) is authored under `moduleResolution: nodenext`
  // and uses explicit `.js` specifiers for its own relative imports (resolved to
  // sibling `.ts` files by tsc). Metro can't do that mapping natively — retry
  // failed relative `.js` requests without the extension so sourceExts (ts/tsx)
  // resolution kicks in. Mirrors the `@nx/jest/plugins/resolver` fix in
  // jest.config.cts (same root cause, verified 2026-07-06).
  const prevResolveRequest = config.resolver.resolveRequest;
  const baseResolve = (ctx, name, platform) =>
    prevResolveRequest
      ? prevResolveRequest(ctx, name, platform)
      : ctx.resolveRequest(ctx, name, platform);
  config.resolver.resolveRequest = (ctx, name, platform) => {
    try {
      return baseResolve(ctx, name, platform);
    } catch (error) {
      if (name.startsWith('.') && name.endsWith('.js')) {
        return baseResolve(ctx, name.replace(/\.js$/, ''), platform);
      }
      throw error;
    }
  };
  return config;
});
