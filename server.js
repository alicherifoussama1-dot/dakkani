// Production entry for Namecheap (CloudLinux Passenger): Passenger sets PORT
// and proxies every domain of the account to this process.
//
// Custom store domains are resolved HERE (Node, with direct DB access) rather
// than in the edge middleware: the edge sandbox cannot call back into this
// host, so `afnane.store/product/x` is rewritten to `/{storeSlug}/product/x`
// before Next.js sees the request.
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
const cache = new Map() // host -> { slug, at }
const TTL = 60_000

async function storeSlugFor(host) {
  const hit = cache.get(host)
  if (hit && Date.now() - hit.at < TTL) return hit.slug
  let slug = null
  try {
    const r = await pool.query(
      `select s.slug from domains d join stores s on s.id = d.store_id
        where d.hostname = $1 and d.status = 'ssl_active' limit 1`, [host])
    slug = r.rows[0]?.slug ?? null
  } catch (e) { console.error('[host-resolve]', e.message) }
  cache.set(host, { slug, at: Date.now() })
  return slug
}

async function rewriteCustomHost(req) {
  // Never trust this marker from the outside: only this function may set it.
  delete req.headers['x-commerco-store-host']
  const host = String(req.headers.host || '').toLowerCase().split(':')[0].replace(/^www\./, '')
  if (!host || PLATFORM.has(host) || /^(localhost|127\.0\.0\.1)$/.test(host)) return
  const u = parse(req.url)
  const path = u.pathname || '/'
  if (SKIP.test(path)) return
  const slug = await storeSlugFor(host)
  if (!slug) return
  // Shared storefront components emit /store/<slug>/...; collapse to /...
  let p = path.replace(/^\/store\/[^/]+(?=\/|$)/, '') || '/'
  if (!(p === `/${slug}` || p.startsWith(`/${slug}/`))) p = p === '/' ? `/${slug}` : `/${slug}${p}`
  req.url = p + (u.search || '')
  req.headers['x-commerco-store-host'] = host // tells the middleware the host is resolved
}

app.prepare().then(() => {
  createServer(async (req, res) => {
    try { await rewriteCustomHost(req) } catch (e) { console.error('[rewrite]', e.message) }
    handle(req, res)
  }).listen(port, () => {
    console.log(`commerco ready on port ${port}`)
  })
})
