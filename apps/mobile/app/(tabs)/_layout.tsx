// ============================================================
// TAB LAYOUT — hosts the Liquid Glass navbar.
// Uses expo-router Tabs with the default bar hidden so our own
// floating glass component is the only chrome.
// ============================================================
import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Tabs, useRouter, useSegments } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import LiquidGlassTabBar, { TABS } from '../../src/components/LiquidGlassTabBar'
import { api } from '../../src/lib/api'
import { color } from '../../src/theme/tokens'

export default function TabsLayout() {
  const router = useRouter()
  const segments = useSegments()

  // Badge on الطلبات = real count of status='new'.
  const { data } = useQuery({
    queryKey: ['bootstrap'],
    queryFn: () => api.bootstrap(),
    staleTime: 60_000,
  })

  const active = (() => {
    const last = segments[segments.length - 1]
    if (!last || last === '(tabs)') return 'home'
    return TABS.some(t => t.key === last) ? last : 'home'
  })()

  const go = (key: string) => {
    // navigate(), not replace(): replace() discards navigation history, so the
    // Android back button would quit the app from any tab instead of falling
    // back to Home. navigate() also reuses the mounted screen, preserving
    // scroll position when switching tabs.
    router.navigate(key === 'home' ? '/(tabs)' : (`/(tabs)/${key}` as never))
  }

  return (
    <View style={styles.root}>
      <Tabs
        screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="orders" />
        <Tabs.Screen name="products" />
        <Tabs.Screen name="analytics" />
        <Tabs.Screen name="more" />
      </Tabs>

      <LiquidGlassTabBar
        active={active}
        onChange={go}
        badges={{ orders: data?.counters.newOrders ?? 0 }}
      />
    </View>
  )
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: color.bg } })
