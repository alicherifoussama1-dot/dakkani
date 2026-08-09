// ============================================================
// REGRESSION VERIFICATION for the audit fixes.
//
// Runs against the REAL backend and the REAL database, exactly like
// verify-api.mjs (same magic-link session, same headers). Nothing here is
// mocked and nothing is left behind:
//   · every row it creates is deleted again
//   · the one order it touches is PATCHed to the status it already has, so
//     no order ever changes state; the audit row that produces is removed
//
// Run:  node scripts/verify-fixes.mjs
// Env:  ENV_PATH (default F:/dakkani/.env.local), API_URL, STORE_SLUG
// ============================================================
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const ENV_PATH = process.env.ENV_PATH ?? 'F:/dakkani/.env.local'
const BASE = process.env.API_URL ?? 'http://localhost:3000'
const SLUG = process.env.STORE_SLUG ?? 'sama-brand-04'

const env = Object.fromEntries(
  fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] }))

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let pass = 0, fail = 0, skip = 0
const ok = (n, c, extra = '') => {
  c ? (pass++, console.log(`  ✓ ${n}${extra ? ' — ' + extra : ''}`))
    : (fail++, console.log(`  ✗ ${n}${extra ? ' — ' + extra : ''}`))
}
const skipped = (n, why) => { skip++; console.log(`  ~ ${n} — SKIPPED: ${why}`) }

// ── session ──
const { data: store } = await admin.from('stores').select('id,owner_id,name').eq('slug', SLUG).single()
const { data: u } = await admin.auth.admin.getUserById(store.owner_id)
const { data: link } = await admin.auth.admin.generateLink({ type: 'magiclink', email: u.user.email })
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const { data: sess } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: link.properties.hashed_token })
const H = {
  Authorization: `Bearer ${sess.session.access_token}`,
  'X-Commerco-Store': store.id,
  'Content-Type': 'application/json',
}
const call = async (p, init = {}) => {
  const r = await fetch(BASE + p, { ...init, headers: { ...H, ...(init.headers || {}) } })
  return { status: r.status, body: await r.json().catch(() => ({})) }
}

console.log(`\nSTORE: ${store.name}\nBASE:  ${BASE}\n`)

