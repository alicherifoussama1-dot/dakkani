'use client'
// ============================================================
// COMMERCO TOAST — cobalt DS
//
// Tiny module-level bus + <Toaster /> that mounts a fixed stack.
// Call from anywhere:
//   import { toast } from '@/lib/ui/toast'
//   toast.success('تم الحفظ')
//   toast.error('فشل — أعد المحاولة')
//   toast('...', { duration: 8000, variant: 'info' })
//
// Styling: reuses .c-toast-stack / .c-toast[--variant] from
// design/components.css. No new CSS.
// ============================================================
import { useEffect, useState, useCallback } from 'react'
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'
export interface ToastOptions { duration?: number; variant?: ToastVariant }
interface ToastItem { id: number; message: string; variant: ToastVariant; duration: number }

type Listener = (list: ToastItem[]) => void

let queue: ToastItem[] = []
let listeners = new Set<Listener>()
let nextId = 1

function emit() { listeners.forEach(l => l([...queue])) }

function push(message: string, opts: ToastOptions = {}) {
  const item: ToastItem = {
    id: nextId++,
    message,
    variant: opts.variant ?? 'info',
    duration: opts.duration ?? 4000,
  }
  queue = [...queue, item].slice(-4) // cap at 4 stacked
  emit()
  if (item.duration > 0) {
    setTimeout(() => remove(item.id), item.duration)
  }
  return item.id
}

function remove(id: number) {
  queue = queue.filter(t => t.id !== id)
  emit()
}

export const toast = Object.assign(
  (message: string, opts?: ToastOptions) => push(message, opts),
  {
    success: (m: string, opts?: Omit<ToastOptions, 'variant'>) => push(m, { ...opts, variant: 'success' }),
    error:   (m: string, opts?: Omit<ToastOptions, 'variant'>) => push(m, { ...opts, variant: 'error' }),
    warning: (m: string, opts?: Omit<ToastOptions, 'variant'>) => push(m, { ...opts, variant: 'warning' }),
    info:    (m: string, opts?: Omit<ToastOptions, 'variant'>) => push(m, { ...opts, variant: 'info' }),
    dismiss: (id: number) => remove(id),
  },
)

const ICONS: Record<ToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2, error: AlertCircle, warning: AlertTriangle, info: Info,
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([])
  useEffect(() => {
    setItems([...queue])
    const l: Listener = (next) => setItems(next)
    listeners.add(l)
    return () => { listeners.delete(l) }
  }, [])

  const dismiss = useCallback((id: number) => remove(id), [])

  if (items.length === 0) return null
  return (
    <div className="c-toast-stack" role="region" aria-live="polite" aria-label="notifications">
      {items.map(t => {
        const Icon = ICONS[t.variant]
        return (
          <div key={t.id} className={`c-toast c-toast--${t.variant}`} role="status">
            <Icon size={16} className="mt-0.5 shrink-0" aria-hidden />
            <span style={{ flex: 1, minInlineSize: 0 }}>{t.message}</span>
            <button
              type="button" onClick={() => dismiss(t.id)}
              aria-label="إغلاق"
              style={{ background: 'transparent', border: 0, color: 'inherit', opacity: 0.7, cursor: 'pointer', padding: 2, borderRadius: 4 }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
            >
              <X size={14} aria-hidden />
            </button>
          </div>
        )
      })}
    </div>
  )
}
