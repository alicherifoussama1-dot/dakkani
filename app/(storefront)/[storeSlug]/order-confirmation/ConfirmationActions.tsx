'use client'

import { useState } from 'react'
import { MessageSquare, PhoneCall, Check, Loader2 } from 'lucide-react'

interface Props {
  storePhone: string
  orderNumber: string
  storeName: string
  customerName: string
  customerPhone: string
  totalAmount: string
}

export default function ConfirmationActions({
  storePhone,
  orderNumber,
  storeName,
  customerName,
  customerPhone,
  totalAmount,
}: Props) {
  const [callRequested, setCallRequested] = useState(false)
  const [loading, setLoading] = useState(false)

  // Normalize phone number for wa.me link
  const getWhatsAppLink = () => {
    const clean = storePhone.replace(/\D/g, '')
    let waPhone = clean
    if (clean.startsWith('0') && clean.length === 10) {
      waPhone = '213' + clean.slice(1)
    } else if (clean.length === 9 && (clean.startsWith('5') || clean.startsWith('6') || clean.startsWith('7'))) {
      waPhone = '213' + clean
    }
    const text = `قم بتأكيد طلبك`
    return `https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`
  }

  const handleCallRequest = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setCallRequested(true)
    }, 800)
  }

  return (
    <div className="space-y-3.5 w-full">
      {/* WhatsApp Button */}
      <a
        href={getWhatsAppLink()}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-3 w-full bg-[#25D366] hover:bg-[#20BA5A] text-white font-black py-4 px-6 rounded-2xl text-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 text-center"
      >
        <MessageSquare className="w-6 h-6 fill-white text-white shrink-0" />
        <span>لتأكيد طلبك اضغط على الزر</span>
      </a>

      {/* Call request button */}
      {callRequested ? (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 rounded-2xl p-4 text-center justify-center">
          <Check className="w-5 h-5 text-green-600 shrink-0" />
          <span className="font-bold text-sm">تم تسجيل اختيارك! سيتصل بك فريقنا لتأكيد طلبك هاتفياً.</span>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleCallRequest}
          disabled={loading}
          className="flex items-center justify-center gap-3 w-full bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 font-bold py-3.5 px-6 rounded-2xl text-base shadow-sm transition-all duration-150 active:scale-95 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
          ) : (
            <PhoneCall className="w-5 h-5 text-[#0D6EFD]" />
          )}
          <span>أريد أن يتم الاتصال بي لتأكيدها</span>
        </button>
      )}
    </div>
  )
}
