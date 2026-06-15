const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join, isAbsolute } = require('path');

module.exports = {
  output: {
    path: join(__dirname, 'dist'),
    clean: true,
    ...(process.env.NODE_ENV !== 'production' && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  // Externalize every bare (node_modules) import; bundle only relative/absolute
  // paths. Nx's built-in nodeExternals scans the ROOT node_modules, but under
  // pnpm this app's deps live in apps/api/node_modules, so they'd otherwise be
  // bundled — and webpack then chokes on optional/guarded deep requires (e.g.
  // @nestjs/mapped-types' try/catch require of class-transformer/storage, which
  // resolves fine at runtime via class-transformer/cjs/storage). `mergeExternals`
  // keeps this alongside Nx's externals.
  externals: [
    function ({ request }, callback) {
      if (!request || request.startsWith('.') || isAbsolute(request)) {
        return callback();
      }
      return callback(null, 'node-commonjs ' + request);
    },
  ],
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: false,
      sourceMap: true,
      mergeExternals: true,
    }),
  ],
};
