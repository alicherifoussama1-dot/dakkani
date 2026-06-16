// GET /api/storefront/preview-data?slug=… — public data for the live builder
// preview (same queries as the storefront home). Read-only, no secrets.
import { NextResponse } from 'next/server'
import { createPublicClient } from '@/lib/supabase/public'

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  const supabase = createPublicClient()
  const { data: store } = await supabase
    .from('stores').select('*, store_settings(*)').eq('slug', slug).eq('is_active', true).single()
  if (!store) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const [featuredRes, categoriesRes, bestsellersRes, reviewsRes] = await Promise.all([
    supabase.from('products').select('id,name,name_ar,slug,price,compare_price,images')
      .eq('store_id', store.id).eq('is_featured', true).eq('is_active', true).limit(8),
    supabase.from('categories').select('id,name,name_ar,image_url,slug')
      .eq('store_id', store.id).eq('is_active', true).order('sort_order').limit(8),
    supabase.from('products').select('id,name,name_ar,slug,price,compare_price,images')
      .eq('store_id', store.id).eq('is_active', true).order('created_at', { ascending: false }).limit(12),
    supabase.from('reviews').select('customer_name,rating,comment,created_at')
      .eq('store_id', store.id).eq('is_approved', true).order('created_at', { ascending: false }).limit(6),
  ])

  return NextResponse.json({
    store,
    data: {
      featured:   featuredRes.data ?? [],
      categories: categoriesRes.data ?? [],
      products:   bestsellersRes.data ?? [],
      reviews:    reviewsRes.data ?? [],
    },
  })
}
