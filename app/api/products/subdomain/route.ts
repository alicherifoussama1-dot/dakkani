// Kicks off the hosting provisioner (cPanel subdomain + SSL certificate) right
// after a product's subdomain is saved, instead of waiting for the cron run.
// Poll with GET ?id=<productId> to read subdomain_status.
import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const PROVISIONER = process.env.SUBDOMAIN_PROVISIONER ?? path.join(os.homedir(), 'acme-tool', 'provision-subdomains.js')

export async function POST(req: Request) {
  const supabase = createServerClient(req.headers.get('authorization'))
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'يرجى تسجيل الدخول' }, { status: 401 })
  if (!fs.existsSync(PROVISIONER)) return NextResponse.json({ started: false })
  const child = spawn(process.execPath, [PROVISIONER], { detached: true, stdio: 'ignore' })
  child.unref()
  return NextResponse.json({ started: true })
}

export async function GET(req: Request) {
  const supabase = createServerClient(req.headers.get('authorization'))
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'يرجى تسجيل الدخول' }, { status: 401 })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id' }, { status: 400 })
  const { data } = await supabase.from('products').select('subdomain, subdomain_status').eq('id', id).single()
  return NextResponse.json(data ?? {})
}
