export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import StorefrontLayout from '@/components/storefront/StorefrontLayout'
import WhatsAppFloat    from '@/components/storefront/WhatsAppFloat'
import InfiniteProducts from '@/components/storefront/InfiniteProducts'
import { FadeUp }       from '@/components/ui/animations'

interface Props {
  params: { storeSlug: string }
  searchParams: { category?: string; q?: string; sort?: string; min?: string; max?: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `المنتجات | ${params.storeSlug}` }
}

export default async function CataloguePage({ params, searchParams }: Props) {
  const supabase = createServerClient()
  const { data: store } = await supabase.from('stores').select('*, store_settings(*)').eq('slug', params.storeSlug).eq('is_active', true).single()
  if (!store) notFound()

  const [catRes, totalRes] = await Promise.all([
    supabase.from('categories').select('id,name,name_ar').eq('store_id', store.id).eq('is_active', true).order('sort_order'),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('store_id', store.id).eq('is_active', true),
  ])

  const categories = catRes.data ?? []
  const total      = totalRes.count ?? 0
  const storePhone = (store as any).whatsapp ?? store.phone

  return (
    <StorefrontLayout store={store as any}>
      <div className="pt-16 min-h-screen bg-[#FAFAF8]">
        {/* Header */}
        <div className="bg-gradient-hero py-10 px-4 mb-0">
          <div className="max-w-6xl mx-auto" dir="rtl">
            <FadeUp>
              <h1 className="text-3xl font-black text-white mb-1">جميع المنتجات</h1>
              <p className="text-white/60">{total} منتج متوفر</p>
            </FadeUp>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex gap-6" dir="rtl">
            {/* Sidebar */}
            <aside className="hidden md:block w-56 flex-shrink-0 space-y-4">
              {/* Categories */}
              <div className="bg-white rounded-2xl shadow-card p-4">
                <h3 className="font-black text-[#111827] mb-3 text-sm">الفئات</h3>
                <div className="space-y-1">
                  <a href={`/store/${store.slug}/products`}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors ${!searchParams.category ? 'bg-primary text-white font-bold' : 'text-gray-600 hover:bg-gray-50'}`}>
                    <span>الكل</span>
                    <span className="text-xs opacity-60">{total}</span>
                  </a>
                  {categories.map(cat => (
                    <a key={cat.id} href={`/store/${store.slug}/products?category=${cat.id}`}
                      className={`flex items-center px-3 py-2 rounded-xl text-sm transition-colors ${searchParams.category === cat.id ? 'bg-primary text-white font-bold' : 'text-gray-600 hover:bg-gray-50'}`}>
                      {cat.name_ar ?? cat.name}
                    </a>
                  ))}
                </div>
              </div>

              {/* Price filter */}
              <div className="bg-white rounded-2xl shadow-card p-4">
                <h3 className="font-black text-[#111827] mb-3 text-sm">السعر</h3>
                <form method="GET" action={`/store/${store.slug}/products`} className="space-y-2">
                  {searchParams.category && <input type="hidden" name="category" value={searchParams.category} />}
                  {searchParams.q && <input type="hidden" name="q" value={searchParams.q} />}
                  <div className="flex items-center gap-2">
                    <input name="min" type="number" placeholder="من" defaultValue={searchParams.min}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary/30 outline-none" />
                    <span className="text-gray-300">—</span>
                    <input name="max" type="number" placeholder="إلى" defaultValue={searchParams.max}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary/30 outline-none" />
                  </div>
                  <button type="submit" className="w-full bg-primary hover:bg-primary-light text-white text-xs font-bold py-2 rounded-xl transition-colors">
                    تطبيق
                  </button>
                </form>
              </div>
            </aside>

            {/* Products */}
            <main className="flex-1 min-w-0">
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                {searchParams.q && (
                  <p className="text-sm text-gray-600">نتائج: <strong>&quot;{searchParams.q}&quot;</strong></p>
                )}
                <form method="GET" action={`/store/${store.slug}/products`} className="mr-auto">
                  {searchParams.category && <input type="hidden" name="category" value={searchParams.category} />}
                  {searchParams.q && <input type="hidden" name="q" value={searchParams.q} />}
                  <select name="sort" defaultValue={searchParams.sort ?? 'newest'}
                    onChange={e => e.target.form?.submit()}
                    className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-primary/30 outline-none font-medium">
                    <option value="newest">الأحدث</option>
                    <option value="price_asc">السعر: الأقل</option>
                    <option value="price_desc">السعر: الأعلى</option>
                  </select>
                </form>
              </div>

              <InfiniteProducts
                storeId={store.id}
                storeSlug={store.slug}
                initialFilters={{
                  categoryId: searchParams.category,
                  query:      searchParams.q,
                  sort:       searchParams.sort ?? 'newest',
                  minPrice:   searchParams.min ? parseInt(searchParams.min) : undefined,
                  maxPrice:   searchParams.max ? parseInt(searchParams.max) : undefined,
                }}
              />
            </main>
          </div>
        </div>
      </div>
      {storePhone && <WhatsAppFloat phone={storePhone} storeName={store.name_ar ?? store.name} />}
    </StorefrontLayout>
  )
}
