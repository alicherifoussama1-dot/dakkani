// ============================================================
// NEW-ORDER SOUND GENERATOR  →  assets/sounds/new_order.wav
//
// Synthesises an ORIGINAL cash-register "cha-ching" from scratch. It is
// deliberately generated rather than downloaded: the sounds Shopify and
// YouCan use are their own branded assets, and shipping a copy of one would
// be someone else's property in our APK. This is our own waveform, and the
// code that makes it is committed so it can be reviewed, tuned and rebuilt
// instead of being an opaque binary.
//
// Run:  node scripts/make-order-sound.mjs
//
// The character being aimed at — the reason a till bell reads as "money"
// and a phone chime does not:
//   · struck METAL, so partials are inharmonic (a bell, not a sine beep)
//   · TWO hits, the second higher — the rising "cha-CHING" that sounds like
//     a completed transaction rather than a notification
//   · a fast noisy transient at each strike (the hammer), which is most of
//     what makes it read as physical
//
// Format is dictated by the platforms, not by preference:
//   · Android res/raw wants PCM WAV; the resource name must be a valid Java
//     identifier, hence new_order.wav and never new-order.wav
//   · Keep it under ~2s — Android truncates long channel sounds
// ============================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(HERE, '..', 'assets', 'sounds', 'new_order.wav')

const RATE = 44100
const DURATION = 1.25
const N = Math.floor(RATE * DURATION)

/** Inharmonic partials of a struck metal bar, as ratios of the fundamental.
 *  Harmonic ratios (1,2,3…) would sound like an organ; these are what make
 *  the ear hear "metal". Each carries its own gain and decay because high
 *  partials on a real bell die away first. */
const PARTIALS = [
  { ratio: 1.00, gain: 1.00, decay: 1.00 },
  { ratio: 2.41, gain: 0.62, decay: 0.72 },
  { ratio: 3.94, gain: 0.40, decay: 0.55 },
  { ratio: 5.12, gain: 0.26, decay: 0.42 },
  { ratio: 6.83, gain: 0.15, decay: 0.30 },
]

/** One bell strike: hammer transient + decaying inharmonic partials. */
function strike(buf, startSec, f0, amp, decaySec) {
  const start = Math.floor(startSec * RATE)

  for (let i = 0; i < N - start; i++) {
    const t = i / RATE
    const env = Math.exp(-t / decaySec)
    if (env < 1e-4) break

    let s = 0
    for (const p of PARTIALS) {
      s += p.gain * Math.exp(-t / (decaySec * p.decay)) * Math.sin(2 * Math.PI * f0 * p.ratio * t)
    }
    s /= PARTIALS.reduce((a, p) => a + p.gain, 0)

    // The hammer: a very short noise burst. Without it the bell sounds
    // synthetic — this is the part the ear reads as something being struck.
    const hammer = Math.exp(-t / 0.006) * (Math.random() * 2 - 1) * 0.55

    buf[start + i] += amp * (s * env + hammer)
  }
}

const buf = new Float64Array(N)

// "cha" — lower, shorter, quieter: the drawer/lever before the bell.
strike(buf, 0.000, 1244.5, 0.55, 0.16)
// "CHING" — higher and ringing: the payoff. The rise between the two is
// what makes it sound like money arriving rather than an alert.
strike(buf, 0.115, 1864.7, 1.00, 0.62)

// Gentle tail fade so the file cannot end on a discontinuity (a click).
const FADE = Math.floor(0.05 * RATE)
for (let i = 0; i < FADE; i++) buf[N - 1 - i] *= i / FADE

// Normalise with headroom — clipping on a phone speaker sounds like distortion,
// and this plays at full notification volume.
let peak = 0
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(buf[i]))
const scale = peak > 0 ? (0.89 / peak) : 1

// ── 16-bit PCM mono WAV ──
const dataBytes = N * 2
const out = Buffer.alloc(44 + dataBytes)
out.write('RIFF', 0)
out.writeUInt32LE(36 + dataBytes, 4)
out.write('WAVE', 8)
out.write('fmt ', 12)
out.writeUInt32LE(16, 16)          // PCM chunk size
out.writeUInt16LE(1, 20)           // format = PCM
out.writeUInt16LE(1, 22)           // channels = mono
out.writeUInt32LE(RATE, 24)
out.writeUInt32LE(RATE * 2, 28)    // byte rate
out.writeUInt16LE(2, 32)           // block align
out.writeUInt16LE(16, 34)          // bits per sample
out.write('data', 36)
out.writeUInt32LE(dataBytes, 40)

for (let i = 0; i < N; i++) {
  const v = Math.max(-1, Math.min(1, buf[i] * scale))
  out.writeInt16LE(Math.round(v * 32767), 44 + i * 2)
}

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, out)

console.log(`wrote ${OUT}`)
console.log(`  ${DURATION}s · ${RATE}Hz · 16-bit mono · ${(out.length / 1024).toFixed(1)} KB`)
console.log(`  peak before normalise ${peak.toFixed(3)} → scaled by ${scale.toFixed(3)}`)
