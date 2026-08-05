// ============================================================
// PRODUCT EDITOR — real create/edit against the verified API.
// Route handles BOTH: /products/new and /products/<uuid>
// Image upload → POST /api/upload · stock → PATCH .../stock
// ============================================================
import React, { useEffect, useState } from 'react'
import {
  View, Text, TextInput, ScrollView, StyleSheet, Pressable, Alert, Switch,
} from 'react-native'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { api } from '../../src/lib/api'
import { Card, Button, Skeleton, ErrorState } from '../../src/components/ui'
import TopBar from '../../src/components/TopBar'
import { Plus, X, ImageIcon, Trash2 } from 'lucide-react-native'
import { color, primary, space, radius, text, fontFamily, control, fmtDZD } from '../../src/theme/tokens'

interface Img { url: string }

export default function ProductEditor() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const isNew = !id || id === 'new'
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const qc = useQueryClient()

  const [name, setName] = useState('')
  const [nameAr, setNameAr] = useState('')
  const [price, setPrice] = useState('')
  const [comparePrice, setComparePrice] = useState('')
  const [sku, setSku] = useState('')
  const [description, setDescription] = useState('')
  const [images, setImages] = useState<Img[]>([])
  const [variants, setVariants] = useState<string[]>([])
  const [variantDraft, setVariantDraft] = useState('')
  const [stock, setStock] = useState('')
  const [active, setActive] = useState(true)
  const [uploading, setUploading] = useState(false)

  const q = useQuery({
    queryKey: ['product', id],
    queryFn: () => api.product(String(id)),
    enabled: !isNew,
  })

  // Hydrate the form once the product arrives.
  useEffect(() => {
    const p = q.data?.product
    if (!p) return
    setName(p.name ?? '')
    setNameAr(p.name_ar ?? '')
    setPrice(String(p.price ?? ''))
    setComparePrice(p.compare_price ? String(p.compare_price) : '')
    setSku(p.sku ?? '')
    setDescription(p.description_ar ?? p.description ?? '')
    setImages(Array.isArray(p.images) ? p.images : [])
    setVariants(Array.isArray(p.variants) ? p.variants.map((v: any) => v?.label ?? v?.key ?? String(v)) : [])
    setActive(!!p.is_active)
    const st = (q.data as any)?.stock ?? {}
    setStock(String(st.default ?? Object.values(st)[0] ?? ''))
  }, [q.data])

  const save = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        name: name.trim() || nameAr.trim(),
        name_ar: nameAr.trim() || name.trim(),
        price: Number(price),
        compare_price: comparePrice ? Number(comparePrice) : null,
        sku: sku.trim() || undefined,
        description_ar: description.trim() || undefined,
        images,
        variants: variants.map(v => ({ key: v, label: v })),
        is_active: active,
      }
      const res = isNew
        ? await api.createProduct(body)
        : await api.updateProduct(String(id), body)

      const productId = (res as any).product?.id ?? id
      // Stock lives in warehouse_stock, so it is a separate call.
      if (stock !== '' && Number.isFinite(Number(stock))) {
        try { await api.setStock(String(productId), Number(stock)) }
        catch (e: any) {
          // A store with no warehouse yet → surface it, don't fail the save.
          Alert.alert('تنبيه', e?.message ?? 'تم حفظ المنتج لكن تعذّر تحديث المخزون')
        }
      }
      return productId
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['product', id] })
      router.back()
    },
    onError: (e: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
      Alert.alert('تعذّر الحفظ', e?.message ?? 'تحقّق من البيانات وحاول مرة أخرى')
    },
  })

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('الصلاحية مرفوضة', 'اسمح بالوصول إلى الصور من إعدادات النظام.')
      return
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,           // upload-friendly on 3G without visible loss
      allowsMultipleSelection: false,
    })
    if (res.canceled || !res.assets?.[0]) return

    const a = res.assets[0]
    setUploading(true)
    try {
      const up = await api.uploadImage(
        { uri: a.uri, name: a.fileName ?? `product-${Date.now()}.jpg`, type: a.mimeType ?? 'image/jpeg' },
        'products',
      )
      setImages(prev => [...prev, { url: up.url }])
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    } catch (e: any) {
      Alert.alert('تعذّر رفع الصورة', e?.message ?? 'حاول مرة أخرى')
    } finally { setUploading(false) }
  }

  const removeImage = (i: number) => setImages(prev => prev.filter((_, idx) => idx !== i))
  const addVariant = () => {
    const v = variantDraft.trim()
    if (!v || variants.includes(v)) return
    setVariants(prev => [...prev, v]); setVariantDraft('')
  }

  const priceNum = Number(price), cmpNum = Number(comparePrice)
  const priceError = comparePrice !== '' && cmpNum > 0 && cmpNum <= priceNum
    ? 'السعر قبل الخصم يجب أن يكون أكبر من السعر الحالي' : ''
  const canSave = (name.trim() || nameAr.trim()) && priceNum > 0 && !priceError && !save.isPending

  return (
    <View style={styles.root}>
      <TopBar
        title={isNew ? 'منتج جديد' : 'تعديل المنتج'}
        onBack={() => router.back()}
      />

      {!isNew && q.isError ? (
        <ErrorState message={(q.error as any)?.message} onRetry={() => q.refetch()} />
      ) : !isNew && q.isLoading ? (
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          <Skeleton height={120} rounded={radius.lg} /><Skeleton height={90} rounded={radius.lg} /><Skeleton height={90} rounded={radius.lg} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled">

          {/* images */}
          <Text style={styles.section}>صور المنتج</Text>
          <Card>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 9 }}>
              {images.map((img, i) => (
                <View key={img.url + i}>
                  <Image source={{ uri: img.url }} style={styles.imgTile} contentFit="cover"
                    cachePolicy="memory-disk" alt={`صورة المنتج ${i + 1}`} />
                  <Pressable style={styles.imgRemove} onPress={() => removeImage(i)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`حذف الصورة ${i + 1}`}>
                    <X size={12} color={color.white} />
                  </Pressable>
                  {i === 0 && <View style={styles.mainBadge}><Text style={styles.mainBadgeText}>رئيسية</Text></View>}
                </View>
              ))}
              <Pressable style={[styles.imgTile, styles.imgAdd]} onPress={pickImage} disabled={uploading} accessibilityRole="button" accessibilityLabel="إضافة صورة">
                {uploading
                  ? <Text style={styles.addText}>...</Text>
                  : <><ImageIcon size={20} color={primary[600]} /><Text style={styles.addText}>إضافة</Text></>}
              </Pressable>
            </ScrollView>
          </Card>

          {/* basics */}
          <Text style={styles.section}>المعلومات الأساسية</Text>
          <Card>
            <FormField label="الاسم بالعربية *" value={nameAr} onChange={setNameAr} placeholder="مثال: عباية دارين" />
            <FormField label="الاسم بالإنجليزية" value={name} onChange={setName} placeholder="Darin Abaya" />
            <FormField label="الوصف" value={description} onChange={setDescription} multiline
              placeholder="وصف قصير يظهر في صفحة المنتج" />
            <FormField label="رمز المنتج (SKU)" value={sku} onChange={setSku} placeholder="اختياري" />
          </Card>

          {/* pricing */}
          <Text style={styles.section}>السعر والخصم</Text>
          <Card>
            <FormField label="السعر الحالي (دج) *" value={price} onChange={setPrice}
              keyboardType="numeric" placeholder="4500" />
            <FormField label="السعر قبل الخصم (دج)" value={comparePrice} onChange={setComparePrice}
              keyboardType="numeric" placeholder="5900 — اختياري" />
            {priceError ? <Text style={styles.error}>{priceError}</Text> : null}
            {!priceError && cmpNum > priceNum && priceNum > 0 && (
              <Text style={styles.hint}>
                الخصم: {Math.round(((cmpNum - priceNum) / cmpNum) * 100)}% · توفير {fmtDZD(cmpNum - priceNum)}
              </Text>
            )}
          </Card>

          {/* stock */}
          <Text style={styles.section}>المخزون</Text>
          <Card>
            <FormField label="الكمية المتوفرة" value={stock} onChange={setStock}
              keyboardType="numeric" placeholder="0" />
            <Text style={styles.hint}>يُحدَّث في warehouse_stock — نفس مصدر الموقع</Text>
          </Card>

          {/* variants */}
          <Text style={styles.section}>المتغيّرات</Text>
          <Card>
            <View style={styles.variantRow}>
              {variants.map(v => (
                <Pressable key={v} style={styles.variantChip} accessibilityRole="button" accessibilityLabel={`حذف المتغيّر ${v}`}
                  onPress={() => setVariants(prev => prev.filter(x => x !== v))}>
                  <Text style={styles.variantText}>{v}</Text>
                  <X size={11} color={color.ink3} />
                </Pressable>
              ))}
            </View>
            <View style={styles.variantAdd}>
              <TextInput value={variantDraft} onChangeText={setVariantDraft}
                placeholder="مثال: M أو أسود" placeholderTextColor={color.ink3}
                style={styles.variantInput} onSubmitEditing={addVariant} returnKeyType="done" />
              <Pressable style={styles.variantBtn} onPress={addVariant} hitSlop={6} accessibilityRole="button" accessibilityLabel="إضافة متغيّر">
                <Plus size={16} color={color.white} />
              </Pressable>
            </View>
          </Card>

          {/* visibility */}
          <Card style={{ marginTop: space[4] }}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>ظاهر في المتجر</Text>
                <Text style={styles.hint}>عند الإيقاف لن يظهر المنتج للزوار</Text>
              </View>
              <Switch value={active} onValueChange={setActive}
                trackColor={{ true: color.br500, false: color.border }} thumbColor={color.white} />
            </View>
          </Card>

          <Button title={isNew ? 'إنشاء المنتج' : 'حفظ التغييرات'}
            onPress={() => save.mutate()} loading={save.isPending}
            style={{ marginTop: 20, opacity: canSave ? 1 : 0.5 }} />

          {!isNew && (
            <Button title="إخفاء المنتج" variant="danger" style={{ marginTop: 10 }}
              icon={<Trash2 size={16} color="#B91C1C" />}
              onPress={() => Alert.alert('إخفاء المنتج؟', 'يمكنك إظهاره لاحقاً.', [
                { text: 'إلغاء', style: 'cancel' },
                {
                  text: 'إخفاء', style: 'destructive',
                  onPress: async () => {
                    try {
                      await api.deleteProduct(String(id))
                      qc.invalidateQueries({ queryKey: ['products'] })
                      router.back()
                    } catch (e: any) { Alert.alert('تعذّر', e?.message) }
                  },
                },
              ])} />
          )}
        </ScrollView>
      )}
    </View>
  )
}

