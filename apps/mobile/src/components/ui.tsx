// ============================================================
// COMMERCO UI KIT — primitives on the web design system.
// Opaque panels, hairline borders, flat cobalt fills. (GlassCard
// keeps its name for its many call sites; it is no longer glass.)
// GlassCard · BrandHero · KpiCard · AnimatedNumber · Chip
// Skeleton · EmptyState · ErrorState · OfflineBanner · Toast
// StatusPill · Sparkline · Bars · Sheet
// ============================================================
import React, { useEffect, useRef, useState } from 'react'
import {
  View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator,
  Modal, Animated as RNAnimated, Easing as RNEasing, ViewStyle, TextStyle,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg'
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, withRepeat,
  cancelAnimation, Easing,
} from 'react-native-reanimated'
import { color, radius, shadow, font, space, motion, ORDER_STATUS, fmtNum } from '../theme/tokens'
import { IconRefresh, IconClose } from './Icons'

// ── GlassCard ─────────────────────────────────────────────
export const GlassCard: React.FC<{
  children: React.ReactNode; style?: ViewStyle; index?: number; onPress?: () => void
}> = ({ children, style, index = 0, onPress }) => {
  const op = useSharedValue(0)
  const ty = useSharedValue(12)
  // FlashList RECYCLES cells: a recycled row gets a new `index`, which would
  // re-fire the entrance animation and make rows visibly flash while
  // scrolling. Capture the stagger once, on first mount only.
  const staggerRef = useRef(Math.min(index, 8) * 40)
  useEffect(() => {
    // Stagger capped at 8 — never stagger a 100-row list, it feels broken.
    const d = staggerRef.current
    op.value = withDelay(d, withTiming(1, { duration: motion.slow, easing: Easing.bezier(...motion.easeOut) }))
    ty.value = withDelay(d, withTiming(0, { duration: motion.slow, easing: Easing.bezier(...motion.easeOut) }))
    return () => { cancelAnimation(op); cancelAnimation(ty) }
  }, [op, ty])

  const st = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateY: ty.value }] }))
  const Wrapper: any = onPress ? Pressable : View

  return (
    <Animated.View style={[st, styles.cardShadow, style]}>
      <Wrapper onPress={onPress} style={styles.card}>
        {children}
      </Wrapper>
    </Animated.View>
  )
}

// ── BrandHero (cobalt→teal, tracing the logo) ─────────────
export const BrandHero: React.FC<{ children: React.ReactNode; style?: ViewStyle }> = ({ children, style }) => (
  <LinearGradient
    colors={[color.br600, color.br700, color.tl600]}
    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
    style={[styles.hero, style]}
  >
    <LinearGradient
      colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']}
      start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
    {children}
  </LinearGradient>
)

// ── AnimatedNumber (count-up) ─────────────────────────────
export const AnimatedNumber: React.FC<{
  value: number; suffix?: string; style?: TextStyle; duration?: number
}> = ({ value, suffix = '', style, duration = 900 }) => {
  const [display, setDisplay] = useState(0)
  const anim = useRef(new RNAnimated.Value(0)).current
  const from = useRef(0)

  useEffect(() => {
    const start = from.current
    const target = Number.isFinite(value) ? value : 0
    anim.setValue(0)
    const id = anim.addListener(({ value: p }) => setDisplay(start + (target - start) * p))
    const animation = RNAnimated.timing(anim, {
      toValue: 1, duration, easing: RNEasing.out(RNEasing.cubic), useNativeDriver: false,
    })
    animation.start(() => { from.current = target })
    return () => {
      // Both are required: removeListener alone leaves the timing driver
      // running and setting state after unmount.
      anim.removeListener(id)
      animation.stop()
    }
  }, [value, duration, anim])

  return (
    <Text style={style} accessibilityRole="text">
      {fmtNum(display)}{suffix}
    </Text>
  )
}

