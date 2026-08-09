// ============================================================
// COMMERCO UI KIT
//
// A 1:1 port of the website's component layer (design/components.css,
// the .c-* classes). Every dimension, radius, weight and colour below is
// taken from that file — nothing is invented, simplified or "improved".
//
// Card · Button · Badge · StatusPill · Chip · Field/Input/Textarea
// Skeleton · Spinner · EmptyState · ErrorState · Row · Divider · Sheet
// ============================================================
import React, { useEffect, useRef, useState } from 'react'
import {
  View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, Modal,
  TextInput, Animated, Easing, ViewStyle, TextStyle, StyleProp,
  TextInputProps, AccessibilityRole,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  color, primary, neutral, space, radius, shadow, control, card as cardT,
  text, fontSize, skeleton as skel, spinner as spin, ORDER_STATUS,
} from '../theme/tokens'

// ════════════════════════════════════════════════════════════
// CARD  .c-card
// ════════════════════════════════════════════════════════════
export const Card: React.FC<{
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  onPress?: () => void
  /** Row-action menu equivalent. MUST live here, not on a nested Pressable:
   *  a child Pressable always wins the responder (Pressability returns true
   *  from onStartShouldSetResponder unless disabled), which silently ate the
   *  card's own onPress. */
  onLongPress?: () => void
  padded?: boolean
  accessibilityLabel?: string
}> = ({ children, style, onPress, onLongPress, padded = true, accessibilityLabel }) => {
  const base: StyleProp<ViewStyle> = [styles.card, padded && { padding: cardT.pad }, style]
  if (!onPress && !onLongPress) return <View style={base}>{children}</View>
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      // .c-card--interactive lifts 1px and deepens the shadow on hover;
      // touch has no hover, so the press state carries it instead.
      style={({ pressed }) => [base, pressed && { borderColor: color.borderStrong, ...shadow.md }]}
    >
      {children}
    </Pressable>
  )
}

export const CardTitle: React.FC<{ children: React.ReactNode; style?: StyleProp<TextStyle> }> = ({ children, style }) => (
  <Text style={[styles.cardTitle, style]}>{children}</Text>
)

export const CardSub: React.FC<{ children: React.ReactNode; style?: StyleProp<TextStyle> }> = ({ children, style }) => (
  <Text style={[styles.cardSub, style]}>{children}</Text>
)

// ════════════════════════════════════════════════════════════
// BUTTON  .c-btn + --primary/--secondary/--ghost/--danger, --sm/--lg
// ════════════════════════════════════════════════════════════
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type BtnSize = 'sm' | 'md' | 'lg'

const BTN_FILL: Record<BtnVariant, { rest: string; down: string; border: string; fg: string }> = {
  primary:   { rest: color.primary, down: color.primaryHover, border: 'transparent',      fg: color.onBrand },
  secondary: { rest: color.raised,  down: color.sunken,       border: color.borderStrong, fg: color.ink },
  ghost:     { rest: 'transparent', down: color.sunken,       border: 'transparent',      fg: color.ink2 },
  danger:    { rest: color.error,   down: '#B91C1C',          border: 'transparent',      fg: '#FFFFFF' },
}

