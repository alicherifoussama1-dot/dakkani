import type { Metadata } from 'next'

// Storefront pages belong to the store, not the platform: their titles
// already carry the store name, so drop the root "%s | Commerco" suffix.
export const metadata: Metadata = {
  title: { template: '%s', default: 'متجر' },
}

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return children
}
