import { I18nProvider } from '@/lib/i18n/react'
import { getSiteLocale, getAllSiteMessages } from '@/lib/i18n/site'
import { SITE_LANG_COOKIE } from '@/lib/i18n/config'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const locale = getSiteLocale()
  return (
    <I18nProvider initialLocale={locale} catalogs={getAllSiteMessages()} cookieName={SITE_LANG_COOKIE}>
      {children}
    </I18nProvider>
  )
}
