// ============================================================
// LIQUID GLASS TAB BAR — real React Native.
//
// · expo-blur for genuine platform blur (not a translucent colour hack)
// · Reanimated shared values → the pill morphs on the UI thread, so it
//   stays 60fps even while the JS thread is fetching.
// · RTL-aware WITHOUT direction math: tab x-offsets are measured from
//   onLayout, which React Native already reports in the correct visual
//   order for the active writing direction.
// · Vector icons only. No emoji.
// ============================================================
import React, { useCallback, useRef, useState } from 'react'
import { View, Pressable, Text, StyleSheet, Platform, LayoutChangeEvent } from 'react-native'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring, Easing,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { color, radius, font, motion, shadow } from '../theme/tokens'
import { IconHome, IconOrders, IconProducts, IconAnalytics, IconMore } from './Icons'

export interface TabDef {
  key: string
  label: string
  Icon: React.FC<{ size?: number; color?: string; strokeWidth?: number }>
  badge?: number
}

export const TABS: TabDef[] = [
  { key: 'home', label: 'الرئيسية', Icon: IconHome },
  { key: 'orders', label: 'الطلبات', Icon: IconOrders },
  { key: 'products', label: 'المنتجات', Icon: IconProducts },
  { key: 'analytics', label: 'التحليلات', Icon: IconAnalytics },
  { key: 'more', label: 'المزيد', Icon: IconMore },
]

interface Props {
  active: string
  onChange: (key: string) => void
  badges?: Record<string, number>
}

export default function LiquidGlassTabBar({ active, onChange, badges = {} }: Props) {
  const insets = useSafeAreaInsets()
  const layouts = useRef<Record<string, { x: number; w: number }>>({})
  const [ready, setReady] = useState(false)

  const pillX = useSharedValue(0)
  const pillW = useSharedValue(0)

  const moveTo = useCallback((key: string) => {
    const l = layouts.current[key]
    if (!l) return
    // Spring for x (organic "liquid" settle), timing for width (no wobble).
    pillX.value = withSpring(l.x, { damping: 18, stiffness: 170, mass: 0.9 })
    pillW.value = withTiming(l.w, {
      duration: motion.pill,
      easing: Easing.bezier(...motion.easeOut),
    })
  }, [pillX, pillW])

  const onTabLayout = (key: string) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout
    layouts.current[key] = { x, w: width }
    if (key === active) {
      // First measurement: place the pill without animating.
      if (!ready) { pillX.value = x; pillW.value = width; setReady(true) }
      else moveTo(key)
    }
  }

  React.useEffect(() => { moveTo(active) }, [active, moveTo])

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillX.value }],
    width: pillW.value,
  }))

  const press = (key: string) => {
    if (key !== active) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    onChange(key)
  }

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom - 8, 8) }]} pointerEvents="box-none">
      <View style={styles.shadowHost}>
        <BlurView
          intensity={Platform.OS === 'ios' ? 60 : 90}
          tint="light"
          style={styles.blur}
        >
          {/* liquid sheen: cyan → transparent → emerald */}
          <LinearGradient
            colors={['rgba(6,182,212,0.14)', 'rgba(255,255,255,0)', 'rgba(16,185,129,0.16)']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          {/* specular top rim — what makes it read as glass rather than frosted plastic */}
          <View style={styles.rim} pointerEvents="none" />

          {/* morphing active pill */}
          <Animated.View style={[styles.pill, pillStyle]} pointerEvents="none">
            <LinearGradient
              colors={['rgba(16,185,129,0.18)', 'rgba(6,182,212,0.12)']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          <View style={styles.row}>
            {TABS.map(t => {
              const on = t.key === active
              const badge = badges[t.key]
              return (
                <Pressable
                  key={t.key}
                  onLayout={onTabLayout(t.key)}
                  onPress={() => press(t.key)}
                  style={styles.tab}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={t.label}
                  hitSlop={6}
                >
                  <TabIcon Icon={t.Icon} active={on} />
                  <Text style={[styles.label, on && styles.labelOn]} numberOfLines={1}>
                    {t.label}
                  </Text>
                  {badge ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
                    </View>
                  ) : null}
                </Pressable>
              )
            })}
          </View>
        </BlurView>
      </View>
    </View>
  )
}

/** Icon lift + scale on activation, driven on the UI thread. */
function TabIcon({ Icon, active }: { Icon: TabDef['Icon']; active: boolean }) {
  const p = useSharedValue(active ? 1 : 0)
  React.useEffect(() => {
    p.value = withTiming(active ? 1 : 0, {
      duration: motion.pill, easing: Easing.bezier(...motion.easeOut),
    })
  }, [active, p])

  const st = useAnimatedStyle(() => ({
    transform: [
      { translateY: -1 * p.value },
      { scale: 1 + 0.1 * p.value },
    ],
  }))

  return (
    <Animated.View style={st}>
      <Icon size={21} color={active ? color.em700 : color.ink3} strokeWidth={active ? 2.2 : 1.9} />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14 },
  // Shadow must live OUTSIDE the BlurView: iOS cannot render a shadow on a
  // view that also clips its children with overflow hidden.
  shadowHost: { borderRadius: 30, ...shadow.md },
  blur: { borderRadius: 30, overflow: 'hidden', borderWidth: 1, borderColor: color.glassBorder },
  rim: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  row: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 7 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 7 },
  pill: {
    position: 'absolute', top: 6, bottom: 6,
    // `left` (physical), NOT `start`. translateX is always physical too, and
    // onLayout reports a physical x — mixing in a direction-aware anchor put
    // the pill on the wrong edge under RTL. The tab's x already includes the
    // row's horizontal padding, so no extra margin here or it double-counts.
    left: 0,
    borderRadius: 22, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.24)',
  },
  label: { fontSize: font.micro, fontWeight: '800', color: color.ink3 },
  labelOn: { color: color.em700 },
  badge: {
    position: 'absolute', top: 2,
    // `end` is direction-aware in RN, so this is correct in RTL and LTR.
    end: 12,
    minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 9,
    backgroundColor: color.rose, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: color.white,
  },
  badgeText: { color: color.white, fontSize: 9.5, fontWeight: '800' },
})
