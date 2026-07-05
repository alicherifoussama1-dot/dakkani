// ============================================================
// Commerco Label Generator
// A6 (10cm × 15cm) shipping label with barcode + QR
// A4 format: 4 labels per page (2×2)
// ============================================================
import jsPDF from 'jspdf'
import JsBarcode from 'jsbarcode'
import type { Order } from '@/types'

// ── Types ────────────────────────────────────────────────────
export interface LabelData {
  // Order info
  orderNumber: string
  trackingNumber?: string
  createdAt: string
  notes?: string
  // Customer
  customerName: string
  customerPhone: string
  // Address
  wilayaName: string
  communeName?: string
  address?: string
  deliveryType: 'home' | 'stopdesk'
  stopDeskCode?: string
  // Financial
  codAmount: number
  // Store
  storeName: string
  storeLogo?: string
  storePhone?: string
  // Products
  productList: string
}

// ── Constants ────────────────────────────────────────────────
const MM_TO_PT = 2.8346
const A6_W = 105  // mm
const A6_H = 148  // mm
const MARGIN = 6  // mm
const ORANGE = [249, 115, 22] as const
const DARK = [15, 23, 42] as const
const GRAY = [100, 116, 139] as const
const LIGHT = [248, 250, 252] as const
const RED = [220, 38, 38] as const
const GREEN = [22, 163, 74] as const

