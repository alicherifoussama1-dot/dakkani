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

    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://dakkani.vercel.app'}/reset-password`

    // Generate link ONCE only
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    })

    if (linkError) {
      console.error('Generate link error:', linkError.message)
      return NextResponse.json({ error: linkError.message }, { status: 400 })
    }

    const resetLink = (linkData as any)?.properties?.action_link

    if (!resetLink) {
      return NextResponse.json({ error: 'فشل في إنشاء رابط الاسترداد' }, { status: 500 })
    }

    // Send via Resend
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey || resendKey === 'your_resend_api_key') {
      // No Resend configured — return the link directly for testing
      console.log('RESET LINK (no email provider):', resetLink)
      return NextResponse.json({ success: true, debug_link: process.env.NODE_ENV === 'development' ? resetLink : undefined })
    }

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: 'دكاني <onboarding@resend.dev>',
        to: [email],
        subject: 'إعادة تعيين كلمة المرور — دكاني',
        html: `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:40px 20px">
    <tr><td align="center">
      <table width="500" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1B4332,#2D6A4F);padding:32px;text-align:center">
            <h1 style="color:white;margin:0;font-size:28px;font-weight:900">دكاني</h1>
            <p style="color:rgba(255,255,255,0.75);margin:8px 0 0;font-size:14px">منصة التجارة الإلكترونية الجزائرية</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 32px">
            <h2 style="color:#111827;margin:0 0 12px;font-size:22px">إعادة تعيين كلمة المرور 🔐</h2>
            <p style="color:#6B7280;font-size:15px;line-height:1.7;margin:0 0 24px">
              مرحباً،<br>
              طلبت إعادة تعيين كلمة المرور لحسابك في دكاني.<br>
              اضغط على الزر أدناه للمتابعة:
            </p>

            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding:8px 0 32px">
                  <a href="${resetLink}"
                     style="background:linear-gradient(135deg,#1B4332,#2D6A4F);color:white;padding:16px 40px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;letter-spacing:0.3px">
                    إعادة تعيين كلمة المرور
                  </a>
                </td>
              </tr>
            </table>

            <!-- Warning box -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:10px;padding:14px 16px">
                  <p style="color:#92400E;font-size:13px;margin:0;line-height:1.6">
                    ⏱️ الرابط صالح لمدة <strong>24 ساعة</strong> فقط.<br>
                    🔒 إذا لم تطلب ذلك، تجاهل هذا الإيميل — حسابك آمن.
                  </p>
                </td>
              </tr>
            </table>

            <p style="color:#9CA3AF;font-size:12px;margin:24px 0 0;line-height:1.6">
              إذا لم يعمل الزر، انسخ هذا الرابط في المتصفح:<br>
              <a href="${resetLink}" style="color:#1B4332;word-break:break-all">${resetLink}</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F9FAFB;padding:20px 32px;text-align:center;border-top:1px solid #E5E7EB">
            <p style="color:#9CA3AF;font-size:12px;margin:0">
              دكاني © ${new Date().getFullYear()} · منصة التجارة الإلكترونية الجزائرية
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
      }),
    })

    const emailResult = await emailRes.json()

    if (!emailRes.ok) {
      console.error('Resend error:', emailResult)
      return NextResponse.json({ error: 'فشل إرسال الإيميل: ' + (emailResult.message ?? 'خطأ في Resend') }, { status: 502 })
    }

    return NextResponse.json({ success: true, id: emailResult.id })

  } catch (err) {
    console.error('Reset password error:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'البريد الإلكتروني غير صالح' }, { status: 400 })
    }
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}
