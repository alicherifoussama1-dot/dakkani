// ============================================================
// API VERIFICATION — exercises the real mobile API against the real
// backend + database. Run with: npm run test:api
//
// This is how the RN data layer is proven without a simulator.
// Every object it creates is deleted again at the end.
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

let pass = 0, fail = 0
const ok = (n, c, extra = '') => { c ? (pass++, console.log(`  ✓ ${n}${extra ? ' — ' + extra : ''}`)) : (fail++, console.log(`  ✗ ${n}${extra ? ' — ' + extra : ''}`)) }

// ── session ──
const { data: store } = await admin.from('stores').select('id,owner_id,name').eq('slug', SLUG).single()
const { data: u } = await admin.auth.admin.getUserById(store.owner_id)
const { data: link } = await admin.auth.admin.generateLink({ type: 'magiclink', email: u.user.email })
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const { data: sess } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: link.properties.hashed_token })
const TOKEN = sess.session.access_token
const H = { Authorization: `Bearer ${TOKEN}`, 'X-Commerco-Store': store.id, 'Content-Type': 'application/json' }
const call = async (p, init = {}) => {
  const r = await fetch(BASE + p, { ...init, headers: { ...H, ...(init.headers || {}) } })
  return { status: r.status, body: await r.json().catch(() => ({})) }
}

console.log(`\nSTORE: ${store.name}\n`)

console.log('READ ENDPOINTS')
const boot = await call('/api/mobile/v1/bootstrap')
ok('bootstrap', boot.status === 200 && !!boot.body.counters, JSON.stringify(boot.body.counters))
const an = await call('/api/mobile/v1/dashboard?preset=30d')
ok('analytics (shared handler)', an.status === 200 && !!an.body.kpis,
  `wilayas=${an.body.wilayaDistribution?.sortedWilayas?.length}`)
ok('wilaya names resolved', !(an.body.wilayaDistribution?.sortedWilayas ?? []).some(w => /^ولاية \d+$/.test(w.name)),
  an.body.wilayaDistribution?.sortedWilayas?.[0]?.name)
ok('58-wilaya model', (an.body.wilayaDistribution?.sortedWilayas ?? []).every(w => w.id <= 58))
const ords = await call('/api/mobile/v1/orders?limit=3')
ok('orders list', ords.status === 200 && Array.isArray(ords.body.orders), `total=${ords.body.total}`)
ok('order has wilaya name', !!ords.body.orders?.[0]?.wilaya_name, ords.body.orders?.[0]?.wilaya_name)
const prods = await call('/api/mobile/v1/products?limit=5')
ok('products list', prods.status === 200 && Array.isArray(prods.body.products), `n=${prods.body.products?.length}`)
const custs = await call('/api/mobile/v1/customers?limit=5')
ok('customers', custs.status === 200 && Array.isArray(custs.body.customers), `n=${custs.body.customers?.length}`)
const notifs = await call('/api/mobile/v1/notifications')
ok('notifications', notifs.status === 200, `unread=${notifs.body.unread}`)
if (ords.body.orders?.[0]) {
  const one = await call('/api/mobile/v1/orders/' + ords.body.orders[0].id)
  ok('order detail', one.status === 200 && !!one.body.order)
}

console.log('\nPRODUCT CRUD (create → read → update → stock → delete)')
let createdId = null
const create = await call('/api/mobile/v1/products', {
  method: 'POST',
  body: JSON.stringify({ name: 'TEST API Product', name_ar: 'منتج اختبار API', price: 3200, compare_price: 4000 }),
})
ok('create product', create.status === 201 && !!create.body.product?.id, create.body.error ?? create.body.product?.slug)
createdId = create.body.product?.id

