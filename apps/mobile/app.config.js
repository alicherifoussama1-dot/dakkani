// ============================================================
// DYNAMIC EXPO CONFIG
//
// Reads app.json, then conditionally attaches credentials that are NOT in
// version control:
//   · google-services.json  (Firebase / FCM — Android)
//   · assets/sounds/new_order.wav (custom notification sound)
//
// Why: referencing a missing file in app.json makes Expo emit
// "Could not parse Expo config", which breaks EAS Build. This keeps dev
// and CI working before the credentials land, while still wiring them
// automatically the moment they are added.
// ============================================================
const fs = require('fs')
const path = require('path')

const base = require('./app.json').expo

const exists = (p) => fs.existsSync(path.join(__dirname, p))

module.exports = () => {
  const config = JSON.parse(JSON.stringify(base))

  // ── Firebase (Android push). Required for a production Android build. ──
  if (exists('google-services.json')) {
    config.android.googleServicesFile = './google-services.json'
  } else {
    delete config.android.googleServicesFile
    if (process.env.EAS_BUILD_PLATFORM === 'android' && process.env.EAS_BUILD_PROFILE === 'production') {
      throw new Error(
        'google-services.json is missing — Android production builds need it for FCM push. ' +
        'Download it from Firebase Console → Project Settings → Your apps (package store.commerco.merchant).',
      )
    }
  }

  // ── Custom notification sound. The plugin fails hard if the file is absent,
  //    so only declare it once the asset exists. Without it the app still
  //    works and simply uses the default system sound.
  //    On iOS the same `sounds` array makes the plugin copy the .wav into the
  //    app bundle as a build resource, which is what lets the APNs payload
  //    name it. ──
  const soundPath = 'assets/sounds/new_order.wav'
  const notifPlugin = config.plugins.find(p => Array.isArray(p) && p[0] === 'expo-notifications')
  if (notifPlugin) {
    if (exists(soundPath)) {
      notifPlugin[1].sounds = [`./${soundPath}`]
    } else {
      delete notifPlugin[1].sounds
    }

    // ── APNs environment. This one is a trap.
    //
    // withNotificationsIOS writes `aps-environment` into the entitlements
    // UNCONDITIONALLY and its `mode` prop defaults to 'development'. Leaving
    // it unset means the plugin overwrites the 'production' value declared in
    // app.json, and the failure is silent and expensive: an ad-hoc build would
    // hand out SANDBOX device tokens while the server pushes to
    // api.push.apple.com, so every send comes back BadDeviceToken and the
    // merchant simply never hears anything.
    //
    // So it is pinned to the build profile instead of being left to a default.
    // EAS 'preview' is ad-hoc distribution and 'production' is App Store —
    // both use production APNs. A local `expo run:ios` build is signed with a
    // development profile and must stay on sandbox.
    //
    // The server side has to agree: APNS_USE_SANDBOX=true for development
    // builds, unset/false for preview and production.
    const profile = process.env.EAS_BUILD_PROFILE
    const apsMode = profile === 'preview' || profile === 'production' ? 'production' : 'development'
    notifPlugin[1].mode = apsMode
    config.ios = config.ios ?? {}
    config.ios.entitlements = { ...(config.ios.entitlements ?? {}), 'aps-environment': apsMode }
  }

  // ── App icons. Expo needs real files; fall back to no icon rather than a
  //    broken path so bundling never fails on a fresh checkout. ──
  for (const [key, p] of [['icon', 'assets/icon.png'], ['splash', 'assets/splash.png']]) {
    if (!exists(p)) {
      if (key === 'icon') delete config.icon
      if (key === 'splash') delete config.splash
    }
  }
  if (!exists('assets/adaptive-icon.png')) delete config.android.adaptiveIcon
  if (notifPlugin && !exists('assets/notification-icon.png')) delete notifPlugin[1].icon

  return { expo: config }
}
