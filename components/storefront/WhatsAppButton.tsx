'use client'
import { MessageCircle } from 'lucide-react'

interface Props { phone: string; storeName: string; productName?: string; price?: number }

export default function WhatsAppButton({ phone, storeName, productName, price }: Props) {
  const clean = phone.replace(/\D/g, '')
  const wa    = clean.startsWith('0') ? '213' + clean.slice(1) : clean

  const text  = productName
    ? `السلام عليكم، أريد طلب: ${productName}${price ? ` — ${price.toLocaleString()} دج` : ''}`
    : `السلام عليكم، أريد الاستفسار عن منتجاتكم في ${storeName}`

  const url = `https://wa.me/${wa}?text=${encodeURIComponent(text)}`

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 left-6 z-50 flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-2xl shadow-xl hover:shadow-2xl transition group"
      aria-label="تواصل عبر واتساب"
    >
      <MessageCircle className="w-6 h-6" />
      <span className="text-sm font-bold hidden group-hover:block transition">واتساب</span>
    </a>
  )
}