// ════════════════════════════════════════════════════════════
console.log('FIX 4 — order_history writes the columns that exist')
// migration 010: old_status / new_status / changed_by / notes.
// The route used to write from_status / to_status / note, which silently
// failed on every single mobile status change.
{
  // Only an order whose status writes NO timestamp column, so re-applying
  // the same status is a genuine no-op on the orders row.
  const TIMESTAMPED = ['confirmed', 'shipped', 'delivered']
  const { data: cand } = await admin
    .from('orders').select('id,status')
    .eq('store_id', store.id)
    .not('status', 'in', `(${TIMESTAMPED.join(',')})`)
    .limit(1)

  const order = cand?.[0]
  if (!order) {
    skipped('history row is written on status change', 'no safely-patchable order in this store')
  } else {
    // A unique marker, NOT a timestamp window: created_at comes from the
    // database clock and the test process's clock is a different one, so a
    // `gte(created_at, before)` filter can miss a row that was written.
    const MARKER = 'VERIFY-FIXES probe ' + Date.now()
    const res = await call(`/api/mobile/v1/orders/${order.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: order.status, note: MARKER }),
    })
    ok('PATCH same status succeeds', res.status === 200, res.body.error ?? `status=${res.body.status}`)

    const { data: hist } = await admin
      .from('order_history').select('id,old_status,new_status,notes,changed_by,created_at')
      .eq('order_id', order.id).eq('notes', MARKER).limit(1)

    const row = hist?.[0]
    ok('history row was actually inserted', !!row, row ? `id=${row.id}` : 'NO ROW — insert still failing')
    if (row) {
      ok('new_status populated', row.new_status === order.status, `new_status=${row.new_status}`)
      ok('old_status populated', row.old_status === order.status, `old_status=${row.old_status}`)
      ok('notes populated (not `note`)', row.notes === MARKER, `notes=${row.notes}`)
      // Clean up the probe row — the order itself never changed status.
      await admin.from('order_history').delete().eq('id', row.id)
      console.log('    ↳ probe history row deleted')
    }

    const { data: after } = await admin.from('orders').select('status').eq('id', order.id).single()
    ok('order status unchanged by the probe', after.status === order.status, after.status)
  }
}

// ════════════════════════════════════════════════════════════
console.log('\nFIX 11 — product search matches SKU')
{
  const create = await call('/api/mobile/v1/products', {
    method: 'POST',
    body: JSON.stringify({
      name: 'VERIFY FIXES Product', name_ar: 'منتج تحقق', price: 1234,
      sku: 'VRFY-SKU-9911',
    }),
  })
  const id = create.body.product?.id
  ok('created probe product', create.status === 201 && !!id, create.body.error ?? id)

  if (id) {
    const bySku = await call('/api/mobile/v1/products?q=VRFY-SKU-9911')
    ok('search by SKU finds it',
      bySku.body.products?.some(p => p.id === id),
      `hits=${bySku.body.products?.length}`)

    ok('product row exposes sku',
      bySku.body.products?.find(p => p.id === id)?.sku === 'VRFY-SKU-9911',
      String(bySku.body.products?.find(p => p.id === id)?.sku))

    const byName = await call('/api/mobile/v1/products?q=' + encodeURIComponent('منتج تحقق'))
    ok('search by Arabic name still works', byName.body.products?.some(p => p.id === id))

    // ── PostgREST filter injection: a comma used to break the or() grammar
    const comma = await call('/api/mobile/v1/products?q=' + encodeURIComponent('a,b)c'))
    ok('comma/paren in search does not error', comma.status === 200 && !comma.body.error,
      comma.body.error ?? 'clean 200')

    // ── FIX 10: variants round-trip without losing their fields
    const richVariants = [
      { key: 'red-m', label: 'أحمر / M', price: 1500, stock: 7, image: 'https://example.com/a.jpg', options: { color: 'red', size: 'M' } },
      { key: 'blue-l', label: 'أزرق / L', price: 1800, stock: 3 },
    ]
    await call('/api/mobile/v1/products/' + id, {
      method: 'PATCH', body: JSON.stringify({ variants: richVariants }),
    })
    // Simulate exactly what the editor now sends back: the array verbatim.
    const reread = await call('/api/mobile/v1/products/' + id)
    const roundTripped = reread.body.product?.variants ?? []
    await call('/api/mobile/v1/products/' + id, {
      method: 'PATCH', body: JSON.stringify({ variants: roundTripped }),
    })
    const after = await call('/api/mobile/v1/products/' + id)
    const v = after.body.product?.variants?.[0]
    ok('variant price survives an edit-save cycle', v?.price === 1500, `price=${v?.price}`)
    ok('variant stock survives an edit-save cycle', v?.stock === 7, `stock=${v?.stock}`)
    ok('variant image survives an edit-save cycle', !!v?.image, String(v?.image))
    ok('variant options survive an edit-save cycle', v?.options?.color === 'red', JSON.stringify(v?.options))

    // ── FIX 10b: per-variant stock keys are written independently
    const s1 = await call(`/api/mobile/v1/products/${id}/stock`, {
      method: 'PATCH', body: JSON.stringify({ quantity: 11, variant_key: 'red-m' }),
    })
    const s2 = await call(`/api/mobile/v1/products/${id}/stock`, {
      method: 'PATCH', body: JSON.stringify({ quantity: 22, variant_key: 'blue-l' }),
    })
    if (s1.status === 409 || s2.status === 409) {
      skipped('per-variant stock', 'store has no warehouse')
    } else {
      const withStock = await call('/api/mobile/v1/products/' + id)
      ok('stock for variant red-m kept', withStock.body.stock?.['red-m'] === 11, JSON.stringify(withStock.body.stock))
      ok('stock for variant blue-l kept', withStock.body.stock?.['blue-l'] === 22, JSON.stringify(withStock.body.stock))
    }

    await call('/api/mobile/v1/products/' + id + '?hard=true', { method: 'DELETE' })
  }
  await admin.from('products').delete().eq('store_id', store.id).like('name', 'VERIFY FIXES Product%')
  console.log('    ↳ probe product deleted')
}

// ════════════════════════════════════════════════════════════
console.log('\nFIX 12 — customer stats use the real total')
{
  const list = await call('/api/mobile/v1/customers?limit=1')
  const c = list.body.customers?.[0]
  if (!c) {
    skipped('customer aggregate', 'store has no customers')
  } else {
    const agg = await call('/api/mobile/v1/customers?phone=' + encodeURIComponent(c.phone))
    ok('single-customer aggregate returns', agg.status === 200 && !!agg.body.customer, agg.body.error ?? '')

    // The exact order count must equal the orders endpoint's exact total for
    // the same phone — that is the number the detail screen now shows.
    const scoped = await call('/api/mobile/v1/orders?limit=1&phone=' + encodeURIComponent(c.phone))
    ok('aggregate orders == orders total for that phone',
      agg.body.customer?.orders === scoped.body.total,
      `aggregate=${agg.body.customer?.orders} orders=${scoped.body.total}`)

    ok('aggregate spend is a number', typeof agg.body.customer?.spend === 'number',
      String(agg.body.customer?.spend))

    // phone= is an EXACT match, so every returned order belongs to them.
    const page = await call('/api/mobile/v1/orders?limit=25&phone=' + encodeURIComponent(c.phone))
    ok('phone filter returns only that customer',
      (page.body.orders ?? []).every(o => o.customer_phone === c.phone),
      `n=${page.body.orders?.length}`)

    const unknown = await call('/api/mobile/v1/customers?phone=00000000000')
    ok('unknown phone → customer:null', unknown.status === 200 && unknown.body.customer === null)
  }
}

// ════════════════════════════════════════════════════════════
console.log('\nFIX 8 — device push preferences are readable')
{
  const TOKEN = 'VERIFY-FIXES-TOKEN-' + Date.now() + '-abcdefghijklmnop'

  const before = await call('/api/mobile/v1/devices?token=' + TOKEN)
  ok('unregistered device → registered:false', before.status === 200 && before.body.registered === false,
    JSON.stringify(before.body))

  const reg = await call('/api/mobile/v1/devices', {
    method: 'POST',
    body: JSON.stringify({ token: TOKEN, platform: 'android', app_version: '1.0.0', locale: 'fr' }),
  })
  ok('register device', reg.status === 200 && reg.body.registered === true, reg.body.error ?? '')

  const fresh = await call('/api/mobile/v1/devices?token=' + TOKEN)
  ok('defaults read back as all-enabled',
    fresh.body.prefs?.push_enabled === true && fresh.body.prefs?.sound_enabled === true,
    JSON.stringify(fresh.body.prefs))
  ok('locale is persisted as sent (not forced to ar)', fresh.body.locale === 'fr', String(fresh.body.locale))

  await call('/api/mobile/v1/devices', {
    method: 'PATCH', body: JSON.stringify({ token: TOKEN, sound_enabled: false }),
  })
  const muted = await call('/api/mobile/v1/devices?token=' + TOKEN)
  ok('muted sound survives a re-read', muted.body.prefs?.sound_enabled === false,
    JSON.stringify(muted.body.prefs))
  ok('other prefs untouched by the patch', muted.body.prefs?.push_enabled === true)

  await call('/api/mobile/v1/devices?token=' + TOKEN, { method: 'DELETE' })
  const gone = await call('/api/mobile/v1/devices?token=' + TOKEN)
  ok('unregister removes the row', gone.body.registered === false)
  console.log('    ↳ probe device token deleted')
}

// ════════════════════════════════════════════════════════════
console.log('\nFIX 6 — the الإحصائيات endpoint exists and matches the page rules')
{
  const a = await call('/api/mobile/v1/analytics?days=30')
  ok('analytics responds', a.status === 200 && !!a.body.kpis, a.body.error ?? '')
  const k = a.body.kpis ?? {}
  const expected = ['revenue', 'grossProfit', 'avgOrder', 'deliveryRate', 'cancelRate', 'deliveryRevenue', 'ordersCount', 'uniqueCustomers']
  ok('all 8 KPIs present', expected.every(key => typeof k[key] === 'number'),
    expected.filter(key => typeof k[key] !== 'number').join(',') || 'all present')
  ok('grossProfit === revenue − deliveryRevenue',
    Math.abs((k.revenue - k.deliveryRevenue) - k.grossProfit) < 0.01,
    `${k.revenue} - ${k.deliveryRevenue} = ${k.grossProfit}`)
  ok('deliveryRate within 0..100', k.deliveryRate >= 0 && k.deliveryRate <= 100, String(k.deliveryRate))
  ok('cancelRate within 0..100', k.cancelRate >= 0 && k.cancelRate <= 100, String(k.cancelRate))
  ok('byWilaya is ranked by order count',
    (a.body.byWilaya ?? []).every((w, i, arr) => i === 0 || arr[i - 1].total >= w.total),
    `n=${a.body.byWilaya?.length}`)
  ok('wilaya names resolved (not "ولاية <id>")',
    (a.body.byWilaya ?? []).every(w => !w.wilaya_name || !/^ولاية \d+$/.test(w.wilaya_name)),
    a.body.byWilaya?.[0]?.wilaya_name ?? 'none')

  // Cross-check against the shared dashboard handler over the same window.
  const dash = await call('/api/mobile/v1/dashboard?preset=30d')
  const dashOrders = Number(dash.body.kpis?.totalOrders?.value ?? 0)
  ok('order count agrees with the dashboard handler (±2%)',
    dashOrders === 0 || Math.abs(dashOrders - k.ordersCount) / Math.max(dashOrders, 1) < 0.02,
    `analytics=${k.ordersCount} dashboard=${dashOrders}`)
}

// ════════════════════════════════════════════════════════════
console.log('\nBOOTSTRAP — Algiers day boundary')
{
  const b = await call('/api/mobile/v1/bootstrap')
  ok('bootstrap responds', b.status === 200 && !!b.body.counters, b.body.error ?? '')
  const c = b.body.counters ?? {}
  ok('all counters are numbers',
    ['newOrders', 'unreadNotifications', 'activeProducts', 'ordersToday', 'revenueToday', 'ordersThisMonth', 'productCount']
      .every(k => typeof c[k] === 'number'),
    JSON.stringify(c))

  // The defect was that bootstrap used the server's OWN local midnight while
  // the dashboard used getAlgiersDateRange, so the two disagreed about which
  // orders were "today". The property to assert is therefore that they now
  // agree — both count rows.length over the same range, so the numbers must
  // be identical. (Asserting against a third, locally-computed boundary would
  // only re-test the shared helper against the test host's timezone.)
  const dashToday = await call('/api/mobile/v1/dashboard?preset=today')
  const dashCount = Number(dashToday.body.kpis?.totalOrders?.value ?? -1)
  ok('ordersToday agrees with the dashboard handler for the same day',
    c.ordersToday === dashCount,
    `bootstrap=${c.ordersToday} dashboard=${dashCount}`)
}

// ════════════════════════════════════════════════════════════
console.log('\nSTORE ISOLATION still holds after the changes')
{
  const forged = await call('/api/mobile/v1/bootstrap', {
    headers: { 'X-Commerco-Store': '00000000-0000-4000-8000-000000000000' },
  })
  ok('forged store header cannot cross tenants', forged.body.store?.id === store.id)

  const noAuth = await fetch(BASE + '/api/mobile/v1/analytics')
  ok('analytics without a token → 401', noAuth.status === 401)

  const noAuthDev = await fetch(BASE + '/api/mobile/v1/devices?token=x')
  ok('devices GET without a token → 401', noAuthDev.status === 401)

  const noAuthCust = await fetch(BASE + '/api/mobile/v1/customers?phone=0555000000')
  ok('customers aggregate without a token → 401', noAuthCust.status === 401)
}

console.log(`\n${'='.repeat(50)}\nTOTAL  PASS ${pass}   FAIL ${fail}   SKIP ${skip}\n${'='.repeat(50)}`)
process.exit(fail ? 1 : 0)
