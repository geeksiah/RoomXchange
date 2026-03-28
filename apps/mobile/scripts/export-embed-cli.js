#!/usr/bin/env node

const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const args = process.argv.slice(2);

if (args[0] === "export:embed") {
  process.argv = [process.argv[0], process.argv[1], "export:embed", ...args.slice(1), projectRoot];
  process.env.EXPO_NO_METRO_WORKSPACE_ROOT = "1";
}

process.chdir(projectRoot);
require(require.resolve("expo/bin/cli", { paths: [projectRoot] }));
