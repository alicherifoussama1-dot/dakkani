// ============================================================
// IN-APP NEW ORDER ALERT — shown when a push arrives while the app is
// in the FOREGROUND (the OS banner is suppressed in that case).
//
// Exact format required by the brief:
//   COMMERCO
//   طلب جديد #5
//   العميل: محمد أحمد
//   المنتجات: 2
//   الإجمالي: 4,500 دج
//
// Actions: عرض الطلب · تأكيد · تجاهل
// Rendered by a singleton host mounted once in the root layout, so any
// module can trigger it without prop drilling.
// ============================================================
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { BlurView } from 'expo-blur'
import { SvgXml } from 'react-native-svg'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring, Easing, runOnJS,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { LOGO_ICON_XML } from '../assets/logo'
import { color, radius, shadow, font, motion, fmtDZD, fmtNum , fontFamily } from '../theme/tokens'
import type { NewOrderPayload } from '../lib/push'
import { api } from '../lib/api'

type Listener = (p: NewOrderPayload, onView: () => void) => void
let listener: Listener | null = null

/** Fire the alert from anywhere (push handler, realtime subscription…). */
export function showOrderAlert(p: NewOrderPayload, onView: () => void) {
  listener?.(p, onView)
}

export function OrderAlertHost() {
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const [state, setState] = useState<{ p: NewOrderPayload; onView: () => void } | null>(null)
  const [confirming, setConfirming] = useState(false)

  const ty = useSharedValue(-160)
  const op = useSharedValue(0)
  // Held so a second order cannot inherit the first order's dismiss timer.
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearDismiss = useCallback(() => {
    if (dismissTimer.current) { clearTimeout(dismissTimer.current); dismissTimer.current = null }
  }, [])

  const hide = useCallback(() => {
    clearDismiss()
    op.value = withTiming(0, { duration: 200 })
    ty.value = withTiming(-160, { duration: 260, easing: Easing.bezier(...motion.standard) },
      f => { if (f) runOnJS(setState)(null) })
  }, [op, ty, clearDismiss])

  useEffect(() => {
    listener = (p, onView) => {
      clearDismiss()             // a new order replaces the previous alert
      setState({ p, onView })
      setConfirming(false)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      op.value = withTiming(1, { duration: 220 })
      ty.value = withSpring(0, { damping: 17, stiffness: 160 })
      // Auto-dismiss after 8s so it never blocks the UI permanently.
      dismissTimer.current = setTimeout(() => hide(), 8000)
    }
    return () => { listener = null; clearDismiss() }
  }, [op, ty, hide, clearDismiss])

  const st = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ translateY: ty.value }],
  }))

  if (!state) return null
  const { p, onView } = state

  const confirm = async () => {
    if (confirming) return              // double-tap guard
    setConfirming(true)
    try {
      await api.setOrderStatus(p.orderId, 'confirmed', 'تم التأكيد من تنبيه التطبيق')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      // Without this the orders list and badge keep showing it as new.
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['order', p.orderId] })
      queryClient.invalidateQueries({ queryKey: ['bootstrap'] })
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
    } finally {
      setConfirming(false)
      hide()
    }
  }

  return (
    <Animated.View
      style={[styles.wrap, { paddingTop: insets.top + 6 }, st]}
      pointerEvents="box-none"
    >
      <View style={styles.shadowHost}>
        <BlurView intensity={70} tint="light" style={styles.card}>
          <View style={styles.accent} />
          <View style={styles.row}>
            <View style={styles.logo}><SvgXml xml={LOGO_ICON_XML} width={24} height={24} /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.brand}>COMMERCO</Text>
              <Text style={styles.title} numberOfLines={1}>طلب جديد {p.orderNumber}</Text>
              <Text style={styles.line} numberOfLines={1}>العميل: {p.customer}</Text>
              <Text style={styles.line} numberOfLines={1}>المنتجات: {fmtNum(p.itemsCount)}</Text>
              <Text style={styles.total} numberOfLines={1}>الإجمالي: {fmtDZD(p.total)}</Text>
              {p.wilaya ? <Text style={styles.line} numberOfLines={1}>{p.wilaya}</Text> : null}
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable
              style={[styles.btn, styles.btnPrimary]}
              onPress={() => { hide(); onView() }}
              accessibilityRole="button"
              accessibilityLabel={`عرض الطلب ${p.orderNumber}`}
            >
              <Text style={styles.btnPrimaryText}>عرض الطلب</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.btnGlass]}
              onPress={confirm}
              disabled={confirming}
              accessibilityRole="button"
              accessibilityLabel="تأكيد الطلب"
              accessibilityState={{ disabled: confirming, busy: confirming }}
            >
              <Text style={styles.btnText}>{confirming ? '...' : 'تأكيد'}</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.btnGhost]}
              onPress={hide}
              accessibilityRole="button"
              accessibilityLabel="تجاهل التنبيه"
            >
              <Text style={styles.btnGhostText}>تجاهل</Text>
            </Pressable>
          </View>
        </BlurView>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 900, paddingHorizontal: 14 },
  shadowHost: { borderRadius: 22, ...shadow.lg },
  card: {
    borderRadius: 22, overflow: 'hidden', padding: 14,
    borderWidth: 1, borderColor: color.white,
    backgroundColor: 'rgba(255,255,255,0.86)',
  },
  // Emerald leading edge — the brand "glow" cue.
  accent: { position: 'absolute', top: 0, bottom: 0, start: 0, width: 4, backgroundColor: color.br500 },
  row: { flexDirection: 'row', gap: 11, alignItems: 'flex-start' },
  logo: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: color.white,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: color.hairline,
  },
  brand: { fontSize: 10.5, fontFamily: fontFamily.bold, color: color.ink3, letterSpacing: 0.6 },
  title: { fontSize: 15, fontFamily: fontFamily.bold, color: color.ink, marginTop: 2 },
  line: { fontSize: 12.5, color: color.ink2, marginTop: 2 },
  total: { fontSize: 14, fontFamily: fontFamily.bold, color: color.br700, marginTop: 3, fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', gap: 7, marginTop: 12 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: radius.sm, alignItems: 'center' },
  btnPrimary: { backgroundColor: color.br600 },
  btnPrimaryText: { color: color.white, fontFamily: fontFamily.bold, fontSize: 12.5 },
  btnGlass: { backgroundColor: color.white, borderWidth: 1, borderColor: color.hairline },
  btnText: { color: color.ink, fontFamily: fontFamily.bold, fontSize: 12.5 },
  btnGhost: { flex: 0.7, backgroundColor: 'transparent' },
  btnGhostText: { color: color.ink3, fontFamily: fontFamily.bold, fontSize: 12.5 },
})
