// ============================================================
// GENERIC MERCHANT-RESOURCE ROUTE
//   GET    /api/mobile/v1/catalog/:resource        list
//   POST   /api/mobile/v1/catalog/:resource        create
//   PATCH  /api/mobile/v1/catalog/:resource?id=…   update
//   DELETE /api/mobile/v1/catalog/:resource?id=…   delete
//
// One audited handler for the remaining simple merchant tables, instead of
// six near-identical files. Safety comes from a WHITELIST: only the tables
// and columns declared below are reachable, so no request can touch orders,
// products, tracking or any protected table.
//
// Every query is scoped by store_id on top of RLS.
// ============================================================
export const dynamic = 'force-dynamic'

import { z } from 'zod'
import { getMobileContext, ok, fail } from '@/lib/mobile/context'

interface ResourceDef {
  table: string
  select: string
  order: { col: string; asc: boolean }
  /** Columns the app may write. Anything else is rejected. */
  writable: z.ZodTypeAny | null
  /** Soft-delete column when hard deletes are unsafe. */
  softDelete?: string
}

const RESOURCES: Record<string, ResourceDef> = {
  coupons: {
    table: 'coupons',
    select: 'id,code,type,value,min_order_amount,max_uses,used_count,starts_at,expires_at,is_active,created_at',
    order: { col: 'created_at', asc: false },
    writable: z.object({
      code: z.string().min(2).max(40),
      type: z.enum(['percent', 'fixed']),
      value: z.number().positive(),
      min_order_amount: z.number().nonnegative().optional(),
      max_uses: z.number().int().positive().nullable().optional(),
      expires_at: z.string().nullable().optional(),
      is_active: z.boolean().optional(),
    }).partial({ type: true, value: true }),
  },
  warehouses: {
    table: 'warehouses',
    select: 'id,name,name_ar,address,wilaya_id,phone,is_default,is_active,created_at',
    order: { col: 'created_at', asc: true },
    writable: z.object({
      name: z.string().min(2),
      name_ar: z.string().optional(),
      address: z.string().optional(),
      wilaya_id: z.number().int().min(1).max(58).optional(),
      phone: z.string().optional(),
      is_default: z.boolean().optional(),
      is_active: z.boolean().optional(),
    }).partial({ name: true }),
  },
  blacklist: {
    table: 'blacklisted_customers',
    select: 'id,phone,full_name,reason,created_at',
    order: { col: 'created_at', asc: false },
    writable: z.object({
      phone: z.string().regex(/^(05|06|07)\d{8}$/, 'رقم الهاتف غير صحيح'),
      full_name: z.string().optional(),
      reason: z.string().optional(),
    }).partial({ phone: true }),
  },
  sheets: {
    table: 'sheets',
    select: 'id,sheet_name,sheet_id,sheet_page_name,last_sync,is_active,created_at',
    order: { col: 'created_at', asc: false },
    writable: z.object({ is_active: z.boolean() }),
  },
  'landing-pages': {
    table: 'landing_pages',
    select: 'id,title,title_ar,slug,is_active,views,conversions,created_at',
    order: { col: 'created_at', asc: false },
    // Landing pages carry meta_pixel_id / tiktok_pixel_id — PROTECTED.
    // Only the visibility flag is writable from mobile.
    writable: z.object({ is_active: z.boolean() }),
  },
  categories: {
    table: 'categories',
    select: 'id,name,name_ar,slug,image_url,sort_order,is_active,parent_id,created_at',
    order: { col: 'sort_order', asc: true },
    writable: z.object({
      name: z.string().min(2).max(80),
      name_ar: z.string().max(80).optional(),
      // UNIQUE(store_id, slug) — the DB rejects duplicates and the error
      // surfaces to the user rather than silently creating a second row.
      slug: z.string().regex(/^[a-z0-9-]+$/, 'المعرّف يقبل حروفاً لاتينية صغيرة وأرقاماً وشرطات فقط').max(80),
      sort_order: z.number().int().nonnegative().optional(),
      is_active: z.boolean().optional(),
    }).partial({ name: true, slug: true }),
  },
  notifications: {
    table: 'confirmili_notifications',
    select: 'id,type,title,message,order_id,is_read,created_at',
    order: { col: 'created_at', asc: false },
    writable: z.object({ is_read: z.boolean() }),
  },

  // ── Delivery: READ-ONLY from mobile ──────────────────────
  // Delivery logic is a protected production system. The app surfaces what
  // is configured so a merchant can check it on the road, but every write
  // stays on the web dashboard (writable: null → POST/PATCH return 405).
  'delivery-providers': {
    table: 'delivery_providers',
    // `credentials` is DELIBERATELY absent. It holds encrypted courier API
    // keys; the column never leaves the server for a mobile client, not even
    // masked. Anything not listed here cannot be selected.
    select: 'id,provider_type,display_name,is_active,is_automatic,from_wilaya_code,created_at',
    order: { col: 'created_at', asc: true },
    writable: null,
  },
  'delivery-prices': {
    table: 'delivery_declared_prices',
    select: 'id,provider_id,wilaya_code,home_price,stopdesk_price,source,updated_at',
    order: { col: 'wilaya_code', asc: true },
    writable: null,
  },
  'stopdesk-offices': {
    table: 'store_delivery_offices',
    select: 'id,provider_id,wilaya_code,name,address,is_active,created_at',
    order: { col: 'wilaya_code', asc: true },
    writable: null,
  },
}

