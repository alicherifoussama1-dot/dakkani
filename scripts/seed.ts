// ============================================================
// Dakkani Seed Script
// Run: npx ts-node --project tsconfig.seed.json scripts/seed.ts
// ============================================================
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── Test stores ───────────────────────────────────────────
const STORES = [
  { name: 'دكاني الجزائر', name_ar: 'دكاني الجزائر', slug: 'dakkani-alger',   plan: 'pro',       wilaya_id: 16 },
  { name: 'متجر الموضة',   name_ar: 'متجر الموضة',   slug: 'moda-store-dz',  plan: 'starter',   wilaya_id: 31 },
  { name: 'سوق الإلكترون', name_ar: 'سوق الإلكترون', slug: 'souk-electron',  plan: 'free',      wilaya_id: 25 },
]

// ── Sample Algerian products ──────────────────────────────
const PRODUCTS_TEMPLATES = [
  { name_ar: 'قميص كتاني رجالي ناعم',           name: 'Chemise Lin Homme',          price: 2800, cost: 1200, category: 'ملابس رجالية', tags: ['قميص','كتان','رجالي'] },
  { name_ar: 'بلوزة نسائية ربيعية',              name: 'Blouse Femme Printanière',   price: 1900, cost: 800,  category: 'ملابس نسائية', tags: ['بلوزة','ربيعي','نسائي'] },
  { name_ar: 'عطر أورينتال فاخر 100مل',          name: 'Parfum Oriental Luxe',       price: 4500, cost: 1800, category: 'عطور',         tags: ['عطر','أورينتال','رجالي'] },
  { name_ar: 'حذاء رياضي نايكي أصلي',            name: 'Chaussure Sport Nike',       price: 6500, cost: 3000, category: 'أحذية',        tags: ['حذاء','رياضي','نايكي'] },
  { name_ar: 'سماعة بلوتوث لاسلكية',             name: 'Écouteur Bluetooth Sans Fil', price: 3200, cost: 1500, category: 'إلكترونيات',  tags: ['سماعة','بلوتوث','لاسلكي'] },
  { name_ar: 'كريم مرطب للوجه بالورد',           name: 'Crème Hydratante Rose',      price: 1200, cost: 400,  category: 'جمال',         tags: ['كريم','وجه','طبيعي'] },
  { name_ar: 'ساعة ذكية رجالية مقاومة للماء',   name: 'Montre Intelligente Homme',  price: 8500, cost: 4000, category: 'ساعات',       tags: ['ساعة','ذكية','رجالي'] },
  { name_ar: 'حقيبة جلد طبيعي نسائية',          name: 'Sac Cuir Femme',             price: 3800, cost: 1600, category: 'حقائب',       tags: ['حقيبة','جلد','نسائي'] },
  { name_ar: 'نظارة شمسية رجالية فاخرة',         name: 'Lunette Soleil Homme',       price: 2200, cost: 900,  category: 'إكسسوارات',  tags: ['نظارة','شمس','رجالي'] },
  { name_ar: 'جاكيت تبان ولادي صغار',           name: 'Veste Garçon Enfant',        price: 1600, cost: 700,  category: 'ملابس أطفال', tags: ['جاكيت','ولادي','طفل'] },
  { name_ar: 'كنزة صوف شتوية دافئة',            name: 'Pull Laine Chaud Hiver',     price: 2400, cost: 1000, category: 'ملابس رجالية', tags: ['كنزة','صوف','شتاء'] },
  { name_ar: 'حزام جلد للرجال بإبزيم ذهبي',    name: 'Ceinture Cuir Homme',        price: 900,  cost: 350,  category: 'إكسسوارات',  tags: ['حزام','جلد','ذهبي'] },
  { name_ar: 'لباس رياضي نسائي كامل',           name: 'Tenue Sport Femme',          price: 3200, cost: 1400, category: 'ملابس نسائية', tags: ['رياضي','نسائي','لباس'] },
  { name_ar: 'هاتف شاومي ريدمي نوت 13',         name: 'Xiaomi Redmi Note 13',       price: 28000, cost: 22000, category: 'إلكترونيات', tags: ['هاتف','شاومي','ريدمي'] },
  { name_ar: 'سدري تقليدي جزائري مطرز',         name: 'Gilet Traditionnel Algérien', price: 4200, cost: 1800, category: 'ملابس تقليدية', tags: ['سدري','تقليدي','جزائري'] },
  { name_ar: 'طاجين فخاري أصيل قالمة',          name: 'Tajine Poterie Guelma',      price: 1800, cost: 600,  category: 'منزل',        tags: ['طاجين','فخار','تقليدي'] },
  { name_ar: 'صابون بلدي طبيعي حلب',            name: 'Savon Beldi Naturel',        price: 350,  cost: 120,  category: 'جمال',        tags: ['صابون','بلدي','طبيعي'] },
  { name_ar: 'عسل سدر جبلي جزائري أصلي',       name: 'Miel Sidr Montagne',         price: 3500, cost: 2000, category: 'غذاء',        tags: ['عسل','سدر','طبيعي'] },
  { name_ar: 'حقيبة ظهر جامعية متينة',          name: 'Sac à Dos Université',       price: 2200, cost: 900,  category: 'حقائب',       tags: ['حقيبة','ظهر','جامعة'] },
  { name_ar: 'مكيف هواء موبيل 12000 BTU',       name: 'Climatiseur Mobile 12000',   price: 55000, cost: 42000, category: 'إلكترونيات', tags: ['مكيف','موبيل','تبريد'] },
]

