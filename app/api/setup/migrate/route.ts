// ============================================================
// One-time setup endpoint — runs public read policies
// Call once: GET /api/setup/migrate?secret=YOUR_CRON_SECRET
// ============================================================
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

const MIGRATIONS = [
  `DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename='stores' AND policyname='public_read_active_stores'
    ) THEN
      CREATE POLICY "public_read_active_stores" ON stores FOR SELECT USING (is_active = true);
    END IF;
  END $$`,

  `DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename='store_settings' AND policyname='public_read_store_settings'
    ) THEN
      CREATE POLICY "public_read_store_settings" ON store_settings FOR SELECT USING (true);
    END IF;
  END $$`,

  `DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename='categories' AND policyname='public_read_active_categories'
    ) THEN
      CREATE POLICY "public_read_active_categories" ON categories FOR SELECT USING (is_active = true);
    END IF;
  END $$`,

  `DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename='warehouse_stock' AND policyname='public_read_stock_badges'
    ) THEN
      CREATE POLICY "public_read_stock_badges" ON warehouse_stock FOR SELECT USING (true);
    END IF;
  END $$`,
]

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  const expectedSecret = process.env.CRON_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-10)

  if (!secret || secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const results: { sql: string; status: string; error?: string }[] = []

  for (const sql of MIGRATIONS) {
    try {
      const { error } = await supabase.rpc('exec_sql' as any, { sql })
      if (error) {
        // Try direct query instead
        results.push({ sql: sql.slice(0, 50), status: 'skipped', error: error.message })
      } else {
        results.push({ sql: sql.slice(0, 50), status: 'ok' })
      }
    } catch (e) {
      results.push({ sql: sql.slice(0, 50), status: 'error', error: String(e) })
    }
  }

  return NextResponse.json({ ok: true, results })
}
