// ============================================================
// EXPO PUSH SERVICE — the delivery path that needs no Apple account.
//
// FCM and APNs both require credentials the developer owns: a Firebase
// service account, or an APNs key that only a paid Apple Developer
// membership can issue. Expo's push service sits in front of both and
// delivers with EXPO's credentials, so an iPhone running Expo Go receives
// real remote notifications — pushed by Apple, while the app is backgrounded
// or fully closed — without the merchant buying anything.
//
// The trade is fidelity, not capability: the notification is delivered to the
// Expo Go container, so it cannot carry our bundled cash-register sound and
// the alert is branded Expo Go. Everything else — arriving while closed, the
// sound, the badge, tapping through to the right order — behaves normally.
//
// This is additive. Tokens are routed by SHAPE, not by platform, so a real
// Android build keeps going straight to FCM with its custom channel and
// sound, exactly as before.
// ============================================================

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

/** Expo hands out `ExponentPushToken[…]`; `ExpoPushToken[…]` is the newer
 *  spelling. Anything else is a raw FCM/APNs token and must not come here. */
export function isExpoPushToken(token: string): boolean {
  return /^Expo(nent)?PushToken\[/.test(token)
}

export interface ExpoPushInput {
  token: string
  title: string
  body: string
  data: Record<string, string>
  badge?: number
  sound: boolean
  /** Android channel id — ignored by iOS, honoured by a real Android build. */
  channelId?: string
}

export interface ExpoPushOutcome {
  token: string
  ok: boolean
  stale: boolean
  error?: string
}

/** Expo caps a request at 100 messages. */
const CHUNK = 100

export async function sendViaExpo(inputs: ExpoPushInput[]): Promise<ExpoPushOutcome[]> {
  if (inputs.length === 0) return []

  const out: ExpoPushOutcome[] = []

  for (let i = 0; i < inputs.length; i += CHUNK) {
    const batch = inputs.slice(i, i + CHUNK)
    const payload = batch.map(m => ({
      to: m.token,
      title: m.title,
      body: m.body,
      data: m.data,
      // Expo Go can only play the system sound: our .wav is not in its
      // bundle. 'default' is the honest maximum here.
      sound: m.sound ? 'default' : null,
      badge: m.badge,
      priority: 'high',
      channelId: m.channelId,
      // Same reasoning as the APNs path — lets a new order surface through
      // Focus, if the merchant has allowed it. No entitlement required.
      // Kebab-case: Expo's schema accepts 'active' | 'critical' | 'passive' |
      // 'time-sensitive' and rejects the camelCase spelling outright, which
      // would fail the whole batch rather than just dropping the field.
      interruptionLevel: 'time-sensitive',
      // A new order is worth waking the phone for, but it stops being worth
      // it after a day; without this Expo would keep retrying stale alerts.
      ttl: 86_400,
    }))

    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        out.push(...batch.map(m => ({
          token: m.token, ok: false, stale: false,
          error: `expo ${res.status} ${text.slice(0, 140)}`,
        })))
        continue
      }

      const json = await res.json() as { data?: Array<{ status: string; message?: string; details?: { error?: string } }> }
      const tickets = json.data ?? []

      batch.forEach((m, idx) => {
        const t = tickets[idx]
        if (!t) {
          out.push({ token: m.token, ok: false, stale: false, error: 'no ticket returned' })
          return
        }
        if (t.status === 'ok') {
          out.push({ token: m.token, ok: true, stale: false })
          return
        }
        // DeviceNotRegistered is Expo's 410: the merchant deleted the app or
        // signed out of Expo Go. Pruned by the caller like any dead token.
        const stale = t.details?.error === 'DeviceNotRegistered'
        out.push({ token: m.token, ok: false, stale, error: t.message ?? t.details?.error ?? 'unknown' })
      })
    } catch (e) {
      out.push(...batch.map(m => ({
        token: m.token, ok: false, stale: false, error: (e as Error).message,
      })))
    }
  }

  return out
}
