export const dynamic = 'force-dynamic'
import { createServerClient, getActiveStore } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatDZD, formatDate, formatDateShort } from '@/lib/utils/format'
import Link from 'next/link'
import { ChevronLeft, Phone, MapPin, Package, Truck, Mail, ShieldAlert, User, FileText, History } from 'lucide-react'
import OrderActions from '@/components/orders/OrderActions'
import StatusBadge from '@/components/ui/StatusBadge'

export async function generateMetadata({ params }: { params: { id: string } }) {
  return { title: `طلب #${params.id.slice(0, 8)}` }
}

// Ordered stepper — abandoned/cancelled/returned/failed collapse out.
const STEPS: { key: string; label: string }[] = [
  { key: 'new',        label: 'جديد' },
  { key: 'confirmed',  label: 'مؤكد' },
  { key: 'processing', label: 'قيد التجهيز' },
  { key: 'shipped',    label: 'في الطريق' },
  { key: 'delivered',  label: 'مُسلَّم' },
]
const STATUS_AR: Record<string, string> = {
  new: 'جديد', confirmed: 'مؤكد', cancelled: 'ملغى', delivered: 'مُسلَّم',
  processing: 'قيد التجهيز', shipped: 'شُحن', returned: 'مُرجَع', failed: 'فاشل',
  failed_1: 'فاشلة 01', failed_2: 'فاشلة 02', failed_3: 'فاشلة 03',
  postponed: 'مؤجلة', duplicate: 'مكررة', abandoned: 'مهجور',
  in_transit: 'في الطريق', out_for_delivery: 'في التوزيع',
  with_driver: 'مع المندوب', at_stopdesk: 'في المكتب', exception: 'استثناء',
}

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { activeStore: store } = await getActiveStore(supabase, user.id)
  if (!store) return null

  const { data: order } = await supabase
    .from('orders')
    .select(`*, wilaya:wilayas(name_ar, name_fr), commune:communes(name_ar), items:order_items(*)`)
    .eq('id', params.id)
    .eq('store_id', store.id)
    .single()
  if (!order) notFound()

  const { data: history } = await supabase
    .from('order_history')
    .select('*')
    .eq('order_id', params.id)
    .order('created_at', { ascending: false })

  const currentStep = STEPS.findIndex(s => s.key === order.status)
  const showStepper = currentStep >= 0
  const items = (order.items as any[]) ?? []

  return (
    <div className="p-4 md:p-6 mx-auto" style={{ maxInlineSize: 1120, fontFamily: 'var(--font-sans)' }} dir="rtl">
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-3 flex items-center gap-1.5" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
        <Link href="/orders" className="hover:text-[var(--text-primary)] transition-colors" style={{ color: 'inherit' }}>الطلبات</Link>
        <ChevronLeft size={12} aria-hidden style={{ transform: 'scaleX(-1)' }} />
        <span className="num" style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-semibold)' }}>#{order.order_number}</span>
      </nav>

      {/* Header — one line for identity, one for actions */}
      <header className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)', letterSpacing: '-0.015em' }}>
              طلب #<span className="num">{order.order_number}</span>
            </h1>
            <StatusBadge status={order.status} />
            {order.is_duplicate && <span className="c-badge c-badge--warning">مكرر</span>}
            {order.is_blacklisted && <span className="c-badge c-badge--error"><ShieldAlert size={11} aria-hidden />قائمة سوداء</span>}
          </div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBlockStart: 4 }}>{formatDate(order.created_at)}</p>
        </div>
      </header>

      {/* Actions bar — sticky, quiet border */}
      <div className="mb-6 p-3 rounded-[var(--radius-md)]"
        style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-default)' }}>
        <OrderActions order={order as any} store={store} />
      </div>

      {/* Stepper — only for live orders (skip cancelled / returned / abandoned / failed) */}
      {showStepper && (
        <div className="c-card mb-6" style={{ padding: 'var(--space-5) var(--space-6)' }}>
          <ol className="flex items-center justify-between relative" style={{ listStyle: 'none' }}>
            {/* Track */}
            <span aria-hidden style={{
              position: 'absolute', insetInlineStart: 12, insetInlineEnd: 12,
              insetBlockStart: 14, blockSize: 2, background: 'var(--border-default)', borderRadius: 999,
            }} />
            <span aria-hidden style={{
              position: 'absolute', insetInlineStart: 12,
              insetBlockStart: 14, blockSize: 2, background: 'var(--color-primary-600)', borderRadius: 999,
              inlineSize: `calc((100% - 24px) * ${Math.max(0, currentStep) / (STEPS.length - 1)})`,
              transition: 'inline-size var(--duration-slow) var(--ease-standard)',
            }} />
            {STEPS.map((step, i) => {
              const done = i <= currentStep
              const current = i === currentStep
              return (
                <li key={step.key} className="flex flex-col items-center gap-1.5" style={{ position: 'relative', flex: '0 0 auto', minInlineSize: 60 }}>
                  <span aria-current={current ? 'step' : undefined}
                    style={{
                      inlineSize: 28, blockSize: 28, borderRadius: 'var(--radius-full)',
                      background: done ? 'var(--color-primary-600)' : 'var(--surface-raised)',
                      border: `2px solid ${done ? 'var(--color-primary-600)' : 'var(--border-default)'}`,
                      color: done ? '#fff' : 'var(--text-muted)',
                      display: 'grid', placeItems: 'center',
                      fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)',
                      boxShadow: current ? '0 0 0 4px var(--color-primary-100)' : 'none',
                      transition: 'all var(--duration-base) var(--ease-standard)',
                    }}>
                    {done ? '✓' : i + 1}
                  </span>
                  <span style={{
                    fontSize: 'var(--text-xs)',
                    color: done ? 'var(--color-primary-700)' : 'var(--text-muted)',
                    fontWeight: current ? 'var(--font-semibold)' : 'var(--font-regular)',
                  }}
                    className="hidden sm:block">
                    {step.label}
                  </span>
                </li>
              )
            })}
          </ol>
        </div>
      )}

      {/* Main grid: items + totals + delivery + customer + timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column: 2/3 */}
        <div className="lg:col-span-2 space-y-4">
          {/* Items table */}
          <div className="c-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="flex items-center gap-2 px-5 py-4" style={{ borderBlockEnd: '1px solid var(--border-default)' }}>
              <Package size={16} aria-hidden style={{ color: 'var(--color-primary-600)' }} />
              <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>المنتجات</h2>
              <span style={{ marginInlineStart: 'auto', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }} className="num">
                {items.length} {items.length === 1 ? 'منتج' : 'منتجات'}
              </span>
            </div>
            <div className="c-table-scroll">
              <table className="c-table">
                <tbody>
                  {items.map((item: any) => (
                    <tr key={item.id}>
                      <td>
                        <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>{item.product_name}</p>
                        {item.variant_label && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBlockStart: 2 }}>{item.variant_label}</p>}
                        {item.product_sku && <p className="num" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBlockStart: 2 }} dir="ltr">SKU: {item.product_sku}</p>}
                      </td>
                      <td className="num" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>×{item.quantity}</td>
                      <td className="num" style={{ color: 'var(--text-secondary)' }}>{formatDZD(item.unit_price)}</td>
                      <td className="num" style={{ textAlign: 'end', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>{formatDZD(item.total_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Totals */}
            <div style={{ background: 'var(--surface-sunken)', padding: 'var(--space-4) var(--space-5)' }}>
              <dl className="space-y-2" style={{ fontSize: 'var(--text-sm)' }}>
                <div className="flex justify-between" style={{ color: 'var(--text-secondary)' }}>
                  <dt>المجموع الفرعي</dt>
                  <dd className="num">{formatDZD(order.subtotal)}</dd>
                </div>
                <div className="flex justify-between" style={{ color: 'var(--text-secondary)' }}>
                  <dt>رسوم التوصيل</dt>
                  <dd className="num">{formatDZD(order.delivery_fee)}</dd>
                </div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between" style={{ color: 'var(--color-success-700)' }}>
                    <dt>خصم {order.coupon_code && <span dir="ltr" style={{ opacity: 0.8 }}>({order.coupon_code})</span>}</dt>
                    <dd className="num">−{formatDZD(order.discount_amount)}</dd>
                  </div>
                )}
                <div className="flex justify-between pt-2" style={{
                  borderBlockStart: '1px solid var(--border-default)',
                  fontSize: 'var(--text-md)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)',
                }}>
                  <dt>المجموع الكلي</dt>
                  <dd className="num" style={{ color: 'var(--color-primary-700)' }}>{formatDZD(order.total)}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Delivery info */}
          <div className="c-card">
            <div className="flex items-center gap-2 mb-4">
              <Truck size={16} aria-hidden style={{ color: 'var(--color-primary-600)' }} />
              <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>معلومات التوصيل</h2>
            </div>
            <dl className="grid grid-cols-2 md:grid-cols-3 gap-4" style={{ fontSize: 'var(--text-sm)' }}>
              <FieldPair label="نوع التوصيل" value={order.delivery_type === 'stopdesk' ? 'نقطة توزيع' : 'توصيل للمنزل'} />
              <FieldPair label="الولاية" value={(order.wilaya as any)?.name_ar ?? '—'} />
              {(order.commune as any)?.name_ar && <FieldPair label="البلدية" value={(order.commune as any).name_ar} />}
              <FieldPair label="شركة التوصيل" value={order.delivery_partner ?? 'غير محدد'} />
              {order.tracking_number && (
                <FieldPair label="رقم التتبع" value={<span className="num" dir="ltr" style={{ color: 'var(--color-primary-700)', fontWeight: 'var(--font-semibold)' }}>{order.tracking_number}</span>} />
              )}
              <FieldPair label="محاولات الاتصال" value={<span className="num">{order.call_attempts ?? 0}</span>} />
            </dl>
            {order.address && (
              <div className="mt-4 pt-4 flex items-start gap-2" style={{ borderBlockStart: '1px solid var(--border-default)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                <MapPin size={14} aria-hidden style={{ marginBlockStart: 2, flexShrink: 0, color: 'var(--text-muted)' }} />
                <span>{order.address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right column: 1/3 */}
        <div className="space-y-4">
          {/* Customer */}
          <div className="c-card">
            <div className="flex items-center gap-2 mb-4">
              <User size={16} aria-hidden style={{ color: 'var(--color-primary-600)' }} />
              <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>العميل</h2>
            </div>
            <div className="space-y-3">
              <p style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>{order.customer_name}</p>
              <p className="num flex items-center gap-2" dir="ltr" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                <Phone size={13} aria-hidden style={{ color: 'var(--text-muted)' }} />{order.customer_phone}
              </p>
              {order.customer_phone2 && (
                <p className="num flex items-center gap-2" dir="ltr" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                  <Phone size={13} aria-hidden style={{ opacity: 0.7 }} />{order.customer_phone2}
                </p>
              )}
              {order.customer_email && (
                <p className="flex items-center gap-2" dir="ltr" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                  <Mail size={13} aria-hidden />{order.customer_email}
                </p>
              )}
            </div>
            {order.fraud_score > 0 && (
              <div className="mt-4 pt-4 flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)]"
                style={{ borderBlockStart: '1px solid var(--border-default)', marginInline: -8 }}>
                <FraudBadge score={order.fraud_score} blacklisted={order.is_blacklisted} />
              </div>
            )}
          </div>

          {/* Source */}
          {(order.source || order.utm_source) && (
            <div className="c-card">
              <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBlockEnd: 12 }}>مصدر الطلب</h2>
              <dl className="space-y-1.5" style={{ fontSize: 'var(--text-xs)' }}>
                {order.source && <SourceRow k="المصدر" v={order.source} />}
                {order.utm_source && <SourceRow k="utm_source" v={order.utm_source} />}
                {order.utm_medium && <SourceRow k="utm_medium" v={order.utm_medium} />}
                {order.utm_campaign && <SourceRow k="utm_campaign" v={order.utm_campaign} />}
              </dl>
            </div>
          )}

          {/* Customer notes */}
          {order.notes && (
            <div className="c-card" style={{
              background: 'var(--color-warning-50)', borderColor: 'var(--color-warning-100)',
            }}>
              <div className="flex items-start gap-2">
                <FileText size={14} aria-hidden style={{ color: 'var(--color-warning-600)', marginBlockStart: 2, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--color-warning-700)' }}>ملاحظة العميل</p>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-warning-700)', marginBlockStart: 4, opacity: 0.9 }}>{order.notes}</p>
                </div>
              </div>
            </div>
          )}

          {/* Timeline */}
          {(history ?? []).length > 0 && (
            <div className="c-card">
              <div className="flex items-center gap-2 mb-4">
                <History size={16} aria-hidden style={{ color: 'var(--color-primary-600)' }} />
                <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>سجل التغييرات</h2>
              </div>
              <ol className="space-y-0" style={{ listStyle: 'none' }}>
                {(history ?? []).map((h: any, i: number) => (
                  <li key={h.id} className="flex gap-3">
                    <div className="flex flex-col items-center" style={{ paddingBlockStart: 6 }}>
                      <span aria-hidden style={{ inlineSize: 8, blockSize: 8, borderRadius: 'var(--radius-full)', background: 'var(--color-primary-600)', flexShrink: 0 }} />
                      {i < (history ?? []).length - 1 && (
                        <span aria-hidden style={{ inlineSize: 1.5, flex: 1, background: 'var(--border-default)', marginBlockStart: 4, minBlockSize: 24 }} />
                      )}
                    </div>
                    <div className="pb-4 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {h.old_status && (
                          <>
                            <span className="c-badge c-badge--neutral">{STATUS_AR[h.old_status] ?? h.old_status}</span>
                            <ChevronLeft size={11} aria-hidden style={{ color: 'var(--text-muted)', transform: 'scaleX(-1)' }} />
                          </>
                        )}
                        <span className="c-badge c-badge--info">{STATUS_AR[h.new_status] ?? h.new_status}</span>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>· {h.changed_by}</span>
                      </div>
                      {h.notes && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBlockStart: 4 }}>{h.notes}</p>}
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBlockStart: 4 }}>
                        {formatDateShort(h.created_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Small server-component helpers ─────────────────────────

function FieldPair({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBlockEnd: 2 }}>{label}</dt>
      <dd style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 'var(--font-medium)' }}>{value}</dd>
    </div>
  )
}

function SourceRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2" style={{ color: 'var(--text-muted)' }}>
      <dt dir="ltr" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{k}</dt>
      <dd dir="ltr" style={{ color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{v}</dd>
    </div>
  )
}

function FraudBadge({ score, blacklisted }: { score: number; blacklisted: boolean }) {
  const level = score >= 70 ? 'error' : score >= 40 ? 'warning' : 'success'
  const bg = level === 'error' ? 'var(--color-error-50)' : level === 'warning' ? 'var(--color-warning-50)' : 'var(--color-success-50)'
  const fg = level === 'error' ? 'var(--color-error-700)' : level === 'warning' ? 'var(--color-warning-700)' : 'var(--color-success-700)'
  return (
    <div className="flex items-center gap-2 w-full px-3 py-2 rounded-[var(--radius-md)]"
      style={{ background: bg, color: fg, fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)' }}>
      <ShieldAlert size={13} aria-hidden />
      <span>تقييم الاحتيال: <span className="num">{score}%</span></span>
      {blacklisted && <span className="c-badge c-badge--error" style={{ marginInlineStart: 'auto' }}>محظور</span>}
    </div>
  )
}
