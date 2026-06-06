'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence, useInView, useReducedMotion } from 'framer-motion'

const TABS = [
  { id: 'store',      label: 'المتجر',       icon: '🏪', desc: 'واجهة المتجر التي يراها عملاؤك' },
  { id: 'dashboard',  label: 'لوحة التحكم',  icon: '📊', desc: 'تتبع مبيعاتك وإدارة منتجاتك' },
  { id: 'confirmili', label: 'Confirmili',   icon: '✅', desc: 'إدارة الطلبات وتأكيد التوصيل' },
]

/* ─── Store Mockup ─── */
function StoreMockup() {
  return (
    <div style={{
      background: '#fff', borderRadius: 20, overflow: 'hidden',
      boxShadow: '0 24px 80px rgba(0,0,0,0.14)',
      border: '1px solid #E2E8F0',
    }}>
      {/* Browser chrome */}
      <div style={{
        background: '#F8FAFC', padding: '10px 14px',
        display: 'flex', alignItems: 'center', gap: 8,
        borderBottom: '1px solid #E2E8F0',
      }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['#FF5F57','#FEBC2E','#28C840'].map(c => (
            <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
          ))}
        </div>
        <div style={{
          flex: 1, background: '#fff', borderRadius: 6, height: 22,
          display: 'flex', alignItems: 'center', padding: '0 10px',
          border: '1px solid #E2E8F0', gap: 6,
        }}>
          <svg width="10" height="10" viewBox="0 0 16 16" fill="#94A3B8">
            <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 14.4C4.5 14.4 1.6 11.5 1.6 8S4.5 1.6 8 1.6s6.4 2.9 6.4 6.4-2.9 6.4-6.4 6.4z"/>
          </svg>
          <span style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'var(--font-inter)' }}>
            elegance.dakkani.dz
          </span>
        </div>
      </div>

      {/* Store header */}
      <div style={{
        background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
        padding: '18px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{
          fontFamily: 'var(--font-tajawal)', fontWeight: 900, fontSize: 18, color: '#fff',
        }}>متجر الأناقة</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {['البيت','المنتجات','اتصل بنا'].map(l => (
            <span key={l} style={{
              fontFamily: 'var(--font-tajawal)', fontSize: 10, color: 'rgba(255,255,255,0.75)',
              background: 'rgba(255,255,255,0.12)', padding: '3px 9px', borderRadius: 6,
            }}>{l}</span>
          ))}
          <div style={{
            background: 'rgba(255,255,255,0.2)', borderRadius: 6,
            width: 28, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 12 }}>🛒</span>
          </div>
        </div>
      </div>

      {/* Hero banner */}
      <div style={{
        background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
        padding: '20px', textAlign: 'center',
      }}>
        <div style={{
          fontFamily: 'var(--font-tajawal)', fontWeight: 800, fontSize: 18,
          color: '#0F172A', marginBottom: 4,
        }}>تخفيضات الصيف 🌞</div>
        <div style={{ fontSize: 12, color: '#475569', fontFamily: 'var(--font-tajawal)', marginBottom: 12 }}>
          خصم 30% على كل المنتجات — توصيل مجاني
        </div>
        <div style={{
          display: 'inline-block', background: '#4F46E5', color: '#fff',
          padding: '7px 22px', borderRadius: 10, fontSize: 12,
          fontFamily: 'var(--font-tajawal)', fontWeight: 700,
        }}>تسوّق الآن</div>
      </div>

      {/* Product grid */}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontFamily: 'var(--font-tajawal)', fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 10 }}>
          المنتجات الجديدة
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            { emoji: '👗', name: 'فستان صيفي', price: '3,200', og: '4,500', color: '#FDF2F8' },
            { emoji: '👟', name: 'حذاء رياضي', price: '6,500', og: '8,000', color: '#EEF2FF' },
            { emoji: '👜', name: 'حقيبة يد',   price: '4,800', og: '6,200', color: '#ECFDF5' },
          ].map((p, i) => (
            <div key={i} style={{
              background: p.color, borderRadius: 10, overflow: 'hidden',
              border: '1px solid rgba(0,0,0,0.04)',
            }}>
              <div style={{
                padding: '12px 8px 6px', textAlign: 'center',
                fontSize: 26,
              }}>{p.emoji}</div>
              <div style={{ padding: '0 8px 10px' }}>
                <div style={{
                  fontFamily: 'var(--font-tajawal)', fontSize: 10,
                  fontWeight: 600, color: '#0F172A', marginBottom: 2,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{p.name}</div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontFamily: 'var(--font-inter)', fontSize: 10, fontWeight: 700, color: '#4F46E5' }}>
                    {p.price}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-inter)', fontSize: 9,
                    color: '#94A3B8', textDecoration: 'line-through',
                  }}>{p.og}</span>
                </div>
                <div style={{
                  background: '#4F46E5', color: '#fff', borderRadius: 5,
                  padding: '3px 0', fontSize: 9, textAlign: 'center',
                  fontFamily: 'var(--font-tajawal)', fontWeight: 600,
                }}>أضف للسلة</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trust bar */}
      <div style={{
        borderTop: '1px solid #E2E8F0', padding: '10px 16px',
        display: 'flex', justifyContent: 'space-around',
      }}>
        {['🚚 توصيل سريع', '💵 دفع عند الاستلام', '↩️ إرجاع مجاني'].map(t => (
          <span key={t} style={{
            fontFamily: 'var(--font-tajawal)', fontSize: 9, color: '#64748B',
          }}>{t}</span>
        ))}
      </div>
    </div>
  )
}

