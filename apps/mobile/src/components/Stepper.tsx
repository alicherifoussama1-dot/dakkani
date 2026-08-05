// ============================================================
// STEPPER
//
// The <ol> at the top of app/(dashboard)/orders/[id]/page.tsx: a 2px
// track in --border-default, a primary-600 fill sized to progress, and
// 28px round nodes that carry a ✓ once passed. The current node wears
// the 4px primary-100 ring the web draws with box-shadow.
//
// The web hides step labels below sm; a phone IS below sm, but a bare
// row of numbers tells a merchant nothing, so the labels stay — that is
// the one deliberate deviation, and it is additive.
// ============================================================
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { color, primary, radius, space, text, fontFamily } from '../theme/tokens'

export interface Step { key: string; label: string }

/** STEPS from the web page, in order. */
export const ORDER_STEPS: Step[] = [
  { key: 'new', label: 'جديد' },
  { key: 'confirmed', label: 'مؤكد' },
  { key: 'processing', label: 'قيد التجهيز' },
  { key: 'shipped', label: 'في الطريق' },
  { key: 'delivered', label: 'مُسلَّم' },
]

export default function Stepper({ steps = ORDER_STEPS, current }: { steps?: Step[]; current: number }) {
  const pct = steps.length > 1 ? Math.max(0, current) / (steps.length - 1) : 0

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: steps.length - 1, now: Math.max(0, current) }}
      style={styles.root}
    >
      {/* Track: inset 12px each side so it starts at the first node's centre. */}
      <View style={styles.track} pointerEvents="none" />
      <View style={[styles.fill, { width: `${pct * 100}%` }]} pointerEvents="none" />

      <View style={styles.row}>
        {steps.map((s, i) => {
          const done = i <= current
          const now = i === current
          return (
            <View key={s.key} style={styles.step}>
              <View style={styles.nodeWrap}>
                {/* box-shadow: 0 0 0 4px primary-100 — an OUTER ring, so it
                    must not grow the node. A border would. */}
                {now ? <View style={styles.ring} pointerEvents="none" /> : null}
                <View style={[styles.node, done && styles.nodeDone]}>
                  <Text style={[styles.nodeText, done && styles.nodeTextDone]}>
                    {done ? '✓' : String(i + 1)}
                  </Text>
                </View>
              </View>
              <Text
                style={[styles.label, done && styles.labelDone, now && styles.labelNow]}
                numberOfLines={1}
              >
                {s.label}
              </Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { position: 'relative', justifyContent: 'center' },
  track: {
    position: 'absolute', start: 12, end: 12, top: 13,
    height: 2, borderRadius: radius.full, backgroundColor: color.border,
  },
  fill: {
    position: 'absolute', start: 12, top: 13,
    height: 2, borderRadius: radius.full, backgroundColor: primary[600],
    maxWidth: '100%',
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  step: { alignItems: 'center', gap: 6, flex: 1 },
  nodeWrap: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  // The 4px ring sits behind the node and outside its box, exactly as
  // box-shadow does — 28 + 4×2 = 36.
  ring: {
    position: 'absolute', width: 36, height: 36,
    borderRadius: radius.full, backgroundColor: primary[100],
  },
  // 28px, 2px border, --radius-full
  node: {
    width: 28, height: 28, borderRadius: radius.full,
    borderWidth: 2, borderColor: color.border,
    backgroundColor: color.raised,
    alignItems: 'center', justifyContent: 'center',
  },
  nodeDone: { backgroundColor: primary[600], borderColor: primary[600] },
  nodeText: { fontFamily: fontFamily.bold, fontSize: 12, color: color.ink3 },
  nodeTextDone: { color: '#FFFFFF' },
  label: { ...text('xs'), color: color.ink3, textAlign: 'center' },
  labelDone: { color: primary[700] },
  labelNow: { fontFamily: fontFamily.semibold },
})
