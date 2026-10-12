const { withGradleProperties, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Optional R8/ProGuard code shrinking for Android release builds.
// OFF by default: it only turns on when the build is started with ENABLE_R8=1
// (see the "production-r8" profile in eas.json), so normal builds are unchanged.
//
// Turning R8 on makes the Play Store build smaller and generates a mapping file
// that Play Console uses to de-obfuscate crash reports. The keep rules below are
// what stop R8 from removing or renaming classes that are reached by reflection
// or from native code (Razorpay checkout, Play Billing, Nitro IAP, JS bridge).
const RULES = `
# ---- Added by plugins/withAndroidR8.js ----
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod,JavascriptInterface

# Razorpay checkout (react-native-razorpay -> com.razorpay:standard-core)
-dontwarn com.razorpay.**
-keep class com.razorpay.** { *; }
-optimizations !method/inlining/*
-keepclasseswithmembers class * {
    public void onPayment*(...);
}
-keep class proguard.annotation.Keep
-keep class proguard.annotation.KeepClassMembers
-dontwarn proguard.annotation.**
-keepclassmembers class * {
    @proguard.annotation.Keep *;
    @proguard.annotation.KeepClassMembers *;
}

# JavaScript bridges used by WebViews (PayU / Canva viewer / Razorpay)
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Google Play Billing + Nitro modules used by react-native-iap
-keep class com.android.vending.billing.** { *; }
-keep class com.android.billingclient.** { *; }
-keep class com.margelo.nitro.** { *; }
-keep class com.dooboolab.** { *; }

# React Native / Hermes / fbjni reflection and JNI entry points
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
-keep @com.facebook.proguard.annotations.DoNotStrip class * { *; }
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
}
# ---- end withAndroidR8 ----
`;

module.exports = function withAndroidR8(config) {
  if (process.env.ENABLE_R8 !== '1') {
    return config;
  }

  config = withGradleProperties(config, (cfg) => {
    const set = (key, value) => {
      const existing = cfg.modResults.find((p) => p.type === 'property' && p.key === key);
      if (existing) existing.value = value;
      else cfg.modResults.push({ type: 'property', key, value });
    };
    set('android.enableMinifyInReleaseBuilds', 'true');
    // Resource shrinking is a second, separate risk; keep resources as they are.
    set('android.enableShrinkResourcesInReleaseBuilds', 'false');
    return cfg;
  });

  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const file = path.join(cfg.modRequest.platformProjectRoot, 'app', 'proguard-rules.pro');
      const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
      if (!current.includes('Added by plugins/withAndroidR8.js')) {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, current + RULES);
      }
      return cfg;
    },
  ]);

  return config;
};
