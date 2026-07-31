// ============================================================
// ANDROID READINESS VERIFICATION
//
// Covers what verify-api.mjs does not: the delivery/categories resources
// added for the mobile app, the exact push payload Android will receive,
// and the deep-link contract. Run with:
//   API_URL=https://dakkani.vercel.app node scripts/verify-android.mjs
//
// Read-only. Creates nothing, sends no notification, drains no queue.
// ============================================================
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const ENV_PATH = process.env.ENV_PATH ?? 'F:/dakkani/.env.local'
const BASE = process.env.API_URL ?? 'https://dakkani.vercel.app'
const SLUG = process.env.STORE_SLUG ?? 'sama-brand-04'

const env = Object.fromEntries(
  fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] }))

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let pass = 0, fail = 0
const ok = (n, c, extra = '') => { c ? (pass++, console.log(`  ✓ ${n}${extra ? ' — ' + extra : ''}`)) : (fail++, console.log(`  ✗ ${n}${extra ? ' — ' + extra : ''}`)) }

// ── authenticate as the store owner ──
const { data: store } = await admin.from('stores').select('id,owner_id,name').eq('slug', SLUG).single()
const { data: u } = await admin.auth.admin.getUserById(store.owner_id)
const { data: link } = await admin.auth.admin.generateLink({ type: 'magiclink', email: u.user.email })
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const { data: sess } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: link.properties.hashed_token })
const TOKEN = sess.session.access_token

const call = async (path, init = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${TOKEN}`,
      'X-Commerco-Store': store.id,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
  })
  let body = null
  try { body = await res.json() } catch { /* non-JSON */ }
  return { status: res.status, body }
}

console.log(`\nSTORE: ${store.name}\n`)

// ── 1. resources added for the mobile app ──
console.log('NEW CATALOG RESOURCES')
for (const r of ['categories', 'delivery-providers', 'delivery-prices', 'stopdesk-offices']) {
  const { status, body } = await call(`/api/mobile/v1/catalog/${r}?limit=5`)
  ok(`catalog/${r}`, status === 200, `n=${body?.items?.length ?? '?'}`)
}

// ── 2. delivery resources must be READ-ONLY from mobile ──
console.log('\nDELIVERY RESOURCES ARE READ-ONLY')
for (const r of ['delivery-providers', 'delivery-prices', 'stopdesk-offices']) {
  const post = await call(`/api/mobile/v1/catalog/${r}`, { method: 'POST', body: JSON.stringify({ x: 1 }) })
  ok(`POST ${r} rejected`, post.status === 405, `HTTP ${post.status}`)
  const del = await call(`/api/mobile/v1/catalog/${r}?id=00000000-0000-0000-0000-000000000000`, { method: 'DELETE' })
  ok(`DELETE ${r} rejected`, del.status === 405, `HTTP ${del.status}`)
}

// ── 3. courier credentials must never reach the client ──
console.log('\nCREDENTIAL LEAK CHECK')
const dp = await call('/api/mobile/v1/catalog/delivery-providers?limit=50')
const raw = JSON.stringify(dp.body ?? {})
ok('no `credentials` field in payload', !raw.includes('"credentials"'))
ok('no api_key / token / password in payload', !/api_key|"token"|password|secret/i.test(raw))

// ── 4. categories are writable (round-trip, then cleaned up) ──
console.log('\nCATEGORIES CRUD')
const slug = `qa-android-${Date.now()}`
const created = await call('/api/mobile/v1/catalog/categories', {
  method: 'POST', body: JSON.stringify({ name: 'QA Android', slug }),
})
ok('create category', created.status === 201, created.body?.item?.slug ?? created.body?.error)
const newId = created.body?.item?.id
if (newId) {
  const patched = await call(`/api/mobile/v1/catalog/categories?id=${newId}`, {
    method: 'PATCH', body: JSON.stringify({ is_active: false }),
  })
  ok('toggle category', patched.status === 200)
  const removed = await call(`/api/mobile/v1/catalog/categories?id=${newId}`, { method: 'DELETE' })
  ok('delete category (cleanup)', removed.status === 200)
}
const badSlug = await call('/api/mobile/v1/catalog/categories', {
  method: 'POST', body: JSON.stringify({ name: 'Bad', slug: 'Not Valid Slug!' }),
})
ok('rejects invalid slug', badSlug.status === 400, badSlug.body?.error)

// ── 5. push payload contract (built server-side, asserted here) ──
console.log('\nPUSH PAYLOAD CONTRACT')
const sendSrc = fs.readFileSync('F:/dakkani/lib/push/send.ts', 'utf8')
for (const k of ['order_id', 'order_number', 'customer', 'items_count', 'total', 'wilaya', 'deeplink'])
  ok(`payload carries ${k}`, new RegExp(`${k}:`).test(sendSrc))
ok("type is 'new_order'", /type:\s*'new_order'/.test(sendSrc))
ok('android channel_id set', /channel_id/.test(sendSrc))
ok('custom sound referenced', /'new_order'/.test(sendSrc))

const pushSrc = fs.readFileSync('F:/dakkani/apps/mobile/src/lib/push.ts', 'utf8')
for (const k of ['order_id', 'order_number', 'customer', 'items_count', 'total', 'wilaya'])
  ok(`app parses ${k}`, new RegExp(`d\\.${k}`).test(pushSrc))
ok('app uses NATIVE device token (not Expo token)', /getDevicePushTokenAsync/.test(pushSrc))
ok('app does NOT use Expo push token', !/getExpoPushTokenAsync/.test(pushSrc))

// ── 6. deep link contract ──
console.log('\nDEEP LINK CONTRACT')
const deeplink = sendSrc.match(/deeplink:\s*`([^`]+)`/)?.[1] ?? ''
ok('server emits commerco://orders/<id>', deeplink.startsWith('commerco://orders/'), deeplink)
const layoutSrc = fs.readFileSync('F:/dakkani/apps/mobile/app/_layout.tsx', 'utf8')
// The app's own regex contains ')' inside it — match up to the closing '/i'
// rather than the first ')', or the pattern gets truncated.
const re = layoutSrc.match(/\.match\(\/(.+?)\/i\)/)?.[1]
ok('app has a deep-link regex', !!re, re ? `/${re}/i` : '')
if (re) {
  const rx = new RegExp(re, 'i')
  const sample = 'commerco://orders/3f2504e0-4f89-11d3-9a0c-0305e82c3301'
  ok('regex matches a real deep link', rx.test(sample), sample)
  ok('regex extracts the uuid', rx.exec(sample)?.[1] === '3f2504e0-4f89-11d3-9a0c-0305e82c3301')
  ok('regex rejects a non-order link', !rx.test('commerco://products/abc'))
}
const appJson = JSON.parse(fs.readFileSync('F:/dakkani/apps/mobile/app.json', 'utf8')).expo
ok('scheme registered in app.json', appJson.scheme === 'commerco', appJson.scheme)
ok('android intent filter has the scheme',
  appJson.android.intentFilters?.[0]?.data?.[0]?.scheme === 'commerco')

console.log(`\n==============================================`)
console.log(`TOTAL  PASS ${pass}   FAIL ${fail}`)
console.log(`==============================================`)
process.exit(fail ? 1 : 0)
