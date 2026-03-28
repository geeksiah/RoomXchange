const path = require("path");
const Module = require("module");

process.env.NODE_PATH = [
  path.resolve(__dirname, "node_modules"),
  path.resolve(__dirname, "../../node_modules"),
  process.env.NODE_PATH ?? ""
]
  .filter(Boolean)
  .join(path.delimiter);
Module._initPaths();

const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, "../../")];
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
  path.resolve(__dirname, "../../node_modules")
];

module.exports = withNativeWind(config, {
  input: "./global.css",
  disableTypeScriptGeneration: true
});
