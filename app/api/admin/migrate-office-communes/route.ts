// POST /api/admin/migrate-office-communes  — ONE-TIME MIGRATION (server-side)
//
// Scans every row in store_delivery_offices and, where the municipality
// (commune) part of the office name is truncated/abbreviated, replaces it with
// the OFFICIAL municipality name — but only when there is a SAFE UNIQUE match in
// the official baladias dataset (resolveCommune never guesses). Merchants do not
// have to recreate their offices.
//
// The office name is stored as "<commune> | <office name>". Only the commune
// part is rewritten (to its official Arabic name, matching home delivery); the
// office name and everything else are left untouched.
//
// Guard: requires  Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>  so only the
// operator can run it. Pass ?dry=1 to preview the report WITHOUT writing.
//
// Returns a report: { summary, fixed[], skipped[], unresolved[] }.
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resolveCommune } from '@/lib/algeria-baladias'

export const dynamic = 'force-dynamic'

const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ')

type Row = { id: string | number; name: string; wilaya_code: string | null }

export async function POST(req: Request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${serviceKey}`) {
    return NextResponse.json({ error: 'Unauthorized — send Authorization: Bearer <service role key>' }, { status: 401 })
  }

  const dryRun = new URL(req.url).searchParams.get('dry') === '1'
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

  const { data, error } = await supabase
    .from('store_delivery_offices')
    .select('id, name, wilaya_code')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []) as Row[]
  const fixed: { id: string; wilaya: string | null; from: string; to: string; office: string }[] = []
  const skipped: { id: string; wilaya: string | null; commune: string; reason: string }[] = []
  const unresolved: { id: string; wilaya: string | null; commune: string; office: string }[] = []

  for (const row of rows) {
    const id = String(row.id)
    const raw = row.name ?? ''

    // Only rows using the "<commune> | <office>" convention carry a commune part.
    if (!raw.includes('|')) {
      skipped.push({ id, wilaya: row.wilaya_code, commune: raw, reason: 'no-commune-part' })
      continue
    }
    const pipe = raw.indexOf('|')
    const commune = raw.slice(0, pipe).trim()
    const office = raw.slice(pipe + 1).trim()

    if (!commune) { skipped.push({ id, wilaya: row.wilaya_code, commune: raw, reason: 'empty-commune' }); continue }

    const match = resolveCommune(row.wilaya_code, commune)
    if (!match) {
      // No safe unique official match → left as-is, flagged for manual review.
      unresolved.push({ id, wilaya: row.wilaya_code, commune, office })
      continue
    }

    // Already an official full name (Arabic or French) → nothing to fix.
    if (norm(commune) === norm(match.name_ar) || norm(commune) === norm(match.name_fr)) {
      skipped.push({ id, wilaya: row.wilaya_code, commune, reason: 'already-official' })
      continue
    }

    // Safe unique match found and the stored commune differs → rewrite it to the
    // official Arabic name (canonical, matches home-delivery submissions).
    const newName = `${match.name_ar} | ${office}`
    if (!dryRun) {
      const { error: upErr } = await supabase.from('store_delivery_offices').update({ name: newName }).eq('id', row.id)
      if (upErr) { unresolved.push({ id, wilaya: row.wilaya_code, commune, office: `UPDATE_FAILED: ${upErr.message}` }); continue }
    }
    fixed.push({ id, wilaya: row.wilaya_code, from: commune, to: match.name_ar, office })
  }

  return NextResponse.json({
    dryRun,
    summary: { scanned: rows.length, fixed: fixed.length, skipped: skipped.length, unresolved: unresolved.length },
    fixed, skipped, unresolved,
  })
}
