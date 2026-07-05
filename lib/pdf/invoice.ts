import jsPDF from 'jspdf'
import type { Order, Store } from '@/types'

export function generateInvoicePDF(order: Order, store: Store): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pageW = doc.internal.pageSize.getWidth()

  // Header
  doc.setFillColor(249, 115, 22) // commerco orange
  doc.rect(0, 0, pageW, 35, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text(store.name, pageW / 2, 16, { align: 'center' })
  doc.setFontSize(10)
  doc.text(`فاتورة رقم: ${order.order_number}`, pageW / 2, 26, { align: 'center' })

  // Reset color
  doc.setTextColor(30, 41, 59)

  // Customer info box
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(10, 42, pageW - 20, 40, 3, 3, 'F')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('معلومات العميل', 15, 52)
  doc.setFont('helvetica', 'normal')
  doc.text(`الاسم: ${order.customer_name}`, 15, 60)
  doc.text(`الهاتف: ${order.customer_phone}`, 15, 67)
  doc.text(`الولاية: ${order.wilaya?.name_ar ?? ''}`, 15, 74)
  if (order.address) doc.text(`العنوان: ${order.address}`, pageW / 2, 60)

  // Order items table
  let y = 92
  doc.setFillColor(30, 41, 59)
  doc.rect(10, y - 5, pageW - 20, 8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.text('المنتج', 15, y)
  doc.text('الكمية', pageW - 65, y, { align: 'center' })
  doc.text('السعر', pageW - 40, y, { align: 'center' })
  doc.text('المجموع', pageW - 15, y, { align: 'right' })

  doc.setTextColor(30, 41, 59)
  y += 10

  order.items?.forEach((item, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252)
      doc.rect(10, y - 5, pageW - 20, 8, 'F')
    }
    doc.setFontSize(9)
    doc.text(item.product_name.slice(0, 35), 15, y)
    doc.text(String(item.quantity), pageW - 65, y, { align: 'center' })
    doc.text(`${item.unit_price} DZD`, pageW - 40, y, { align: 'center' })
    doc.text(`${item.total_price} DZD`, pageW - 15, y, { align: 'right' })
    y += 9
  })

  // Totals
  y += 5
  doc.line(10, y, pageW - 10, y)
  y += 7
  doc.setFontSize(10)

  const addRow = (label: string, value: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.text(label, pageW - 80, y)
    doc.text(value, pageW - 15, y, { align: 'right' })
    y += 7
  }

  addRow('المجموع الفرعي:', `${order.subtotal} DZD`)
  addRow('رسوم التوصيل:', `${order.delivery_fee} DZD`)
  if (order.discount_amount > 0) addRow('الخصم:', `-${order.discount_amount} DZD`)
  addRow('المجموع الكلي:', `${order.total} DZD`, true)

  // Footer
  const pageH = doc.internal.pageSize.getHeight()
  doc.setFillColor(248, 250, 252)
  doc.rect(0, pageH - 20, pageW, 20, 'F')
  doc.setFontSize(8)
  doc.setTextColor(100)
  doc.text('شكراً على ثقتكم | Commerco - منصة التجارة الإلكترونية الجزائرية', pageW / 2, pageH - 8, { align: 'center' })

  doc.save(`فاتورة-${order.order_number}.pdf`)
}
