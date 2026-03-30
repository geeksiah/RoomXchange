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
const workspaceRoot = path.resolve(__dirname, "../../");
const workspacePackageRoots = [
  path.resolve(workspaceRoot, "packages/shared"),
  path.resolve(workspaceRoot, "packages/contracts"),
  path.resolve(workspaceRoot, "node_modules")
];

config.watchFolders = [...new Set([...(config.watchFolders ?? []), ...workspacePackageRoots])];
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
  ...(config.resolver.nodeModulesPaths ?? [])
];

module.exports = withNativeWind(config, {
  input: "./global.css",
  disableTypeScriptGeneration: true
});
