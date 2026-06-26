import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/onboarding',
  '/auth/login', '/auth/register', '/discover']

// Routes that require auth (gate logged-out users to /login).
const PROTECTED = ['/dashboard','/admin','/products','/orders','/settings','/categories',
  '/warehouses','/coupons','/customers','/analytics','/landing-pages','/tracking',
  '/apps','/billing','/confirmili','/justad','/learn','/reviews','/blacklist']
// Auth pages that redirect already-logged-in users to /dashboard.
const AUTH_PAGES = ['/login','/register','/auth/login','/auth/register']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

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
