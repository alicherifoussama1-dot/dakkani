'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, Package, ShoppingCart, Users, Navigation2,
  Phone, BarChart2, GraduationCap, CreditCard, ChevronDown,
  ChevronRight, Menu, X, LogOut, Settings, Bell, Youtube,
  HelpCircle, Sun, Moon, Globe, User, Store, ExternalLink,
  Coins, Star, ShieldOff, Plus, Loader2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { slugify } from '@/lib/utils/format'

// ── Nav structure ─────────────────────────────────────────
const NAV_MAIN = [
  { href: '/dashboard',      label: 'الرئيسية',    icon: Home },
  { href: '/orders',         label: 'الطلبات',     icon: ShoppingCart },
  { href: '/products',       label: 'المنتجات',    icon: Package },
  { href: '/store-builder',  label: 'مُنشئ المتجر', icon: Store, badge: 'جديد' },
  { href: '/customers',      label: 'الزبائن',     icon: Users },
  { href: '/analytics',      label: 'الإحصائيات', icon: BarChart2 },
  { href: '/reviews',        label: 'التقييمات',   icon: Star },
  { href: '/blacklist',      label: 'القائمة السوداء', icon: ShieldOff },
  { href: '/landing-pages',  label: 'صفحات الهبوط', icon: Globe },
  { href: '/tracking',       label: 'التتبع',      icon: Navigation2 },
]
const NAV_FEATURES = [
  { href: '/confirmili',    label: 'Confirmili',  icon: Phone,         badge: 'جديد' },
  { href: '/google-sheets', label: 'قوقل شيت',    icon: Globe,         badge: 'جديد' },
  { href: '/justad',        label: 'JustAd',       icon: BarChart2 },
  { href: '/learn',         label: 'تعلم',          icon: GraduationCap },
]
const NAV_BILLING = [
  { href: '/billing/plans', label: 'الفواتير والاشتراك', icon: CreditCard },
]

interface Props {
  children: React.ReactNode
  store?: { id: string; name: string; slug?: string; plan?: string; logo_url?: string } | null
  user?: { name?: string; email?: string; avatar?: string } | null
  newOrdersCount?: number
  allStores?: Array<{ id: string; name: string; slug: string; plan: string; logo_url?: string }>
}

