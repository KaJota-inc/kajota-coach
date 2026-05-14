module.exports = function (api) {
  api.cache(true);
  // Expo SDK 51 + Metro resolves `@/*` paths from tsconfig.json natively,
  // so no babel-plugin-module-resolver is needed.
  return {
    presets: ['babel-preset-expo'],
  };
};
