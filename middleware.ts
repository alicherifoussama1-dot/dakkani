import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/onboarding',
  '/auth/login', '/auth/register', '/discover']

export async function middleware(request: NextRequest) {
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

  // Refresh session
  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Always allow API, webhooks, static files
  if (pathname.startsWith('/api/') || pathname.startsWith('/store/')) return response

  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))

  if (isPublic) {
    if (user && ['/login','/register','/auth/login','/auth/register'].includes(pathname)) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return response
  }

  // Require auth for dashboard & admin
  const PROTECTED = ['/dashboard','/admin','/products','/orders','/settings','/categories',
    '/warehouses','/coupons','/customers','/analytics','/landing-pages','/tracking',
    '/apps','/billing','/confirmili']
  if (!user && PROTECTED.some(p => pathname.startsWith(p))) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|workbox-.*|offline.html).*)'],
}
