// ============================================================
// CONTACT ACTIONS — phone + WhatsApp.
//
// Linking.openURL REJECTS when nothing on the device can handle the URL
// (WhatsApp not installed, a tablet with no dialer). Every call site was
// firing it unguarded, so those cases surfaced as unhandled promise
// rejections instead of something the merchant could understand.
//
// The 0 → 213 normalisation also lived in three separate screens; it lives
// here now so the WhatsApp number is built one way only.
// ============================================================
import { Linking, Alert } from 'react-native'

/** Algerian local (0XXXXXXXXX) → international (213XXXXXXXXX). */
export function toIntlDZ(phone: string): string {
  const digits = (phone || '').replace(/[^\d+]/g, '')
  if (digits.startsWith('+213')) return digits.slice(1)
  if (digits.startsWith('213')) return digits
  return digits.replace(/^0/, '213')
}

async function open(url: string, unavailableMessage: string) {
  try {
    await Linking.openURL(url)
  } catch {
    Alert.alert('تعذّر فتح التطبيق', unavailableMessage)
  }
}

/** Place a call. No-ops safely on devices without a dialer. */
export function callPhone(phone?: string | null) {
  if (!phone) return
  open(`tel:${phone}`, 'لا يوجد تطبيق اتصال على هذا الجهاز.')
}

/** Open a WhatsApp chat with a prefilled message. */
export function openWhatsApp(phone?: string | null, message = '') {
  if (!phone) return
  const url = `https://wa.me/${toIntlDZ(phone)}${message ? `?text=${encodeURIComponent(message)}` : ''}`
  open(url, 'تأكد من تثبيت WhatsApp على هذا الجهاز.')
}