export default function DashboardShell({ children, store, user, newOrdersCount = 0, allStores = [] }: Props) {
  const pathname = usePathname()
  const router   = useRouter()

  const [sidebarOpen,  setSidebarOpen]  = useState(true)
  const [mobileOpen,   setMobileOpen]   = useState(false)
  const [avatarOpen,   setAvatarOpen]   = useState(false)
  const [creditsOpen,  setCreditsOpen]  = useState(false)
  const [billingOpen,  setBillingOpen]  = useState(false)
  const [darkMode,     setDarkMode]     = useState(false)
  const [notifOn,      setNotifOn]      = useState(true)
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false)
  const [newStoreModalOpen, setNewStoreModalOpen] = useState(false)
  const [newStoreName, setNewStoreName] = useState('')
  const [newStoreNameAr, setNewStoreNameAr] = useState('')
  const [newStorePhone, setNewStorePhone] = useState('')
  const [newStoreError, setNewStoreError] = useState('')
  const [isSubmittingNewStore, setIsSubmittingNewStore] = useState(false)

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
    if (!user) {
      router.push('/login')
      return
    }
    const newSlug = slugify(newStoreName) || `store-${Date.now()}`
    const newStoreId = crypto.randomUUID()

    const { error: insertErr } = await sb.from('stores').insert({
      id: newStoreId,
      owner_id: user.id,
      name: newStoreName,
      name_ar: newStoreNameAr,
      slug: newSlug,
      phone: newStorePhone || null,
      currency: 'DZD',
      plan: 'free',
      is_active: true,
    })

    if (insertErr) {
      if (insertErr.message.includes('unique')) {
        const randomSlug = newSlug + '-' + Math.random().toString(36).slice(2, 6)
        const { error: insertErr2 } = await sb.from('stores').insert({
          id: newStoreId,
          owner_id: user.id,
          name: newStoreName,
          name_ar: newStoreNameAr,
          slug: randomSlug,
          phone: newStorePhone || null,
          currency: 'DZD',
          plan: 'free',
          is_active: true,
        })
        if (insertErr2) {
          setNewStoreError(insertErr2.message)
          setIsSubmittingNewStore(false)
          return
        }
      } else {
        setNewStoreError(insertErr.message)
        setIsSubmittingNewStore(false)
        return
      }
    }

    document.cookie = `dakkani_active_store_id=${newStoreId}; path=/; max-age=31536000`
    setNewStoreModalOpen(false)
    setIsSubmittingNewStore(false)
    setNewStoreName('')
    setNewStoreNameAr('')
    setNewStorePhone('')
    window.location.href = '/dashboard'
  }

  // Close on route change
  useEffect(() => { setMobileOpen(false); setAvatarOpen(false) }, [pathname])

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  const signOut = async () => {
    const sb = createClient()
    await sb.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const NavItem = ({ item, count }: { item: { href: string; label: string; icon: any; badge?: string }; count?: number }) => {
    const active = isActive(item.href)
    return (
      <Link href={item.href} className={`sidebar-item ${active ? 'active' : ''}`}>
        <item.icon size={16} className="icon flex-shrink-0" />
        <span className="flex-1 truncate">{item.label}</span>
        {count && count > 0 ? (
          <span className="badge badge-red text-[10px] h-[18px] px-1.5">{count > 99 ? '99+' : count}</span>
        ) : item.badge ? (
          <span className="badge badge-blue text-[10px] h-[18px] px-1.5">{item.badge}</span>
        ) : null}
      </Link>
    )
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full" style={{ fontFamily: 'var(--font-arabic)' }}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b flex-shrink-0" style={{ borderColor: 'var(--color-sidebar-border)' }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-white text-sm" style={{ background: 'var(--color-accent)' }}>
          د
        </div>
        <span className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>دكاني</span>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5 scrollbar-none">
        {NAV_MAIN.map(item => (
          <NavItem key={item.href} item={item} count={item.href === '/orders' ? newOrdersCount : undefined} />
        ))}

        <div className="pt-3 pb-1 px-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
            الميزات
          </p>
        </div>
        {NAV_FEATURES.map(item => <NavItem key={item.href} item={item} />)}

        <div className="pt-3 pb-1 px-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
            الاشتراك
          </p>
        </div>
        <div>
          <button
            onClick={() => setBillingOpen(o => !o)}
            className={`sidebar-item w-full ${isActive('/billing') ? 'active' : ''}`}
          >
            <CreditCard size={16} className="icon flex-shrink-0" />
            <span className="flex-1 text-right truncate">الفواتير والاشتراك</span>
            <ChevronDown size={14} className={`transition-transform duration-200 ${billingOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--color-text-muted)' }} />
          </button>
          {billingOpen && (
            <div className="pr-6 py-0.5 space-y-0.5">
              <Link href="/billing/plans"   className={`sidebar-item text-sm ${isActive('/billing/plans') ? 'active' : ''}`}><ChevronRight size={12} className="flex-shrink-0" />الخطط</Link>
              <Link href="/billing/history" className={`sidebar-item text-sm ${isActive('/billing/history') ? 'active' : ''}`}><ChevronRight size={12} className="flex-shrink-0" />سجل الفواتير</Link>
            </div>
          )}
        </div>
        <NavItem item={{ href: '/settings', label: 'الإعدادات', icon: Settings }} />
      </div>

      {/* Bottom */}
      <div className="flex-shrink-0 border-t p-3 space-y-2" style={{ borderColor: 'var(--color-sidebar-border)' }}>
        {store && (
          <div className="relative">
            <button
              onClick={() => setStoreDropdownOpen(o => !o)}
              className="flex items-center justify-between w-full px-1.5 py-1.5 rounded-xl hover:bg-[#F8F9FA] transition-colors text-right"
            >
              <div className="flex items-center gap-2 min-w-0">
                {store.logo_url
                  ? <img src={store.logo_url} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0 border" style={{borderColor:'var(--color-border)'}} />
                  : <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{background:'var(--color-accent)'}}>{store.name[0]}</div>
                }
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>{store.name}</p>
                  {store.plan && <span className="badge badge-blue text-[10px] scale-90 origin-right">{store.plan}</span>}
                </div>
              </div>
              <ChevronDown size={14} className={`transition-transform duration-200 ${storeDropdownOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--color-text-muted)' }} />
            </button>

            {storeDropdownOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setStoreDropdownOpen(false)} />
                <div className="absolute bottom-full right-0 mb-1 w-full bg-white border rounded-xl shadow-lg z-40 overflow-hidden p-1" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="max-h-48 overflow-y-auto space-y-0.5">
                    {allStores.map(s => (
                      <button
                        key={s.id}
                        onClick={() => handleSwitchStore(s.id)}
                        className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-right text-xs transition-colors ${s.id === store.id ? 'bg-[#EBF5FF] text-[#0D6EFD] font-bold' : 'hover:bg-[#F8F9FA] text-[#444444]'}`}
                      >
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${s.id === store.id ? 'bg-[#0D6EFD] text-white' : 'bg-gray-100 text-gray-500'}`}>
                          {s.name[0]}
                        </div>
                        <span className="truncate flex-1">{s.name}</span>
                        {s.id === store.id && <span className="text-[10px] font-black text-[#0D6EFD]">✓</span>}
                      </button>
                    ))}
                  </div>
                  <div className="h-px bg-gray-100 my-1" />
                  <button
                    onClick={() => {
                      setNewStoreModalOpen(true)
                      setStoreDropdownOpen(false)
                    }}
                    className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-lg bg-[#EBF5FF] hover:bg-[#EBF5FF]/80 text-[#0D6EFD] font-bold text-xs transition-colors"
                  >
                    <Plus size={13} />
                    <span>إضافة متجر جديد</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        {user && (
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: 'var(--color-accent)' }}>
              {(user.name ?? 'U')[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{user.name}</p>
              <p className="text-[11px] truncate" style={{ color: 'var(--color-text-muted)' }}>{user.email}</p>
            </div>
            <button onClick={signOut} className="p-1.5 rounded-md hover:bg-red-50 transition-colors" title="تسجيل الخروج">
              <LogOut size={14} style={{ color: '#DC3545' }} />
            </button>
          </div>
        )}
      </div>
    </div>
  )

  // Confirmili is a self-contained module with its own teal chrome + sidebar
  // (see ConfirmiliClient). Render it full-bleed without the Dakkani shell so
  // the design system takes over the whole screen. (After all hooks above.)
  if (pathname?.startsWith('/confirmili')) {
    return <div className="h-screen overflow-hidden">{children}</div>
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--color-bg-soft)' }}>
      {/* ── Desktop Sidebar ── */}
      <aside
        className="hidden lg:flex flex-col flex-shrink-0 h-full border-l transition-all duration-200 overflow-hidden"
        style={{
          width: sidebarOpen ? '240px' : '0px',
          backgroundColor: 'var(--color-sidebar-bg)',
          borderColor: 'var(--color-sidebar-border)',
        }}
      >
        <SidebarContent />
      </aside>

      {/* ── Mobile Drawer ── */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed top-0 right-0 h-full z-50 w-[240px] flex flex-col border-l lg:hidden animate-slide-right"
            style={{ backgroundColor: 'var(--color-sidebar-bg)', borderColor: 'var(--color-sidebar-border)' }}>
            <SidebarContent />
          </aside>
        </>
      )}

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex-shrink-0 flex items-center justify-between px-4 border-b z-30"
          style={{ height: '56px', backgroundColor: 'var(--color-topbar-bg)', borderColor: 'var(--color-topbar-border)' }}>
          {/* Right side (RTL) */}
          <div className="flex items-center gap-2">
            <button onClick={() => { setSidebarOpen(o => !o); setMobileOpen(o => !o) }}
              className="p-2 rounded-md hover:bg-[#F8F9FA] transition-colors lg:flex hidden">
              <Menu size={18} style={{ color: 'var(--color-text-secondary)' }} />
            </button>
            <button onClick={() => setMobileOpen(o => !o)}
              className="p-2 rounded-md hover:bg-[#F8F9FA] transition-colors lg:hidden">
              <Menu size={18} style={{ color: 'var(--color-text-secondary)' }} />
            </button>
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-white text-sm" style={{ background: 'var(--color-accent)' }}>د</div>
              <span className="font-bold text-sm hidden sm:block" style={{ color: 'var(--color-text-primary)' }}>دكاني</span>
            </Link>
            {store?.slug ? (
              <a href={`/store/${store.slug}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 h-8 rounded-full border text-xs sm:text-sm font-semibold transition-all hover:bg-[#F8F9FA]"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                title="زيارة المتجر">
                <ExternalLink size={13} />
                <span>المتجر</span>
              </a>
            ) : (
              <Link href="/settings"
                className="flex items-center gap-1.5 px-3 h-8 rounded-full border text-xs sm:text-sm font-semibold transition-all hover:bg-[#F8F9FA]"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                title="أضف رابط متجرك في الإعدادات لزيارته">
                <ExternalLink size={13} />
                <span>المتجر</span>
              </Link>
            )}
          </div>

          {/* Left side (RTL) */}
          <div className="flex items-center gap-1.5">
            {/* Credits */}
            <button onClick={() => setCreditsOpen(true)}
              className="flex items-center gap-1.5 px-3 h-8 rounded-full border text-sm font-medium transition-colors hover:bg-[#F8F9FA]"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
              <Coins size={13} />
              <span>0 كريدت</span>
            </button>
            {/* Store visit link moved to the right side */}
            <Link href="/learn"
              className="p-2 rounded-md hover:bg-[#F8F9FA] transition-colors" title="تعلم">
              <Youtube size={16} style={{ color: '#FF0000' }} />
            </Link>
            <a href="https://wa.me/213000000000?text=مرحبا، أحتاج مساعدة في دكاني" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 h-8 rounded-md border text-xs font-medium hover:bg-[#F8F9FA] transition-colors"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
              <HelpCircle size={13} />
              <span className="hidden sm:block">مساعدة؟</span>
            </a>
            {store?.plan && (
              <span className="badge badge-blue px-2.5 h-7 text-xs">{store.plan}</span>
            )}

            {/* Avatar */}
            <div className="relative">
              <button onClick={() => setAvatarOpen(o => !o)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold transition-all hover:ring-2 hover:ring-blue-200"
                style={{ background: 'var(--color-accent)' }}>
                {(user?.name ?? 'U')[0]}
              </button>

              {avatarOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setAvatarOpen(false)} />
                  <div className="absolute left-0 top-full mt-1 w-56 bg-white border rounded-xl shadow-md z-20 overflow-hidden animate-scale-in"
                    style={{ borderColor: 'var(--color-border)' }}>
                    <div className="p-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: 'var(--color-accent)' }}>
                          {(user?.name ?? 'U')[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>{user?.name ?? 'المستخدم'}</p>
                          <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{user?.email ?? ''}</p>
                          {store?.plan && <span className="badge badge-blue text-[10px] mt-0.5">{store.plan}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="p-1">
                      {[
                        { label: 'الملف الشخصي', href: '/settings', icon: User },
                        { label: 'الإعدادات', href: '/settings', icon: Settings },
                      ].map(item => (
                        <Link key={item.href} href={item.href} onClick={() => setAvatarOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-[#F8F9FA] transition-colors"
                          style={{ color: 'var(--color-text-secondary)' }}>
                          <item.icon size={14} /> {item.label}
                        </Link>
                      ))}
                      <div className="flex items-center justify-between px-3 py-2">
                        <span className="text-sm" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-arabic)' }}>الإشعارات</span>
                        <button onClick={() => setNotifOn(o => !o)} className="toggle-wrap">
                          <span className={`inline-block w-9 h-5 rounded-full transition-colors duration-200 ${notifOn ? 'bg-[#0D6EFD]' : 'bg-[#DEE2E6]'}`}>
                            <span className={`block w-4 h-4 bg-white rounded-full shadow mt-0.5 transition-transform duration-200 ${notifOn ? 'translate-x-[-16px] mr-0.5' : 'mr-0.5'}`} />
                          </span>
                        </button>
                      </div>
                      <div className="flex items-center justify-between px-3 py-2">
                        <span className="text-sm flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-arabic)' }}>
                          {darkMode ? <Moon size={14}/> : <Sun size={14}/>} الوضع الليلي
                        </span>
                        <input type="checkbox" checked={darkMode} onChange={() => setDarkMode(o => !o)} className="w-4 h-4 accent-blue-500" />
                      </div>
                      <div className="h-px mx-2 my-1" style={{ background: 'var(--color-border)' }} />
                      <button onClick={signOut}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm rounded-lg hover:bg-red-50 transition-colors"
                        style={{ color: '#DC3545' }}>
                        <LogOut size={14} />تسجيل الخروج
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto" style={{ backgroundColor: 'var(--color-bg-soft)' }}>
          {children}
        </main>
      </div>

      {/* Credits Modal */}
      {creditsOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setCreditsOpen(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-xl z-50 overflow-hidden animate-scale-in" dir="rtl">
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="font-bold text-base" style={{ fontFamily: 'var(--font-arabic)', color: 'var(--color-text-primary)' }}>
                اشتري كريدت
              </h3>
              <button onClick={() => setCreditsOpen(false)} className="p-1.5 rounded-md hover:bg-[#F8F9FA]">
                <X size={16} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-arabic)' }}>
                اختر باقة وادفع دون تغيير اشتراكك الحالي
              </p>
              <div className="p-3 rounded-lg text-sm font-semibold text-center" style={{ background: 'var(--color-bg-soft)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-arabic)' }}>
                الرصيد الحالي: <span className="text-accent font-bold">0 كريدت</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[{c:1000,p:'990 دج'},{c:2000,p:'1,990 دج'},{c:3000,p:'2,990 دج'}].map(pkg => (
                  <button key={pkg.c} className="p-3 border rounded-xl text-center hover:border-blue-400 hover:bg-[#EBF5FF] transition-all" style={{ borderColor: 'var(--color-border)' }}>
                    <p className="font-bold text-base" style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-primary)' }}>{pkg.c.toLocaleString()}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-arabic)' }}>كريدت</p>
                    <p className="text-xs font-semibold mt-1" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-primary)' }}>{pkg.p}</p>
                  </button>
                ))}
              </div>
              <button className="btn btn-primary w-full" style={{ fontFamily: 'var(--font-arabic)' }}>متابعة الدفع</button>
            </div>
          </div>
        </>
      )}

      {/* New Store Modal */}
      {newStoreModalOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50 animate-fade-in" onClick={() => setNewStoreModalOpen(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-3xl shadow-xl z-50 overflow-hidden animate-scale-in" dir="rtl" style={{ fontFamily: 'var(--font-arabic)' }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="font-bold text-base text-[#111111]">إنشاء متجر جديد</h3>
              <button onClick={() => setNewStoreModalOpen(false)} className="p-1.5 rounded-md hover:bg-[#F8F9FA]">
                <X size={16} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            </div>
            <form onSubmit={handleCreateStore}>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-[#111111]">اسم المتجر بالعربية *</label>
                  <input
                    type="text"
                    required
                    value={newStoreNameAr}
                    onChange={e => setNewStoreNameAr(e.target.value)}
                    placeholder="مثال: متجر الأناقة الجزائري"
                    className="w-full border border-[#EBEBEB] focus:border-[#0D6EFD] rounded-xl px-3 py-2 text-sm outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5 text-[#111111]">اسم المتجر بالفرنسية / الإنجليزية *</label>
                  <input
                    type="text"
                    required
                    value={newStoreName}
                    onChange={e => setNewStoreName(e.target.value)}
                    placeholder="Ex: Elegance Store DZ"
                    className="w-full border border-[#EBEBEB] focus:border-[#0D6EFD] rounded-xl px-3 py-2 text-sm outline-none transition"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5 text-[#111111]">رقم الهاتف (اختياري)</label>
                  <input
                    type="tel"
                    value={newStorePhone}
                    onChange={e => setNewStorePhone(e.target.value)}
                    placeholder="0555 xx xx xx"
                    className="w-full border border-[#EBEBEB] focus:border-[#0D6EFD] rounded-xl px-3 py-2 text-sm outline-none transition"
                  />
                </div>

                {newStoreError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-xs">
                    ⚠️ {newStoreError}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setNewStoreModalOpen(false)}
                    className="w-1/3 border border-[#EBEBEB] text-[#444444] font-bold py-2.5 rounded-xl hover:bg-[#F9F9F9] transition text-xs"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingNewStore}
                    className="flex-1 bg-gradient-to-r from-[#0D6EFD] to-[#0B5ED7] hover:from-[#0B5ED7] hover:to-[#0B5ED7] text-white font-black py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 text-xs"
                  >
                    {isSubmittingNewStore ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />جارٍ الإنشاء...</>
                    ) : (
                      '🚀 أنشئ المتجر الآن'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
