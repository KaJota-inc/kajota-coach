// Overlay app.json with runtime env vars so secrets stay out of git.
//
// Expo 50+ auto-loads .env for EXPO_PUBLIC_* variables. Non-prefixed
// vars must be set in the shell before `expo run:*` OR loaded via a
// dotenv require here. We use the non-prefixed names so the values
// don't leak into the JS bundle via Expo's public-env inlining —
// they're consumed at build time in this file and passed through to
// `extra`, which is available at runtime via `Constants.expoConfig.extra`.
//
// See .env.example for the variables this reads.

const staticConfig = require('./app.json');

// Load .env if present (fine to be missing in CI). Kept optional so
// no extra dependency is required — try dotenv, ignore if not installed.
try {
  require('dotenv').config();
} catch (_) {
  // dotenv not installed — either env vars are already exported
  // (recommended for CI) or paste-keys-into-app.json path is still open.
}

module.exports = () => ({
  ...staticConfig.expo,
  extra: {
    ...(staticConfig.expo.extra || {}),
    // RevenueCat client-side API keys. Not secrets in the "leak-my-DB" sense
    // — they're publishable — but still shouldn't end up in git history.
    revenueCatIosKey:
      process.env.REVENUECAT_IOS_KEY ||
      staticConfig.expo.extra?.revenueCatIosKey ||
      '',
    revenueCatAndroidKey:
      process.env.REVENUECAT_ANDROID_KEY ||
      staticConfig.expo.extra?.revenueCatAndroidKey ||
      '',
  },
});
