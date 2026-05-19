'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter }    from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  saveSaleLocally, getUnsyncedSales, markSaleSynced,
  cacheProducts, getCachedProducts, generateReceiptNum,
  type POSSale, type POSItem,
} from '@/lib/pos/db'
import { formatDZD } from '@/lib/utils/format'
import { Search, Printer, WifiOff, Wifi, RefreshCw, Trash2, Plus, Minus, X } from 'lucide-react'

interface Product { id: string; name: string; name_ar?: string; price: number; images?: { url: string }[]; sku?: string; warehouse_stock?: { quantity: number; reserved: number }[] }
interface CartItem extends POSItem { }

interface Props { storeId: string; storeName: string; cashierId: string; products: Product[] }

const PAYMENT_OPTS = [
  { id: 'cash',      label: 'نقداً',    color: 'bg-green-600 hover:bg-green-700' },
  { id: 'cib',       label: 'CIB',      color: 'bg-blue-600 hover:bg-blue-700' },
  { id: 'edahabia', label: 'داهبية',   color: 'bg-yellow-500 hover:bg-yellow-600' },
] as const

export default function POSTerminal({ storeId, storeName, cashierId, products: serverProducts }: Props) {
  const router   = useRouter()
  const supabase = createClient()
  const receiptRef = useRef<HTMLDivElement>(null)

  const [products,    setProducts]  = useState<Product[]>(serverProducts)
  const [cart,        setCart]      = useState<CartItem[]>([])
  const [search,      setSearch]    = useState('')
  const [discount,    setDiscount]  = useState({ type: 'dzd' as 'pct' | 'dzd', value: 0 })
  const [payment,     setPayment]   = useState<'cash' | 'cib' | 'edahabia'>('cash')
  const [cashGiven,   setCashGiven] = useState('')
  const [isOnline,    setIsOnline]  = useState(true)
  const [unsynced,    setUnsynced]  = useState(0)
  const [syncing,     setSyncing]   = useState(false)
  const [lastSale,    setLastSale]  = useState<POSSale | null>(null)

  // ── Online/offline detection ──────────────────────────────
  useEffect(() => {
    const on  = () => { setIsOnline(true);  syncPending() }
    const off = () => setIsOnline(false)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    setIsOnline(navigator.onLine)

    // Cache products for offline use
    cacheProducts(serverProducts)

    // Load offline products if needed
    if (!navigator.onLine) {
      getCachedProducts().then(cached => { if (cached.length) setProducts(cached) })
    }

    // Count unsynced
    getUnsyncedSales(storeId).then(sales => setUnsynced(sales.length))

    return () => {
      window.removeEventListener('online',  on)
      window.removeEventListener('offline', off)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Sync pending sales ────────────────────────────────────
  const syncPending = useCallback(async () => {
    const pending = await getUnsyncedSales(storeId)
    if (!pending.length) return
    setSyncing(true)

    for (const sale of pending) {
      try {
        // Create order in Supabase
        const { data: order } = await supabase.from('orders').insert({
          store_id:       storeId,
          order_number:   sale.receiptNum,
          customer_name:  'عميل POS',
          customer_phone: '0000000000',
          delivery_type:  'home',
          wilaya_id:      16,
          subtotal:       sale.subtotal,
          discount_amount: sale.discount,
          total:          sale.total,
          delivery_fee:   0,
          payment_method: sale.paymentType === 'cash' ? 'cod' : 'card',
          status:         'delivered',
          source:         'pos',
        }).select('id').single()

        if (order) {
          await supabase.from('order_items').insert(
            sale.items.map(i => ({
              order_id:     order.id,
              store_id:     storeId,
              product_id:   i.productId,
              product_name: i.productName,
              variant_key:  i.variantKey,
              quantity:     i.quantity,
              unit_price:   i.price,
              total_price:  i.total,
            }))
          )
          await markSaleSynced(sale.id)
        }
      } catch { /* retry next time */ }
    }

    const remaining = await getUnsyncedSales(storeId)
    setUnsynced(remaining.length)
    setSyncing(false)
  }, [storeId, supabase])

  // ── Cart helpers ──────────────────────────────────────────
  const addToCart = (product: Product) => {
    const stock = (product.warehouse_stock ?? []).reduce((s, w) => s + w.quantity - w.reserved, 0)
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id)
      if (existing) {
        if (existing.quantity >= stock && stock > 0) return prev
        return prev.map(i => i.productId === product.id
          ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.price }
          : i
        )
      }
      return [...prev, {
        productId:   product.id,
        productName: product.name_ar ?? product.name,
        variantKey:  'default',
        price:       product.price,
        quantity:    1,
        total:       product.price,
        imageUrl:    product.images?.[0]?.url,
      }]
    })
  }

  const updateQty = (productId: string, delta: number) => {
    setCart(prev => prev
      .map(i => i.productId === productId
        ? { ...i, quantity: Math.max(0, i.quantity + delta), total: Math.max(0, i.quantity + delta) * i.price }
        : i
      )
      .filter(i => i.quantity > 0)
    )
  }

  const removeItem = (productId: string) => setCart(prev => prev.filter(i => i.productId !== productId))

  // ── Totals ────────────────────────────────────────────────
  const subtotal     = cart.reduce((s, i) => s + i.total, 0)
  const discountAmt  = discount.type === 'pct' ? (subtotal * discount.value) / 100 : discount.value
  const total        = Math.max(0, subtotal - discountAmt)
  const change       = payment === 'cash' && cashGiven ? Math.max(0, parseFloat(cashGiven) - total) : 0

  // ── Checkout ──────────────────────────────────────────────
  const checkout = async () => {
    if (!cart.length) return

    const sale: POSSale = {
      id:          crypto.randomUUID(),
      items:       cart,
      subtotal,
      discount:    discountAmt,
      total,
      paymentType: payment,
      cashGiven:   cashGiven ? parseFloat(cashGiven) : undefined,
      storeId,
      cashierId,
      createdAt:   new Date().toISOString(),
      synced:      false,
      receiptNum:  generateReceiptNum(),
    }

    // Always save locally first
    await saveSaleLocally(sale)
    setLastSale(sale)
    setUnsynced(n => n + 1)

    // Try immediate sync if online
    if (isOnline) {
      syncPending()
    }

    // Reset cart
    setCart([])
    setDiscount({ type: 'dzd', value: 0 })
    setCashGiven('')
  }

  // ── Print receipt ─────────────────────────────────────────
  const printReceipt = () => {
    if (!lastSale) return
    const win = window.open('', '_blank', 'width=400,height=600')
    if (!win) return
    win.document.write(`
      <html><head><title>فاتورة POS</title>
      <style>
        body { font-family: monospace; font-size: 12px; margin: 0; padding: 10px; direction: rtl; }
        .center { text-align: center; }
        .line { border-top: 1px dashed #000; margin: 6px 0; }
        .bold { font-weight: bold; }
        .row { display: flex; justify-content: space-between; }
      </style></head><body>
      <div class="center bold" style="font-size:16px">${storeName}</div>
      <div class="center">نقطة البيع</div>
      <div class="line"></div>
      <div class="row"><span>رقم الفاتورة:</span><span>${lastSale.receiptNum}</span></div>
      <div class="row"><span>التاريخ:</span><span>${new Date(lastSale.createdAt).toLocaleString('ar-DZ')}</span></div>
      <div class="line"></div>
      ${lastSale.items.map(i => `
        <div class="row"><span>${i.productName}</span><span>${formatDZD(i.total)}</span></div>
        <div style="color:#666; font-size:10px">${i.quantity} × ${formatDZD(i.price)}</div>
      `).join('')}
      <div class="line"></div>
      <div class="row bold"><span>المجموع:</span><span>${formatDZD(lastSale.total)}</span></div>
      ${lastSale.discount > 0 ? `<div class="row"><span>خصم:</span><span>-${formatDZD(lastSale.discount)}</span></div>` : ''}
      <div class="row bold" style="font-size:14px"><span>الإجمالي:</span><span>${formatDZD(lastSale.total)}</span></div>
      ${lastSale.paymentType === 'cash' && lastSale.cashGiven ? `
        <div class="row"><span>المبلغ المدفوع:</span><span>${formatDZD(lastSale.cashGiven)}</span></div>
        <div class="row"><span>الباقي:</span><span>${formatDZD(Math.max(0, lastSale.cashGiven - lastSale.total))}</span></div>
      ` : ''}
      <div class="line"></div>
      <div class="center">شكراً لزيارتكم</div>
      <div class="center" style="font-size:10px">دكاني POS</div>
      </body></html>
    `)
    win.print()
    win.close()
  }

  const filteredProducts = products.filter(p =>
    !search || (p.name_ar ?? p.name).toLowerCase().includes(search.toLowerCase()) || p.sku?.includes(search)
  )

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden" dir="rtl">
      {/* ── LEFT: Products Grid ──────────────────────────── */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 gap-3">
          <h1 className="text-lg font-black text-white">{storeName} — POS</h1>
          <div className="flex items-center gap-2">
            {/* Online indicator */}
            <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg ${isOnline ? 'bg-green-900/30 text-green-400 border border-green-700/30' : 'bg-red-900/30 text-red-400 border border-red-700/30'}`}>
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isOnline ? 'متصل' : 'غير متصل'}
            </div>
            {/* Unsynced badge */}
            {unsynced > 0 && (
              <button
                onClick={syncPending}
                disabled={!isOnline || syncing}
                className="flex items-center gap-1.5 text-xs bg-yellow-900/30 text-yellow-400 border border-yellow-700/30 px-2.5 py-1.5 rounded-lg hover:bg-yellow-900/50 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                ⚠️ {unsynced} بيع(ة) في الانتظار
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث عن منتج أو امسح الباركود..."
            className="w-full bg-gray-900 border border-gray-700 rounded-xl pr-10 pl-4 py-3 text-sm text-gray-200 focus:ring-2 focus:ring-[#E8431A] outline-none"
          />
        </div>

        {/* Product grid — large tiles */}
        <div className="flex-1 overflow-y-auto grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 content-start">
          {filteredProducts.map(p => {
            const stock = (p.warehouse_stock ?? []).reduce((s, w) => s + w.quantity - w.reserved, 0)
            const img   = p.images?.[0]?.url
            const inCart = cart.find(i => i.productId === p.id)

            return (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                disabled={stock <= 0}
                className={`relative bg-gray-900 border rounded-2xl p-3 text-right hover:border-dakkani-500 transition group disabled:opacity-40 disabled:cursor-not-allowed ${
                  inCart ? 'border-dakkani-500 bg-[#E8431A]/10' : 'border-gray-800'
                }`}
              >
                <div className="aspect-square bg-gray-800 rounded-xl overflow-hidden mb-2">
                  {img
                    ? <img src={img} alt={p.name_ar ?? p.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-3xl text-gray-600">{(p.name_ar ?? p.name)[0]}</div>
                  }
                </div>
                <p className="text-xs font-medium text-gray-300 line-clamp-2">{p.name_ar ?? p.name}</p>
                <p className="text-sm font-black text-dakkani-400 mt-1">{formatDZD(p.price)}</p>
                {inCart && (
                  <div className="absolute top-2 left-2 w-5 h-5 bg-[#E8431A] rounded-full text-white text-xs font-black flex items-center justify-center">
                    {inCart.quantity}
                  </div>
                )}
                {stock <= 5 && stock > 0 && (
                  <p className="text-xs text-yellow-500 mt-0.5">آخر {stock}</p>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── RIGHT: Cart & Payment ──────────────────────────── */}
      <div className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col">
        {/* Cart header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="font-bold text-white">السلة ({cart.length})</h2>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="text-xs text-red-500 hover:text-red-400 transition">
              تفريغ
            </button>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.map(item => (
            <div key={item.productId} className="bg-gray-800 rounded-xl p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-200 line-clamp-1">{item.productName}</p>
                <p className="text-xs text-dakkani-400 font-bold">{formatDZD(item.price)}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => updateQty(item.productId, -1)} className="w-6 h-6 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center transition">
                  <Minus className="w-3 h-3 text-gray-300" />
                </button>
                <span className="w-6 text-center text-sm font-black text-white">{item.quantity}</span>
                <button onClick={() => updateQty(item.productId, 1)} className="w-6 h-6 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center transition">
                  <Plus className="w-3 h-3 text-gray-300" />
                </button>
                <button onClick={() => removeItem(item.productId)} className="w-6 h-6 text-gray-600 hover:text-red-400 flex items-center justify-center transition">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs font-black text-white w-14 text-left">{formatDZD(item.total)}</p>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="text-center py-12 text-gray-600">
              <p className="text-3xl mb-2">🛒</p>
              <p className="text-sm">السلة فارغة</p>
            </div>
          )}
        </div>

        {/* Discount */}
        <div className="p-3 border-t border-gray-800">
          <p className="text-xs text-gray-500 mb-2">خصم</p>
          <div className="flex gap-2">
            <button
              onClick={() => setDiscount(d => ({ ...d, type: d.type === 'pct' ? 'dzd' : 'pct' }))}
              className="text-xs px-2.5 py-1.5 bg-gray-800 text-gray-400 border border-gray-700 rounded-lg hover:bg-gray-700 transition"
            >
              {discount.type === 'pct' ? '%' : 'دج'}
            </button>
            <input
              type="number"
              min="0"
              value={discount.value || ''}
              onChange={e => setDiscount(d => ({ ...d, value: parseFloat(e.target.value) || 0 }))}
              placeholder="0"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:ring-1 focus:ring-[#E8431A] outline-none"
            />
          </div>
        </div>

        {/* Totals */}
        <div className="px-3 py-2 border-t border-gray-800 space-y-1 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>المجموع</span><span>{formatDZD(subtotal)}</span>
          </div>
          {discountAmt > 0 && (
            <div className="flex justify-between text-green-500">
              <span>خصم</span><span>-{formatDZD(discountAmt)}</span>
            </div>
          )}
          <div className="flex justify-between font-black text-white text-lg">
            <span>الإجمالي</span><span className="text-dakkani-400">{formatDZD(total)}</span>
          </div>
        </div>

        {/* Payment method */}
        <div className="p-3 border-t border-gray-800 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_OPTS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setPayment(opt.id)}
                className={`py-2 rounded-xl text-xs font-bold transition ${payment === opt.id ? opt.color + ' text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {payment === 'cash' && (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">المبلغ المسلم</label>
              <input
                type="number"
                value={cashGiven}
                onChange={e => setCashGiven(e.target.value)}
                placeholder={formatDZD(total)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:ring-1 focus:ring-[#E8431A] outline-none"
              />
              {change > 0 && (
                <p className="text-sm text-green-400 font-bold mt-1">الباقي: {formatDZD(change)}</p>
              )}
            </div>
          )}

          <button
            onClick={checkout}
            disabled={!cart.length}
            className="w-full bg-[#E8431A] hover:bg-[#C73615] disabled:opacity-40 text-white font-black py-3.5 rounded-xl text-base transition"
          >
            {formatDZD(total)} — إتمام البيع
          </button>

          {lastSale && (
            <button
              onClick={printReceipt}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-400 hover:text-gray-200 border border-gray-700 rounded-xl transition"
            >
              <Printer className="w-4 h-4" />
              طباعة آخر فاتورة
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
