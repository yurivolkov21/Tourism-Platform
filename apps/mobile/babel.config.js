// Explicit babel config: under pnpm's strict node_modules layout,
// babel-preset-expo's hasModule('react-native-worklets') auto-detection
// resolves from the preset's own context and always fails, so the worklets
// plugin (required by reanimated 4) was silently never applied — every
// worklet then dies at runtime with "[Worklets] Failed to create a worklet".
// Declaring the preset + plugin here resolves both from the app's context.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Must stay last in the plugins list (reanimated/worklets requirement).
    plugins: ['react-native-worklets/plugin'],
  };
};
