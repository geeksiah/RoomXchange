const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("./node_modules/nativewind/dist/metro/index.js");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, {
  input: "./global.css",
  disableTypeScriptGeneration: true
});
