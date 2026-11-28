module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo ajoute lui-même le plugin react-native-worklets (Reanimated 4)
    presets: ['babel-preset-expo'],
  };
};
