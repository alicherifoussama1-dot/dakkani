import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  password: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { password } = schema.parse(body)

    const supabase = createServerClient()

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'جلسة العمل غير متوفرة أو منتهية. يرجى تسجيل الدخول مجدداً.' }, { status: 401 })
    }

    // Update the password
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      let msg = updateError.message
      if (msg.includes('Auth session missing')) {
        msg = 'انتهت صلاحية جلسة العمل أو غير متوفرة. يرجى إعادة تسجيل الدخول.'
      }
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Update password API error:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}
