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
    unstable_conditionNames: ['@tourism/source', 'react-native', 'require', 'import'],
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
  config.projectRoot = fixDriveCase(config.projectRoot);
  config.watchFolders = (config.watchFolders ?? []).map(fixDriveCase);
  return config;
});
