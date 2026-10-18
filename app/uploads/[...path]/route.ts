// Serves files stored by lib/db storage (UPLOAD_DIR) — replaces Supabase
// Storage public URLs. Files are immutable (unique names), so cache hard.
import { promises as fs } from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.avif': 'image/avif', '.mp4': 'video/mp4', '.pdf': 'application/pdf',
}

export async function GET(_req: Request, { params }: { params: { path: string[] } }) {
  const root = path.resolve(process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'public', 'uploads'))
  const abs = path.resolve(root, ...params.path.map(p => decodeURIComponent(p)))
  if (!abs.startsWith(root + path.sep)) return new NextResponse('Not found', { status: 404 })
  try {
    const buf = await fs.readFile(abs)
    const type = TYPES[path.extname(abs).toLowerCase()] ?? 'application/octet-stream'
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': type,
        'Cache-Control': 'public, max-age=31536000, immutable',
        // SVG uploads must never execute script in our origin.
        ...(type === 'image/svg+xml' ? { 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'" } : {}),
      },
    })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
}
