// Serves files stored by lib/db storage (UPLOAD_DIR) — replaces Supabase
// Storage public URLs. Files are immutable (unique names), so cache hard.
// Raster images accept ?w=<width>[&q=<quality>]: resized to WebP with sharp
// and kept on disk under UPLOAD_DIR/.resized so each size is encoded once.
import { promises as fs } from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.avif': 'image/avif', '.mp4': 'video/mp4', '.pdf': 'application/pdf',
}
const RESIZABLE = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif'])
// Snap requested widths to a fixed set so the disk cache stays bounded.
const WIDTHS = [256, 384, 640, 828, 1080, 1200, 1920]
const CACHE_HEADERS = { 'Cache-Control': 'public, max-age=31536000, immutable' }

async function resized(root: string, abs: string, width: number, quality: number): Promise<Buffer> {
  const w = WIDTHS.find(x => x >= width) ?? WIDTHS[WIDTHS.length - 1]
  const q = Math.min(90, Math.max(40, quality || 75))
  const out = path.join(root, '.resized', `${w}q${q}`, path.relative(root, abs) + '.webp')
  try { return await fs.readFile(out) } catch {}
  const sharp = (await import('sharp')).default
  const buf = await sharp(abs).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: q }).toBuffer()
  await fs.mkdir(path.dirname(out), { recursive: true })
  await fs.writeFile(out, buf)
  return buf
}

export async function GET(req: Request, { params }: { params: { path: string[] } }) {
  const root = path.resolve(process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'public', 'uploads'))
  const abs = path.resolve(root, ...params.path.map(p => decodeURIComponent(p)))
  if (!abs.startsWith(root + path.sep) || abs.startsWith(path.join(root, '.resized') + path.sep)) {
    return new NextResponse('Not found', { status: 404 })
  }
  const ext = path.extname(abs).toLowerCase()
  const url = new URL(req.url)
  const width = Number(url.searchParams.get('w')) || 0
  try {
    if (width > 0 && RESIZABLE.has(ext)) {
      try {
        const buf = await resized(root, abs, width, Number(url.searchParams.get('q')) || 0)
        return new NextResponse(new Uint8Array(buf), { headers: { 'Content-Type': 'image/webp', ...CACHE_HEADERS } })
      } catch (e: any) {
        if (e?.code === 'ENOENT') throw e
        console.error('[uploads] resize failed, serving original:', e?.message)
      }
    }
    const buf = await fs.readFile(abs)
    const type = TYPES[ext] ?? 'application/octet-stream'
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': type,
        ...CACHE_HEADERS,
        // SVG uploads must never execute script in our origin.
        ...(type === 'image/svg+xml' ? { 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'" } : {}),
      },
    })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
}