// ── KpiCard ───────────────────────────────────────────────
export const KpiCard: React.FC<{
  label: string; value: number; delta?: number; icon?: React.ReactNode
  iconBg?: string; index?: number; suffix?: string
}> = ({ label, value, delta, icon, iconBg = color.br50, index = 0, suffix }) => {
  const up = (delta ?? 0) >= 0
  return (
    <GlassCard index={index} style={styles.kpi}>
      <View style={styles.rowBetween}>
        {icon ? <View style={[styles.kpiIcon, { backgroundColor: iconBg }]}>{icon}</View> : <View />}
        {delta !== undefined && (
          <View style={[styles.deltaChip, up ? styles.deltaUp : styles.deltaDown]}>
            <Text style={[styles.deltaText, { color: up ? color.success : color.rose700 }]}>
              {up ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
            </Text>
          </View>
        )}
      </View>
      <AnimatedNumber value={value} suffix={suffix} style={styles.kpiValue} />
      <Text style={styles.label}>{label}</Text>
    </GlassCard>
  )
}

// ── Chip row ──────────────────────────────────────────────
export const Chips: React.FC<{
  items: Array<{ key: string; label: string }>; active: string; onChange: (k: string) => void
}> = ({ items, active, onChange }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
    {items.map(it => {
      const on = it.key === active
      const a11y = {
        accessibilityRole: 'button' as const,
        accessibilityLabel: it.label,
        accessibilityState: { selected: on },
      }
      return on ? (
        <Pressable key={it.key} onPress={() => onChange(it.key)} {...a11y}>
          <View style={[styles.chip, styles.chipOn, { backgroundColor: color.br600 }]}>
            <Text style={[styles.chipText, { color: color.white }]}>{it.label}</Text>
          </View>
        </Pressable>
      ) : (
        <Pressable key={it.key} onPress={() => onChange(it.key)} style={styles.chip} {...a11y}>
          <Text style={styles.chipText}>{it.label}</Text>
        </Pressable>
      )
    })}
  </ScrollView>
)

// ── StatusPill (19 real statuses) ─────────────────────────
export const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const s = (ORDER_STATUS as any)[status] ?? { ar: status, bg: color.sunken, fg: color.ink2 }
  return (
    <View style={[styles.status, { backgroundColor: s.bg }]}>
      <Text style={[styles.statusText, { color: s.fg }]}>{s.ar}</Text>
    </View>
  )
}

// ── Sparkline ─────────────────────────────────────────────
export const Sparkline: React.FC<{
  data: number[]; height?: number; stroke?: string; width?: number
}> = ({ data, height = 34, stroke = color.br500, width = 260 }) => {
  // A single NaN/undefined from the API would produce "MNaN,NaN", which is an
  // invalid path and throws inside the native SVG renderer on Android.
  const safe = (data ?? []).map(v => (Number.isFinite(v) ? v : 0))
  if (!safe.length) return <View style={{ height }} />
  const max = Math.max(...safe, 1)
  const d = safe.map((y, i) =>
    `${i ? 'L' : 'M'}${((i / Math.max(safe.length - 1, 1)) * width).toFixed(1)},${(height - (y / max) * height).toFixed(1)}`
  ).join(' ')
  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <Defs>
        <SvgGrad id="spark" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={color.br600} /><Stop offset="1" stopColor={color.tl600} />
        </SvgGrad>
      </Defs>
      <Path d={d} stroke={stroke === 'grad' ? 'url(#spark)' : stroke} strokeWidth={2.4}
        fill="none" strokeLinecap="round" />
    </Svg>
  )
}

// ── Bars (hourly / period) ────────────────────────────────
export const Bars: React.FC<{ data: number[]; height?: number }> = ({ data, height = 118 }) => {
  // Same NaN guard as Sparkline — a NaN height percentage breaks layout.
  const safe = (data ?? []).map(v => (Number.isFinite(v) ? v : 0))
  const max = Math.max(...safe, 1)
  return (
    <View style={[styles.bars, { height }]}>
      {safe.map((v, i) => <Bar key={i} pct={Math.max((v / max) * 100, 3)} delay={i * 20} />)}
    </View>
  )
}
const Bar: React.FC<{ pct: number; delay: number }> = ({ pct, delay }) => {
  const h = useSharedValue(0)
  useEffect(() => {
    h.value = withDelay(delay, withTiming(pct, { duration: 700, easing: Easing.bezier(...motion.easeOut) }))
    return () => cancelAnimation(h)
  }, [pct, delay, h])
  const st = useAnimatedStyle(() => ({ height: `${h.value}%` }))
  return (
    <Animated.View style={[styles.bar, st]}>
      <LinearGradient colors={[color.br500, 'rgba(41,82,227,0.16)']} style={StyleSheet.absoluteFill} />
    </Animated.View>
  )
}

