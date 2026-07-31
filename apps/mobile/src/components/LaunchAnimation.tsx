// ============================================================
// LAUNCH ANIMATION — official COMMERCO logo, elegantly revealed.
//
// The logo geometry is the OFFICIAL asset (assets/brand/logo-icon.svg,
// copied verbatim from public/brand/). Colours and shape are untouched —
// only scale/opacity and an emerald glow are animated around it.
//
// Timing: ~1.25s total. Short, premium, never childish.
// ============================================================
import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { SvgXml } from 'react-native-svg'
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, withSequence, Easing, runOnJS,
} from 'react-native-reanimated'
import { color, motion } from '../theme/tokens'
import { LOGO_ICON_XML, LOGO_WORDMARK_XML } from '../assets/logo'

const EASE = Easing.bezier(...motion.easeOut)

export default function LaunchAnimation({ onDone }: { onDone: () => void }) {
  const logoScale = useSharedValue(0.62)
  const logoOpacity = useSharedValue(0)
  const glow = useSharedValue(0)
  const wordOpacity = useSharedValue(0)
  const wordY = useSharedValue(10)
  const screenOpacity = useSharedValue(1)

  // onDone is passed as an inline arrow by the root layout, so keeping it in a
  // ref lets the effect below run EXACTLY once. Otherwise every parent
  // re-render (auth resolving, for one) restarts the whole animation.
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const firedRef = useRef(false)

  useEffect(() => {
    const finish = () => {
      if (firedRef.current) return
      firedRef.current = true
      onDoneRef.current()
    }

    // Safety net: Reanimated pauses when the app is backgrounded and reports
    // finished=false on interruption. Without this the app would sit on the
    // logo screen forever with no way out.
    const failsafe = setTimeout(finish, 2000)

    // 1. logo scales up and fades in
    logoOpacity.value = withTiming(1, { duration: 420, easing: EASE })
    logoScale.value = withSequence(
      withTiming(1.04, { duration: 520, easing: EASE }),
      withTiming(1, { duration: 200, easing: EASE }),
    )
    // 2. emerald glow breathes once behind it
    glow.value = withSequence(
      withTiming(1, { duration: 620, easing: EASE }),
      withTiming(0.45, { duration: 380, easing: EASE }),
    )
    // 3. wordmark rises in
    wordOpacity.value = withDelay(340, withTiming(1, { duration: 380, easing: EASE }))
    wordY.value = withDelay(340, withTiming(0, { duration: 420, easing: EASE }))
    // 4. whole screen dissolves into the dashboard
    screenOpacity.value = withDelay(1080, withTiming(0, { duration: 260, easing: EASE }, () => {
      // Fire regardless of `finished`; the guard in finish() dedupes against
      // the failsafe so onDone runs exactly once either way.
      runOnJS(finish)()
    }))

    return () => clearTimeout(failsafe)
    // Shared values are stable; onDone is read through a ref. Run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sLogo = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }))
  const sGlow = useAnimatedStyle(() => ({
    opacity: glow.value * 0.55,
    transform: [{ scale: 0.85 + glow.value * 0.5 }],
  }))
  const sWord = useAnimatedStyle(() => ({
    opacity: wordOpacity.value,
    transform: [{ translateY: wordY.value }],
  }))
  const sScreen = useAnimatedStyle(() => ({ opacity: screenOpacity.value }))

  return (
    <Animated.View style={[styles.root, sScreen]} pointerEvents="none">
      <View style={styles.center}>
        <Animated.View style={[styles.glow, sGlow]} />
        <Animated.View style={sLogo}>
          <SvgXml xml={LOGO_ICON_XML} width={92} height={92} />
        </Animated.View>
        <Animated.View style={[styles.word, sWord]}>
          <SvgXml xml={LOGO_WORDMARK_XML} width={168} height={30} />
          <Text style={styles.tagline}>نظام تشغيل تجارتك</Text>
        </Animated.View>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: color.white, zIndex: 999 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  glow: {
    position: 'absolute', width: 240, height: 240, borderRadius: 120,
    backgroundColor: color.em300,
    // A large soft radial glow; on Android shadows don't blur this way, so we
    // rely on opacity+scale which reads correctly on both platforms.
    // (opacity is driven entirely by sGlow — no static value here, it would
    // just be overwritten on the first frame.)
  },
  word: { alignItems: 'center', marginTop: 22 },
  tagline: { marginTop: 8, fontSize: 12, fontWeight: '700', color: color.ink3, letterSpacing: 0.2 },
})
