'use client'
// ============================================================
// COMMERCO MERCHANT SHELL — design-system rebuild (Flow C identity)
// Scope class `commerco-ds` activates the token retheme (globals.css);
// storefront/checkout outside this tree are untouched.
// Behaviors preserved 1:1: store switcher + create store, credits,
// sign-out, i18n (ar/fr/en, RTL/LTR), Confirmili passthrough.
// New UX: sectioned nav IA, notifications popover, persisted dark
// mode, mobile bottom nav + drawer, 44px touch targets.
// ============================================================
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import {
  Home, Package, ShoppingCart, Users, Navigation2, Phone, BarChart2,
  CreditCard, ChevronDown, ChevronRight, Menu, X, LogOut, Settings,
  Bell, HelpCircle, Sun, Moon, Globe, Store, ExternalLink,
  Coins, Star, ShieldOff, Plus, Loader2, Truck, LayoutGrid, Megaphone,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils/format'
import { useT, useLocale, useDir } from '@/lib/i18n/react'
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher'

// ── Nav IA: Main → Growth → Channels → Setup ────────────────
// Labels come from the existing i18n catalog (nav.*); section titles
// are shell-local (the catalog has no keys for them).
const SECTION_LABELS: Record<string, { ar: string; fr: string; en: string }> = {
  growth:   { ar: 'النمو',     fr: 'Croissance', en: 'Growth' },
  channels: { ar: 'القنوات',   fr: 'Canaux',     en: 'Channels' },
  setup:    { ar: 'الإعداد',   fr: 'Réglages',   en: 'Setup' },
}
const NOTIF_TEXT: Record<string, (n: number) => string> = {
  ar: n => n > 0 ? `لديك ${n} طلب جديد اليوم` : 'لا إشعارات جديدة — كل شيء تحت السيطرة ✓',
  fr: n => n > 0 ? `${n} nouvelle(s) commande(s) aujourd'hui` : 'Aucune notification — tout est à jour ✓',
  en: n => n > 0 ? `${n} new order(s) today` : 'No new notifications — all caught up ✓',
}
const VIEW_ORDERS: Record<string, string> = { ar: 'عرض الطلبات', fr: 'Voir les commandes', en: 'View orders' }

type NavEntry = { href: string; key: string; icon: any; badge?: boolean }
const NAV_MAIN: NavEntry[] = [
  { href: '/dashboard', key: 'home',      icon: Home },
  { href: '/orders',    key: 'orders',    icon: ShoppingCart },
  { href: '/products',  key: 'products',  icon: Package },
  { href: '/customers', key: 'customers', icon: Users },
]
const NAV_GROWTH: NavEntry[] = [
  { href: '/analytics',     key: 'analytics',     icon: BarChart2 },
  { href: '/landing-pages', key: 'landing_pages', icon: Megaphone },
  { href: '/reviews',       key: 'reviews',       icon: Star },
]
const NAV_CHANNELS: NavEntry[] = [
  { href: '/store-builder',  key: 'store_builder', icon: Store, badge: true },
  { href: '/store/delivery', key: 'delivery',      icon: Truck, badge: true },
  { href: '/confirmili',     key: 'confirmili',    icon: Phone, badge: true },
  { href: '/google-sheets',  key: 'google_sheets', icon: Globe, badge: true },
  { href: '/blacklist',      key: 'blacklist',     icon: ShieldOff },
]
const NAV_SETUP: NavEntry[] = [
  { href: '/settings?tab=checkout',     key: 'checkout_page',    icon: ShoppingCart },
  { href: '/settings/tracking-domains', key: 'tracking_domains', icon: Navigation2 },
]
const NAV_MOBILE: NavEntry[] = [
  { href: '/dashboard', key: 'home',      icon: Home },
  { href: '/orders',    key: 'orders',    icon: ShoppingCart },
  { href: '/products',  key: 'products',  icon: Package },
  { href: '/analytics', key: 'analytics', icon: BarChart2 },
]

interface Props {
  children: React.ReactNode
  store?: { id: string; name: string; slug?: string; plan?: string; logo_url?: string; hostname?: string } | null
  user?: { name?: string; email?: string; avatar?: string } | null
  newOrdersCount?: number
  allStores?: Array<{ id: string; name: string; slug: string; plan: string; logo_url?: string }>
}

export default function DashboardShell({ children, store, user, newOrdersCount = 0, allStores = [] }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams ? searchParams.get('tab') : null
  const t = useT()
  const locale = useLocale()
  const dir = useDir()
  const sec = (k: string) => SECTION_LABELS[k][locale as 'ar' | 'fr' | 'en'] ?? SECTION_LABELS[k].en

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [creditsOpen, setCreditsOpen] = useState(false)
  const [billingOpen, setBillingOpen] = useState(false)
  const [dark, setDark] = useState(false)
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false)
  const [newStoreModalOpen, setNewStoreModalOpen] = useState(false)
  const [newStoreName, setNewStoreName] = useState('')
  const [newStoreNameAr, setNewStoreNameAr] = useState('')
  const [newStorePhone, setNewStorePhone] = useState('')
  const [newStoreError, setNewStoreError] = useState('')
  const [isSubmittingNewStore, setIsSubmittingNewStore] = useState(false)

  // ── Dark mode: persisted, applied to <html data-theme> so both the
  //    token layer and tailwind's [data-theme="dark"] variant react. ──
  useEffect(() => {
    const saved = typeof window !== 'undefined' && localStorage.getItem('commerco-theme')
    if (saved === 'dark') applyTheme(true)
  }, [])
  const applyTheme = (isDark: boolean) => {
    setDark(isDark)
    const el = document.documentElement
    el.setAttribute('data-theme', isDark ? 'dark' : 'light')
    el.style.colorScheme = isDark ? 'dark' : 'light'
    localStorage.setItem('commerco-theme', isDark ? 'dark' : 'light')
  }

  const handleSwitchStore = (storeId: string) => {
    document.cookie = `dakkani_active_store_id=${storeId}; path=/; max-age=31536000`
    setStoreDropdownOpen(false)
    router.refresh()
    window.location.href = '/dashboard'
  }

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStoreName || !newStoreNameAr) return
    setIsSubmittingNewStore(true)
    setNewStoreError('')
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { router.push('/login'); return }
    const newSlug = slugify(newStoreName) || `store-${Date.now()}`
    const newStoreId = crypto.randomUUID()
    const { error: insertErr } = await sb.from('stores').insert({
      id: newStoreId, owner_id: user.id, name: newStoreName, name_ar: newStoreNameAr,
      slug: newSlug, phone: newStorePhone || null, currency: 'DZD', plan: 'free', is_active: true,
    })
    if (insertErr) {
      if (insertErr.message.includes('unique')) {
        const randomSlug = newSlug + '-' + Math.random().toString(36).slice(2, 6)
        const { error: insertErr2 } = await sb.from('stores').insert({
          id: newStoreId, owner_id: user.id, name: newStoreName, name_ar: newStoreNameAr,
          slug: randomSlug, phone: newStorePhone || null, currency: 'DZD', plan: 'free', is_active: true,
        })
        if (insertErr2) { setNewStoreError(insertErr2.message); setIsSubmittingNewStore(false); return }
      } else {
        setNewStoreError(insertErr.message); setIsSubmittingNewStore(false); return
      }
    }
    document.cookie = `dakkani_active_store_id=${newStoreId}; path=/; max-age=31536000`
    setNewStoreModalOpen(false)
    setIsSubmittingNewStore(false)
    setNewStoreName(''); setNewStoreNameAr(''); setNewStorePhone('')
    window.location.href = '/dashboard'
  }

  useEffect(() => { setMobileOpen(false); setAvatarOpen(false); setNotifOpen(false) }, [pathname])

  const isActive = useCallback((href: string) => {
    if (href.includes('?')) {
      const [path, query] = href.split('?')
      const params = new URLSearchParams(query)
      return pathname === path && activeTab === params.get('tab')
    }
    if (href === '/settings') return pathname === '/settings' && !activeTab
    return pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
  }, [pathname, activeTab])

  const signOut = async () => {
    const sb = createClient()
    await sb.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // ── Nav item: pill active state (no side-stripes), 40px, logical props ──
  const NavItem = ({ item, count }: { item: NavEntry; count?: number }) => {
    const active = isActive(item.href)
    return (
      <Link href={item.href} aria-current={active ? 'page' : undefined}
        className="ios-tap flex items-center gap-3 h-10 px-3 rounded-xl text-sm font-semibold transition-all duration-150"
        style={{
          background: active ? '#EFF6FF' : 'transparent',
          color: active ? '#0D6EFD' : 'var(--text-secondary)',
        }}
        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#F1F5F9' }}
        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      >
        <item.icon size={18} strokeWidth={active ? 2.2 : 1.8} className={`flex-shrink-0 ${active ? 'text-[#0D6EFD]' : 'text-gray-400'}`} aria-hidden />
        <span className="flex-1 truncate">{t(`nav.${item.key}`)}</span>
        {count && count > 0 ? (
          <span className="min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center bg-[#0D6EFD] text-white">
            {count > 99 ? '99+' : count}
          </span>
        ) : item.badge ? (
          <span className="h-[18px] px-1.5 rounded-full text-[10px] font-semibold flex items-center bg-blue-50 text-blue-700">
            {t('section.new')}
          </span>
        ) : null}
      </Link>
    )
  }

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <p className="px-3 pt-5 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em]"
      style={{ color: 'var(--text-muted)' }}>{children}</p>
  )

  const SidebarContent = () => (
    <div className="flex flex-col h-full" style={{ fontFamily: 'var(--font-arabic)' }}>
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 h-14 flex-shrink-0 border-b" style={{ borderColor: 'var(--border-default)' }}>
        <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
          <img src={dark ? '/brand/logo-dark.svg' : '/brand/logo-primary.svg'} alt="Commerco" className="h-6 w-auto" />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 scrollbar-none" aria-label="Dashboard">
        <div className="space-y-0.5">
          {NAV_MAIN.map(item => (
            <NavItem key={item.href} item={item} count={item.href === '/orders' ? newOrdersCount : undefined} />
          ))}
        </div>
        <SectionTitle>{sec('growth')}</SectionTitle>
        <div className="space-y-0.5">{NAV_GROWTH.map(item => <NavItem key={item.href} item={item} />)}</div>
        <SectionTitle>{sec('channels')}</SectionTitle>
        <div className="space-y-0.5">{NAV_CHANNELS.map(item => <NavItem key={item.href} item={item} />)}</div>
        <SectionTitle>{sec('setup')}</SectionTitle>
        <div className="space-y-0.5">
          {NAV_SETUP.map(item => <NavItem key={item.href} item={item} />)}
          {/* Billing (collapsible, preserved) */}
          <button onClick={() => setBillingOpen(o => !o)}
            className="flex items-center gap-3 h-10 px-3 w-full rounded-[var(--radius-md)] text-sm font-medium transition-colors"
            style={{ color: isActive('/billing') ? 'var(--nav-item-fg-active)' : 'var(--text-secondary)', background: isActive('/billing') ? 'var(--nav-item-bg-active)' : 'transparent' }}
            aria-expanded={billingOpen}>
            <CreditCard size={18} strokeWidth={1.8} className="flex-shrink-0" aria-hidden />
            <span className="flex-1 truncate text-start">{t('billing.title')}</span>
            <ChevronDown size={14} className={`transition-transform ${billingOpen ? 'rotate-180' : ''}`} aria-hidden />
          </button>
          {billingOpen && (
            <div className="ps-8 space-y-0.5">
              {[{ href: '/billing/plans', label: t('billing.plans') }, { href: '/billing/history', label: t('billing.history') }].map(s => (
                <Link key={s.href} href={s.href}
                  className="flex items-center gap-2 h-9 px-3 rounded-[var(--radius-md)] text-sm transition-colors"
                  style={{ color: isActive(s.href) ? 'var(--nav-item-fg-active)' : 'var(--text-secondary)', background: isActive(s.href) ? 'var(--nav-item-bg-active)' : 'transparent' }}>
                  <ChevronRight size={12} className="rtl:rotate-180" aria-hidden />{s.label}
                </Link>
              ))}
            </div>
          )}
          <NavItem item={{ href: '/settings', key: 'settings', icon: Settings }} />
        </div>
      </nav>

      {/* Store switcher + user (preserved behavior) */}
      <div className="flex-shrink-0 border-t p-3 space-y-2" style={{ borderColor: 'var(--border-default)' }}>
        {store && (
          <div className="relative">
            <button onClick={() => setStoreDropdownOpen(o => !o)} aria-expanded={storeDropdownOpen}
              className="flex items-center justify-between w-full px-2 py-2 rounded-[var(--radius-md)] transition-colors text-start"
              style={{ background: storeDropdownOpen ? 'var(--surface-sunken)' : 'transparent' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-sunken)'}
              onMouseLeave={e => { if (!storeDropdownOpen) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
              <div className="flex items-center gap-2 min-w-0">
                {store.logo_url
                  ? <img src={store.logo_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0 border" style={{ borderColor: 'var(--border-default)' }} />
                  : <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: 'var(--interactive-primary)' }}>{store.name[0]}</div>}
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>{store.name}</p>
                  {store.plan && <p className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: 'var(--text-muted)' }}>{store.plan}</p>}
                </div>
              </div>
              <ChevronDown size={14} className={`transition-transform ${storeDropdownOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--text-muted)' }} aria-hidden />
            </button>
            {storeDropdownOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setStoreDropdownOpen(false)} />
                <div className="absolute bottom-full inset-inline-start-0 start-0 mb-1 w-full rounded-[var(--radius-md)] z-40 overflow-hidden p-1 border"
                  style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-default)', boxShadow: 'var(--shadow-md)' }}>
                  <div className="max-h-48 overflow-y-auto space-y-0.5">
                    {allStores.map(s => (
                      <button key={s.id} onClick={() => handleSwitchStore(s.id)}
                        className="flex items-center gap-2 w-full px-2 py-2 rounded-[var(--radius-sm)] text-start text-xs transition-colors"
                        style={s.id === store.id
                          ? { background: 'var(--nav-item-bg-active)', color: 'var(--nav-item-fg-active)', fontWeight: 700 }
                          : { color: 'var(--text-secondary)' }}>
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                          style={s.id === store.id ? { background: 'var(--interactive-primary)', color: '#fff' } : { background: 'var(--surface-sunken)', color: 'var(--text-muted)' }}>
                          {s.name[0]}
                        </span>
                        <span className="truncate flex-1">{s.name}</span>
                        {s.id === store.id && <span aria-hidden>✓</span>}
                      </button>
                    ))}
                  </div>
                  <div className="h-px my-1" style={{ background: 'var(--border-default)' }} />
                  <button onClick={() => { setNewStoreModalOpen(true); setStoreDropdownOpen(false) }}
                    className="flex items-center justify-center gap-1.5 w-full h-9 rounded-[var(--radius-sm)] font-bold text-xs transition-colors"
                    style={{ background: 'var(--color-primary-50)', color: 'var(--color-primary-700)' }}>
                    <Plus size={13} aria-hidden /><span>{t('shell.add_new_store')}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        {user && (
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: 'var(--interactive-primary)' }}>
              {(user.name ?? 'U')[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{user.name}</p>
              <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
            </div>
            <button onClick={signOut} title={t('shell.logout')} aria-label={t('shell.logout')}
              className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center transition-colors"
              style={{ color: 'var(--color-error-600)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-error-50)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
              <LogOut size={15} aria-hidden />
            </button>
          </div>
        )}
      </div>
    </div>
  )

  // Confirmili keeps its self-contained theme (unchanged behavior)
  if (pathname?.startsWith('/confirmili')) {
    return <div dir={dir} lang={locale} className="h-screen overflow-hidden">{children}</div>
  }

  return (
    <div dir={dir} lang={locale} className="commerco-ds c-ui flex h-screen overflow-hidden" style={{ background: 'var(--surface-page)' }}>
      {/* ── Desktop sidebar — light clean panel ── */}
      <aside className="bg-[#F8FAFC] hidden lg:flex flex-col flex-shrink-0 h-full overflow-hidden border-e border-gray-200"
        style={{
          width: sidebarOpen ? 260 : 0,
          transition: 'width 320ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}>
        <SidebarContent />
      </aside>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 lg:hidden" style={{ background: 'var(--overlay-scrim)' }} onClick={() => setMobileOpen(false)} />
          <aside className="bg-[#F8FAFC] fixed top-0 bottom-0 start-0 z-50 w-[280px] max-w-[85vw] flex flex-col lg:hidden border-e border-gray-200"
            style={{ animation: 'ios-sheet-up 320ms cubic-bezier(0.32, 0.72, 0, 1)' }}
            role="dialog" aria-label={t('shell.settings')}>
            <SidebarContent />
          </aside>
        </>
      )}

      {/* ── Main column ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar — iOS frosted surface. overflow-hidden guards against any
            chrome element accidentally pushing the row past 375px on mobile. */}
        <header className="ios-frost flex-shrink-0 flex items-center justify-between gap-1.5 sm:gap-2 px-2 sm:px-4 border-b z-30 overflow-hidden"
          style={{ blockSize: 56 }}>
          <div className="flex items-center gap-1.5 min-w-0">
            <button onClick={() => setSidebarOpen(o => !o)} aria-label="Toggle sidebar"
              className="w-10 h-10 rounded-[var(--radius-md)] hidden lg:flex items-center justify-center transition-colors hover:bg-[var(--surface-sunken)]"
              style={{ color: 'var(--text-secondary)' }}>
              <Menu size={18} aria-hidden />
            </button>
            <button onClick={() => setMobileOpen(true)} aria-label="Open menu"
              className="w-10 h-10 rounded-[var(--radius-md)] lg:hidden flex items-center justify-center transition-colors hover:bg-[var(--surface-sunken)]"
              style={{ color: 'var(--text-secondary)' }}>
              <Menu size={18} aria-hidden />
            </button>
            <Link href="/dashboard" className="lg:hidden flex items-center">
              <img src={dark ? '/brand/logo-dark.svg' : '/brand/logo-primary.svg'} alt="Commerco" className="h-5 w-auto" />
            </Link>
            {(store?.hostname || store?.slug) && (
              <a href={store?.hostname ? `https://${store.hostname}/` : `/store/${store.slug}`} target="_blank" rel="noopener noreferrer" title={t('shell.visit_store')}
                className="hidden sm:flex items-center gap-1.5 px-3 h-9 rounded-full border text-xs font-semibold transition-colors hover:bg-[var(--surface-sunken)]"
                style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)' }}>
                <ExternalLink size={13} aria-hidden /><span>{t('shell.store')}</span>
              </a>
            )}
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1">
            {/* Language switcher — mobile hides it (available in the avatar menu) */}
            <div className="hidden md:block"><LanguageSwitcher /></div>
            {/* Dark mode — 36x36 on mobile so the topbar fits inside 375px */}
            <button onClick={() => applyTheme(!dark)} aria-label={t('shell.dark_mode')} title={t('shell.dark_mode')}
              className="ios-tap w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-colors hover:bg-[var(--surface-sunken)]"
              style={{ color: 'var(--text-secondary)' }}>
              {dark ? <Sun size={17} aria-hidden /> : <Moon size={17} aria-hidden />}
            </button>
            {/* Notifications */}
            <div className="relative">
              <button onClick={() => setNotifOpen(o => !o)} aria-label={t('shell.notifications')} aria-expanded={notifOpen}
                className="ios-tap w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-colors hover:bg-[var(--surface-sunken)] relative"
                style={{ color: 'var(--text-secondary)' }}>
                <Bell size={17} aria-hidden />
                {newOrdersCount > 0 && (
                  <span className="absolute top-1.5 end-1.5 w-2 h-2 rounded-full" style={{ background: 'var(--color-error-500)' }} aria-hidden />
                )}
              </button>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
                  <div className="absolute end-0 top-full mt-1 w-72 rounded-[var(--radius-lg)] border z-20 overflow-hidden animate-scale-in"
                    style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-default)', boxShadow: 'var(--shadow-md)' }}
                    role="status" aria-live="polite">
                    <div className="px-4 py-3 border-b text-sm font-bold" style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
                      {t('shell.notifications')}
                    </div>
                    <div className="p-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {(NOTIF_TEXT[locale] ?? NOTIF_TEXT.en)(newOrdersCount)}
                    </div>
                    {newOrdersCount > 0 && (
                      <Link href="/orders" onClick={() => setNotifOpen(false)}
                        className="block px-4 py-3 border-t text-sm font-semibold transition-colors hover:bg-[var(--surface-sunken)]"
                        style={{ borderColor: 'var(--border-default)', color: 'var(--text-link)' }}>
                        {VIEW_ORDERS[locale] ?? VIEW_ORDERS.en} ←
                      </Link>
                    )}
                  </div>
                </>
              )}
            </div>
            {/* Credits (preserved) */}
            <button onClick={() => setCreditsOpen(true)}
              className="hidden md:flex items-center gap-1.5 px-3 h-9 rounded-full border text-xs font-medium transition-colors hover:bg-[var(--surface-sunken)]"
              style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)' }}>
              <Coins size={13} aria-hidden /><span>{t('shell.credits', { count: 0 })}</span>
            </button>
            <a href="https://wa.me/213000000000?text=مرحبا، أحتاج مساعدة في Commerco" target="_blank" rel="noopener noreferrer"
              aria-label={t('shell.help')}
              className="hidden md:flex w-10 h-10 rounded-[var(--radius-md)] items-center justify-center transition-colors hover:bg-[var(--surface-sunken)]"
              style={{ color: 'var(--text-secondary)' }}>
              <HelpCircle size={17} aria-hidden />
            </a>
            {/* Avatar menu */}
            <div className="relative">
              <button onClick={() => setAvatarOpen(o => !o)} aria-label={t('shell.profile')} aria-expanded={avatarOpen}
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold transition-shadow focus-visible:outline-none"
                style={{ background: 'var(--interactive-primary)', boxShadow: avatarOpen ? 'var(--shadow-focus)' : 'none' }}>
                {(user?.name ?? 'U')[0]}
              </button>
              {avatarOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setAvatarOpen(false)} />
                  <div className="absolute end-0 top-full mt-1 w-60 rounded-[var(--radius-lg)] border z-20 overflow-hidden animate-scale-in"
                    style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-default)', boxShadow: 'var(--shadow-md)' }}>
                    <div className="p-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: 'var(--interactive-primary)' }}>
                          {(user?.name ?? 'U')[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{user?.name ?? t('shell.user')}</p>
                          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user?.email ?? ''}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-1">
                      <Link href="/settings" onClick={() => setAvatarOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-[var(--radius-sm)] transition-colors hover:bg-[var(--surface-sunken)]"
                        style={{ color: 'var(--text-secondary)' }}>
                        <Settings size={15} aria-hidden /> {t('shell.settings')}
                      </Link>
                      {/* Language switcher — mobile-only row (desktop uses the topbar chip) */}
                      <div className="md:hidden flex items-center justify-between px-3 py-2 text-sm rounded-[var(--radius-sm)]"
                        style={{ color: 'var(--text-secondary)' }}>
                        <span className="flex items-center gap-2.5"><Globe size={15} aria-hidden />{t('shell.language') || 'اللغة'}</span>
                        <LanguageSwitcher />
                      </div>
                      <button onClick={() => applyTheme(!dark)}
                        className="flex items-center justify-between w-full px-3 py-2.5 text-sm rounded-[var(--radius-sm)] transition-colors hover:bg-[var(--surface-sunken)]"
                        style={{ color: 'var(--text-secondary)' }}>
                        <span className="flex items-center gap-2.5">{dark ? <Moon size={15} aria-hidden /> : <Sun size={15} aria-hidden />} {t('shell.dark_mode')}</span>
                        <span className="relative inline-block w-9 h-5 rounded-full transition-colors" style={{ background: dark ? 'var(--interactive-primary)' : 'var(--color-neutral-300)' }} aria-hidden>
                          <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all" style={{ insetInlineStart: dark ? 18 : 2 }} />
                        </span>
                      </button>
                      <div className="h-px mx-2 my-1" style={{ background: 'var(--border-default)' }} />
                      <button onClick={signOut}
                        className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm rounded-[var(--radius-sm)] transition-colors"
                        style={{ color: 'var(--color-error-600)' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-error-50)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                        <LogOut size={15} aria-hidden />{t('shell.logout')}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content — bottom padding clears the mobile bottom nav */}
        <main className="flex-1 overflow-auto pb-16 lg:pb-0" style={{ background: 'var(--surface-page)' }}>
          {children}
        </main>
      </div>

      {/* ── Mobile bottom nav: 4 top-level + More (drawer) ── */}
      <nav className="fixed bottom-0 inset-inline-0 start-0 end-0 z-40 lg:hidden border-t"
        style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-default)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label="Bottom navigation">
        <div className="flex items-stretch justify-around h-14 px-1">
          {NAV_MOBILE.map(item => {
            const active = isActive(item.href)
            return (
              <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined}
                className="relative flex flex-col items-center justify-center gap-0.5 flex-1 min-w-[44px]"
                style={{ color: active ? 'var(--nav-item-fg-active)' : 'var(--text-muted)' }}>
                <span className="relative">
                  <item.icon size={20} strokeWidth={active ? 2.2 : 1.8} aria-hidden />
                  {item.href === '/orders' && newOrdersCount > 0 && (
                    <span className="absolute -top-1 -end-1.5 min-w-[14px] h-3.5 px-0.5 rounded-full text-[8px] font-black text-white flex items-center justify-center"
                      style={{ background: 'var(--color-error-500)' }}>{newOrdersCount > 9 ? '9+' : newOrdersCount}</span>
                  )}
                </span>
                <span className="text-[10px] font-medium leading-none">{t(`nav.${item.key}`)}</span>
              </Link>
            )
          })}
          <button onClick={() => setMobileOpen(true)} aria-label={t('shell.settings')}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 min-w-[44px]"
            style={{ color: 'var(--text-muted)' }}>
            <LayoutGrid size={20} strokeWidth={1.8} aria-hidden />
            <span className="text-[10px] font-medium leading-none">{sec('setup')}</span>
          </button>
        </div>
      </nav>

      {/* ── Credits modal (preserved) ── */}
      {creditsOpen && (
        <div className="c-overlay" onClick={e => { if (e.target === e.currentTarget) setCreditsOpen(false) }}>
          <div className="c-modal c-modal--sm" role="dialog" aria-labelledby="credits-title" style={{ fontFamily: 'var(--font-arabic)' }}>
            <div className="flex items-center justify-between mb-2">
              <h3 id="credits-title" className="c-modal__title" style={{ marginBottom: 0 }}>{t('credits.title')}</h3>
              <button onClick={() => setCreditsOpen(false)} aria-label="Close"
                className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center hover:bg-[var(--surface-sunken)]"
                style={{ color: 'var(--text-muted)' }}><X size={16} aria-hidden /></button>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{t('credits.subtitle')}</p>
            <div className="p-3 rounded-[var(--radius-md)] text-sm font-semibold text-center mb-4" style={{ background: 'var(--surface-sunken)', color: 'var(--text-primary)' }}>
              {t('credits.current_balance')} <span style={{ color: 'var(--text-link)' }} className="font-bold">{t('shell.credits', { count: 0 })}</span>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[{ c: 1000, p: '990 دج' }, { c: 2000, p: '1,990 دج' }, { c: 3000, p: '2,990 دج' }].map(pkg => (
                <button key={pkg.c} className="p-3 border rounded-[var(--radius-lg)] text-center transition-colors"
                  style={{ borderColor: 'var(--border-default)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary-300)'; (e.currentTarget as HTMLElement).style.background = 'var(--color-primary-50)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                  <p className="font-bold text-base" style={{ color: 'var(--text-link)', fontVariantNumeric: 'tabular-nums' }}>{pkg.c.toLocaleString()}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{t('credits.unit')}</p>
                  <p className="text-xs font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>{pkg.p}</p>
                </button>
              ))}
            </div>
            <button className="c-btn c-btn--primary w-full">{t('credits.continue')}</button>
          </div>
        </div>
      )}

      {/* ── New store modal (preserved) ── */}
      {newStoreModalOpen && (
        <div className="c-overlay" onClick={e => { if (e.target === e.currentTarget) setNewStoreModalOpen(false) }}>
          <div className="c-modal c-modal--sm" role="dialog" aria-labelledby="newstore-title" style={{ fontFamily: 'var(--font-arabic)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 id="newstore-title" className="c-modal__title" style={{ marginBottom: 0 }}>{t('new_store.title')}</h3>
              <button onClick={() => setNewStoreModalOpen(false)} aria-label="Close"
                className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center hover:bg-[var(--surface-sunken)]"
                style={{ color: 'var(--text-muted)' }}><X size={16} aria-hidden /></button>
            </div>
            <form onSubmit={handleCreateStore} className="space-y-4">
              <div className="c-field">
                <label className="c-label" htmlFor="ns-ar">{t('new_store.name_ar')} <span className="req">*</span></label>
                <input id="ns-ar" type="text" required value={newStoreNameAr}
                  onChange={e => setNewStoreNameAr(e.target.value)} placeholder={t('new_store.name_ar_ph')} className="c-input" />
              </div>
              <div className="c-field">
                <label className="c-label" htmlFor="ns-fr">{t('new_store.name_fr')} <span className="req">*</span></label>
                <input id="ns-fr" type="text" required value={newStoreName}
                  onChange={e => setNewStoreName(e.target.value)} placeholder="Ex: Elegance Store DZ" className="c-input" dir="ltr" />
              </div>
              <div className="c-field">
                <label className="c-label" htmlFor="ns-ph">{t('new_store.phone')}</label>
                <input id="ns-ph" type="tel" value={newStorePhone}
                  onChange={e => setNewStorePhone(e.target.value)} placeholder="0555 xx xx xx" className="c-input c-input--numeric" />
              </div>
              {newStoreError && (
                <div role="alert" className="rounded-[var(--radius-md)] p-3 text-xs border"
                  style={{ background: 'var(--color-error-50)', borderColor: 'var(--color-error-100)', color: 'var(--color-error-700)' }}>
                  {newStoreError}
                </div>
              )}
              <div className="c-modal__footer" style={{ marginTop: 'var(--space-4)' }}>
                <button type="button" onClick={() => setNewStoreModalOpen(false)} className="c-btn c-btn--secondary">
                  {t('new_store.cancel')}
                </button>
                <button type="submit" disabled={isSubmittingNewStore} className={`c-btn c-btn--primary ${isSubmittingNewStore ? 'is-loading' : ''}`}>
                  {isSubmittingNewStore ? t('new_store.creating') : t('new_store.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