export const Button: React.FC<{
  title: string
  onPress?: () => void
  variant?: BtnVariant
  size?: BtnSize
  loading?: boolean
  disabled?: boolean
  icon?: React.ReactNode
  style?: StyleProp<ViewStyle>
  fullWidth?: boolean
}> = ({ title, onPress, variant = 'primary', size = 'md', loading, disabled, icon, style, fullWidth }) => {
  const off = disabled || loading
  const fill = BTN_FILL[variant]

  return (
    <Pressable
      onPress={off ? undefined : onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      style={({ pressed }) => [
        styles.btn,
        {
          height: control.height[size],
          paddingHorizontal: control.padInline[size],
          backgroundColor: pressed ? fill.down : fill.rest,
          borderColor: fill.border,
        },
        fullWidth && { alignSelf: 'stretch' },
        off && { opacity: 0.5 }, // .c-btn:disabled
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fill.fg} />
      ) : (
        <View style={styles.btnInner}>
          {icon}
          <Text style={[text('base', 'semibold'), { color: fill.fg, fontSize: control.fontSize[size] }]}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  )
}

// ════════════════════════════════════════════════════════════
// BADGE  .c-badge — 2px block padding, full radius, xs semibold
// ════════════════════════════════════════════════════════════
type BadgeTone = 'success' | 'warning' | 'error' | 'info' | 'neutral'

const BADGE_TONE: Record<BadgeTone, { bg: string; fg: string }> = {
  success: { bg: '#DCFCE8',   fg: '#15803D' },
  warning: { bg: '#FEF3C7',   fg: '#B45309' },
  error:   { bg: '#FEE2E2',   fg: '#B91C1C' },
  info:    { bg: primary[50], fg: primary[700] },
  neutral: { bg: color.sunken, fg: color.ink2 },
}

export const Badge: React.FC<{ label: string; tone?: BadgeTone; style?: StyleProp<ViewStyle> }> = ({
  label, tone = 'neutral', style,
}) => {
  const t = BADGE_TONE[tone]
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }, style]}>
      <Text style={[text('xs', 'semibold'), { color: t.fg }]} numberOfLines={1}>{label}</Text>
    </View>
  )
}

/** The 19 production order statuses, wearing the web's badge shape. */
export const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const s = (ORDER_STATUS as any)[status] ?? { ar: status, bg: color.sunken, fg: color.ink2 }
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[text('xs', 'semibold'), { color: s.fg }]} numberOfLines={1}>{s.ar}</Text>
    </View>
  )
}

// ════════════════════════════════════════════════════════════
// CHIP  .c-chip — 32px tall, pill, selected = primary-50/300/700
// ════════════════════════════════════════════════════════════
export const Chips: React.FC<{
  items: Array<{ key: string; label: string }>
  active: string
  onChange: (k: string) => void
  style?: StyleProp<ViewStyle>
}> = ({ items, active, onChange, style }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chipRow, style]}>
    {items.map(it => {
      const on = it.key === active
      return (
        <Pressable
          key={it.key}
          onPress={() => onChange(it.key)}
          accessibilityRole="button"
          accessibilityLabel={it.label}
          accessibilityState={{ selected: on }}
          style={[styles.chip, on && { backgroundColor: primary[50], borderColor: primary[300] }]}
        >
          <Text style={[text('sm', on ? 'semibold' : 'medium'), { color: on ? primary[700] : color.ink2 }]}>
            {it.label}
          </Text>
        </Pressable>
      )
    })}
  </ScrollView>
)

// ════════════════════════════════════════════════════════════
// FIELD  .c-field > .c-label + .c-input + .c-hint
// ════════════════════════════════════════════════════════════
export const Field: React.FC<{
  label?: string
  hint?: string
  error?: string
  required?: boolean
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
}> = ({ label, hint, error, required, children, style }) => (
  <View style={[styles.field, style]}>
    {label ? (
      <Text style={[text('sm', 'medium'), { color: color.ink }]}>
        {label}
        {required ? <Text style={{ color: color.error }}> *</Text> : null}
      </Text>
    ) : null}
    {children}
    {error || hint ? (
      <Text style={[text('xs'), { color: error ? color.error : color.ink3 }]}>{error || hint}</Text>
    ) : null}
  </View>
)

export const Input: React.FC<TextInputProps & { invalid?: boolean }> = ({ invalid, style, ...rest }) => {
  const [focused, setFocused] = useState(false)
  return (
    <TextInput
      {...rest}
      onFocus={e => { setFocused(true); rest.onFocus?.(e) }}
      onBlur={e => { setFocused(false); rest.onBlur?.(e) }}
      placeholderTextColor={color.ink3}
      style={[
        styles.input,
        // .c-input:focus — border-focus plus a 3px primary-100 ring. RN has
        // no outline, so the ring is expressed as the border colour shift.
        focused && { borderColor: color.borderFocus },
        invalid && { borderColor: '#EF4444' },
        rest.editable === false && { opacity: 0.55, backgroundColor: color.sunken },
        style,
      ]}
    />
  )
}

