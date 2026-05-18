// ============================================================
// Password Reset Email API — uses Resend directly
// No SMTP config needed in Supabase
// ============================================================
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const schema = z.object({ email: z.string().email() })

export async function POST(req: Request) {
  try {
    const { email } = schema.parse(await req.json())

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`

    const { error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Send via Resend if configured
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      const { data: linkData } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo },
      })

      const resetLink = (linkData as any)?.properties?.action_link ?? redirectTo

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: `دكاني <noreply@resend.dev>`,
          to: email,
          subject: 'إعادة تعيين كلمة المرور — دكاني',
          html: `
            <div dir="rtl" style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px">
              <div style="background:linear-gradient(135deg,#1B4332,#2D6A4F);border-radius:16px;padding:24px;text-align:center;margin-bottom:24px">
                <h1 style="color:white;margin:0;font-size:28px">دكاني</h1>
                <p style="color:rgba(255,255,255,0.8);margin:8px 0 0">منصة التجارة الإلكترونية الجزائرية</p>
              </div>
              <h2 style="color:#111827">إعادة تعيين كلمة المرور</h2>
              <p style="color:#6B7280">مرحباً،<br>طلبت إعادة تعيين كلمة المرور لحسابك. اضغط على الزر أدناه للمتابعة:</p>
              <div style="text-align:center;margin:32px 0">
                <a href="${resetLink}"
                   style="background:#1B4332;color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block">
                  إعادة تعيين كلمة المرور
                </a>
              </div>
              <p style="color:#9CA3AF;font-size:12px;text-align:center">
                إذا لم تطلب ذلك، تجاهل هذا الإيميل.<br>
                الرابط صالح لمدة 24 ساعة.
              </p>
              <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0">
              <p style="color:#9CA3AF;font-size:11px;text-align:center">دكاني © ${new Date().getFullYear()}</p>
            </div>
          `,
        }),
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'البريد الإلكتروني غير صالح' }, { status: 400 })
    }
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
