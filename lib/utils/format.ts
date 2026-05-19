export function formatDZD(amount: number): string {
  return new Intl.NumberFormat('ar-DZ', {
    style: 'currency',
    currency: 'DZD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | Date, locale = 'ar-DZ'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-DZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(date))
}

export function formatPhone(phone: string): string {
  // Format Algerian phone: 0xxx xx xx xx
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{4})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4')
  }
  return phone
}

export function slugify(text: string): string {
  if (!text) return ''

  // Arabic to Latin transliteration map
  const AR_MAP: Record<string, string> = {
    'ا':'a','أ':'a','إ':'a','آ':'a','ب':'b','ت':'t','ث':'th','ج':'j','ح':'h','خ':'kh',
    'د':'d','ذ':'dh','ر':'r','ز':'z','س':'s','ش':'sh','ص':'s','ض':'d','ط':'t','ظ':'z',
    'ع':'a','غ':'gh','ف':'f','ق':'q','ك':'k','ل':'l','م':'m','ن':'n','ه':'h','و':'w',
    'ي':'y','ى':'a','ة':'a','ء':'','ئ':'y','ؤ':'w','لا':'la','لأ':'la','لإ':'la',
    // French/special chars
    'é':'e','è':'e','ê':'e','à':'a','â':'a','î':'i','ô':'o','û':'u','ç':'c','ñ':'n',
  }

  let result = text
  // Replace Arabic chars
  for (const [ar, lat] of Object.entries(AR_MAP)) {
    result = result.split(ar).join(lat)
  }

  return result
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')  // keep only latin, numbers, spaces, dashes
    .replace(/[\s]+/g, '-')         // spaces to dashes
    .replace(/-+/g, '-')            // multiple dashes to one
    .replace(/^-+|-+$/g, '')        // trim dashes
    || `product-${Date.now()}`       // fallback if empty
}

export function truncate(text: string, length: number): string {
  return text.length > length ? text.slice(0, length) + '…' : text
}

export function calculateMargin(price: number, cost: number): number {
  if (cost <= 0) return 0
  return Math.round(((price - cost) / price) * 100)
}
