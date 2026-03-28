const { createRunOncePlugin, withAppBuildGradle } = require("expo/config-plugins");

const PLUGIN_NAME = "with-monorepo-android-bundle";
const CLI_LINE = 'cliFile = new File(projectRoot, "scripts/export-embed-cli.js")';
const BUNDLE_COMMAND_LINE = 'bundleCommand = "export:embed"';

function updateAppBuildGradle(contents) {
  if (contents.includes(CLI_LINE)) {
    return contents;
  }

  const defaultCliPattern =
    /cliFile = new File\(\["node", "--print", "require\.resolve\('@expo\/cli', \{ paths: \[require\.resolve\('expo\/package\.json'\)\] \}\)"\]\.execute\(null, rootDir\)\.text\.trim\(\)\)\s*bundleCommand = "export:embed"/;

  if (defaultCliPattern.test(contents)) {
    return contents.replace(defaultCliPattern, `${CLI_LINE}\n    ${BUNDLE_COMMAND_LINE}`);
  }

  const anchor = "    enableBundleCompression = (findProperty('android.enableBundleCompression') ?: false).toBoolean()";
  if (!contents.includes(anchor)) {
    throw new Error(`Could not find Android React block anchor for ${PLUGIN_NAME}.`);
  }

  return contents.replace(
    anchor,
    `${anchor}\n    // Use the workspace-local Expo CLI wrapper so Android release bundling resolves from apps/mobile.\n    ${CLI_LINE}\n    ${BUNDLE_COMMAND_LINE}`
  );
}

const withMonorepoAndroidBundle = (config) =>
  withAppBuildGradle(config, (config) => {
    config.modResults.contents = updateAppBuildGradle(config.modResults.contents);
    return config;
  });

module.exports = createRunOncePlugin(withMonorepoAndroidBundle, PLUGIN_NAME, "1.0.0");