// ── Barcode generator (canvas-based) ────────────────────────
function generateBarcodeDataUrl(value: string): string | null {
  if (typeof document === 'undefined') return null
  try {
    const canvas = document.createElement('canvas')
    JsBarcode(canvas, value, {
      format: 'CODE128',
      width: 2,
      height: 40,
      displayValue: false,
      margin: 0,
      background: '#ffffff',
      lineColor: '#0f172a',
    })
    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
}

// ── QR code via API (lightweight) ────────────────────────────
function getQRUrl(data: string): string {
  const encoded = encodeURIComponent(data)
  return `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encoded}&margin=2`
}

// ── Single A6 label renderer ─────────────────────────────────
function renderA6Label(
  doc: jsPDF,
  label: LabelData,
  xOffset = 0,
  yOffset = 0
): void {
  const x = (v: number) => xOffset + v
  const y = (v: number) => yOffset + v

  // ── Background ──────────────────────────────────────────
  doc.setFillColor(...LIGHT)
  doc.rect(x(0), y(0), A6_W, A6_H, 'F')

  // ── Header band ─────────────────────────────────────────
  doc.setFillColor(...ORANGE)
  doc.rect(x(0), y(0), A6_W, 18, 'F')

  // Store name
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(label.storeName.slice(0, 30), x(MARGIN), y(8))

  // Delivery type badge
  const badgeLabel = label.deliveryType === 'stopdesk' ? 'BUREAU' : 'DOMICILE'
  const badgeColor = label.deliveryType === 'stopdesk' ? [139, 92, 246] : [16, 185, 129]
  doc.setFillColor(...(badgeColor as [number, number, number]))
  doc.roundedRect(x(A6_W - MARGIN - 22), y(5), 22, 8, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(6)
  doc.setFont('helvetica', 'bold')
  doc.text(badgeLabel, x(A6_W - MARGIN - 11), y(10), { align: 'center' })

  let curY = y(22)

  // ── Tracking / Order number ──────────────────────────────
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(x(MARGIN), curY - 1, A6_W - MARGIN * 2, 10, 2, 2, 'F')
  doc.setTextColor(...DARK)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('رقم الطلب:', x(MARGIN + 2), curY + 4)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(label.trackingNumber ?? label.orderNumber, x(A6_W - MARGIN - 2), curY + 4, { align: 'right' })
  curY += 13

  // ── Barcode ──────────────────────────────────────────────
  const barcodeValue = label.trackingNumber ?? label.orderNumber
  const barcodeData = generateBarcodeDataUrl(barcodeValue)
  if (barcodeData) {
    doc.addImage(barcodeData, 'PNG', x(MARGIN), curY, A6_W - MARGIN * 2, 14)
    curY += 15
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    doc.text(barcodeValue, x(A6_W / 2), curY, { align: 'center' })
    curY += 5
  } else {
    // Fallback: text barcode
    doc.setFontSize(14)
    doc.setFont('courier', 'bold')
    doc.setTextColor(...DARK)
    doc.text(`*${barcodeValue}*`, x(A6_W / 2), curY + 8, { align: 'center' })
    curY += 14
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    doc.text(barcodeValue, x(A6_W / 2), curY, { align: 'center' })
    curY += 4
  }

  // ── Divider ──────────────────────────────────────────────
  doc.setDrawColor(...ORANGE)
  doc.setLineWidth(0.5)
  doc.line(x(MARGIN), curY, x(A6_W - MARGIN), curY)
  curY += 4

  // ── Customer info ────────────────────────────────────────
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(x(MARGIN), curY, A6_W - MARGIN * 2, 28, 2, 2, 'F')

  doc.setTextColor(...DARK)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(label.customerName, x(MARGIN + 3), curY + 7)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  doc.text('📞', x(MARGIN + 3), curY + 14)
  doc.setTextColor(...DARK)
  doc.text(label.customerPhone, x(MARGIN + 10), curY + 14)

  if (label.storePhone) {
    doc.setFontSize(7)
    doc.setTextColor(...GRAY)
    doc.text(`المرسل: ${label.storePhone}`, x(A6_W - MARGIN - 3), curY + 7, { align: 'right' })
  }

  // Address line
  const addressLine = [
    label.communeName,
    label.wilayaName,
    label.address,
  ].filter(Boolean).join(' - ')
  doc.setFontSize(8)
  doc.setTextColor(...DARK)
  doc.setFont('helvetica', 'bold')
  doc.text('📍 ' + addressLine.slice(0, 45), x(MARGIN + 3), curY + 22)

  curY += 32

  // ── Stop desk info ───────────────────────────────────────
  if (label.deliveryType === 'stopdesk' && label.stopDeskCode) {
    doc.setFillColor(139, 92, 246)
    doc.roundedRect(x(MARGIN), curY, A6_W - MARGIN * 2, 8, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text(`نقطة التوزيع: ${label.stopDeskCode}`, x(A6_W / 2), curY + 5.5, { align: 'center' })
    curY += 12
  }

  // ── COD amount ───────────────────────────────────────────
  if (label.codAmount > 0) {
    doc.setFillColor(...RED)
    doc.roundedRect(x(MARGIN), curY, A6_W - MARGIN * 2, 11, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text(
      `COD: ${label.codAmount.toLocaleString()} DA`,
      x(A6_W / 2), curY + 8,
      { align: 'center' }
    )
    curY += 14
  } else {
    doc.setFillColor(...(GREEN as [number, number, number]))
    doc.roundedRect(x(MARGIN), curY, A6_W - MARGIN * 2, 8, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('مدفوع مسبقاً', x(A6_W / 2), curY + 5.5, { align: 'center' })
    curY += 11
  }

  // ── Product list ─────────────────────────────────────────
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  const productLine = label.productList.slice(0, 60)
  doc.text(productLine, x(A6_W / 2), curY + 4, { align: 'center' })
  curY += 8

  // ── Date ─────────────────────────────────────────────────
  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  doc.text(
    new Date(label.createdAt).toLocaleDateString('fr-DZ'),
    x(MARGIN + 2), curY
  )

  // ── Notes ────────────────────────────────────────────────
  if (label.notes) {
    doc.setFontSize(7)
    doc.setTextColor(...DARK)
    doc.text(`ملاحظة: ${label.notes.slice(0, 50)}`, x(A6_W / 2), curY, { align: 'center' })
  }

  // ── Footer ───────────────────────────────────────────────
  doc.setFillColor(...ORANGE)
  doc.rect(x(0), y(A6_H - 5), A6_W, 5, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(5)
  doc.setFont('helvetica', 'normal')
  doc.text('Powered by Commerco', x(A6_W / 2), y(A6_H - 1.5), { align: 'center' })

  // ── Border ───────────────────────────────────────────────
  doc.setDrawColor(...ORANGE)
  doc.setLineWidth(0.3)
  doc.rect(x(0), y(0), A6_W, A6_H)
}

// ── Public API ───────────────────────────────────────────────

/**
 * Generate a single A6 shipping label and trigger download
 */
export function generateA6Label(label: LabelData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [A6_W, A6_H],
  })

  renderA6Label(doc, label, 0, 0)
  doc.save(`label-${label.trackingNumber ?? label.orderNumber}.pdf`)
}

/**
 * Generate A4 sheet with 4 labels (2 columns × 2 rows)
 */
export function generateA4Labels(labels: LabelData[]): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const A4_W = 210
  const A4_H = 297
  const colW = A4_W / 2   // 105mm
  const rowH = A4_H / 2   // 148.5mm

  const positions = [
    { x: 0, y: 0 },
    { x: colW, y: 0 },
    { x: 0, y: rowH },
    { x: colW, y: rowH },
  ]

  labels.slice(0, 4).forEach((label, i) => {
    renderA6Label(doc, label, positions[i].x, positions[i].y)
  })

  // Cut lines
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.1)
  ;(doc as any).setLineDash([2, 2])
  doc.line(colW, 0, colW, A4_H)
  doc.line(0, rowH, A4_W, rowH)

  doc.save(`labels-A4-${new Date().toISOString().slice(0, 10)}.pdf`)
}

/**
 * Generate labels for multiple orders, auto-batching into A4 pages
 */
export function generateBulkLabels(labels: LabelData[]): void {
  if (labels.length === 0) return

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const A4_W = 210
  const A4_H = 297
  const colW = A4_W / 2
  const rowH = A4_H / 2

  const positions = [
    { x: 0, y: 0 },
    { x: colW, y: 0 },
    { x: 0, y: rowH },
    { x: colW, y: rowH },
  ]

  labels.forEach((label, idx) => {
    const posIdx = idx % 4
    if (posIdx === 0 && idx > 0) {
      doc.addPage()
    }
    renderA6Label(doc, label, positions[posIdx].x, positions[posIdx].y)

    // Draw cut lines on each page
    if (posIdx === 3 || idx === labels.length - 1) {
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.1)
      ;(doc as any).setLineDash([2, 2])
      doc.line(colW, 0, colW, A4_H)
      doc.line(0, rowH, A4_W, rowH)
    }
  })

  doc.save(`bulk-labels-${labels.length}-${new Date().toISOString().slice(0, 10)}.pdf`)
}

/**
 * Convert Order + Store to LabelData
 */
export function orderToLabelData(
  order: Order & { wilaya?: { name_ar: string }; commune?: { name_ar: string } },
  storeName: string,
  storePhone?: string,
): LabelData {
  const productList = order.items
    ?.map(i => `${i.product_name} ×${i.quantity}`)
    .join(', ') ?? 'منتجات متنوعة'

  return {
    orderNumber: order.order_number,
    trackingNumber: order.tracking_number ?? undefined,
    createdAt: order.created_at,
    notes: order.notes ?? undefined,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    wilayaName: order.wilaya?.name_ar ?? String(order.wilaya_id),
    communeName: order.commune?.name_ar ?? undefined,
    address: order.address ?? undefined,
    deliveryType: order.delivery_type,
    stopDeskCode: order.stopdesk_code ?? undefined,
    codAmount: order.total,
    storeName,
    storePhone,
    productList,
  }
}
