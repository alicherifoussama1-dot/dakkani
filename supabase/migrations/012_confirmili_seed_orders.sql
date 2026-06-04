-- ============================================================
-- Migration 012 — Seed 20 Confirmili mock orders
-- Only inserts if the store has fewer than 5 orders already.
-- Safe to run multiple times (uses DO block with guard).
-- ============================================================

DO $$
DECLARE
  v_store_id UUID;
  v_wilaya_1 INT := 16;  -- Alger
  v_wilaya_2 INT := 31;  -- Oran
  v_wilaya_3 INT := 25;  -- Constantine
  v_wilaya_4 INT := 6;   -- Béjaïa
  v_wilaya_5 INT := 23;  -- Annaba
  v_order_count INT;
BEGIN
  -- Find first active store
  SELECT id INTO v_store_id FROM stores ORDER BY created_at LIMIT 1;
  IF v_store_id IS NULL THEN RETURN; END IF;

  -- Count existing orders (don't seed if already has data)
  SELECT COUNT(*) INTO v_order_count FROM orders WHERE store_id = v_store_id;
  IF v_order_count >= 5 THEN RETURN; END IF;

  -- Insert 20 mock orders
  INSERT INTO orders (
    store_id, order_number, customer_name, customer_phone, address,
    wilaya_id, total, subtotal, delivery_fee, status, source,
    delivery_type, notes, created_at
  ) VALUES

  -- Dakkani source
  (v_store_id, 'DK-'||extract(epoch from now())::bigint::text||'1',
   'أحمد بن علي', '0555123401', 'حي الأندلس، شارع 20 أوت',
   v_wilaya_1, 2800, 2500, 300, 'new', 'Dakkani', 'home', '', NOW() - INTERVAL '2 hours'),

  (v_store_id, 'DK-'||extract(epoch from now())::bigint::text||'2',
   'فاطمة الزهراء', '0661987602', 'بئر توتة، حي النصر',
   v_wilaya_1, 4200, 3800, 400, 'confirmed', 'Dakkani', 'home', 'يرجى التسليم بسرعة', NOW() - INTERVAL '5 hours'),

  (v_store_id, 'DK-'||extract(epoch from now())::bigint::text||'3',
   'محمد أمين', '0770456703', 'شارع زيغود يوسف',
   v_wilaya_2, 3500, 3200, 300, 'new', 'Dakkani', 'stopdesk', '', NOW() - INTERVAL '1 day'),

  -- Manual source
  (v_store_id, 'ORD-'||extract(epoch from now())::bigint::text||'4',
   'سامية بوعزيز', '0550789004', 'حي المنظر الجميل',
   v_wilaya_3, 1900, 1600, 300, 'new', 'manual', 'home', 'العميل طلب اللون الأزرق', NOW() - INTERVAL '1 day' + INTERVAL '2 hours'),

  (v_store_id, 'ORD-'||extract(epoch from now())::bigint::text||'5',
   'كريم بلال', '0660321505', 'الشارع الرئيسي',
   v_wilaya_4, 5600, 5000, 600, 'confirmed', 'manual', 'home', '', NOW() - INTERVAL '2 days'),

  (v_store_id, 'ORD-'||extract(epoch from now())::bigint::text||'6',
   'نور الهدى', '0770654306', 'باب الواد، زقاق 5',
   v_wilaya_1, 2200, 2000, 200, 'cancelled', 'manual', 'home', 'إلغاء بطلب العميل', NOW() - INTERVAL '2 days' + INTERVAL '3 hours'),

  -- Failed statuses
  (v_store_id, 'ORD-'||extract(epoch from now())::bigint::text||'7',
   'يزيد مقران', '0555987007', 'حي المنجر، رقم 12',
   v_wilaya_2, 3100, 2800, 300, 'failed_1', 'manual', 'stopdesk', 'لا يرد على الهاتف', NOW() - INTERVAL '3 days'),

  (v_store_id, 'ORD-'||extract(epoch from now())::bigint::text||'8',
   'سارة عمري', '0660112308', 'ديار شمس البيبان',
   v_wilaya_5, 4400, 4000, 400, 'failed_2', 'manual', 'home', '', NOW() - INTERVAL '3 days' + INTERVAL '1 hour'),

  (v_store_id, 'ORD-'||extract(epoch from now())::bigint::text||'9',
   'إسلام بركات', '0770888009', 'مسكن ترقوي، بلوك ج',
   v_wilaya_3, 1800, 1600, 200, 'failed_3', 'manual', 'stopdesk', 'محاولة 3 — لا رد', NOW() - INTERVAL '4 days'),

  -- Delivered / returned
  (v_store_id, 'DK-'||extract(epoch from now())::bigint::text||'10',
   'حسام الدين قاسمي', '0550444010', 'طريق عين النعجة',
   v_wilaya_1, 6200, 5500, 700, 'delivered', 'Dakkani', 'home', '', NOW() - INTERVAL '5 days'),

  (v_store_id, 'DK-'||extract(epoch from now())::bigint::text||'11',
   'إيمان سبع', '0661777011', 'حي الجامعة بن عكنون',
   v_wilaya_1, 3800, 3400, 400, 'returned', 'Dakkani', 'home', 'المنتج تالف', NOW() - INTERVAL '5 days' + INTERVAL '2 hours'),

  -- Postponed / duplicate
  (v_store_id, 'ORD-'||extract(epoch from now())::bigint::text||'12',
   'مروان حمزاوي', '0770222012', 'حي المدينة الجديدة',
   v_wilaya_4, 2900, 2600, 300, 'postponed', 'manual', 'stopdesk', 'تأجيل بطلب العميل', NOW() - INTERVAL '6 days'),

  -- Duplicate of same phone
  (v_store_id, 'DK-'||extract(epoch from now())::bigint::text||'13',
   'أحمد بن علي', '0555123401', 'حي الأندلس، شارع 20 أوت',
   v_wilaya_1, 2800, 2500, 300, 'duplicate', 'Dakkani', 'home', 'طلب مكرر', NOW() - INTERVAL '6 days' + INTERVAL '1 hour'),

  -- More recent orders for today section
  (v_store_id, 'DK-'||extract(epoch from now())::bigint::text||'14',
   'نجاة بلعيد', '0660555014', 'سكيكدة، حي النصر',
   v_wilaya_5, 7800, 7000, 800, 'new', 'Dakkani', 'home', '', NOW() - INTERVAL '30 minutes'),

  (v_store_id, 'DK-'||extract(epoch from now())::bigint::text||'15',
   'عبد الرحمن صغير', '0555011015', 'وهران، حي الياسمين',
   v_wilaya_2, 3200, 2800, 400, 'new', 'Dakkani', 'stopdesk', '', NOW() - INTERVAL '45 minutes'),

  (v_store_id, 'ORD-'||extract(epoch from now())::bigint::text||'16',
   'خديجة بوشارب', '0770321016', 'بجاية، أعالي المدينة',
   v_wilaya_4, 4100, 3700, 400, 'confirmed', 'manual', 'home', 'مستعجل', NOW() - INTERVAL '1 hour'),

  (v_store_id, 'ORD-'||extract(epoch from now())::bigint::text||'17',
   'بلال حداد', '0661902017', 'قسنطينة، سيدي ماحي',
   v_wilaya_3, 5300, 4800, 500, 'confirmed', 'manual', 'home', '', NOW() - INTERVAL '2 hours' - INTERVAL '30 minutes'),

  (v_store_id, 'DK-'||extract(epoch from now())::bigint::text||'18',
   'رنا عيسى', '0550678018', 'الجزائر، شراقة',
   v_wilaya_1, 2600, 2300, 300, 'new', 'Dakkani', 'home', '', NOW() - INTERVAL '3 hours'),

  (v_store_id, 'ORD-'||extract(epoch from now())::bigint::text||'19',
   'أنيس منصوري', '0770099019', 'عنابة، سيدي أمار',
   v_wilaya_5, 3900, 3500, 400, 'failed_1', 'manual', 'stopdesk', '', NOW() - INTERVAL '7 days'),

  (v_store_id, 'DK-'||extract(epoch from now())::bigint::text||'20',
   'سلمى بوساحة', '0661234020', 'وهران، الكروم',
   v_wilaya_2, 8500, 7800, 700, 'delivered', 'Dakkani', 'home', 'تم التسليم بنجاح', NOW() - INTERVAL '8 days');

  -- Add order history for a few of them
  INSERT INTO order_history (order_id, store_id, old_status, new_status, changed_by, notes, created_at)
  SELECT
    o.id, o.store_id,
    'new' as old_status,
    'confirmed' as new_status,
    'confirmili' as changed_by,
    'تم التأكيد يدوياً' as notes,
    o.created_at + INTERVAL '30 minutes'
  FROM orders o
  WHERE o.store_id = v_store_id AND o.status IN ('confirmed','delivered','returned')
  LIMIT 5;

  INSERT INTO order_history (order_id, store_id, old_status, new_status, changed_by, notes, created_at)
  SELECT
    o.id, o.store_id,
    'confirmed' as old_status,
    o.status as new_status,
    'system' as changed_by,
    '' as notes,
    o.created_at + INTERVAL '2 hours'
  FROM orders o
  WHERE o.store_id = v_store_id AND o.status IN ('delivered','returned')
  LIMIT 3;

END $$;

SELECT 'Migration 012 completed — mock orders seeded' AS status;
