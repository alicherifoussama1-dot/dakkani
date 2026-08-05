// ============================================================
// TOP BAR
//
// A port of the <header> in components/layout/DashboardShell.tsx: 56px
// tall, surface-raised on a hairline bottom border, logo at the start,
// 36px round icon buttons at the end, notification dot in error-500.
//
// The web's frosted blur is a desktop-sidebar effect; on the phone the
// header sits on the page background, so an opaque surface is what the
// site actually renders there.
// ============================================================
import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SvgXml } from 'react-native-svg'
import { ChevronRight, type LucideIcon } from 'lucide-react-native'
import { color, error, space, radius, text, fontFamily } from '../theme/tokens'
import { LOGO_WORDMARK_XML } from '../assets/logo'

export interface TopBarAction {
  key: string
  label: string
  Icon: LucideIcon
  onPress: () => void
  /** Draws the web's 8px error-500 dot on the icon's top-inline-end corner. */
  dot?: boolean
}

export default function TopBar({
  title, onBack, actions = [], showLogo,
}: {
  /** Page title. Omitted on the dashboard, where the web shows the logo. */
  title?: string
  onBack?: () => void
  actions?: TopBarAction[]
  showLogo?: boolean
}) {
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.bar, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        <View style={styles.start}>
          {onBack ? (
            <Pressable
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="رجوع"
              style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnDown]}
            >
              {/* RTL: "back" points inline-start, which is right in Arabic. */}
              <ChevronRight size={20} color={color.ink2} strokeWidth={1.8} />
            </Pressable>
          ) : null}

          {showLogo ? (
            <SvgXml xml={LOGO_WORDMARK_XML} height={20} width={110} />
          ) : title ? (
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
          ) : null}
        </View>

        <View style={styles.end}>
          {actions.map(({ key, label, Icon, onPress, dot }) => (
            <Pressable
              key={key}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityLabel={label}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnDown]}
            >
              <Icon size={17} color={color.ink2} strokeWidth={1.8} />
              {dot ? <View style={styles.dot} /> : null}
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: color.raised,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  // blockSize: 56 on the web header
  row: {
    height: 56,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: space[2], gap: space[2],
  },
  start: { flexDirection: 'row', alignItems: 'center', gap: space[1], flexShrink: 1, minWidth: 0 },
  end: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  // The web's page heading size for a mobile topbar title.
  title: { ...text('lg', 'bold'), color: color.ink, flexShrink: 1 },
  // w-9 h-9 rounded-full
  iconBtn: { width: 36, height: 36, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  iconBtnDown: { backgroundColor: color.sunken },
  dot: {
    position: 'absolute', top: 7, end: 7,
    width: 8, height: 8, borderRadius: radius.full,
    backgroundColor: error[500],
    borderWidth: 1.5, borderColor: color.raised,
  },
})
