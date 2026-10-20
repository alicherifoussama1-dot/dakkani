// Public URL of a store: its own custom domain when it has one
// (https://afnane.store), otherwise its platform subdomain
// (https://arsily-dz.commerco.store). server.js routes both to the storefront.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://commerco.store'

export function storeBaseUrl(slug: string, customHost?: string | null): string {
  if (customHost) return `https://${customHost}`
  const app = new URL(APP_URL)
  // Local dev has no wildcard DNS: keep the path-based storefront there.
  if (/^(localhost|127\.0\.0\.1)$/.test(app.hostname)) return `${app.origin}/store/${slug}`
  return `${app.protocol}//${slug}.${app.hostname.replace(/^www\./, '')}`
}