export const Textarea: React.FC<TextInputProps & { invalid?: boolean }> = ({ style, ...rest }) => (
  <Input
    {...rest}
    multiline
    textAlignVertical="top"
    // .c-textarea { min-block-size: calc(control-h-md * 2); padding-block: space-2 }
    style={[{ height: undefined, minHeight: control.height.md * 2, paddingVertical: space[2] }, style]}
  />
)

// ════════════════════════════════════════════════════════════
// SKELETON  .c-skeleton — 1.4s shimmer between base and sheen
// ════════════════════════════════════════════════════════════
export const Skeleton: React.FC<{
  width?: number | `${number}%`; height?: number; rounded?: number; style?: StyleProp<ViewStyle>
}> = ({ width = '100%', height = 14, rounded = radius.sm, style }) => {
  const t = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(t, { toValue: 1, duration: 1400, easing: Easing.ease, useNativeDriver: true }),
    )
    loop.start()
    return () => loop.stop()
  }, [t])

  // The CSS animates a 200%-wide gradient across the box. Translating an
  // overlay the same distance reproduces it without rebuilding a gradient
  // every frame.
  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [-200, 200] })

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: rounded, backgroundColor: skel.base, overflow: 'hidden' }, style]}
    >
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: skel.sheen, opacity: 0.6, transform: [{ translateX }] }]}
      />
    </View>
  )
}

/** Rows of skeleton lines — the loading state every list shares. */
export const ListSkeleton: React.FC<{ rows?: number }> = ({ rows = 6 }) => (
  <View style={{ gap: space[3] }}>
    {Array.from({ length: rows }).map((_, i) => (
      <Card key={i}>
        <Skeleton width="45%" height={fontSize.base} />
        <Skeleton width="70%" height={fontSize.sm} style={{ marginTop: space[2] }} />
      </Card>
    ))}
  </View>
)

// ════════════════════════════════════════════════════════════
// SPINNER  .c-spinner — 20px, 2.5px track, primary head
// ════════════════════════════════════════════════════════════
export const Spinner: React.FC<{ size?: number; color?: string }> = ({ size = spin.size, color: c = spin.head }) => (
  <ActivityIndicator size={size > 24 ? 'large' : 'small'} color={c} />
)

export const Loading: React.FC<{ label?: string }> = ({ label }) => (
  <View style={styles.centered}>
    <Spinner />
    {label ? <Text style={[text('sm'), { color: color.ink2, marginTop: space[3] }]}>{label}</Text> : null}
  </View>
)

// ════════════════════════════════════════════════════════════
// EMPTY  .c-empty — 56px primary-50 circle, lg bold title, base sub
// ════════════════════════════════════════════════════════════
export const EmptyState: React.FC<{
  icon?: React.ReactNode; title: string; sub?: string; action?: React.ReactNode
}> = ({ icon, title, sub, action }) => (
  <View style={styles.empty}>
    {icon ? <View style={styles.emptyIcon}>{icon}</View> : null}
    <Text style={[text('lg', 'bold'), { color: color.ink, textAlign: 'center' }]}>{title}</Text>
    {sub ? <Text style={[text('base'), styles.emptySub]}>{sub}</Text> : null}
    {action ? <View style={{ marginTop: space[4] }}>{action}</View> : null}
  </View>
)

export const ErrorState: React.FC<{ message?: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <EmptyState
    title="تعذّر تحميل البيانات"
    sub={message || 'تحقّق من اتصالك ثم أعد المحاولة.'}
    action={onRetry ? <Button title="إعادة المحاولة" onPress={onRetry} variant="secondary" /> : undefined}
  />
)

