// ============================================================
// ALGERIA WILAYA MAP — 58 official wilayas.
//
// WHY A TILE CARTOGRAM AND NOT AN OUTLINE MAP:
// verified against the live DB — `wilayas` holds exactly 58 rows and every
// `orders.wilaya_id` is a FOREIGN KEY to it, so ids 59–69 (which appear in
// the legacy web map constant) are DELIVERY ZONES, not wilayas, and can
// never carry order data. Rendering them would create permanently empty
// regions. Delivery zones live in the Delivery screen instead.
//
// Tiles are positioned on a 14×11 grid that approximates real geography
// (dense northern coast, sparse Sahara). Intensity is computed from the
// data — the highest-order wilaya always gets the strongest colour. No
// wilaya is ever hardcoded.
// ============================================================
import React, { useMemo, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withDelay, withTiming, Easing } from 'react-native-reanimated'
import { color, radius, font, motion, fmtDZD, fmtNum } from '../theme/tokens'

/** id → [column, row] on a 14×11 grid. All 58 wilayas, none omitted. */
export const WILAYA_GRID: Record<number, [number, number]> = {
  46: [1, 1], 31: [2, 1], 27: [3, 1], 2: [4, 1], 42: [5, 1], 16: [6, 1], 35: [7, 1],
  15: [8, 1], 6: [9, 1], 18: [10, 1], 21: [11, 1], 23: [12, 1], 36: [13, 1],
  13: [1, 2], 22: [2, 2], 29: [3, 2], 48: [4, 2], 44: [5, 2], 9: [6, 2], 10: [7, 2],
  34: [8, 2], 19: [9, 2], 43: [10, 2], 25: [11, 2], 24: [12, 2], 41: [13, 2],
  20: [2, 3], 14: [3, 3], 38: [4, 3], 26: [5, 3], 28: [7, 3], 5: [9, 3], 4: [10, 3],
  40: [11, 3], 12: [13, 3],
  45: [1, 4], 32: [2, 4], 3: [4, 4], 17: [6, 4], 51: [8, 4], 7: [9, 4], 57: [10, 4], 39: [11, 4],
  8: [1, 5], 52: [2, 5], 47: [6, 5], 30: [8, 5], 55: [9, 5],
  58: [6, 6], 37: [1, 6], 49: [3, 6], 33: [11, 6],
  1: [3, 7], 53: [5, 7],
  56: [9, 8], 11: [6, 9], 50: [3, 9], 54: [6, 10],
}

