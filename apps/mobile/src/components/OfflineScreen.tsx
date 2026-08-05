// ============================================================
// The only screen the shell draws itself.
//
// It exists because a WebView with no connection renders the system's
// "net::ERR_INTERNET_DISCONNECTED" page — a Chromium error screen with
// none of the site's branding, in English. This replaces it, and gets
// out of the way the moment the network returns.
// ============================================================
import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { SvgXml } from 'react-native-svg'
import { LOGO_ICON_XML } from '../assets/logo'
import { color , fontFamily } from '../theme/tokens'

export default function OfflineScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.root}>
      <SvgXml xml={LOGO_ICON_XML} width={56} height={56} />
      <Text style={styles.title}>لا يوجد اتصال بالإنترنت</Text>
      <Text style={styles.body}>
        تحقّق من اتصالك ثم أعد المحاولة. سيُستأنف العمل من حيث توقّفت.
      </Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="إعادة المحاولة"
        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
      >
        <Text style={styles.btnText}>إعادة المحاولة</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: color.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  title: { marginTop: 8, fontSize: 19, fontFamily: fontFamily.bold, color: color.ink, textAlign: 'center' },
  body: { fontSize: 14, lineHeight: 22, color: color.ink2, textAlign: 'center' },
  btn: {
    marginTop: 12, paddingVertical: 14, paddingHorizontal: 32,
    borderRadius: 12, backgroundColor: color.br600,
  },
  btnPressed: { backgroundColor: color.br700 },
  btnText: { color: color.white, fontSize: 15, fontFamily: fontFamily.bold },
})