const ORDER_STATUSES = ['new', 'confirmed', 'processing', 'shipped', 'delivered', 'returned', 'cancelled']

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

const ALGERIAN_NAMES = [
  'محمد أمين بلعيد', 'يوسف بومدين', 'عبد الرحمن تواتي', 'كريم زرقان', 'سامي بوعلام',
  'فاطمة الزهراء', 'سارة بن علي', 'أمينة قاسمي', 'نور بنت عمر', 'رانيا حمزة',
  'عمر بن خلدون', 'إبراهيم مرابط', 'خالد معاشي', 'عثمان برقوق', 'سليمان عمروش',
]

const ALGERIAN_PHONES = [
  '0555123456', '0661234567', '0771234568', '0551234569', '0661234570',
  '0771234571', '0555234572', '0661345673', '0771456674', '0550567675',
]

async function seed() {
  console.log('🌱 Starting Dakkani seed...\n')

  for (const storeData of STORES) {
    console.log(`📦 Creating store: ${storeData.name}`)

    // Create a dummy auth user (in real usage, use admin.auth)
    const email    = `store-${storeData.slug}@dakkani.dz`
    const password = 'Dakkani2025!'

    let userId: string
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existing = existingUsers?.users?.find(u => u.email === email)

    if (existing) {
      userId = existing.id
    } else {
      const { data: newUser, error } = await supabase.auth.admin.createUser({
        email, password, email_confirm: true,
      })
      if (error || !newUser.user) { console.error('User error:', error); continue }
      userId = newUser.user.id
    }

    // Create store
    const { data: store, error: storeErr } = await supabase.from('stores').upsert({
      owner_id: userId,
      name:     storeData.name,
      name_ar:  storeData.name_ar,
      slug:     storeData.slug,
      plan:     storeData.plan,
      wilaya_id: storeData.wilaya_id,
      phone:    randomFrom(ALGERIAN_PHONES),
      email,
      is_active: true,
      currency: 'DZD',
    }, { onConflict: 'slug' }).select('id').single()

    if (storeErr || !store) { console.error('Store error:', storeErr); continue }

    const storeId = store.id
    console.log(`  ✅ Store created: ${storeId}`)

    // Create store settings
    await supabase.from('store_settings').upsert({
      store_id: storeId, cash_on_delivery: true,
      fraud_auto_block_score: 80, max_call_attempts: 3,
      low_stock_threshold: 5, order_email: true,
    }, { onConflict: 'store_id' })

    // Create warehouse
    const { data: warehouse } = await supabase.from('warehouses').insert({
      store_id: storeId, name: 'المستودع الرئيسي', is_default: true, wilaya_id: storeData.wilaya_id,
    }).select('id').single()

    // Create categories
    const categoryIds: Record<string, string> = {}
    const cats = Array.from(new Set(PRODUCTS_TEMPLATES.map(p => p.category)))
    for (const cat of cats) {
      const { data: c } = await supabase.from('categories').insert({
        store_id: storeId, name: cat, name_ar: cat, slug: cat.replace(/\s+/g, '-'), is_active: true,
      }).select('id').single()
      if (c) categoryIds[cat] = c.id
    }

    // Create 20 products
    const productIds: string[] = []
    for (const tmpl of PRODUCTS_TEMPLATES) {
      const slug = `${tmpl.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${randomInt(100, 999)}`
      const { data: prod } = await supabase.from('products').insert({
        store_id:    storeId,
        name:        tmpl.name,
        name_ar:     tmpl.name_ar,
        slug,
        price:       tmpl.price,
        compare_price: Math.round(tmpl.price * 1.2),
        cost_price:  tmpl.cost,
        category_id: categoryIds[tmpl.category],
        tags:        tmpl.tags,
        is_active:   true,
        is_featured: Math.random() > 0.7,
        use_store_pixel: true,
        description_ar: `${tmpl.name_ar} — جودة ممتازة بأسعار مناسبة. الدفع عند الاستلام لكل الجزائر.`,
        images: [],
      }).select('id').single()

      if (prod && warehouse) {
        productIds.push(prod.id)
        // Stock
        await supabase.from('warehouse_stock').insert({
          store_id:    storeId,
          product_id:  prod.id,
          warehouse_id: warehouse.id,
          variant_key: 'default',
          quantity:    randomInt(5, 200),
          reserved:    0,
        })
      }
    }
    console.log(`  ✅ ${productIds.length} products created`)

    // Create sample orders (all statuses)
    let orderCount = 0
    for (const status of ORDER_STATUSES) {
      const numOrders = randomInt(3, 8)
      for (let i = 0; i < numOrders; i++) {
        const wilayaId = randomInt(1, 58)
        const { data: wilaya } = await supabase.from('wilayas').select('delivery_fee_home').eq('id', wilayaId).single()
        const productId = randomFrom(productIds)
        const qty = randomInt(1, 3)

        const { data: prod } = await supabase.from('products').select('price, name, name_ar').eq('id', productId).single()
        if (!prod) continue

        const subtotal    = prod.price * qty
        const deliveryFee = wilaya?.delivery_fee_home ?? 500
        const total       = subtotal + deliveryFee

        // Generate order number
        const orderNum = `${storeData.slug.slice(0,3).toUpperCase()}-${new Date().toISOString().slice(2,10).replace(/-/g,'')}${randomInt(100,999)}`

        const daysAgo = randomInt(0, 30)
        const createdAt = new Date(Date.now() - daysAgo * 86400000).toISOString()

        const { data: order } = await supabase.from('orders').insert({
          store_id:       storeId,
          order_number:   orderNum,
          customer_name:  randomFrom(ALGERIAN_NAMES),
          customer_phone: randomFrom(ALGERIAN_PHONES),
          delivery_type:  'home',
          wilaya_id:      wilayaId,
          subtotal,
          delivery_fee:   deliveryFee,
          discount_amount: 0,
          total,
          status,
          payment_method: 'cod',
          fraud_score:    randomInt(0, 30),
          is_blacklisted: false,
          call_attempts:  randomInt(0, 3),
          created_at:     createdAt,
          delivered_at:   status === 'delivered' ? createdAt : null,
        }).select('id').single()

        if (order) {
          await supabase.from('order_items').insert({
            order_id:    order.id,
            store_id:    storeId,
            product_id:  productId,
            product_name: prod.name_ar ?? prod.name,
            variant_key: 'default',
            quantity:    qty,
            unit_price:  prod.price,
            total_price: prod.price * qty,
          })
          orderCount++
        }
      }
    }
    console.log(`  ✅ ${orderCount} orders created\n`)
  }

  console.log('✅ Seed complete!')
}

seed().catch(console.error)
