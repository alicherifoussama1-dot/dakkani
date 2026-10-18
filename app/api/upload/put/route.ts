// Receives the file body for a signed upload URL issued by /api/upload.
import { NextRequest, NextResponse } from 'next/server'
import { storageBucket } from '@/lib/db/server'
import { verifyUploadPath } from '@/lib/db/upload-sign'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest) {
  const q = req.nextUrl.searchParams
  const bucket = q.get('bucket') ?? ''
  const path = q.get('path') ?? ''
  const exp = Number(q.get('exp'))
  const max = Number(q.get('max'))
  if (!verifyUploadPath(`${bucket}/${path}`, exp, max, q.get('sig') ?? '')) {
    return NextResponse.json({ error: 'Invalid or expired upload URL' }, { status: 403 })
  }
  const buf = Buffer.from(await req.arrayBuffer())
  if (!buf.length || buf.length > max) return NextResponse.json({ error: 'File too large' }, { status: 413 })
  const { error } = await storageBucket(bucket).upload(path, buf, { contentType: req.headers.get('content-type') ?? undefined })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ Key: `${bucket}/${path}` })
}
