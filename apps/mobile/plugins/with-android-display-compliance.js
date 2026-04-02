const { AndroidConfig, createRunOncePlugin, withAndroidManifest, withAndroidStyles, withGradleProperties } = require("expo/config-plugins");

const PLUGIN_NAME = "with-android-display-compliance";
const PLUGIN_VERSION = "1.0.0";

function removeOrientationAndResizabilityRestrictions(config) {
  const application = config.modResults.manifest.application?.[0];
  if (!application) {
    return config;
  }

  if (application.$) {
    delete application.$["android:resizeableActivity"];
  }

  for (const activity of application.activity ?? []) {
    if (activity?.$?.["android:name"] === ".MainActivity") {
      delete activity.$["android:screenOrientation"];
      delete activity.$["android:resizeableActivity"];
    }
  }

  return config;
}

function removeDeprecatedEdgeToEdgeProperty(config) {
  config.modResults = config.modResults.filter(
    (item) => !(item.type === "property" && item.key === "expo.edgeToEdgeEnabled")
  );

  return config;
}

function removeDeprecatedEdgeToEdgeThemeItems(config) {
  const { assignStylesValue, getAppThemeGroup } = AndroidConfig.Styles;
  const parent = getAppThemeGroup();

  for (const name of [
    "android:statusBarColor",
    "statusBarColor",
    "android:navigationBarColor",
    "navigationBarColor",
    "android:enforceStatusBarContrast",
    "enforceStatusBarContrast"
  ]) {
    config.modResults = assignStylesValue(config.modResults, {
      add: false,
      name,
      parent,
      value: ""
    });
  }

  return config;
}

  const withAndroidDisplayCompliance = (config) => {
  config = withAndroidManifest(config, removeOrientationAndResizabilityRestrictions);
  config = withGradleProperties(config, removeDeprecatedEdgeToEdgeProperty);
  config = withAndroidStyles(config, removeDeprecatedEdgeToEdgeThemeItems);

  return config;
};

module.exports = createRunOncePlugin(withAndroidDisplayCompliance, PLUGIN_NAME, PLUGIN_VERSION);
