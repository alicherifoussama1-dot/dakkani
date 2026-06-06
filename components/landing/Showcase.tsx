'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence, useInView, useReducedMotion } from 'framer-motion'

const TABS = [
  { id: 'store', label: 'المتجر', icon: '🏪' },
  { id: 'dashboard', label: 'لوحة التحكم', icon: '📊' },
  { id: 'confirmili', label: 'Confirmili', icon: '✅' },
]

function StoreMockup() {
  return (
    <div style={{
      background: '#fff', borderRadius: 16, overflow: 'hidden',
      boxShadow: '0 24px 64px rgba(0,0,0,0.12)',
      border: '1px solid #E2E8F0',
    }}>
      {/* Header bar */}
      <div style={{
        background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
        padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{
          fontFamily: 'var(--font-tajawal)', fontWeight: 900, fontSize: 18, color: '#fff',
        }}>متجر الأناقة</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {['البيت','المنتجات','اتصل بنا'].map(l => (
            <span key={l} style={{
              fontFamily: 'var(--font-tajawal)', fontSize: 11, color: 'rgba(255,255,255,0.8)',
              background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: 6,
            }}>{l}</span>
          ))}
        </div>
      </div>

      {/* Hero banner */}
      <div style={{
        background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
        padding: '24px 20px', textAlign: 'center',
      }}>
        <div style={{
          fontFamily: 'var(--font-tajawal)', fontWeight: 800, fontSize: 20, color: '#0F172A', marginBottom: 6,
        }}>تخفيضات الصيف 🌞</div>
        <div style={{ fontSize: 12, color: '#475569', fontFamily: 'var(--font-tajawal)', marginBottom: 12 }}>
          خصم 30% على كل المنتجات
        </div>
        <div style={{
          display: 'inline-block', background: '#4F46E5', color: '#fff',
          padding: '6px 20px', borderRadius: 8, fontSize: 12, fontFamily: 'var(--font-tajawal)', fontWeight: 600,
        }}>تسوّق الآن</div>
      </div>

      {/* Products grid */}
      <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        {[
          { name: 'فستان صيفي', price: '3,200 دج', color: '#FDF2F8', emoji: '👗' },
          { name: 'حذاء رياضي', price: '6,500 دج', color: '#EEF2FF', emoji: '👟' },
          { name: 'حقيبة يد', price: '4,800 دج', color: '#ECFDF5', emoji: '👜' },
        ].map((p, i) => (
          <div key={i} style={{
            background: p.color, borderRadius: 10, padding: 12, textAlign: 'center',
            border: '1px solid rgba(0,0,0,0.04)',
          }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>{p.emoji}</div>
            <div style={{ fontFamily: 'var(--font-tajawal)', fontSize: 11, fontWeight: 600, color: '#0F172A', marginBottom: 2 }}>
              {p.name}
            </div>
            <div style={{ fontFamily: 'var(--font-inter)', fontSize: 10, color: '#4F46E5', fontWeight: 700 }}>
              {p.price}
            </div>
            <div style={{
              marginTop: 6, background: '#4F46E5', color: '#fff',
              borderRadius: 5, padding: '3px 0', fontSize: 9,
              fontFamily: 'var(--font-tajawal)',
            }}>اشتري</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DashboardMockup() {
  return (
    <div style={{
      background: '#F8FAFC', borderRadius: 16, overflow: 'hidden',
      boxShadow: '0 24px 64px rgba(0,0,0,0.12)',
      border: '1px solid #E2E8F0',
    }}>
      {/* Topbar */}
      <div style={{
        background: '#fff', padding: '12px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid #E2E8F0',
      }}>
        <span style={{ fontFamily: 'var(--font-tajawal)', fontWeight: 800, fontSize: 15, color: '#4F46E5' }}>
          دكاني
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          {['🔔','⚙️'].map((ic, i) => (
            <div key={i} style={{
              width: 28, height: 28, borderRadius: 8, background: '#F8FAFC',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
            }}>{ic}</div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex' }}>
        {/* Sidebar */}
        <div style={{
          width: 80, background: '#fff', borderLeft: '1px solid #E2E8F0',
          padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          {[
            { icon: '📊', label: 'الرئيسية', active: true },
            { icon: '📦', label: 'المنتجات', active: false },
            { icon: '🛒', label: 'الطلبات', active: false },
            { icon: '👥', label: 'العملاء', active: false },
          ].map((item, i) => (
            <div key={i} style={{
              padding: '8px 4px', textAlign: 'center',
              background: item.active ? '#EEF2FF' : 'transparent',
              borderRight: item.active ? '2px solid #4F46E5' : '2px solid transparent',
            }}>
              <div style={{ fontSize: 16 }}>{item.icon}</div>
              <div style={{
                fontSize: 8, fontFamily: 'var(--font-tajawal)', color: item.active ? '#4F46E5' : '#94A3B8',
                marginTop: 2,
              }}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, padding: 16 }}>
          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            {[
              { label: 'المبيعات اليوم', val: '18,500 دج', up: '+12%', color: '#ECFDF5' },
              { label: 'الطلبات الجديدة', val: '7 طلبات', up: '+3', color: '#EEF2FF' },
              { label: 'الزوار', val: '142', up: '+8%', color: '#FDF2F8' },
              { label: 'التحويل', val: '4.9%', up: '+0.3%', color: '#FFFBEB' },
            ].map((s, i) => (
              <div key={i} style={{
                background: s.color, borderRadius: 8, padding: 10,
                border: '1px solid rgba(0,0,0,0.04)',
              }}>
                <div style={{ fontFamily: 'var(--font-tajawal)', fontSize: 9, color: '#475569', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontFamily: 'var(--font-inter)', fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{s.val}</div>
                <div style={{ fontFamily: 'var(--font-inter)', fontSize: 9, color: '#059669', marginTop: 2 }}>{s.up} ▲</div>
              </div>
            ))}
          </div>

          {/* Chart bar mockup */}
          <div style={{
            background: '#fff', borderRadius: 10, padding: 12,
            border: '1px solid #E2E8F0',
          }}>
            <div style={{ fontFamily: 'var(--font-tajawal)', fontSize: 10, color: '#475569', marginBottom: 8 }}>المبيعات الأسبوعية</div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 40 }}>
              {[30, 55, 40, 70, 45, 85, 60].map((h, i) => (
                <div key={i} style={{
                  flex: 1, height: `${h}%`,
                  background: i === 5
                    ? 'linear-gradient(180deg, #4F46E5, #818CF8)'
                    : '#E0E7FF',
                  borderRadius: 3,
                }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ConfirmiliMockup() {
  return (
    <div style={{
      background: '#0F172A', borderRadius: 16, overflow: 'hidden',
      boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
      border: '1px solid #1E293B',
    }}>
      {/* Header */}
      <div style={{
        background: '#1E293B', padding: '12px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid #334155',
      }}>
        <span style={{ fontFamily: 'var(--font-tajawal)', fontWeight: 800, fontSize: 15, color: '#818CF8' }}>
          Confirmili
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          {['الطلبات','المنتجات','الإعدادات'].map(t => (
            <span key={t} style={{
              fontFamily: 'var(--font-tajawal)', fontSize: 10,
              padding: '3px 8px', borderRadius: 5,
              background: t === 'الطلبات' ? 'rgba(129,140,248,0.15)' : 'transparent',
              color: t === 'الطلبات' ? '#818CF8' : '#64748B',
            }}>{t}</span>
          ))}
        </div>
      </div>

      {/* Orders table */}
      <div style={{ padding: 12 }}>
        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr',
          gap: 8, padding: '6px 8px',
          fontFamily: 'var(--font-tajawal)', fontSize: 9, color: '#475569',
          borderBottom: '1px solid #1E293B', marginBottom: 4,
        }}>
          <span>رقم الطلب</span>
          <span>العميل</span>
          <span>المبلغ</span>
          <span>الحالة</span>
        </div>

        {[
          { num: 'DK-0041', name: 'فاطمة الزهراء', price: '4,200', status: 'مؤكدة', color: '#22C55E' },
          { num: 'DK-0040', name: 'محمد أمين', price: '3,500', status: 'معلقة', color: '#80BCBD' },
          { num: 'DK-0039', name: 'سارة عمري', price: '1,800', status: 'فاشلة 01', color: '#FFA447' },
          { num: 'DK-0038', name: 'كريم بلال', price: '5,600', status: 'مؤكدة', color: '#22C55E' },
        ].map((row, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr',
            gap: 8, padding: '8px 8px',
            borderBottom: '1px solid #1E293B',
            background: i === 1 ? 'rgba(129,140,248,0.05)' : 'transparent',
          }}>
            <span style={{ fontFamily: 'var(--font-inter)', fontSize: 9, color: '#94A3B8' }}>{row.num}</span>
            <span style={{ fontFamily: 'var(--font-tajawal)', fontSize: 9, color: '#CBD5E1' }}>{row.name}</span>
            <span style={{ fontFamily: 'var(--font-inter)', fontSize: 9, color: '#94A3B8' }}>{row.price}</span>
            <span style={{
              fontFamily: 'var(--font-tajawal)', fontSize: 8,
              background: row.color + '22', color: row.color,
              padding: '2px 6px', borderRadius: 4, display: 'inline-flex', alignItems: 'center',
            }}>{row.status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const MOCKUPS: Record<string, React.ReactNode> = {
  store: <StoreMockup />,
  dashboard: <DashboardMockup />,
  confirmili: <ConfirmiliMockup />,
}

export default function Showcase() {
  const [active, setActive] = useState('store')
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const prefersReduced = useReducedMotion()

  return (
    <section id="showcase" ref={ref} style={{
      background: '#F8FAFC', padding: '100px 0',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#EEF2FF', borderRadius: 100, padding: '6px 16px', marginBottom: 16,
          }}>
            <span style={{ fontFamily: 'var(--font-tajawal)', fontSize: 13, fontWeight: 600, color: '#4F46E5' }}>
              ✦ معاينة المنصة
            </span>
          </div>
          <h2 style={{
            fontFamily: 'var(--font-tajawal)', fontWeight: 900,
            fontSize: 'clamp(28px,4vw,44px)', color: '#0F172A',
            lineHeight: 1.3, margin: 0,
          }}>
            كل أدواتك في مكان واحد
          </h2>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.1, duration: 0.5 }}
          style={{
            display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 40,
            flexWrap: 'wrap',
          }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 24px', borderRadius: 50,
                border: active === tab.id ? '1.5px solid #4F46E5' : '1.5px solid #E2E8F0',
                background: active === tab.id ? '#4F46E5' : '#fff',
                color: active === tab.id ? '#fff' : '#475569',
                fontFamily: 'var(--font-tajawal)', fontWeight: 600, fontSize: 14,
                cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: active === tab.id ? '0 4px 14px rgba(79,70,229,0.25)' : 'none',
              }}>
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2, duration: 0.55 }}
          style={{ maxWidth: 760, margin: '0 auto', position: 'relative' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={prefersReduced ? {} : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReduced ? {} : { opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
              {MOCKUPS[active]}
            </motion.div>
          </AnimatePresence>

          {/* Floating accent elements */}
          <motion.div
            animate={prefersReduced ? {} : { y: [0, -8, 0], rotate: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            style={{
              position: 'absolute', top: -20, left: -20,
              width: 48, height: 48, borderRadius: 14,
              background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, boxShadow: '0 8px 24px rgba(79,70,229,0.3)',
            }}>🚀</motion.div>

          <motion.div
            animate={prefersReduced ? {} : { y: [0, 10, 0], rotate: [0, -5, 0] }}
            transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut', delay: 1 }}
            style={{
              position: 'absolute', bottom: -16, right: -16,
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, #059669, #10B981)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, boxShadow: '0 8px 20px rgba(5,150,105,0.3)',
            }}>💰</motion.div>
        </motion.div>
      </div>
    </section>
  )
}
