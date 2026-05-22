'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, LogOut, Search, Plus, ExternalLink, ChevronDown, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Store } from '@/types'
import type { User as SupabaseUser } from '@supabase/supabase-js'

export default function Header({ store, user }: { store: Store; user: SupabaseUser }) {
  const router = useRouter()
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(false)

  const signOut = async () => {
    setLoading(true)
    await createClient().auth.signOut()
    router.push('/login')
  }

  const initial = (user.email ?? 'U')[0].toUpperCase()

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-5 gap-4">
      {/* Left: quick actions */}
      <div className="flex items-center gap-2">
        <Link
          href="/products/new"
          className="hidden md:flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl text-white transition-all shadow-green"
          style={{ background: 'linear-gradient(135deg,#0D6EFD,#0B5ED7)' }}
        >
          <Plus className="w-3.5 h-3.5" />
          منتج جديد
        </Link>
        <Link
          href="/admin/ai-agent"
          className="hidden md:flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl text-purple-600 bg-purple-50 hover:bg-purple-100 transition-colors border border-purple-100"
        >
          <Sparkles className="w-3.5 h-3.5" />
          AI
        </Link>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 mr-auto">
        {/* Store live link */}
        <a
          href={`/store/${store.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary px-3 py-2 rounded-xl hover:bg-primary/5 transition-colors border border-gray-200 hover:border-primary/20"
        >
          <span className="w-2 h-2 bg-green-400 rounded-full dot-blink" />
          المتجر مباشر
          <ExternalLink className="w-3 h-3" />
        </a>

        {/* Bell */}
        <button className="relative p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
        </button>

        {/* User dropdown */}
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black"
              style={{ background: 'linear-gradient(135deg,#0D6EFD,#F59E0B)' }}>
              {initial}
            </div>
            <span className="text-sm font-semibold text-gray-700 hidden md:block">{user.email?.split('@')[0]}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {open && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 top-full mt-1.5 w-52 bg-white rounded-2xl shadow-float border border-gray-100 z-20 overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                    <p className="text-sm font-black text-[#111827]">{user.email?.split('@')[0]}</p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>
                  <div className="p-1.5">
                    <Link href="/settings" onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
                      ⚙️ الإعدادات
                    </Link>
                    <button onClick={signOut} disabled={loading}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50">
                      <LogOut className="w-4 h-4" />
                      {loading ? 'جارٍ الخروج...' : 'تسجيل الخروج'}
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
