'use client'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const STATUS_LABELS: Record<string, string> = {
  new: 'جديد',
  confirmed: 'مؤكد',
  processing: 'يُعالج',
  shipped: 'شُحن',
  delivered: 'سُلّم',
  returned: 'مُرجع',
  cancelled: 'ملغى',
  failed: 'فاشل',
}

interface Props {
  currentStatus: string
  steps: string[]
  currentStep: number
}

export default function OrderStatusBar({ currentStatus, steps, currentStep }: Props) {
  const isTerminal = ['returned', 'cancelled', 'failed'].includes(currentStatus)

  if (isTerminal) {
    return (
      <div className={`rounded-xl p-4 text-center font-semibold ${
        currentStatus === 'returned' ? 'bg-orange-50 text-orange-700 border border-orange-100' :
        'bg-red-50 text-red-700 border border-red-100'
      }`}>
        {STATUS_LABELS[currentStatus]} — {currentStatus === 'returned' ? 'تم إرجاع الطلب' : 'تم إلغاء/فشل الطلب'}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between">
        {steps.map((step, i) => {
          const done = i < currentStep
          const active = i === currentStep
          return (
            <div key={step} className="flex-1 flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors',
                  done ? 'bg-green-500 text-white' :
                  active ? 'bg-[#E8431A] text-white ring-4 ring-[#FFF0ED]' :
                  'bg-gray-100 text-gray-400'
                )}>
                  {done ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span className={cn(
                  'text-xs font-medium whitespace-nowrap',
                  active ? 'text-[#E8431A]' : done ? 'text-green-600' : 'text-gray-400'
                )}>
                  {STATUS_LABELS[step]}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={cn(
                  'flex-1 h-0.5 mx-2 mb-5 transition-colors',
                  i < currentStep ? 'bg-green-400' : 'bg-gray-200'
                )} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