// ── States ────────────────────────────────────────────────
export const Skeleton: React.FC<{ h?: number; w?: any; style?: ViewStyle }> = ({ h = 14, w = '100%', style }) => {
  const o = useSharedValue(0.5)
  useEffect(() => {
    // withRepeat(-1, reverse) instead of a self-rescheduling callback: the old
    // version had no cleanup, so every skeleton kept looping forever after
    // unmount (ListSkeleton alone mounts 15 of them) and they accumulated on
    // each navigation. withRepeat is cancelled by cancelAnimation below.
    o.value = withRepeat(withTiming(1, { duration: 700 }), -1, true)
    return () => cancelAnimation(o)
  }, [o])
  const st = useAnimatedStyle(() => ({ opacity: o.value }))
  return <Animated.View style={[{ height: h, width: w, borderRadius: 10, backgroundColor: '#EEF2F7' }, st, style]} />
}

export const ListSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <View style={{ gap: 10 }}>
    {Array.from({ length: rows }).map((_, i) => (
      <View key={i} style={[styles.card, styles.cardShadow, { flexDirection: 'row', gap: 11, alignItems: 'center' }]}>
        <Skeleton h={44} w={44} style={{ borderRadius: 14 }} />
        <View style={{ flex: 1, gap: 7 }}>
          <Skeleton h={12} w="58%" /><Skeleton h={10} w="38%" />
        </View>
      </View>
    ))}
  </View>
)

export const EmptyState: React.FC<{ icon?: React.ReactNode; title: string; body?: string }> = ({ icon, title, body }) => (
  <View style={styles.centerBox}>
    {icon ? <View style={{ opacity: 0.45, marginBottom: 12 }}>{icon}</View> : null}
    <Text style={styles.emptyTitle}>{title}</Text>
    {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
  </View>
)

export const ErrorState: React.FC<{ message?: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <View style={styles.centerBox}>
    <Text style={styles.emptyTitle}>تعذّر تحميل البيانات</Text>
    <Text style={styles.emptyBody}>{message ?? 'حدث خطأ في الاتصال بالخادم'}</Text>
    {onRetry && (
      <Pressable onPress={onRetry} style={styles.retryBtn}>
        <IconRefresh size={16} color={color.br700} />
        <Text style={styles.retryText}>إعادة المحاولة</Text>
      </Pressable>
    )}
  </View>
)

export const OfflineBanner: React.FC<{ ageMinutes?: number }> = ({ ageMinutes }) => (
  <View style={styles.offline}>
    <Text style={styles.offlineText}>
      أنت غير متصل — تُعرض بيانات محفوظة{ageMinutes != null ? ` منذ ${ageMinutes} دقيقة` : ''}
    </Text>
  </View>
)

export const Loading: React.FC = () => (
  <View style={styles.centerBox}><ActivityIndicator color={color.br500} size="large" /></View>
)

// ── Bottom sheet ──────────────────────────────────────────
export const Sheet: React.FC<{
  visible: boolean; onClose: () => void; title?: string; children: React.ReactNode
}> = ({ visible, onClose, title, children }) => {
  const insets = useSafeAreaInsets()
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={styles.sheetOverlay}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="إغلاق"
      >
        {/* Touches do not bubble in RN — the inner Pressable simply becomes the
            responder, so tapping the sheet body never closes it. */}
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 18 }]}
          accessibilityViewIsModal
        >
          <View style={styles.grab} />
          {title ? <Text style={styles.sheetTitle} accessibilityRole="header">{title}</Text> : null}
          <ScrollView style={{ maxHeight: 460 }}>{children}</ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