/* ─── Dashboard Mockup ─── */
function DashboardMockup() {
  return (
    <div style={{
      background: '#F8FAFC', borderRadius: 20, overflow: 'hidden',
      boxShadow: '0 24px 80px rgba(0,0,0,0.14)',
      border: '1px solid #E2E8F0',
    }}>
      {/* Topbar */}
      <div style={{
        background: '#fff', padding: '12px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid #E2E8F0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'var(--font-tajawal)', fontWeight: 900, fontSize: 16, color: '#4F46E5' }}>دكاني</span>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4F46E5' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E' }} />
          <span style={{ fontFamily: 'var(--font-tajawal)', fontSize: 10, color: '#64748B' }}>متجر الأناقة</span>
          {['🔔','⚙️'].map((ic, i) => (
            <div key={i} style={{
              width: 28, height: 28, borderRadius: 8, background: '#F8FAFC',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
              border: '1px solid #E2E8F0',
            }}>{ic}</div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', height: 280 }}>
        {/* Sidebar */}
        <div style={{
          width: 84, background: '#fff', borderLeft: '1px solid #E2E8F0',
          padding: '10px 0', display: 'flex', flexDirection: 'column', gap: 2,
          flexShrink: 0,
        }}>
          {[
            { icon: '📊', label: 'الرئيسية', active: true  },
            { icon: '📦', label: 'المنتجات', active: false },
            { icon: '🛒', label: 'الطلبات',  active: false },
            { icon: '👥', label: 'العملاء',  active: false },
            { icon: '📈', label: 'التقارير', active: false },
          ].map((item, i) => (
            <div key={i} style={{
              padding: '8px 4px', textAlign: 'center',
              background: item.active ? '#EEF2FF' : 'transparent',
              borderRight: item.active ? '2px solid #4F46E5' : '2px solid transparent',
            }}>
              <div style={{ fontSize: 17 }}>{item.icon}</div>
              <div style={{
                fontSize: 8, fontFamily: 'var(--font-tajawal)',
                color: item.active ? '#4F46E5' : '#94A3B8', marginTop: 2, fontWeight: item.active ? 700 : 400,
              }}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* Main */}
        <div style={{ flex: 1, padding: '14px', overflowY: 'auto' }}>
          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            {[
              { label: 'المبيعات اليوم', val: '18,500 دج', up: '+12%', color: '#ECFDF5', c: '#059669' },
              { label: 'الطلبات الجديدة', val: '7 طلبات',  up: '+3',   color: '#EEF2FF', c: '#4F46E5' },
              { label: 'الزوار',          val: '142',      up: '+8%',  color: '#FDF2F8', c: '#EC4899' },
              { label: 'معدل التحويل',    val: '4.9%',     up: '+0.3%',color: '#FFFBEB', c: '#D97706' },
            ].map((s, i) => (
              <div key={i} style={{
                background: s.color, borderRadius: 10, padding: '10px',
                border: '1px solid rgba(0,0,0,0.04)',
              }}>
                <div style={{ fontFamily: 'var(--font-tajawal)', fontSize: 9, color: '#475569', marginBottom: 3 }}>{s.label}</div>
                <div style={{ fontFamily: 'var(--font-inter)', fontSize: 14, fontWeight: 800, color: '#0F172A', marginBottom: 2 }}>{s.val}</div>
                <div style={{ fontFamily: 'var(--font-inter)', fontSize: 9, color: s.c, fontWeight: 600 }}>{s.up} ▲</div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div style={{
            background: '#fff', borderRadius: 10, padding: '12px',
            border: '1px solid #E2E8F0', marginBottom: 8,
          }}>
            <div style={{ fontFamily: 'var(--font-tajawal)', fontSize: 10, fontWeight: 600, color: '#0F172A', marginBottom: 8 }}>
              المبيعات — آخر 7 أيام
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 50 }}>
              {[28, 55, 38, 72, 44, 85, 60].map((h, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{
                    height: `${h * 0.5}px`,
                    background: i === 5
                      ? 'linear-gradient(180deg, #4F46E5 0%, #818CF8 100%)'
                      : '#E0E7FF',
                    borderRadius: '3px 3px 0 0',
                    transition: 'background 0.2s',
                  }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              {['س','إ','ث','أ','خ','ج','سب'].map((d, i) => (
                <span key={i} style={{ fontFamily: 'var(--font-tajawal)', fontSize: 8, color: '#94A3B8' }}>{d}</span>
              ))}
            </div>
          </div>

          {/* Top products */}
          <div style={{
            background: '#fff', borderRadius: 10, padding: '10px 12px',
            border: '1px solid #E2E8F0',
          }}>
            <div style={{ fontFamily: 'var(--font-tajawal)', fontSize: 10, fontWeight: 600, color: '#0F172A', marginBottom: 7 }}>
              أكثر المنتجات مبيعاً
            </div>
            {[
              { name: 'فستان صيفي', sold: 48, pct: 80 },
              { name: 'حذاء رياضي', sold: 31, pct: 52 },
              { name: 'حقيبة يد',   sold: 24, pct: 40 },
            ].map((p, i) => (
              <div key={i} style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontFamily: 'var(--font-tajawal)', fontSize: 9, color: '#475569' }}>{p.name}</span>
                  <span style={{ fontFamily: 'var(--font-inter)', fontSize: 9, color: '#4F46E5', fontWeight: 700 }}>{p.sold}</span>
                </div>
                <div style={{ background: '#E0E7FF', borderRadius: 2, height: 4 }}>
                  <div style={{
                    width: `${p.pct}%`, height: '100%',
                    background: 'linear-gradient(90deg, #4F46E5, #818CF8)',
                    borderRadius: 2,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Confirmili Mockup ─── */
function ConfirmiliMockup() {
  return (
    <div style={{
      background: '#0F172A', borderRadius: 20, overflow: 'hidden',
      boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
      border: '1px solid #1E293B',
    }}>
      {/* Header */}
      <div style={{
        background: '#1E293B', padding: '12px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid #334155',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-tajawal)', fontWeight: 800, fontSize: 15, color: '#818CF8' }}>
            Confirmili
          </span>
          <span style={{ fontSize: 9, background: '#4F46E5', color: '#fff', padding: '2px 8px', borderRadius: 4, fontFamily: 'var(--font-tajawal)' }}>
            Pro
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {['الطلبات','المنتجات','الإعدادات'].map((t, i) => (
            <span key={t} style={{
              fontFamily: 'var(--font-tajawal)', fontSize: 10,
              padding: '3px 10px', borderRadius: 6,
              background: i === 0 ? 'rgba(129,140,248,0.15)' : 'transparent',
              color: i === 0 ? '#818CF8' : '#64748B',
            }}>{t}</span>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div style={{
        background: '#1A2234', padding: '8px 16px',
        display: 'flex', alignItems: 'center', gap: 8,
        borderBottom: '1px solid #1E293B',
      }}>
        <div style={{
          flex: 1, background: '#0F172A', borderRadius: 8,
          height: 28, display: 'flex', alignItems: 'center', padding: '0 10px',
          border: '1px solid #334155', gap: 6,
        }}>
          <span style={{ fontSize: 10 }}>🔍</span>
          <span style={{ fontFamily: 'var(--font-tajawal)', fontSize: 9, color: '#475569' }}>بحث في الطلبات...</span>
        </div>
        {['اليوم','أمس','هذا الأسبوع'].map((f, i) => (
          <span key={f} style={{
            fontFamily: 'var(--font-tajawal)', fontSize: 9,
            padding: '4px 10px', borderRadius: 6,
            background: i === 0 ? '#4F46E5' : '#1E293B',
            color: i === 0 ? '#fff' : '#64748B',
            border: i > 0 ? '1px solid #334155' : 'none',
          }}>{f}</span>
        ))}
        <span style={{ fontFamily: 'var(--font-tajawal)', fontSize: 10, color: '#64748B', background: '#1E293B', border: '1px solid #334155', borderRadius: 6, padding: '4px 8px' }}>
          ➕ طلبية
        </span>
      </div>

      {/* Table header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '20px 1fr 1.5fr 1fr 0.8fr 0.9fr',
        gap: 6, padding: '8px 14px',
        fontFamily: 'var(--font-tajawal)', fontSize: 9, color: '#475569',
        borderBottom: '1px solid #1E293B',
      }}>
        <span>☐</span><span>رقم</span><span>العميل</span>
        <span>المبلغ</span><span>المصدر</span><span>الحالة</span>
      </div>

      {/* Order rows */}
      {[
        { num: 'DK-0041', name: 'فاطمة الزهراء', wilaya: 'وهران',     price: '4,200', src: 'Dakkani', status: 'مؤكدة',    color: '#22C55E', bg: 'rgba(34,197,94,0.1)'  },
        { num: 'DK-0040', name: 'محمد أمين',     wilaya: 'قسنطينة',  price: '3,500', src: 'Dakkani', status: 'معلقة',    color: '#80BCBD', bg: 'rgba(129,140,248,0.05)' },
        { num: 'ORD-0039',name: 'سارة عمري',    wilaya: 'الجزائر',   price: '1,800', src: 'يدوي',    status: 'فاشلة 01', color: '#FFA447', bg: 'transparent' },
        { num: 'DK-0038', name: 'كريم بلال',    wilaya: 'بجاية',     price: '5,600', src: 'Dakkani', status: 'مؤكدة',    color: '#22C55E', bg: 'transparent' },
        { num: 'ORD-0037',name: 'نور الهدى',    wilaya: 'سطيف',      price: '2,200', src: 'يدوي',    status: 'مؤجلة',    color: '#9D76C1', bg: 'transparent' },
      ].map((row, i) => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: '20px 1fr 1.5fr 1fr 0.8fr 0.9fr',
          gap: 6, padding: '9px 14px',
          borderBottom: '1px solid #1E293B',
          background: i === 1 ? 'rgba(129,140,248,0.04)' : row.bg,
          alignItems: 'center',
        }}>
          <span style={{ fontSize: 9, color: '#334155' }}>☐</span>
          <span style={{ fontFamily: 'var(--font-inter)', fontSize: 9, color: '#818CF8' }}>{row.num}</span>
          <div>
            <div style={{ fontFamily: 'var(--font-tajawal)', fontSize: 9, color: '#CBD5E1' }}>{row.name}</div>
            <div style={{ fontFamily: 'var(--font-tajawal)', fontSize: 8, color: '#475569' }}>{row.wilaya}</div>
          </div>
          <span style={{ fontFamily: 'var(--font-inter)', fontSize: 9, color: '#94A3B8' }}>{row.price} دج</span>
          <span style={{ fontFamily: 'var(--font-tajawal)', fontSize: 8, color: '#64748B' }}>{row.src}</span>
          <span style={{
            fontFamily: 'var(--font-tajawal)', fontSize: 8,
            background: row.color + '22', color: row.color,
            padding: '3px 7px', borderRadius: 5,
            display: 'inline-flex', alignItems: 'center',
            fontWeight: 700,
          }}>{row.status}</span>
        </div>
      ))}

      {/* Pagination */}
      <div style={{
        padding: '10px 14px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', borderTop: '1px solid #1E293B',
      }}>
        <span style={{ fontFamily: 'var(--font-tajawal)', fontSize: 9, color: '#475569' }}>1-5 من 247 طلب</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {['‹','1','2','3','›'].map((p, i) => (
            <div key={i} style={{
              width: 22, height: 22, borderRadius: 5, fontSize: 10,
              background: i === 1 ? '#4F46E5' : '#1E293B',
              color: i === 1 ? '#fff' : '#64748B',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-inter)', fontWeight: i === 1 ? 700 : 400,
              border: i !== 1 ? '1px solid #334155' : 'none',
            }}>{p}</div>
          ))}
        </div>
      </div>
    </div>
  )
}

const MOCKUPS: Record<string, React.ReactNode> = {
  store:      <StoreMockup />,
  dashboard:  <DashboardMockup />,
  confirmili: <ConfirmiliMockup />,
}

export default function Showcase() {
  const [active, setActive] = useState('store')
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const prefersReduced = useReducedMotion()

  return (
    <section id="showcase" ref={ref} style={{ background: '#F8FAFC', padding: '100px 0' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#EEF2FF', borderRadius: 100, padding: '7px 18px', marginBottom: 16,
          }}>
            <span style={{ fontFamily: 'var(--font-tajawal)', fontSize: 13, fontWeight: 700, color: '#4F46E5' }}>
              ✦ معاينة المنصة
            </span>
          </div>
          <h2 style={{
            fontFamily: 'var(--font-tajawal)', fontWeight: 900,
            fontSize: 'clamp(28px, 4vw, 44px)', color: '#0F172A',
            lineHeight: 1.3, margin: '0 0 12px',
          }}>كل أدواتك في مكان واحد</h2>
          <p style={{
            fontFamily: 'var(--font-tajawal)', fontSize: 15, color: '#475569',
          }}>من المتجر إلى الطلبيات — نظام متكامل 100%</p>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.1, duration: 0.4 }}
          style={{
            display: 'flex', justifyContent: 'center', gap: 8,
            marginBottom: 40, flexWrap: 'wrap',
          }}>
          {TABS.map(tab => {
            const isActive = active === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActive(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 22px', borderRadius: 50,
                  border: isActive ? '1.5px solid #4F46E5' : '1.5px solid #E2E8F0',
                  background: isActive ? '#4F46E5' : '#fff',
                  color: isActive ? '#fff' : '#475569',
                  fontFamily: 'var(--font-tajawal)', fontWeight: 600, fontSize: 14,
                  cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: isActive ? '0 4px 16px rgba(79,70,229,0.28)' : '0 1px 4px rgba(0,0,0,0.04)',
                }}>
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            )
          })}
        </motion.div>

        {/* Tab description */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.2 }}
          style={{ textAlign: 'center', marginBottom: 28 }}>
          <AnimatePresence mode="wait">
            <motion.p
              key={active}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              style={{
                fontFamily: 'var(--font-tajawal)', fontSize: 14, color: '#94A3B8',
              }}>
              {TABS.find(t => t.id === active)?.desc}
            </motion.p>
          </AnimatePresence>
        </motion.div>

        {/* Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.25, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{ maxWidth: 800, margin: '0 auto', position: 'relative' }}>
          {/* Glow behind */}
          <div style={{
            position: 'absolute', inset: -40,
            background: 'radial-gradient(ellipse at center, rgba(79,70,229,0.12) 0%, transparent 70%)',
            pointerEvents: 'none', zIndex: 0,
          }} />

          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={prefersReduced ? {} : { opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={prefersReduced ? {} : { opacity: 0, y: -16, scale: 0.98 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              style={{ position: 'relative', zIndex: 1 }}>
              {MOCKUPS[active]}
            </motion.div>
          </AnimatePresence>

          {/* Floating badges */}
          <motion.div
            animate={prefersReduced ? {} : { y: [0, -10, 0], rotate: [-2, 2, -2] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            style={{
              position: 'absolute', top: -24, left: -24, zIndex: 2,
              background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
              borderRadius: 14, padding: '10px 14px',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 8px 28px rgba(79,70,229,0.35)',
            }}
            className="hidden md:flex">
            <span style={{ fontSize: 18 }}>🚀</span>
            <div>
              <div style={{ fontFamily: 'var(--font-tajawal)', fontSize: 10, fontWeight: 700, color: '#fff' }}>
                طلبية جديدة
              </div>
              <div style={{ fontFamily: 'var(--font-tajawal)', fontSize: 9, color: 'rgba(255,255,255,0.7)' }}>
                الآن · وهران
              </div>
            </div>
          </motion.div>

          <motion.div
            animate={prefersReduced ? {} : { y: [0, 8, 0], rotate: [2, -2, 2] }}
            transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut', delay: 1.5 }}
            style={{
              position: 'absolute', bottom: -20, right: -20, zIndex: 2,
              background: '#fff', borderRadius: 14, padding: '10px 14px',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 8px 28px rgba(0,0,0,0.12)',
              border: '1px solid #E2E8F0',
            }}
            className="hidden md:flex">
            <span style={{ fontSize: 18 }}>💰</span>
            <div>
              <div style={{ fontFamily: 'var(--font-tajawal)', fontSize: 10, fontWeight: 700, color: '#0F172A' }}>
                مبيعات اليوم
              </div>
              <div style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: '#4F46E5', fontWeight: 800 }}>
                +24,500 دج
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