/** Bilingual names — Arabic + French, as the brief requires on tap. */
export const WILAYA_NAMES: Record<number, { ar: string; fr: string }> = {
  1: { ar: 'أدرار', fr: 'Adrar' }, 2: { ar: 'الشلف', fr: 'Chlef' }, 3: { ar: 'الأغواط', fr: 'Laghouat' },
  4: { ar: 'أم البواقي', fr: 'Oum El Bouaghi' }, 5: { ar: 'باتنة', fr: 'Batna' }, 6: { ar: 'بجاية', fr: 'Béjaïa' },
  7: { ar: 'بسكرة', fr: 'Biskra' }, 8: { ar: 'بشار', fr: 'Béchar' }, 9: { ar: 'البليدة', fr: 'Blida' },
  10: { ar: 'البويرة', fr: 'Bouira' }, 11: { ar: 'تمنراست', fr: 'Tamanrasset' }, 12: { ar: 'تبسة', fr: 'Tébessa' },
  13: { ar: 'تلمسان', fr: 'Tlemcen' }, 14: { ar: 'تيارت', fr: 'Tiaret' }, 15: { ar: 'تيزي وزو', fr: 'Tizi Ouzou' },
  16: { ar: 'الجزائر', fr: 'Alger' }, 17: { ar: 'الجلفة', fr: 'Djelfa' }, 18: { ar: 'جيجل', fr: 'Jijel' },
  19: { ar: 'سطيف', fr: 'Sétif' }, 20: { ar: 'سعيدة', fr: 'Saïda' }, 21: { ar: 'سكيكدة', fr: 'Skikda' },
  22: { ar: 'سيدي بلعباس', fr: 'Sidi Bel Abbès' }, 23: { ar: 'عنابة', fr: 'Annaba' }, 24: { ar: 'قالمة', fr: 'Guelma' },
  25: { ar: 'قسنطينة', fr: 'Constantine' }, 26: { ar: 'المدية', fr: 'Médéa' }, 27: { ar: 'مستغانم', fr: 'Mostaganem' },
  28: { ar: 'المسيلة', fr: "M'Sila" }, 29: { ar: 'معسكر', fr: 'Mascara' }, 30: { ar: 'ورقلة', fr: 'Ouargla' },
  31: { ar: 'وهران', fr: 'Oran' }, 32: { ar: 'البيض', fr: 'El Bayadh' }, 33: { ar: 'إليزي', fr: 'Illizi' },
  34: { ar: 'برج بوعريريج', fr: 'Bordj Bou Arréridj' }, 35: { ar: 'بومرداس', fr: 'Boumerdès' },
  36: { ar: 'الطارف', fr: 'El Tarf' }, 37: { ar: 'تندوف', fr: 'Tindouf' }, 38: { ar: 'تيسمسيلت', fr: 'Tissemsilt' },
  39: { ar: 'الوادي', fr: 'El Oued' }, 40: { ar: 'خنشلة', fr: 'Khenchela' }, 41: { ar: 'سوق أهراس', fr: 'Souk Ahras' },
  42: { ar: 'تيبازة', fr: 'Tipaza' }, 43: { ar: 'ميلة', fr: 'Mila' }, 44: { ar: 'عين الدفلى', fr: 'Aïn Defla' },
  45: { ar: 'النعامة', fr: 'Naâma' }, 46: { ar: 'عين تموشنت', fr: 'Aïn Témouchent' }, 47: { ar: 'غرداية', fr: 'Ghardaïa' },
  48: { ar: 'غليزان', fr: 'Relizane' }, 49: { ar: 'تيميمون', fr: 'Timimoun' },
  50: { ar: 'برج باجي مختار', fr: 'Bordj Badji Mokhtar' }, 51: { ar: 'أولاد جلال', fr: 'Ouled Djellal' },
  52: { ar: 'بني عباس', fr: 'Béni Abbès' }, 53: { ar: 'عين صالح', fr: 'In Salah' }, 54: { ar: 'عين قزام', fr: 'In Guezzam' },
  55: { ar: 'تقرت', fr: 'Touggourt' }, 56: { ar: 'جانت', fr: 'Djanet' }, 57: { ar: 'المغير', fr: "El M'Ghair" },
  58: { ar: 'المنيعة', fr: 'El Meniaa' },
}

export interface WilayaDatum { id: number; name: string; count: number; pct: number }

const COLS = 14, ROWS = 11

/** Green scale — intensity is relative to the max in the CURRENT range. */
function shade(count: number, max: number): string {
  if (!count) return '#F1F5F9'
  const t = count / Math.max(max, 1)
  if (t < 0.25) return color.br100
  if (t < 0.5) return color.br300
  if (t < 0.75) return color.br500
  return color.br700
}

