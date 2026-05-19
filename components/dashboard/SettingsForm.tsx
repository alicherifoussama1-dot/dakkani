'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import type { Store } from '@/types'

const schema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  meta_pixel_id: z.string().optional(),
  tiktok_pixel_id: z.string().optional(),
  google_tag_id: z.string().optional(),
  order_email: z.boolean(),
  cash_on_delivery: z.boolean(),
  fraud_auto_block_score: z.number().min(0).max(100),
  max_call_attempts: z.number().min(1).max(10),
})
type FormData = z.infer<typeof schema>

export default function SettingsForm({ store }: { store: Store & { store_settings: any } }) {
  const [saved, setSaved] = useState(false)
  const settings = store.store_settings

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: store.name,
      phone: store.phone ?? '',
      email: store.email ?? '',
      meta_pixel_id: store.meta_pixel_id ?? '',
      tiktok_pixel_id: store.tiktok_pixel_id ?? '',
      google_tag_id: store.google_tag_id ?? '',
      order_email: settings?.order_email ?? true,
      cash_on_delivery: settings?.cash_on_delivery ?? true,
      fraud_auto_block_score: settings?.fraud_auto_block_score ?? 80,
      max_call_attempts: settings?.max_call_attempts ?? 3,
    },
  })

  const onSubmit = async (data: FormData) => {
    const supabase = createClient()
    const { order_email, cash_on_delivery, fraud_auto_block_score, max_call_attempts, ...storeData } = data

    await Promise.all([
      supabase.from('stores').update(storeData).eq('id', store.id),
      supabase.from('store_settings').upsert({
        store_id: store.id,
        order_email,
        cash_on_delivery,
        fraud_auto_block_score,
        max_call_attempts,
      }),
    ])

    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-4">
      <h2 className="font-bold text-gray-900 border-b border-gray-100 pb-2">{title}</h2>
      {children}
    </div>
  )

  const Field = ({ label, name, type = 'text', placeholder = '' }: any) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        {...register(name)}
        type={type}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#E8431A] outline-none"
      />
    </div>
  )

  const Toggle = ({ label, name, description }: any) => (
    <label className="flex items-center justify-between cursor-pointer">
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
      <input {...register(name)} type="checkbox" className="w-4 h-4 accent-[#E8431A]" />
    </label>
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" dir="rtl">
      <Section title="معلومات المتجر">
        <Field label="اسم المتجر" name="name" />
        <div className="grid grid-cols-2 gap-4">
          <Field label="الهاتف" name="phone" placeholder="055xxxxxxx" />
          <Field label="البريد الإلكتروني" name="email" type="email" />
        </div>
      </Section>

      <Section title="البكسل والتتبع">
        <Field label="Meta Pixel ID" name="meta_pixel_id" placeholder="123456789" />
        <Field label="TikTok Pixel ID" name="tiktok_pixel_id" placeholder="ABCDEF123" />
        <Field label="Google Tag ID" name="google_tag_id" placeholder="G-XXXXXXXXXX" />
      </Section>

      <Section title="الدفع والتوصيل">
        <Toggle label="الدفع عند الاستلام (COD)" name="cash_on_delivery" description="السماح للعملاء بالدفع عند الاستلام" />
        <Toggle label="إشعارات البريد الإلكتروني" name="order_email" description="إرسال إشعار عند كل طلب جديد" />
      </Section>

      <Section title="مكافحة الاحتيال">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">حد حظر الاحتيال التلقائي (%)</label>
          <input {...register('fraud_auto_block_score', { valueAsNumber: true })} type="number" min="0" max="100"
            className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#E8431A] outline-none" />
          <p className="text-xs text-gray-500 mt-1">الطلبات التي تتجاوز هذا الحد تُحظر تلقائياً</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">الحد الأقصى لمحاولات الاتصال</label>
          <input {...register('max_call_attempts', { valueAsNumber: true })} type="number" min="1" max="10"
            className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#E8431A] outline-none" />
        </div>
      </Section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-[#E8431A] hover:bg-[#C73615] disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-lg transition"
        >
          {isSubmitting ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}
        </button>
        {saved && <span className="text-green-600 text-sm font-medium">✓ تم الحفظ بنجاح</span>}
      </div>
    </form>
  )
}
