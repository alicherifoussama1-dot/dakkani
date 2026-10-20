// Production entry for Namecheap (CloudLinux Passenger): Passenger sets PORT
// and proxies every domain of the account to this process.
//
// Custom store domains are resolved HERE (Node, with direct DB access) rather
// than in the edge middleware: the edge sandbox cannot call back into this
// host, so `afnane.store/product/x` is rewritten to `/{storeSlug}/product/x`
// before Next.js sees the request. A product subdomain (`roya.afnane.store`,
// products.subdomain = 'roya') opens that product's page at `/`.
const { createServer } = require('http')
const { parse } = require('url')
const { loadEnvConfig } = require('@next/env')
loadEnvConfig(__dirname)
const next = require('next')
const { Pool } = require('pg')

const port = Number(process.env.PORT || 3000)
const app = next({ dev: false, dir: __dirname })
const handle = app.getRequestHandler()

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 })
const PLATFORM = new Set((process.env.PLATFORM_HOSTS || '').split(',').map(h => h.trim().toLowerCase()).filter(Boolean))
const SKIP = /^\/(api|_next|uploads|icons|landing)(\/|$)|^\/(favicon\.ico|manifest\.json|sw\.js|robots\.txt|sitemap\.xml)$|^\/workbox-/
const cache = new Map() // host -> { route, at }
const TTL = 60_000

const storeFor = async host => (await pool.query(
  `select s.id, s.slug from domains d join stores s on s.id = d.store_id
    where d.hostname = $1 and d.status = 'ssl_active' limit 1`, [host])).rows[0]

// host -> route | null
//   afnane.store      -> { slug }                              store domain
//   roya.afnane.store -> { slug, product: 'ensemble-roya' }    product subdomain
//   x.afnane.store    -> { base: 'afnane.store' }              unknown label: redirect
async function routeFor(host) {
  const hit = cache.get(host)
  if (hit && Date.now() - hit.at < TTL) return hit.route
  let route = null
  try {
    const direct = await storeFor(host)
    const dot = host.indexOf('.')
    const label = host.slice(0, dot), base = host.slice(dot + 1)
    if (direct) route = { slug: direct.slug }
    else if (dot > 0 && base.includes('.')) {
      const parent = await storeFor(base)
      if (parent) {
        const p = (await pool.query(
          `select slug from products where store_id = $1 and subdomain = $2 and is_active limit 1`,
          [parent.id, label])).rows[0]
        route = p ? { slug: parent.slug, product: p.slug } : { base }
      }
    }
  } catch (e) { console.error('[host-resolve]', e.message) }
  cache.set(host, { route, at: Date.now() })
  return route
}

// Rewrites req.url in place; returns a URL when the visitor must be redirected.
async function rewriteCustomHost(req) {
  // Never trust this marker from the outside: only this function may set it.
  delete req.headers['x-commerco-store-host']
  const host = String(req.headers.host || '').toLowerCase().split(':')[0].replace(/^www\./, '')
  if (!host || PLATFORM.has(host) || /^(localhost|127\.0\.0\.1)$/.test(host)) return
  const u = parse(req.url)
  const path = u.pathname || '/'
  if (SKIP.test(path)) return
  const route = await routeFor(host)
  if (!route) return
  if (route.base) return `https://${route.base}${path}${u.search || ''}`
  const { slug } = route
  // Shared storefront components emit /store/<slug>/...; collapse to /...
  let p = path.replace(/^\/store\/[^/]+(?=\/|$)/, '') || '/'
  if (route.product && p === '/') p = `/product/${route.product}`
  if (!(p === `/${slug}` || p.startsWith(`/${slug}/`))) p = p === '/' ? `/${slug}` : `/${slug}${p}`
  req.url = p + (u.search || '')
  req.headers['x-commerco-store-host'] = host // tells the middleware the host is resolved
}

app.prepare().then(() => {
  createServer(async (req, res) => {
    let redirect
    try { redirect = await rewriteCustomHost(req) } catch (e) { console.error('[rewrite]', e.message) }
    if (redirect) { res.writeHead(302, { Location: redirect }); return res.end() }
    handle(req, res)
  }).listen(port, () => {
    console.log(`commerco ready on port ${port}`)
  })
})
