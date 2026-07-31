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
  //    works and simply uses the default system sound. ──
  const soundPath = 'assets/sounds/new_order.wav'
  const notifPlugin = config.plugins.find(p => Array.isArray(p) && p[0] === 'expo-notifications')
  if (notifPlugin) {
    if (exists(soundPath)) {
      notifPlugin[1].sounds = [`./${soundPath}`]
    } else {
      delete notifPlugin[1].sounds
    }
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