export default function WilayaMap({
  data, compact = false, onSelect,
}: { data: WilayaDatum[]; compact?: boolean; onSelect?: (d: WilayaDatum & { fr: string }) => void }) {
  const [selected, setSelected] = useState<number | null>(null)

  const { byId, max, total } = useMemo(() => {
    const m: Record<number, WilayaDatum> = {}
    let mx = 0, t = 0
    for (const d of data) { m[d.id] = d; mx = Math.max(mx, d.count); t += d.count }
    return { byId: m, max: mx, total: t }
  }, [data])

  const [w, setW] = useState(0)
  const gap = 2.5
  const tile = w ? (w - gap * (COLS - 1)) / COLS : 0

  const pick = (id: number) => {
    const d = byId[id] ?? { id, name: WILAYA_NAMES[id]?.ar ?? `${id}`, count: 0, pct: 0 }
    setSelected(id)
    onSelect?.({ ...d, fr: WILAYA_NAMES[id]?.fr ?? '' })
  }

  return (
    <View>
      <View onLayout={e => setW(e.nativeEvent.layout.width)} style={{ height: tile ? tile * ROWS + gap * (ROWS - 1) : 180 }}>
        {tile > 0 && Object.entries(WILAYA_GRID).map(([idStr, [c, r]], i) => {
          const id = Number(idStr)
          const d = byId[id]
          const count = d?.count ?? 0
          const isMax = count > 0 && count === max
          return (
            <Tile
              key={id}
              index={i}
              size={tile}
              // Grid → absolute px. `start` is writing-direction aware, so the
              // cartogram is not mirrored in RTL (geography must stay correct).
              start={(c - 1) * (tile + gap)}
              top={(r - 1) * (tile + gap)}
              fill={shade(count, max)}
              highlight={isMax}
              selected={selected === id}
              onPress={() => pick(id)}
            />
          )
        })}
      </View>

      {/* legend */}
      <View style={styles.legend}>
        <Text style={styles.legendText}>0</Text>
        <View style={styles.scale}>
          {[color.sunken, color.br100, color.br300, color.br500, color.br700].map(c => (
            <View key={c} style={{ flex: 1, backgroundColor: c }} />
          ))}
        </View>
        <Text style={styles.legendText}>{fmtNum(max)}</Text>
      </View>

      {!compact && selected != null && (
        <View style={styles.detail}>
          <Text style={styles.detailAr}>{WILAYA_NAMES[selected]?.ar}</Text>
          <Text style={styles.detailFr}>{WILAYA_NAMES[selected]?.fr}</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailStat}>{fmtNum(byId[selected]?.count ?? 0)} طلب</Text>
            <Text style={styles.detailStat}>
              {total ? Math.round(((byId[selected]?.count ?? 0) / total) * 100) : 0}% من الإجمالي
            </Text>
          </View>
        </View>
      )}

      {compact && (
        <Text style={styles.note}>58 ولاية — التقسيم الإداري الرسمي للجزائر</Text>
      )}
    </View>
  )
}

function Tile({
  index, size, start, top, fill, highlight, selected, onPress,
}: {
  index: number; size: number; start: number; top: number
  fill: string; highlight: boolean; selected: boolean; onPress: () => void
}) {
  const o = useSharedValue(0)
  const s = useSharedValue(0.4)
  React.useEffect(() => {
    const d = index * 8
    o.value = withDelay(d, withTiming(1, { duration: 460, easing: Easing.bezier(...motion.easeOut) }))
    s.value = withDelay(d, withTiming(1, { duration: 460, easing: Easing.bezier(...motion.easeOut) }))
  }, [index, o, s])

  const st = useAnimatedStyle(() => ({
    opacity: o.value,
    transform: [{ scale: s.value * (selected ? 1.25 : 1) }],
  }))

  return (
    <Animated.View style={[
      { position: 'absolute', start, top, width: size, height: size },
      st,
    ]}>
      <Pressable
        onPress={onPress}
        style={[
          { flex: 1, borderRadius: 4, backgroundColor: fill },
          highlight && styles.highlight,
        ]}
        hitSlop={2}
      />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  highlight: { borderWidth: 2, borderColor: color.br700 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 6, paddingTop: 8, paddingBottom: 4 },
  legendText: { fontSize: 10.5, fontWeight: '700', color: color.ink3 },
  scale: { flex: 1, height: 8, borderRadius: 5, overflow: 'hidden', flexDirection: 'row' },
  note: { fontSize: 10.5, fontWeight: '700', color: color.ink3, textAlign: 'center', paddingBottom: 4 },
  detail: {
    marginTop: 10, padding: 14, borderRadius: radius.md,
    backgroundColor: color.br50, borderWidth: 1, borderColor: color.br100,
  },
  detailAr: { fontSize: 16, fontWeight: '800', color: color.ink },
  detailFr: { fontSize: 12, fontWeight: '600', color: color.ink3, marginTop: 2 },
  detailRow: { flexDirection: 'row', gap: 14, marginTop: 8 },
  detailStat: { fontSize: 13, fontWeight: '800', color: color.br700 },
})