export const SheetOption: React.FC<{ children: React.ReactNode; onPress?: () => void; active?: boolean }> =
  ({ children, onPress, active }) => (
    <Pressable
      onPress={onPress}
      style={[styles.option, active && styles.optionActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
    >
      {children}
    </Pressable>
  )

// ── Button ────────────────────────────────────────────────
export const Button: React.FC<{
  title: string; onPress: () => void; variant?: 'primary' | 'glass' | 'danger'
  loading?: boolean; icon?: React.ReactNode; style?: ViewStyle
}> = ({ title, onPress, variant = 'primary', loading, icon, style }) => {
  // Shared by both variants so screen readers announce state consistently.
  const a11y = {
    accessibilityRole: 'button' as const,
    accessibilityLabel: title,
    accessibilityState: { disabled: !!loading, busy: !!loading },
  }
  if (variant === 'primary') {
    return (
      // Flat cobalt, not a gradient: the web system paints primary buttons
      // with a single --color-primary-600 fill.
      <Pressable onPress={onPress} disabled={loading} {...a11y}
        style={({ pressed }) => [
          styles.btn, { backgroundColor: pressed ? color.br700 : color.br600, borderRadius: radius.md },
          shadow.sm, style,
        ]}>
        {loading ? <ActivityIndicator color="#fff" /> : (
          <View style={styles.btnInner}>{icon}<Text style={styles.btnTextPrimary}>{title}</Text></View>
        )}
      </Pressable>
    )
  }
  return (
    <Pressable onPress={onPress} disabled={loading} {...a11y}
      style={[styles.btn, styles.btnGlass, variant === 'danger' && styles.btnDanger, style]}>
      {loading ? <ActivityIndicator color={color.br600} /> : (
        <View style={styles.btnInner}>
          {icon}
          <Text style={[styles.btnText, variant === 'danger' && { color: color.rose700 }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  // Web panels are opaque white on a hairline border — no translucency, no
  // sheen. Glass over a scrolling list also forced a full repaint per frame.
  cardShadow: { borderRadius: radius.lg, ...shadow.xs, marginBottom: 12 },
  card: {
    backgroundColor: color.surface, borderRadius: radius.lg, padding: 16,
    borderWidth: 1, borderColor: color.border, overflow: 'hidden',
  },
  hero: { padding: 20, borderRadius: radius.lg, overflow: 'hidden', ...shadow.sm },
  kpi: { flex: 1, padding: 16 },
  kpiIcon: { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  kpiValue: { fontSize: font.h2, fontWeight: '800', color: color.ink, marginTop: 8, marginBottom: 4, fontVariant: ['tabular-nums'] },
  label: { fontSize: font.label, fontWeight: '600', color: color.ink2 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  deltaChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  deltaUp: { backgroundColor: color.success50 }, deltaDown: { backgroundColor: color.rose50 },
  deltaText: { fontSize: font.micro, fontWeight: '700' },
  chipsRow: { gap: 7, paddingHorizontal: 16, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill,
    backgroundColor: color.surface, borderWidth: 1, borderColor: color.border,
  },
  chipOn: { borderColor: 'transparent' },
  chipText: { fontSize: font.small, fontWeight: '600', color: color.ink2 },
  status: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.sm },
  statusText: { fontSize: font.micro, fontWeight: '700' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, paddingTop: 8 },
  bar: { flex: 1, borderTopLeftRadius: 5, borderTopRightRadius: 5, overflow: 'hidden', minHeight: 3 },
  centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 54, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: color.ink, marginBottom: 6, textAlign: 'center' },
  emptyBody: { fontSize: 12.5, color: color.ink3, lineHeight: 21, textAlign: 'center' },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 16,
    paddingHorizontal: 16, paddingVertical: 11, borderRadius: radius.md,
    backgroundColor: color.br50, borderWidth: 1, borderColor: color.br100,
  },
  retryText: { color: color.br700, fontWeight: '800', fontSize: 13 },
  offline: { backgroundColor: color.amber50, padding: 10, borderRadius: radius.md, marginBottom: 10 },
  offlineText: { color: '#B45309', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.32)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: 'rgba(255,255,255,0.97)', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    paddingHorizontal: 18, paddingTop: 10, paddingBottom: 34,
  },
  grab: { width: 38, height: 4.5, borderRadius: 3, backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: color.ink, marginBottom: 14 },
  option: {
    paddingHorizontal: 13, paddingVertical: 14, borderRadius: radius.md, marginBottom: 8,
    backgroundColor: color.glass2, borderWidth: 1, borderColor: color.hairline,
    flexDirection: 'row', alignItems: 'center', gap: 11,
  },
  optionActive: { borderColor: color.br400 },
  // 48px tall at these paddings — comfortably over the 44px touch minimum.
  btn: { paddingVertical: 14, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnGlass: { backgroundColor: color.surface, borderWidth: 1, borderColor: color.borderStrong },
  btnDanger: { backgroundColor: color.rose50, borderColor: color.rose100 },
  btnTextPrimary: { color: color.white, fontWeight: '700', fontSize: 15 },
  btnText: { color: color.ink, fontWeight: '600', fontSize: 15 },
})
