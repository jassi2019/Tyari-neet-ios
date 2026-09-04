const { withAppBuildGradle } = require('expo/config-plugins');

module.exports = function withAndroidSdk36(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    // Override targetSdkVersion to 36
    contents = contents.replace(
      /targetSdkVersion\s+\d+/,
      'targetSdkVersion 36'
    );

    // Override compileSdkVersion to 36
    contents = contents.replace(
      /compileSdkVersion\s+\d+/,
      'compileSdkVersion 36'
    );

    // Also handle the rootProject.ext format
    contents = contents.replace(
      /targetSdkVersion\s*=\s*\d+/,
      'targetSdkVersion = 36'
    );
    contents = contents.replace(
      /compileSdkVersion\s*=\s*\d+/,
      'compileSdkVersion = 36'
    );

    config.modResults.contents = contents;
    return config;
  });
};