function def(resource: string) {
  return RESOURCES[resource] ?? null
}

export async function GET(req: Request, { params }: { params: { resource: string } }) {
  const ctx = await getMobileContext(req)
  if ('error' in ctx) return ctx.error

  const d = def(params.resource)
  if (!d) return fail('Unknown resource', 404)

  const url = new URL(req.url)
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 100), 200)

  const { data, error } = await ctx.supabase
    .from(d.table).select(d.select)
    .eq('store_id', ctx.store.id)
    .order(d.order.col, { ascending: d.order.asc })
    .limit(limit)

  // A table missing (migration not applied on this database) degrades to an
  // empty list rather than breaking the screen.
  if (error) return ok({ items: [], total: 0, unavailable: true })

  return ok({ items: data ?? [], total: (data ?? []).length })
}

export async function POST(req: Request, { params }: { params: { resource: string } }) {
  const ctx = await getMobileContext(req)
  if ('error' in ctx) return ctx.error

  const d = def(params.resource)
  if (!d) return fail('Unknown resource', 404)
  if (!d.writable) return fail('هذه الوحدة للقراءة فقط من التطبيق', 405)

  const parsed = d.writable.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return fail((parsed as any).error?.errors?.[0]?.message ?? 'بيانات غير صالحة')
  }

  const { data, error } = await ctx.supabase
    .from(d.table)
    .insert({ ...(parsed.data as object), store_id: ctx.store.id })
    .select(d.select).single()

  if (error) return fail(error.message, 500)
  return ok({ item: data }, { status: 201 })
}

export async function PATCH(req: Request, { params }: { params: { resource: string } }) {
  const ctx = await getMobileContext(req)
  if ('error' in ctx) return ctx.error

  const d = def(params.resource)
  if (!d) return fail('Unknown resource', 404)
  if (!d.writable) return fail('هذه الوحدة للقراءة فقط من التطبيق', 405)

  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  const all = url.searchParams.get('all') === 'true'
  if (!id && !all) return fail('id مطلوب')

  const parsed = d.writable.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return fail((parsed as any).error?.errors?.[0]?.message ?? 'بيانات غير صالحة')
  }

  let q = ctx.supabase.from(d.table).update(parsed.data as object).eq('store_id', ctx.store.id)
  if (id) q = q.eq('id', id)

  const { error } = await q
  if (error) return fail(error.message, 500)
  return ok({ updated: true })
}

export async function DELETE(req: Request, { params }: { params: { resource: string } }) {
  const ctx = await getMobileContext(req)
  if ('error' in ctx) return ctx.error

  const d = def(params.resource)
  if (!d) return fail('Unknown resource', 404)
  // Read-only resources are not deletable either — without this a mobile
  // client could DELETE a delivery provider that it may not even read fully.
  if (!d.writable) return fail('هذه الوحدة للقراءة فقط من التطبيق', 405)

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return fail('id مطلوب')

  if (d.softDelete) {
    const { error } = await ctx.supabase
      .from(d.table).update({ [d.softDelete]: false }).eq('id', id).eq('store_id', ctx.store.id)
    if (error) return fail(error.message, 500)
    return ok({ deleted: 'soft' })
  }

  const { error } = await ctx.supabase
    .from(d.table).delete().eq('id', id).eq('store_id', ctx.store.id)
  if (error) return fail(error.message, 500)
  return ok({ deleted: 'hard' })
}
