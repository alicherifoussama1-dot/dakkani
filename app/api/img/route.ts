// ============================================================
// IMAGE PROXY — /api/img
//
// WHY THIS EXISTS
// Product images live in a PUBLIC Supabase Storage bucket, and their
// absolute URLs are stored inside product rows. That leaves two ways to
// get them in front of a visitor, and both hit a hard wall:
//
//   1. next/image  → every request goes through Vercel Image
//      Optimization, whose transformation quota is exhausted (402).
//   2. raw <img src={supabaseUrl}> → every visitor fetches the full-size
//      original straight from Supabase, so ONE ad campaign drained the
//      project's cached-egress quota and restricted the whole project
//      (auth included), not just storage.
//
// This route is the third way. It sits on Vercel's CDN, so Supabase is
// hit ONCE per (image, width) instead of once per visitor, and it resizes
// with sharp locally instead of spending Vercel's optimizer quota.
// Cache misses cost function CPU; hits cost nothing.
//
// It deliberately does NOT touch any stored URL. Rewriting happens at
// render time only — product rows stay byte-identical.
// ============================================================
import { NextRequest, NextResponse } from 'next/server'

// sharp is loaded LAZILY, inside the handler, and never at module scope.
// A top-level `import sharp` that fails to resolve its native binary in the
// lambda takes the whole route down with a 500 before a single line of our
// code runs — which is exactly what happened on the first deploy. Loaded
// this way, a missing binary costs us the resize and nothing else: the
// proxy still serves the image and still shields Supabase.
let sharpMod: (typeof import('sharp'))['default'] | null | undefined
async function getSharp() {
  if (sharpMod !== undefined) return sharpMod
  try { sharpMod = (await import('sharp')).default }
  catch { sharpMod = null }
  return sharpMod
}

// sharp is native; the edge runtime cannot load it.
export const runtime = 'nodejs'
// NOT `force-static`: in Next 14 that blanks out searchParams inside a
// Route Handler, which would strip `u` and break every image. Edge caching
// is driven by the Cache-Control header on the response instead.
export const dynamic = 'force-dynamic'

/** Only this project's Supabase host may be proxied. Anything else would
 *  make this an open proxy that strangers could use as free bandwidth. */
const ALLOWED_HOST = (() => {
  try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').host }
  catch { return '' }
})()

/** Public storage objects only — never the REST or auth surface, and never
 *  a signed/private path. */
const ALLOWED_PREFIX = '/storage/v1/object/public/'

/** A closed set of widths. An open `w` lets anyone mint unlimited distinct
 *  cache keys, and every miss is a fresh Supabase fetch — exactly the drain
 *  this route exists to stop. These match the sizes the storefront asks for. */
const WIDTHS = [64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920]

const YEAR = 'public, max-age=31536000, s-maxage=31536000, immutable'

function bad(reason: string) {
  return new NextResponse(reason, { status: 400, headers: { 'Cache-Control': 'no-store' } })
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const raw = sp.get('u')
  if (!raw) return bad('missing u')

  let src: URL
  try { src = new URL(raw) } catch { return bad('bad u') }

  if (!ALLOWED_HOST || src.host !== ALLOWED_HOST) return bad('host not allowed')
  if (!src.pathname.startsWith(ALLOWED_PREFIX)) return bad('path not allowed')
  // Strip any query the caller appended — it is not part of the object
  // identity and would only fragment the cache.
  src.search = ''

  // Snap to the nearest allowed width rather than rejecting, so a caller
  // asking for 700 gets 750 instead of a broken image.
  const wReq = Number(sp.get('w'))
  const width = Number.isFinite(wReq) && wReq > 0
    ? WIDTHS.find(w => w >= wReq) ?? WIDTHS[WIDTHS.length - 1]
    : 0
  const qReq = Number(sp.get('q'))
  const quality = Number.isFinite(qReq) && qReq >= 40 && qReq <= 95 ? Math.round(qReq) : 75

  let upstream: Response
  try {
    upstream = await fetch(src.toString(), {
      // Vercel's Data Cache would double-store the bytes; the CDN response
      // cache below is the layer that matters here.
      cache: 'no-store',
      headers: { accept: 'image/*' },
    })
  } catch {
    // Supabase unreachable — hand the browser the original so the page is
    // degraded, not broken. no-store so the failure is never cached.
    return NextResponse.redirect(src.toString(), { status: 307, headers: { 'Cache-Control': 'no-store' } })
  }

  if (!upstream.ok) {
    // Mirror the upstream status (402/404/…) WITHOUT caching it, so the
    // image recovers on its own the moment upstream does.
    return new NextResponse(null, { status: upstream.status, headers: { 'Cache-Control': 'no-store' } })
  }

  const type = upstream.headers.get('content-type') ?? ''
  // Uint8Array, not Buffer: Buffer is not a valid BodyInit under the DOM
  // lib types, and sharp accepts a Uint8Array just the same.
  const bytes = new Uint8Array(await upstream.arrayBuffer())

  // SVG and GIF are passed through untouched: rasterising an SVG loses its
  // whole point, and sharp would flatten a GIF to its first frame.
  if (type.includes('svg') || type.includes('gif')) {
    return new NextResponse(bytes, {
      headers: { 'Content-Type': type || 'application/octet-stream', 'Cache-Control': YEAR },
    })
  }

  const sharpFn = await getSharp()
  if (!sharpFn) {
    // No native binary in this runtime. Serve the original, still cached for
    // a year: unresized bytes are correct bytes, and one origin fetch per
    // image is the whole point of this route.
    return new NextResponse(bytes, {
      headers: {
        'Content-Type': type || 'application/octet-stream',
        'Cache-Control': YEAR,
        'X-Img-Proxy': 'passthrough;no-sharp',
      },
    })
  }

  try {
    let img = sharpFn(bytes, { failOn: 'none' }).rotate() // honour EXIF orientation
    if (width) img = img.resize({ width, withoutEnlargement: true })
    const out = new Uint8Array(await img.webp({ quality }).toBuffer())
    return new NextResponse(out, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': YEAR,
        'X-Img-Proxy': `w=${width || 'orig'};q=${quality}`,
      },
    })
  } catch {
    // Unsupported/corrupt input — serve the original bytes rather than a
    // broken image. Still cacheable: the bytes are correct, just unresized.
    return new NextResponse(bytes, {
      headers: { 'Content-Type': type || 'application/octet-stream', 'Cache-Control': YEAR },
    })
  }
}
