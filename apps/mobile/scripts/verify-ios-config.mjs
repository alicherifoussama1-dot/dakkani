// ============================================================
// iOS PUSH READINESS VERIFICATION
//
// iOS cannot be prebuilt or built from Windows — Expo refuses and tells you
// to run from macOS/Linux. So the native project cannot be inspected here,
// and every iOS push failure mode is silent: a wrong APNs environment, a
// sound filename the bundle does not contain, a missing background mode.
// None of them raise an error. The merchant just never hears anything.
//
// This checks, from the config alone, the things that fail that way.
//
//   node scripts/verify-ios-config.mjs
//   EAS_BUILD_PROFILE=preview node scripts/verify-ios-config.mjs
//
// Read-only: touches no network, no credentials, no native project.
// ============================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

// app.config.js is CommonJS; this file is ESM.
const require = createRequire(import.meta.url)

const HERE = path.dirname(fileURLToPath(import.meta.url))
const MOBILE = path.join(HERE, '..')
const REPO = path.join(MOBILE, '..', '..')

let pass = 0, fail = 0, warn = 0
const ok = (n, c, extra = '') => {
  c ? (pass++, console.log(`  ✓ ${n}${extra ? ' — ' + extra : ''}`))
    : (fail++, console.log(`  ✗ ${n}${extra ? ' — ' + extra : ''}`))
}
const note = (n, extra = '') => { warn++; console.log(`  ! ${n}${extra ? ' — ' + extra : ''}`) }

const profile = process.env.EAS_BUILD_PROFILE ?? '(none — local dev)'
console.log(`\niOS push readiness   build profile: ${profile}\n`)

const config = require(path.join(MOBILE, 'app.config.js'))().expo
const pkg = JSON.parse(fs.readFileSync(path.join(MOBILE, 'package.json'), 'utf8'))

// ── identity ──
console.log('Identity')
ok('ios.bundleIdentifier set', !!config.ios?.bundleIdentifier, config.ios?.bundleIdentifier)
ok('android.package unchanged', config.android?.package === 'store.commerco.merchant', config.android?.package)
ok('EAS projectId present', !!config.extra?.eas?.projectId)
ok('URL scheme for deep links', !!config.scheme, config.scheme)

// ── APNs environment: the silent killer ──
console.log('\nAPNs environment')
const notif = config.plugins.find(p => Array.isArray(p) && p[0] === 'expo-notifications')
const mode = notif?.[1]?.mode
const entitlement = config.ios?.entitlements?.['aps-environment']
ok('expo-notifications mode pinned', !!mode, mode)
ok('entitlement agrees with plugin mode', !!mode && mode === entitlement, `${entitlement} / ${mode}`)
const expected = (process.env.EAS_BUILD_PROFILE === 'preview' || process.env.EAS_BUILD_PROFILE === 'production')
  ? 'production' : 'development'
ok('mode matches this build profile', mode === expected, `expected ${expected}`)
if (mode === 'development') {
  note('server needs APNS_USE_SANDBOX=true for a build made with this profile')
} else {
  note('server needs APNS_USE_SANDBOX unset/false for this profile')
}

// ── the sound, end to end ──
console.log('\nNotification sound')
const sounds = notif?.[1]?.sounds ?? []
ok('sound declared in plugin config', sounds.length > 0, sounds.join(', '))
const soundFile = sounds[0] ? path.join(MOBILE, sounds[0]) : null
ok('sound file exists', !!soundFile && fs.existsSync(soundFile))

if (soundFile && fs.existsSync(soundFile)) {
  const buf = fs.readFileSync(soundFile)
  const riff = buf.subarray(0, 4).toString('ascii')
  const wave = buf.subarray(8, 12).toString('ascii')
  const fmt = buf.readUInt16LE(20)
  const channels = buf.readUInt16LE(22)
  const rate = buf.readUInt32LE(24)
  const bits = buf.readUInt16LE(34)
  const dataBytes = buf.readUInt32LE(40)
  const seconds = dataBytes / (rate * channels * (bits / 8))

  ok('is a RIFF/WAVE file', riff === 'RIFF' && wave === 'WAVE')
  // iOS plays Linear PCM, MA4, µLaw or aLaw only. fmt 1 is Linear PCM.
  ok('Linear PCM (iOS-playable codec)', fmt === 1, `format tag ${fmt}`)
  // Apple truncates notification sounds longer than 30 seconds to the default.
  ok('under Apple’s 30s limit', seconds < 30, `${seconds.toFixed(2)}s`)
  console.log(`      ${rate}Hz · ${bits}-bit · ${channels === 1 ? 'mono' : 'stereo'} · ${(buf.length / 1024).toFixed(1)} KB`)

  // The bug this file exists to prevent: the server naming a sound the bundle
  // does not contain. It previously asked for new-order.caf, which was never
  // shipped, and iOS fell back to the default sound without complaint.
  const bundled = path.basename(soundFile)
  const send = fs.readFileSync(path.join(REPO, 'lib', 'push', 'send.ts'), 'utf8')
  const named = [...send.matchAll(/iosSound[^\n]*?['"]([^'"]+\.(?:wav|caf|aiff))['"]/g)].map(m => m[1])
  const unique = [...new Set(named)]
  ok('server asks for the bundled filename', unique.length > 0 && unique.every(n => n === bundled),
    unique.length ? `${unique.join(', ')} vs bundle ${bundled}` : 'no iosSound found in send.ts')
}

// ── background + tap delivery ──
console.log('\nDelivery')
const modes = config.ios?.infoPlist?.UIBackgroundModes ?? []
ok('UIBackgroundModes has remote-notification', modes.includes('remote-notification'), modes.join(', ') || 'none')
const push = fs.readFileSync(path.join(MOBILE, 'src', 'lib', 'push.ts'), 'utf8')
ok('native device token (not Expo token)', push.includes('getDevicePushTokenAsync'))
ok('cold-start tap handled', push.includes('getLastNotificationResponseAsync'))
ok('tap listener registered', push.includes('addNotificationResponseReceivedListener'))
const layout = fs.readFileSync(path.join(MOBILE, 'app', '_layout.tsx'), 'utf8')
ok('tap wired to order navigation', /onNotificationTap\(\s*goToOrder\s*\)/.test(layout))

// ── versions ──
console.log('\nVersions')
const expoVer = pkg.dependencies.expo ?? ''
const notifVer = pkg.dependencies['expo-notifications'] ?? ''
ok('expo-notifications installed', !!notifVer, notifVer)
// SDK 51 pairs with expo-notifications 0.28.x. A mismatch here is the kind of
// thing that builds fine and misbehaves at runtime.
ok('matches Expo SDK 51', /~?51\./.test(expoVer) && /0\.28\./.test(notifVer), `expo ${expoVer}`)

// ── secrets must not be in the app ──
console.log('\nSecrets')
const eas = JSON.parse(fs.readFileSync(path.join(MOBILE, 'eas.json'), 'utf8'))
const envBlobs = JSON.stringify(eas.build ?? {})
ok('no service-role key in eas.json', !/service_role|SERVICE_ROLE/i.test(envBlobs))
ok('no APNs key in eas.json', !/BEGIN PRIVATE KEY|APNS_KEY_P8/.test(envBlobs))
ok('no APNs key in app config', !/BEGIN PRIVATE KEY/.test(JSON.stringify(config)))

console.log(`\n${pass} passed, ${fail} failed, ${warn} notes\n`)
process.exit(fail ? 1 : 0)
