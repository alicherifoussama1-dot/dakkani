// ============================================================
// BOTTOM NAV
//
// A port of the merchant bottom bar in components/layout/DashboardShell.tsx
// (the `lg:hidden` <nav>). Same 56px row, same four destinations plus the
// More drawer, same 20px lucide icons at 2.2/1.8 stroke, same 10px medium
// labels, same primary-700 active colour, same error-500 order badge
// capped at "9+".
// ============================================================
import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Home, ShoppingCart, Package, BarChart2, LayoutGrid, type LucideIcon } from 'lucide-react-native'
import { color, primary, error, space, radius, fontFamily } from '../theme/tokens'
import { useT } from '../i18n'

export interface TabDef {
  key: string
  /** i18n key, resolved at render — the label must follow the locale. */
  labelKey: string
  Icon: LucideIcon
}

/** NAV_MOBILE from DashboardShell, in the same order, plus More. */
export const TABS: TabDef[] = [
  { key: 'home',      labelKey: 'nav.home',      Icon: Home },
  { key: 'orders',    labelKey: 'nav.orders',    Icon: ShoppingCart },
  { key: 'products',  labelKey: 'nav.products',  Icon: Package },
  { key: 'analytics', labelKey: 'nav.analytics', Icon: BarChart2 },
  { key: 'more',      labelKey: 'nav.more',      Icon: LayoutGrid },
]

export default function BottomNav({
  active, onChange, badges = {},
}: {
  active: string
  onChange: (key: string) => void
  badges?: Record<string, number>
}) {
  const insets = useSafeAreaInsets()
  const t = useT()

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel="التنقّل السفلي"
      // paddingBottom mirrors the web's env(safe-area-inset-bottom).
      style={[styles.bar, { paddingBottom: insets.bottom }]}
    >
      <View style={styles.row}>
        {TABS.map(({ key, labelKey, Icon }) => {
          const on = key === active
          const count = badges[key] ?? 0
          const fg = on ? primary[700] : color.ink3
          const label = t(labelKey)

          return (
            <Pressable
              key={key}
              onPress={() => onChange(key)}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: on }}
              style={styles.item}
            >
              <View>
                <Icon size={20} color={fg} strokeWidth={on ? 2.2 : 1.8} />
                {count > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{count > 9 ? '9+' : String(count)}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.label, { color: fg }]} numberOfLines={1}>{label}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: color.raised,
    borderTopWidth: 1,
    borderTopColor: color.border,
  },
  // h-14 = 56px
  row: { flexDirection: 'row', alignItems: 'stretch', height: 56, paddingHorizontal: space[1] },
  // min-w-[44px] — the platform touch minimum the web bar also honours.
  item: { flex: 1, minWidth: 44, alignItems: 'center', justifyContent: 'center', gap: 2 },
  label: { fontFamily: fontFamily.medium, fontSize: 10, lineHeight: 12 },
  badge: {
    position: 'absolute', top: -4, end: -6,
    minWidth: 14, height: 14, paddingHorizontal: 2,
    borderRadius: radius.full, backgroundColor: error[500],
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { fontFamily: fontFamily.bold, fontSize: 8, color: '#FFFFFF', lineHeight: 10 },
})
