import { createServerClient, type CookieOptions } from '@supabase/ssr'
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
// Uses the Supabase REST API directly (edge-safe) + in-memory TTL cache.
const PLATFORM_HOSTS = /(\.vercel\.app|\.commerco\.app|^localhost(:\d+)?$|^127\.0\.0\.1(:\d+)?$)$/i
const hostCache = new Map<string, { slug: string | null; at: number }>()
const HOST_TTL = 60_000

async function resolveCustomHost(host: string): Promise<string | null> {
  const cached = hostCache.get(host)
  if (cached && Date.now() - cached.at < HOST_TTL) return cached.slug
  let slug: string | null = null
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (url && key) {
      const res = await fetch(
        `${url}/rest/v1/domains?hostname=eq.${encodeURIComponent(host)}&status=eq.ssl_active&select=stores(slug)&limit=1`,
        { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' },
      )
      const rows = await res.json().catch(() => [])
      slug = rows?.[0]?.stores?.slug ?? null
    }
  } catch { slug = null }
  hostCache.set(host, { slug, at: Date.now() })
  return slug
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Custom domain serving: rewrite the host's paths onto the storefront ──
  const rawHost = (request.headers.get('host') ?? '').toLowerCase().split(':')[0]
  const host = rawHost.replace(/^www\./, '')
  if (host && !PLATFORM_HOSTS.test(host) && !pathname.startsWith('/api/') && !pathname.startsWith('/_next')) {
    const slug = await resolveCustomHost(host)
    if (slug) {
      // Canonicalize internal links: on a custom host, `/store/<slug>/...`
      // (emitted by shared storefront components) collapses to `/...` so the
      // visitor stays on the custom domain instead of 404ing.
      let path = pathname
      const m = path.match(/^\/store\/[^/]+(\/.*)?$/)
      if (m) path = m[1] ?? '/'
      // Avoid double-prefixing if the path already targets this store.
      if (!path.startsWith(`/${slug}/`) && path !== `/${slug}`) {
        const target = path === '/' ? `/${slug}` : `/${slug}${path}`
        return NextResponse.rewrite(new URL(target, request.url), { request: { headers: request.headers } })
      }
      if (path !== pathname) {
        return NextResponse.rewrite(new URL(path, request.url), { request: { headers: request.headers } })
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

  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Refresh session / read user (only reached for auth pages & protected routes)
  const { data: { user } } = await supabase.auth.getUser()

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
