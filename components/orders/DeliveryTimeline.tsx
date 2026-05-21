'use client'
import { Package, Truck, MapPin, CheckCircle, XCircle, Clock } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'

interface TimelineEntry {
  status: string
  normalized?: string
  description?: string
  location?: string
  provider?: string
  timestamp: string
}

const STATUS_ICON: Record<string, React.ElementType> = {
  pending: Clock,
  picked_up: Package,
  in_transit: Truck,
  out_for_delivery: Truck,
  with_driver: Truck,
  delivered: CheckCircle,
  returned: XCircle,
  cancelled: XCircle,
  exception: XCircle,
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-500',
  picked_up: 'bg-blue-100 text-blue-600',
  in_transit: 'bg-purple-100 text-purple-600',
  out_for_delivery: 'bg-orange-100 text-orange-600',
  with_driver: 'bg-orange-100 text-orange-600',
  delivered: 'bg-green-100 text-green-600',
  returned: 'bg-red-100 text-red-600',
  cancelled: 'bg-gray-100 text-gray-500',
  exception: 'bg-red-100 text-red-600',
}

interface Props {
  timeline: TimelineEntry[]
  trackingNumber?: string | null
  deliveryPartner?: string | null
}

export default function DeliveryTimeline({ timeline, trackingNumber, deliveryPartner }: Props) {
  if (!timeline?.length && !trackingNumber) return null

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-bold text-gray-900">مسار التوصيل</h2>
        {trackingNumber && (
          <span className="text-xs font-mono text-[#0D6EFD] bg-[#EBF5FF] px-2 py-1 rounded">
            {trackingNumber}
          </span>
        )}
      </div>

      {timeline.length === 0 ? (
        <div className="p-5 text-sm text-gray-400 text-center">
          لم يتم تحديث حالة التوصيل بعد
        </div>
      ) : (
        <div className="p-5">
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute right-4 top-0 bottom-0 w-0.5 bg-gray-100" />

            <div className="space-y-4">
              {[...timeline].reverse().map((entry, i) => {
                const normalized = entry.normalized ?? 'pending'
                const Icon = STATUS_ICON[normalized] ?? MapPin
                const colorClass = STATUS_COLOR[normalized] ?? 'bg-gray-100 text-gray-500'
                const isFirst = i === 0

                return (
                  <div key={i} className="flex items-start gap-4 relative">
                    <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass} ${isFirst ? 'ring-2 ring-offset-1 ring-current' : ''}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 pb-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-semibold ${isFirst ? 'text-gray-900' : 'text-gray-600'}`}>
                          {entry.description ?? entry.status}
                        </p>
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {formatDate(entry.timestamp)}
                        </span>
                      </div>
                      {entry.location && (
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {entry.location}
                        </p>
                      )}
                      {entry.provider && (
                        <p className="text-xs text-gray-300 mt-0.5 capitalize">{entry.provider}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