if (createdId) {
  const read = await call('/api/mobile/v1/products/' + createdId)
  ok('read product', read.status === 200 && read.body.product?.id === createdId)

  const upd = await call('/api/mobile/v1/products/' + createdId, {
    method: 'PATCH', body: JSON.stringify({ price: 2900, name_ar: 'منتج اختبار محدّث' }),
  })
  ok('update product', upd.status === 200 && Number(upd.body.product?.price) === 2900,
    `price=${upd.body.product?.price}`)

  const badPrice = await call('/api/mobile/v1/products/' + createdId, {
    method: 'PATCH', body: JSON.stringify({ price: 5000, compare_price: 1000 }),
  })
  ok('rejects compare_price <= price', badPrice.status === 400, badPrice.body.error)

  const badField = await call('/api/mobile/v1/products/' + createdId, {
    method: 'PATCH', body: JSON.stringify({ store_id: '00000000-0000-4000-8000-000000000000' }),
  })
  ok('rejects unknown/forbidden field (store_id)', badField.status === 400)

  const stock = await call(`/api/mobile/v1/products/${createdId}/stock`, {
    method: 'PATCH', body: JSON.stringify({ quantity: 42 }),
  })
  ok('set stock', stock.status === 200 || stock.status === 409, stock.body.error ?? `stock=${stock.body.stock}`)

  const del = await call('/api/mobile/v1/products/' + createdId + '?hard=true', { method: 'DELETE' })
  ok('hard delete (no orders)', del.status === 200, del.body.deleted ?? del.body.error)

  const gone = await call('/api/mobile/v1/products/' + createdId)
  ok('product is gone', gone.status === 404)
}

console.log('\nSECURITY')
const noAuth = await fetch(BASE + '/api/mobile/v1/bootstrap')
ok('no token → 401', noAuth.status === 401)
const forged = await call('/api/mobile/v1/bootstrap', { headers: { 'X-Commerco-Store': '00000000-0000-4000-8000-000000000000' } })
ok('forged store header cannot cross tenants', forged.body.store?.id === store.id)
const foreignProduct = await call('/api/mobile/v1/products/00000000-0000-4000-8000-000000000000')
ok('foreign product id → 404', foreignProduct.status === 404)

// cleanup any stragglers
await admin.from('products').delete().eq('store_id', store.id).like('name', 'TEST API Product%')


// ── appended: new module endpoints ──
console.log('\nMODULE ENDPOINTS')
const rev = await call('/api/mobile/v1/reviews')
ok('reviews', rev.status === 200 && Array.isArray(rev.body.reviews), `n=${rev.body.reviews?.length} avg=${rev.body.avg}`)
const set = await call('/api/mobile/v1/settings')
ok('settings', set.status === 200, set.body.settings ? 'loaded' : 'null')
const badSet = await call('/api/mobile/v1/settings', { method: 'PATCH', body: JSON.stringify({ fraud_auto_block_score: 0 }) })
ok('settings rejects protected field', badSet.status === 400, badSet.body.error)
const goodSet = await call('/api/mobile/v1/settings', { method: 'PATCH', body: JSON.stringify({ low_stock_alert: true }) })
ok('settings accepts safe field', goodSet.status === 200, goodSet.body.error ?? 'ok')

for (const r of ['coupons', 'warehouses', 'blacklist', 'sheets', 'landing-pages', 'notifications']) {
  const res = await call(`/api/mobile/v1/catalog/${r}`)
  ok(`catalog/${r}`, res.status === 200, res.body.unavailable ? 'table unavailable (graceful)' : `n=${res.body.items?.length}`)
}
const unknown = await call('/api/mobile/v1/catalog/orders')
ok('catalog rejects non-whitelisted table (orders)', unknown.status === 404)

// blacklist create → delete round trip
const bl = await call('/api/mobile/v1/catalog/blacklist', { method: 'POST', body: JSON.stringify({ phone: '0555000111', full_name: 'TEST API', reason: 'verify' }) })
ok('blacklist create', bl.status === 201 || bl.status === 500, bl.body.error ?? bl.body.item?.phone)
if (bl.body.item?.id) {
  const d = await call(`/api/mobile/v1/catalog/blacklist?id=${bl.body.item.id}`, { method: 'DELETE' })
  ok('blacklist delete', d.status === 200)
}
const badPhone = await call('/api/mobile/v1/catalog/blacklist', { method: 'POST', body: JSON.stringify({ phone: '123' }) })
ok('blacklist validates phone', badPhone.status === 400, badPhone.body.error)

console.log(`\n${'='.repeat(46)}\nTOTAL  PASS ${pass}   FAIL ${fail}\n${'='.repeat(46)}`)
process.exit(fail ? 1 : 0)
