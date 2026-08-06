// ============================================================
// STORE SWITCHER
//
// The backend has always supported this: /api/mobile/v1/* resolves the
// active store from the `X-Commerco-Store` header and re-validates it
// against stores.owner_id, and bootstrap returns every store the merchant
// owns. The app received that list and only ever printed its length.
//
// Switching = setActiveStore(id) + clear the cache. Every query is
// store-scoped through the header, so a full invalidate is the correct
// and safest refresh: nothing from the previous store may survive.
// ============================================================
import React, { useCallback } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { Check, Store as StoreIcon } from 'lucide-react-native'
import { setActiveStore, getActiveStoreId } from '../lib/auth'
import { Sheet } from './ui'
import { color, primary, space, radius, text } from '../theme/tokens'

export interface StoreOption { id: string; name: string; slug: string | null }

export default function StoreSwitcher({
  visible, onClose, stores, activeId,
}: {
  visible: boolean
  onClose: () => void
  stores: StoreOption[]
  activeId?: string
}) {
  const qc = useQueryClient()
  const current = activeId ?? getActiveStoreId() ?? undefined

  const pick = useCallback(async (id: string) => {
    if (id === current) { onClose(); return }
    setActiveStore(id)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
    // Not invalidate(): removeQueries drops the cached data outright so no
    // screen can paint the previous store's orders for even one frame while
    // the refetch is in flight.
    qc.removeQueries()
    onClose()
  }, [current, onClose, qc])

  return (
    <Sheet visible={visible} onClose={onClose} title="اختر المتجر">
      {stores.map((s, i) => {
        const on = s.id === current
        return (
          <Pressable
            key={s.id}
            onPress={() => pick(s.id)}
            accessibilityRole="button"
            accessibilityLabel={s.name}
            accessibilityState={{ selected: on }}
            style={({ pressed }) => [
              styles.row,
              i > 0 && styles.divider,
              pressed && { backgroundColor: color.sunken },
            ]}
          >
            <View style={[styles.icon, on && { backgroundColor: primary[50] }]}>
              <StoreIcon size={16} color={on ? primary[600] : color.ink3} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.name, on && { color: primary[700] }]} numberOfLines={1}>
                {s.name}
              </Text>
              {s.slug ? <Text style={styles.slug} numberOfLines={1}>{s.slug}</Text> : null}
            </View>
            {on ? <Check size={18} color={primary[600]} /> : null}
          </Pressable>
        )
      })}
    </Sheet>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    paddingVertical: space[3], paddingHorizontal: space[2],
    borderRadius: radius.md,
  },
  divider: { borderTopWidth: 1, borderTopColor: color.border },
  icon: {
    width: 36, height: 36, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', backgroundColor: color.sunken,
  },
  name: { ...text('base', 'medium'), color: color.ink },
  slug: { ...text('xs'), color: color.ink3, marginTop: 2 },
})
