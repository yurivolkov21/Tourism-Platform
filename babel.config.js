module.exports = function (api) {
  // Cache per environment so Metro (non-test) and Jest (test) get different configs.
  api.cache.using(() => api.env());

  if (api.env('test')) {
    // Jest: allow .babelrc files in all workspace packages (Nx monorepo convention).
    // babelrcRoots is a programmatic-only option; it must NOT be in a file that
    // Expo CLI loads via Babel's `extends:` API (which is what Metro does for
    // the transform cache key). The env guard keeps it out of the Metro path.
    return { babelrcRoots: ['*'] };
  }

  // Metro (expo start): provide the Expo preset so transform-worker can find it
  // when @expo/metro-config resolves the Babel cache key from projectRoot
  // (workspaceRoot, as set by withNxMetro).
  return { presets: ['babel-preset-expo'] };
};
