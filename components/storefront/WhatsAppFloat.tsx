'use client'
import { useState } from 'react'
import { MessageCircle, X } from 'lucide-react'

interface Props { phone: string; storeName: string; productName?: string; price?: number }

export default function WhatsAppFloat({ phone, storeName, productName, price }: Props) {
  const [open, setOpen] = useState(false)

  const clean = phone.replace(/\D/g, '')
  const wa    = clean.startsWith('0') ? '213' + clean.slice(1) : clean
  const text  = productName
    ? `السلام عليكم، أريد طلب: ${productName}${price ? ` — ${price.toLocaleString()} دج` : ''}`
    : `السلام عليكم، أريد الاستفسار عن منتجاتكم في ${storeName}`

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-end gap-3" dir="rtl">
      {/* Chat bubble */}
      {open && (
        <div className="bg-white rounded-2xl shadow-float p-4 w-64 border border-gray-100 animate-scale-in">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-[#25D366] rounded-full flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <p className="font-bold text-[#111827] text-sm">{storeName}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full dot-blink inline-block" />
                متواجد الآن
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-3 leading-relaxed">مرحباً! كيف يمكنني مساعدتك؟ 😊</p>
          <a
            href={`https://wa.me/${wa}?text=${encodeURIComponent(text)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-[#25D366] hover:bg-[#20BD5C] text-white font-bold py-2.5 rounded-xl text-sm text-center transition-colors"
            onClick={() => setOpen(false)}
          >
            ابدأ المحادثة 💬
          </a>
        </div>
      )}

      {/* Main button */}
      <button
        onClick={() => setOpen(!open)}
        className="wa-ring w-14 h-14 bg-[#25D366] hover:bg-[#20BD5C] rounded-full flex items-center justify-center shadow-lg text-white transition-all hover:scale-110 active:scale-95"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-7 h-7 fill-white" />}
      </button>
    </div>
  )
}