// ════════════════════════════════════════════════════════════
// ROW  .c-table td — 48px tall, hairline top border, space-4 inline
// ════════════════════════════════════════════════════════════
export const Row: React.FC<{
  children: React.ReactNode
  onPress?: () => void
  first?: boolean
  dense?: boolean
  style?: StyleProp<ViewStyle>
  accessibilityLabel?: string
  accessibilityRole?: AccessibilityRole
}> = ({ children, onPress, first, dense, style, accessibilityLabel, accessibilityRole = 'button' }) => {
  const body = (
    <View
      style={[
        styles.row,
        { minHeight: dense ? 40 : 48 },
        first && { borderTopWidth: 0 }, // collapsed borders: only the first row has no top edge
        style,
      ]}
    >
      {children}
    </View>
  )
  if (!onPress) return body
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => (pressed ? { backgroundColor: neutral[100] } : null)}
    >
      {body}
    </Pressable>
  )
}

export const Divider: React.FC<{ style?: StyleProp<ViewStyle> }> = ({ style }) => (
  <View style={[styles.divider, style]} />
)

// ════════════════════════════════════════════════════════════
// SHEET — the mobile stand-in for .c-modal, matching its radius,
// surface and overlay. Slides from the bottom, as a phone expects.
// ════════════════════════════════════════════════════════════
export const Sheet: React.FC<{
  visible: boolean; onClose: () => void; title?: string; children: React.ReactNode
}> = ({ visible, onClose, title, children }) => {
  const insets = useSafeAreaInsets()
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel="إغلاق" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + space[4] }]}>
        <View style={styles.grabber} />
        {title ? <Text style={[text('lg', 'bold'), { color: color.ink, marginBottom: space[3] }]}>{title}</Text> : null}
        {children}
      </View>
    </Modal>
  )
}

// ════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  // .c-card
  card: {
    backgroundColor: color.raised,
    borderRadius: cardT.radius,
    borderWidth: cardT.borderWidth,
    borderColor: cardT.borderColor,
    ...shadow.sm,
  },
  cardTitle: { ...text('lg', 'bold'), color: color.ink, marginBottom: space[1] },
  cardSub: { ...text('sm'), color: color.ink2 },

  // .c-btn
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: control.radius, borderWidth: 1,
  },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: space[2] },

  // .c-badge — padding: 2px var(--space-2)
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: space[1],
    paddingVertical: 2, paddingHorizontal: space[2],
    borderRadius: radius.full, alignSelf: 'flex-start',
  },

  // .c-chip
  chipRow: { flexDirection: 'row', gap: space[2], paddingVertical: space[1] },
  chip: {
    height: control.height.sm, paddingHorizontal: space[3],
    borderRadius: radius.full, borderWidth: 1, borderColor: color.border,
    backgroundColor: color.raised, alignItems: 'center', justifyContent: 'center',
  },

  // .c-field
  field: { gap: space[1] },
  input: {
    height: control.height.md,
    paddingHorizontal: control.padInline.md,
    borderRadius: control.radius,
    borderWidth: 1, borderColor: color.border,
    backgroundColor: color.raised,
    color: color.ink,
    ...text('base'),
  },

  // .c-empty
  empty: {
    alignItems: 'center', justifyContent: 'center', gap: space[2],
    paddingVertical: space[12], paddingHorizontal: space[6],
  },
  emptyIcon: {
    width: 56, height: 56, borderRadius: radius.full,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: primary[50], marginBottom: space[2],
  },
  emptySub: { color: color.ink2, textAlign: 'center', maxWidth: 340, lineHeight: 22 },

  centered: { paddingVertical: space[12], alignItems: 'center', justifyContent: 'center' },

  // .c-table td
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: space[4], paddingVertical: space[2],
    borderTopWidth: 1, borderTopColor: color.border,
    backgroundColor: color.raised,
  },
  divider: { height: 1, backgroundColor: color.border },

  // .c-overlay / .c-modal
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.45)' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: color.raised,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: space[5],
  },
  grabber: {
    alignSelf: 'center', width: 36, height: 4, borderRadius: radius.full,
    backgroundColor: color.borderStrong, marginBottom: space[4],
  },
})
