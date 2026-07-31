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
import { GlassCard, Button, Skeleton, ErrorState } from '../../src/components/ui'
import { IconBack, IconPlus, IconClose, IconImage, IconTrash } from '../../src/components/Icons'
import { color, font, radius, shadow, fmtDZD } from '../../src/theme/tokens'

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
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()} hitSlop={8}>
          <IconBack size={18} color={color.ink2} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{isNew ? 'منتج جديد' : 'تعديل المنتج'}</Text>
          <Text style={styles.sub}>{isNew ? 'أضف منتجاً إلى متجرك' : nameAr || name}</Text>
        </View>
      </View>

      {!isNew && q.isError ? (
        <ErrorState message={(q.error as any)?.message} onRetry={() => q.refetch()} />
      ) : !isNew && q.isLoading ? (
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          <Skeleton h={120} /><Skeleton h={90} /><Skeleton h={90} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled">

          {/* images */}
          <Text style={styles.section}>صور المنتج</Text>
          <GlassCard index={0}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 9 }}>
              {images.map((img, i) => (
                <View key={img.url + i}>
                  <Image source={{ uri: img.url }} style={styles.imgTile} contentFit="cover"
                    cachePolicy="memory-disk" alt={`صورة المنتج ${i + 1}`} />
                  <Pressable style={styles.imgRemove} onPress={() => removeImage(i)} hitSlop={6}>
                    <IconClose size={12} color={color.white} />
                  </Pressable>
                  {i === 0 && <View style={styles.mainBadge}><Text style={styles.mainBadgeText}>رئيسية</Text></View>}
                </View>
              ))}
              <Pressable style={[styles.imgTile, styles.imgAdd]} onPress={pickImage} disabled={uploading}>
                {uploading
                  ? <Text style={styles.addText}>...</Text>
                  : <><IconImage size={20} color={color.em600} /><Text style={styles.addText}>إضافة</Text></>}
              </Pressable>
            </ScrollView>
          </GlassCard>

          {/* basics */}
          <Text style={styles.section}>المعلومات الأساسية</Text>
          <GlassCard index={1}>
            <Field label="الاسم بالعربية *" value={nameAr} onChange={setNameAr} placeholder="مثال: عباية دارين" />
            <Field label="الاسم بالإنجليزية" value={name} onChange={setName} placeholder="Darin Abaya" />
            <Field label="الوصف" value={description} onChange={setDescription} multiline
              placeholder="وصف قصير يظهر في صفحة المنتج" />
            <Field label="رمز المنتج (SKU)" value={sku} onChange={setSku} placeholder="اختياري" />
          </GlassCard>

          {/* pricing */}
          <Text style={styles.section}>السعر والخصم</Text>
          <GlassCard index={2}>
            <Field label="السعر الحالي (دج) *" value={price} onChange={setPrice}
              keyboardType="numeric" placeholder="4500" />
            <Field label="السعر قبل الخصم (دج)" value={comparePrice} onChange={setComparePrice}
              keyboardType="numeric" placeholder="5900 — اختياري" />
            {priceError ? <Text style={styles.error}>{priceError}</Text> : null}
            {!priceError && cmpNum > priceNum && priceNum > 0 && (
              <Text style={styles.hint}>
                الخصم: {Math.round(((cmpNum - priceNum) / cmpNum) * 100)}% · توفير {fmtDZD(cmpNum - priceNum)}
              </Text>
            )}
          </GlassCard>

          {/* stock */}
          <Text style={styles.section}>المخزون</Text>
          <GlassCard index={3}>
            <Field label="الكمية المتوفرة" value={stock} onChange={setStock}
              keyboardType="numeric" placeholder="0" />
            <Text style={styles.hint}>يُحدَّث في warehouse_stock — نفس مصدر الموقع</Text>
          </GlassCard>

          {/* variants */}
          <Text style={styles.section}>المتغيّرات</Text>
          <GlassCard index={4}>
            <View style={styles.variantRow}>
              {variants.map(v => (
                <Pressable key={v} style={styles.variantChip}
                  onPress={() => setVariants(prev => prev.filter(x => x !== v))}>
                  <Text style={styles.variantText}>{v}</Text>
                  <IconClose size={11} color={color.ink3} />
                </Pressable>
              ))}
            </View>
            <View style={styles.variantAdd}>
              <TextInput value={variantDraft} onChangeText={setVariantDraft}
                placeholder="مثال: M أو أسود" placeholderTextColor={color.ink3}
                style={styles.variantInput} onSubmitEditing={addVariant} returnKeyType="done" />
              <Pressable style={styles.variantBtn} onPress={addVariant} hitSlop={6}>
                <IconPlus size={16} color={color.white} />
              </Pressable>
            </View>
          </GlassCard>

          {/* visibility */}
          <GlassCard index={5} style={{ marginTop: 16 }}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>ظاهر في المتجر</Text>
                <Text style={styles.hint}>عند الإيقاف لن يظهر المنتج للزوار</Text>
              </View>
              <Switch value={active} onValueChange={setActive}
                trackColor={{ true: color.em500, false: '#E2E8F0' }} thumbColor={color.white} />
            </View>
          </GlassCard>

          <Button title={isNew ? 'إنشاء المنتج' : 'حفظ التغييرات'}
            onPress={() => save.mutate()} loading={save.isPending}
            style={{ marginTop: 20, opacity: canSave ? 1 : 0.5 }} />

          {!isNew && (
            <Button title="إخفاء المنتج" variant="danger" style={{ marginTop: 10 }}
              icon={<IconTrash size={16} color="#B91C1C" />}
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

const Field: React.FC<{
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 16, paddingBottom: 10 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 999, backgroundColor: color.glass2,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: color.hairline, ...shadow.xs,
  },
  title: { fontSize: 17, fontWeight: '800', color: color.ink },
  sub: { fontSize: 11.5, fontWeight: '600', color: color.ink3, marginTop: 1 },
  section: { fontSize: 14.5, fontWeight: '800', color: color.ink, marginTop: 20, marginBottom: 11 },
  fieldLabel: { fontSize: font.label, fontWeight: '700', color: color.ink3, marginBottom: 6 },
  input: {
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: radius.md, fontSize: 14,
    color: color.ink, backgroundColor: color.white, borderWidth: 1, borderColor: color.hairline,
  },
  error: { color: '#B91C1C', fontSize: 12, fontWeight: '700', marginTop: -4 },
  hint: { color: color.ink3, fontSize: 11, fontWeight: '600', marginTop: 4, lineHeight: 17 },
  imgTile: { width: 82, height: 82, borderRadius: radius.md, backgroundColor: color.sunken },
  imgAdd: {
    alignItems: 'center', justifyContent: 'center', gap: 4,
    borderWidth: 1.5, borderColor: color.em300, borderStyle: 'dashed', backgroundColor: color.em50,
  },
  addText: { fontSize: 10.5, fontWeight: '800', color: color.em700 },
  imgRemove: {
    position: 'absolute', top: 4, end: 4, width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(15,23,42,0.6)', alignItems: 'center', justifyContent: 'center',
  },
  mainBadge: {
    position: 'absolute', bottom: 4, start: 4, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 999, backgroundColor: color.em600,
  },
  mainBadgeText: { color: color.white, fontSize: 8.5, fontWeight: '800' },
  variantRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 10 },
  variantChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 999, backgroundColor: color.sunken,
  },
  variantText: { fontSize: 12.5, fontWeight: '700', color: color.ink },
  variantAdd: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  variantInput: {
    flex: 1, paddingHorizontal: 14, paddingVertical: 11, borderRadius: radius.md, fontSize: 13.5,
    color: color.ink, backgroundColor: color.white, borderWidth: 1, borderColor: color.hairline,
  },
  variantBtn: {
    width: 40, height: 40, borderRadius: radius.md, backgroundColor: color.em600,
    alignItems: 'center', justifyContent: 'center',
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchLabel: { fontSize: 13.5, fontWeight: '800', color: color.ink },
})
