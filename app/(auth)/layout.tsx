import { I18nProvider } from '@/lib/i18n/react'
import { getSiteLocale, getAllSiteMessages } from '@/lib/i18n/site'
import { SITE_LANG_COOKIE } from '@/lib/i18n/config'
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher'
import { CheckCircle2 } from 'lucide-react'

// Split-screen auth shell (cobalt brand panel ≥lg / centered card on mobile).
// Everything here is styled by design/components.css → .auth-* classes.
// Individual pages provide only the form; the outer chrome is uniform.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const locale = getSiteLocale()
  const isAr = locale === 'ar'
  const isFr = locale === 'fr'

  const title = isAr ? 'ابدأ متجرك في دقائق'
              : isFr ? 'Lancez votre boutique en minutes'
              :        'Launch your store in minutes'

  const sub = isAr ? 'منصة Commerco تجمع البوتيك والتأكيد والتوصيل والتحليلات في نظام واحد — مصمَّم للتاجر الجزائري.'
            : isFr ? 'Boutique, confirmation, livraison et analytique — un seul système, conçu pour le commerce algérien.'
            :        'Storefront, confirmation, shipping and analytics — one system, built for Algerian commerce.'

  const bullets = isAr
    ? ['58 ولاية · الدفع عند الاستلام', 'قنوات شحن حقيقية · تتبّع مباشر', 'Confirmili · طلبات متروكة · ذكاء اصطناعي']
    : isFr
    ? ['58 wilayas · Paiement à la livraison', 'Transporteurs réels · Suivi en direct', 'Confirmili · Paniers abandonnés · IA']
    : ['58 wilayas · Cash on delivery', 'Real couriers · Live tracking', 'Confirmili · Abandoned carts · AI']

  return (
    <I18nProvider initialLocale={locale} catalogs={getAllSiteMessages()} cookieName={SITE_LANG_COOKIE}>
      <div className="auth-shell" dir={isAr ? 'rtl' : 'ltr'}>
        {/* Brand panel — desktop only (≥1024px) */}
        <aside className="auth-brand" aria-hidden="true">
          <img src="/brand/logo-primary.svg" alt="" className="auth-brand__logo" />
          <h1 className="auth-brand__title">{title}</h1>
          <p className="auth-brand__sub">{sub}</p>
          <ul className="auth-brand__list" role="list">
            {bullets.map(b => (
              <li key={b} className="auth-brand__row">
                <span className="dot"><CheckCircle2 size={14} strokeWidth={2.4} aria-hidden /></span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <div className="auth-brand__foot">© {new Date().getFullYear()} Commerco</div>
        </aside>

        <main className="auth-main">
          <div className="auth-lang"><LanguageSwitcher /></div>
          {children}
        </main>
      </div>
    </I18nProvider>
  )
}
