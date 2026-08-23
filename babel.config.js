module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { reanimated: false }]],
    plugins: [
      // Reanimated / Worklets debe ir siempre de ultimo.
      'react-native-worklets/plugin',
    ],
  };
};
