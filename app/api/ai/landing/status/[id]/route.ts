// ============================================================
// AI Landing Copy — job status polling
// GET /api/ai/landing/status/[id] → { status, result?, error? }
// ============================================================
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      get: (n) => cookieStore.get(n)?.value,
      set: (n, v, o: CookieOptions) => { try { cookieStore.set({ name: n, value: v, ...o }) } catch {} },
      remove: (n, o: CookieOptions) => { try { cookieStore.set({ name: n, value: '', ...o }) } catch {} },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })

  const { data: job, error } = await supabase
    .from('landing_jobs')
    .select('id, status, result, error, type')
    .eq('id', params.id)
    .eq('type', 'text')
    .single()

  if (error || !job) return NextResponse.json({ error: 'المهمة غير موجودة' }, { status: 404 })

  return NextResponse.json({ status: job.status, result: job.result, error: job.error })
}
