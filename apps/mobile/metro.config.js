const path = require('path');

const { workspaceRoot } = require('@nx/devkit');
const { withNxMetro } = require('@nx/expo');
const { getDefaultConfig } = require('@expo/metro-config');
const { mergeConfig } = require('metro-config');

const projectRoot = __dirname;
const defaultConfig = getDefaultConfig(projectRoot);
const { assetExts, sourceExts } = defaultConfig.resolver;

/** Workspace libs the mobile app imports — avoid watching apps/web `.next` etc. */
const workspaceLibs = [
  path.join(workspaceRoot, 'libs/shared/core'),
  path.join(workspaceRoot, 'libs/shared/i18n'),
  path.join(workspaceRoot, 'libs/shared/tokens'),
  path.join(workspaceRoot, 'libs/mobile/ui'),
];

/** Build/cache dirs that must never be crawled or watched (Windows-safe). */
const buildArtifactBlockList = [
  /[\\/]apps[\\/][^\\/]+[\\/]\.next[\\/]/,
  /[\\/]apps[\\/][^\\/]+[\\/]dist[\\/]/,
  /[\\/]\.nx[\\/]/,
  /[\\/]coverage[\\/]/,
  /[\\/]tmp[\\/]/,
];

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const customConfig = {
  cacheVersion: '@tourism/mobile-v4',
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },
  resolver: {
    assetExts: assetExts.filter((ext) => ext !== 'svg'),
    sourceExts: [...sourceExts, 'cjs', 'mjs', 'svg'],
    blockList: buildArtifactBlockList,
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
    resolveRequest: (context, moduleName, platform) => {
      // Native modules that break when Metro resolves two copies in the pnpm
      // monorepo — always pin to the app's single instance.
      const singletonModules = [
        'react-native-safe-area-context',
        'whatwg-fetch',
        'react-native-gesture-handler',
        'react-native-reanimated',
        'react-native-worklets',
      ];
      if (singletonModules.includes(moduleName)) {
        return {
          type: 'sourceFile',
          filePath: require.resolve(moduleName, {
            paths: [projectRoot, workspaceRoot],
          }),
        };
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

const nxMetroConfig = withNxMetro(mergeConfig(defaultConfig, customConfig), {
  debug: false,
  extensions: [],
  watchFolders: [],
});

// withNxMetro sets projectRoot to workspaceRoot for Nx resolution. Override back
// to the Expo app so Router finds apps/mobile/src/app (not workspace/src/app).
// Watch workspace libs + node_modules only — NOT the whole repo (avoids .next ENOENT on Windows).
// See: https://github.com/nrwl/nx/issues/34012
const existingBlockList = nxMetroConfig.resolver?.blockList;
const mergedBlockList = [
  ...(existingBlockList
    ? Array.isArray(existingBlockList)
      ? existingBlockList
      : [existingBlockList]
    : []),
  ...buildArtifactBlockList,
];

module.exports = {
  ...nxMetroConfig,
  projectRoot,
  watchFolders: [
    ...new Set([
      ...(nxMetroConfig.watchFolders ?? []),
      ...workspaceLibs,
      path.join(workspaceRoot, 'node_modules'),
    ]),
  ],
  resolver: {
    ...nxMetroConfig.resolver,
    ...customConfig.resolver,
    blockList: mergedBlockList,
  },
};