const FormField: React.FC<{
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; keyboardType?: any; multiline?: boolean
}> = ({ label, value, onChange, placeholder, keyboardType, multiline }) => (
  <View style={{ marginBottom: 12 }}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      value={value} onChangeText={onChange} placeholder={placeholder}
      placeholderTextColor={color.ink3} keyboardType={keyboardType}
      multiline={multiline} style={[styles.input, multiline && { height: 84, textAlignVertical: 'top' }]}
    />
  </View>
)

// Every text style goes through text(): React Native cannot synthesise a
// weight for a custom family, so a bare fontWeight silently falls back to
// the system face — which is what made the old screens stop matching the
// site even after the colours were right.
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.page },
  // .c-card__title equivalent for a section heading
  section: { ...text('base', 'semibold'), color: color.ink, marginTop: space[5], marginBottom: space[3] },
  // .c-label
  fieldLabel: { ...text('sm', 'medium'), color: color.ink, marginBottom: space[1] },
  // .c-input
  input: {
    height: control.height.md, paddingHorizontal: control.padInline.md,
    borderRadius: control.radius, borderWidth: 1, borderColor: color.border,
    backgroundColor: color.raised, color: color.ink, ...text('base'),
  },
  // .c-field.is-error .c-hint
  error: { ...text('xs'), color: color.rose700, marginTop: space[1] },
  // .c-hint
  hint: { ...text('xs'), color: color.ink3, marginTop: space[1], lineHeight: 18 },

  imgTile: { width: 82, height: 82, borderRadius: radius.md, backgroundColor: color.sunken },
  imgAdd: {
    alignItems: 'center', justifyContent: 'center', gap: 4,
    borderWidth: 1.5, borderColor: primary[300], borderStyle: 'dashed', backgroundColor: primary[50],
  },
  addText: { ...text('xs', 'semibold'), color: primary[700] },
  imgRemove: {
    position: 'absolute', top: 4, end: 4, width: 20, height: 20, borderRadius: radius.full,
    backgroundColor: 'rgba(15,23,42,0.6)', alignItems: 'center', justifyContent: 'center',
  },
  // .c-badge geometry
  mainBadge: {
    position: 'absolute', bottom: 4, start: 4,
    paddingHorizontal: space[2], paddingVertical: 2,
    borderRadius: radius.full, backgroundColor: primary[600],
  },
  mainBadgeText: { fontFamily: fontFamily.semibold, fontSize: 10, color: color.white },

  variantRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginBottom: space[3] },
  // .c-chip
  variantChip: {
    flexDirection: 'row', alignItems: 'center', gap: space[1],
    height: control.height.sm, paddingHorizontal: space[3],
    borderRadius: radius.full, borderWidth: 1, borderColor: color.border,
    backgroundColor: color.raised,
  },
  variantText: { ...text('sm', 'medium'), color: color.ink2 },
  variantAdd: { flexDirection: 'row', gap: space[2], alignItems: 'center' },
  variantInput: {
    flex: 1, height: control.height.md, paddingHorizontal: control.padInline.md,
    borderRadius: control.radius, borderWidth: 1, borderColor: color.border,
    backgroundColor: color.raised, color: color.ink, ...text('base'),
  },
  // .c-btn--icon — square at the control height
  variantBtn: {
    width: control.height.md, height: control.height.md, borderRadius: control.radius,
    backgroundColor: primary[600], alignItems: 'center', justifyContent: 'center',
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  switchLabel: { ...text('sm', 'medium'), color: color.ink },
})
