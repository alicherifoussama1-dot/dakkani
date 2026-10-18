import { SESSION_COOKIE, verifySession } from '@/lib/db/session'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/onboarding', '/discover']

// Routes that require auth (gate logged-out users to /login).
const PROTECTED = ['/dashboard','/admin','/platform','/products','/orders','/settings','/categories',
  '/warehouses','/coupons','/customers','/analytics','/landing-pages','/tracking',
  '/apps','/billing','/confirmili','/justad','/learn','/reviews','/blacklist']
// Auth pages that redirect already-logged-in users to /dashboard.
const AUTH_PAGES = ['/login','/register']

// ── Custom-domain host → store slug resolution (cached) ─────
// afnane.store/product/x  →  rewrite to  /{storeSlug}/product/x
// Middleware runs on the edge runtime (no pg), so the lookup goes through
// /api/internal/resolve-host + an in-memory TTL cache.
// PLATFORM_HOSTS env (comma list) adds the app's own hosts, e.g. "afnan.store".
const EXTRA_PLATFORM_HOSTS = (process.env.PLATFORM_HOSTS ?? '').split(',').map(h => h.trim().toLowerCase()).filter(Boolean)
const PLATFORM_HOSTS_RE = /(\.vercel\.app|\.commerco\.app|^localhost(:\d+)?$|^127\.0\.0\.1(:\d+)?$)$/i
const PLATFORM_HOSTS = { test: (h: string) => PLATFORM_HOSTS_RE.test(h) || EXTRA_PLATFORM_HOSTS.includes(h) }
const hostCache = new Map<string, { slug: string | null; at: number }>()
const HOST_TTL = 60_000

async function resolveCustomHost(host: string, origin: string): Promise<string | null> {
  const cached = hostCache.get(host)
  if (cached && Date.now() - cached.at < HOST_TTL) return cached.slug
  let slug: string | null = null
  try {
    const base = process.env.INTERNAL_ORIGIN ?? origin
    const res = await fetch(`${base}/api/internal/resolve-host?host=${encodeURIComponent(host)}`, { cache: 'no-store' })
    if (res.ok) slug = (await res.json()).slug ?? null
  } catch { slug = null }
  hostCache.set(host, { slug, at: Date.now() })
  return slug
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Custom domain serving: rewrite the host's paths onto the storefront ──
  const rawHost = (request.headers.get('host') ?? '').toLowerCase().split(':')[0]
  const host = rawHost.replace(/^www\./, '')
  if (host && !PLATFORM_HOSTS.test(host) && !pathname.startsWith('/api/') && !pathname.startsWith('/_next') && !pathname.startsWith('/uploads/')) {
    const slug = await resolveCustomHost(host, request.nextUrl.origin)
    if (slug) {
      // Canonicalize internal links: on a custom host, `/store/<slug>/...`
      // (emitted by shared storefront components) collapses to `/...` so the
      // visitor stays on the custom domain instead of 404ing.
      let path = pathname
      const m = path.match(/^\/store\/[^/]+(\/.*)?$/)
      if (m) path = m[1] ?? '/'
      // Avoid double-prefixing if the path already targets this store.
      // IMPORTANT: carry the original query string across the rewrite — otherwise
      // params like ?order=<uuid> (thank-you page) are dropped and the page can't
      // find the order.
      if (!path.startsWith(`/${slug}/`) && path !== `/${slug}`) {
        const target = path === '/' ? `/${slug}` : `/${slug}${path}`
        const rewriteUrl = new URL(target, request.url)
        rewriteUrl.search = request.nextUrl.search
        return NextResponse.rewrite(rewriteUrl, { request: { headers: request.headers } })
      }
      if (path !== pathname) {
        const rewriteUrl = new URL(path, request.url)
        rewriteUrl.search = request.nextUrl.search
        return NextResponse.rewrite(rewriteUrl, { request: { headers: request.headers } })
      }
    }
  }

  // ── Landing v6 (design gelé) : la racine sert le film statique ──
  // public/landing/index.html — l'URL reste `/`. Les hôtes custom résolus
  // ci-dessus ont déjà été réécrits vers leur boutique.
  if (pathname === '/') {
    return NextResponse.rewrite(new URL('/landing/index.html', request.url), { request: { headers: request.headers } })
  }

  // Always allow API, webhooks, and storefront — they never consult `user`,
  // so skip the Supabase auth round-trip entirely.
  if (pathname.startsWith('/api/') || pathname.startsWith('/store/')) {
    return NextResponse.next({ request: { headers: request.headers } })
  }

  const isAuthPage = AUTH_PAGES.includes(pathname)
  const isPublic   = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
  const isProtected = !isPublic && PROTECTED.some(p => pathname.startsWith(p))

  // Only auth pages (redirect-if-logged-in) and protected routes (gate-if-logged-out)
  // actually need the user. For everything else — public pages, storefront slugs,
  // marketing — return immediately and avoid a network call to Supabase Auth.
  if (!isAuthPage && !isProtected) {
    return NextResponse.next({ request: { headers: request.headers } })
  }

  const response = NextResponse.next({ request: { headers: request.headers } })
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value)
  const user = session ? { id: session.sub } : null

  if (isAuthPage) {
    if (user) return NextResponse.redirect(new URL('/dashboard', request.url))
    return response
  }

  // isProtected
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|workbox-.*|offline.html).*)'],
}
