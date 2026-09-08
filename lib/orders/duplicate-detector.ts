// ============================================================
// SECOND-LAYER DUPLICATE DETECTION — repeated purchase INTENT.
//
// The first layer (checkout_token + uq_orders_store_checkout_token) settles
// one question: is this the same checkout attempt arriving twice. It answers
// deterministically and it is finished.
//
// This layer answers a different one, and it can only ever answer it with a
// probability: a customer who heard nothing back comes to the site again
// hours later and re-orders the same thing. New attempt, new token, new
// order.id — and therefore a second Meta Purchase for one real sale.
//
// Measured over 90 days of live orders: 130 same-phone repeat pairs, of which
// 50 survive every gate below. That is 3.26% of real orders, not the 25% a
// naive phone+product rule would claim.
//
// WHAT THIS FILE MAY NOT DO
//   · It never writes. It reads orders and returns a verdict.
//   · It never touches Meta, CAPI, event_id, TikTok, Snapchat or GA4. The
//     duplicate Purchase is prevented by not creating the duplicate ORDER,
//     never by editing tracking.
//   · It never blocks in MONITOR mode, which is the default.
//
// THE GATES ARE THE SAFETY, NOT THE SCORE
// Three identity gates run before any arithmetic, and each can only ALLOW.
// The variant gate is the one that matters commercially: this is a clothing
// business, and 75 of the historical repeat pairs were the same customer
// re-ordering the same garment in a different size or colour — 53% of them
// within ten minutes, which is exactly what "I picked the wrong size" looks
// like. A rule without that gate would reject 45% of genuine repeat business.
// ============================================================

/** Every tunable in one object. Nothing in this file reads a magic number
 *  from anywhere else, and nothing outside it invents one. */
export const DUPLICATE_POLICY = {
  /** monitor = score and log, never interfere (DEFAULT).
   *  soft_block = ask the customer before creating a strong-match order.
   *  off = skip entirely. */
  mode: (process.env.DUPLICATE_DETECTION_MODE ?? 'monitor') as DetectionMode,

  thresholds: {
    /** >= strong  → soft_block asks the customer; monitor only logs. */
    strong: 80,
    /** >= uncertain → recorded for the merchant, customer never interrupted. */
    uncertain: 55,
  },

  weights: {
    /** Awarded once all three identity gates pass. */
    identityBase: 40,
    sameQuantity: 5,
    sameTotal: 15,
    sameDeliveryType: 5,
    sameWilaya: 5,
    sameCommune: 10,
  },

  /** Time is evidence, never a gate — and past 72h it argues AGAINST the
   *  orders sharing one intent. An earlier draft of this model let the decay
   *  bottom out at zero; the backtest then flagged a pair 38 days apart,
   *  because the field weights alone already reached the threshold. A repeat
   *  purchase a month later is a customer who liked the garment. */
  timeBands: [
    { maxHours: 1, points: 25 },
    { maxHours: 6, points: 20 },
    { maxHours: 24, points: 15 },
    { maxHours: 48, points: 10 },
    { maxHours: 72, points: 5 },
    { maxHours: 168, points: -15 },
    { maxHours: Infinity, points: -40 },
  ],

  /** Statuses read from the live schema and from lib/confirmili/statuses.ts —
   *  not invented here.
   *
   *  dead: the first order will not be delivered, so ordering again is the
   *  customer fixing something, not repeating themselves.
   *
   *  reached: the merchant already spoke to this customer. Whatever they order
   *  afterwards is a decision they made WITH that contact, so it is a second
   *  purchase, not an anxious retry. */
  statusPenalties: {
    dead: -45,
    reached: -35,
  },
  deadStatuses: ['cancelled', 'returned', 'failed', 'failed_1', 'failed_2', 'failed_3', 'failed_01', 'failed_02', 'failed_03'] as readonly string[],
  reachedStatuses: ['confirmed', 'shipped', 'delivered'] as readonly string[],

  /** How far back to look for a prior order. Wide on purpose: the lookup
   *  window is not the decision — the score is. Anything older simply arrives
   *  carrying the -40 time penalty and falls out on its own. */
  lookbackHours: 24 * 14,

  /** Name comparison. Deliberately conservative in both directions: too loose
   *  merges the 19 historical cases of a family sharing one phone; too strict
   *  loses the 8 where one person spelled their own name differently. */
  name: {
    /** Accept as the same person when a token of 3+ chars is shared AND the
     *  overall edit distance stays under this ratio. */
    sharedTokenMaxRatio: 0.40,
    /** Or accept on closeness alone, for single-word names with a typo. */
    absoluteMaxRatio: 0.20,
    minTokenLength: 3,
  },

  /** Which order sources enforcement may act on. Scoring and logging still run
   *  for every source — the merchant's own duplicates are worth seeing — but
   *  only these may ever be soft-blocked.
   *
   *  'manual' is excluded deliberately, for two independent reasons:
   *    1. A merchant typing an order into the dashboard is already looking at
   *       the order list. They are not guessing whether the first one arrived,
   *       so the question a soft block asks is one they have already answered.
   *    2. NewOrderClient falls back to a DIRECT Supabase insert whenever this
   *       API returns anything other than success. A 409 there would not stop
   *       the order — it would reroute it around this endpoint entirely, past
   *       the stock decrement and the notification. Refusing to enforce is not
   *       a concession; it is the only outcome that stays truthful. */
  enforceSources: ['storefront'] as readonly string[],
} as const

/** Enforcement gate by order source. Absent means storefront: the mobile app
 *  and older cached bundles omit the field, and the API already defaults it
 *  the same way. */
export function enforcementApplies(source: string | null | undefined): boolean {
  return DUPLICATE_POLICY.enforceSources.includes(source ?? 'storefront')
}

export type DetectionMode = 'monitor' | 'soft_block' | 'off'
export type Band = 'strong' | 'uncertain' | 'allow'

export interface CandidateItem {
  product_id: string
  variant_key?: string | null
  quantity: number
}

/** The checkout being evaluated. */
export interface CandidateOrder {
  store_id: string
  customer_phone: string
  customer_name: string
  total: number
  delivery_type: string
  wilaya_id: number
  baladia?: string | null
  items: CandidateItem[]
}

/** A previously stored order, as read back for comparison. */
export interface PriorOrder {
  id: string
  order_number: string
  customer_name: string
  total: number
  delivery_type: string
  wilaya_id: number
  baladia?: string | null
  status: string
  created_at: string
  items: CandidateItem[]
}

export interface DuplicateVerdict {
  band: Band
  score: number
  /** Human-readable trail of what contributed. Diagnostic only — this must
   *  never be shown to a customer. */
  reasons: string[]
  match: PriorOrder | null
  /** Why the candidate was allowed without scoring, when that happened. */
  gate?: 'different-product' | 'different-variant' | 'different-name' | 'no-prior'
}

// ── name handling ───────────────────────────────────────────

/** Fold the spellings of one name together without folding two names into
 *  one. Arabic here is written with inconsistent hamza, taa marbuta and alef
 *  maqsura by the same person on two different days, so those are unified;
 *  nothing that distinguishes actual names is touched. */
export function normalizeName(raw: string | null | undefined): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[ً-ٰٟ]/g, '')   // harakat
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىي]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^a-z0-9؀-ۿ ]/g, ' ')   // punctuation → space (Latin + Arabic)
    .replace(/\s+/g, ' ')
    .trim()
}

/** Levenshtein distance. Small inputs only — names, not documents. */
function editDistance(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[b.length]
}

/**
 * Whether two names plausibly belong to the same person.
 *
 * A blank name on either side returns false: absence is not a match, and
 * 22.8% of orders carry a single word with no surname to lean on.
 */
export function namesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const A = normalizeName(a)
  const B = normalizeName(b)
  if (!A || !B) return false
  if (A === B) return true

  const { sharedTokenMaxRatio, absoluteMaxRatio, minTokenLength } = DUPLICATE_POLICY.name
  const ratio = editDistance(A, B) / Math.max(A.length, B.length)
  if (ratio <= absoluteMaxRatio) return true

  const tb = new Set(B.split(' '))
  const sharesToken = A.split(' ').some(t => t.length >= minTokenLength && tb.has(t))
  return sharesToken && ratio <= sharedTokenMaxRatio
}

// ── item signatures ─────────────────────────────────────────

const productSig = (items: CandidateItem[]) =>
  items.map(i => i.product_id).sort().join(',')

/** '' and 'default' both mean "this garment has no variants", so they must
 *  compare equal — otherwise a catalogue change would silently turn every
 *  repeat into an allowed order. */
const variantSig = (items: CandidateItem[]) =>
  items.map(i => `${i.product_id}|${normalizeVariant(i.variant_key)}`).sort().join(',')

const quantitySig = (items: CandidateItem[]) =>
  items.map(i => `${i.product_id}|${normalizeVariant(i.variant_key)}|${i.quantity}`).sort().join(',')

function normalizeVariant(v: string | null | undefined): string {
  const s = String(v ?? '').trim().toLowerCase()
  return s === 'default' ? '' : s
}

// ── scoring ─────────────────────────────────────────────────

function timePoints(gapHours: number): number {
  for (const band of DUPLICATE_POLICY.timeBands) {
    if (gapHours <= band.maxHours) return band.points
  }
  return DUPLICATE_POLICY.timeBands[DUPLICATE_POLICY.timeBands.length - 1].points
}

/**
 * Compare one candidate against one prior order.
 *
 * Returns null when an identity gate rejects the pair — meaning ALLOW, with
 * no score computed. The gates are absolute and come first precisely so that
 * no combination of weights can ever override them.
 */
export function scoreAgainst(
  candidate: CandidateOrder,
  prior: PriorOrder,
  now: Date = new Date(),
): { score: number; reasons: string[] } | { gate: NonNullable<DuplicateVerdict['gate']> } {
  if (productSig(candidate.items) !== productSig(prior.items)) return { gate: 'different-product' }

  // THE clothing gate. Different size or colour is a different purchase, full
  // stop — no score, no threshold, no override.
  if (variantSig(candidate.items) !== variantSig(prior.items)) return { gate: 'different-variant' }

  if (!namesMatch(candidate.customer_name, prior.customer_name)) return { gate: 'different-name' }

  const w = DUPLICATE_POLICY.weights
  const reasons: string[] = ['identity(phone+product+variant+name)']
  let score = w.identityBase

  if (quantitySig(candidate.items) === quantitySig(prior.items)) { score += w.sameQuantity; reasons.push(`qty+${w.sameQuantity}`) }
  if (Number(candidate.total) === Number(prior.total)) { score += w.sameTotal; reasons.push(`total+${w.sameTotal}`) }
  if (candidate.delivery_type === prior.delivery_type) { score += w.sameDeliveryType; reasons.push(`delivery+${w.sameDeliveryType}`) }
  if (candidate.wilaya_id === prior.wilaya_id) { score += w.sameWilaya; reasons.push(`wilaya+${w.sameWilaya}`) }
  if (normalizeName(candidate.baladia) === normalizeName(prior.baladia)) { score += w.sameCommune; reasons.push(`commune+${w.sameCommune}`) }

  const gapHours = (now.getTime() - new Date(prior.created_at).getTime()) / 3_600_000
  const tp = timePoints(gapHours)
  score += tp
  reasons.push(`time(${gapHours.toFixed(1)}h)${tp >= 0 ? '+' : ''}${tp}`)

  if (DUPLICATE_POLICY.deadStatuses.includes(prior.status)) {
    score += DUPLICATE_POLICY.statusPenalties.dead
    reasons.push(`prior-dead(${prior.status})${DUPLICATE_POLICY.statusPenalties.dead}`)
  } else if (DUPLICATE_POLICY.reachedStatuses.includes(prior.status)) {
    score += DUPLICATE_POLICY.statusPenalties.reached
    reasons.push(`prior-reached(${prior.status})${DUPLICATE_POLICY.statusPenalties.reached}`)
  } else {
    reasons.push(`prior-unactioned(${prior.status})`)
  }

  return { score, reasons }
}

export function bandFor(score: number): Band {
  if (score >= DUPLICATE_POLICY.thresholds.strong) return 'strong'
  if (score >= DUPLICATE_POLICY.thresholds.uncertain) return 'uncertain'
  return 'allow'
}

/**
 * Evaluate a candidate against a set of prior orders and keep the worst case.
 *
 * Pure: no I/O, no clock of its own. The caller supplies the priors and the
 * time, which is what makes the whole policy testable without a database.
 */
export function evaluate(
  candidate: CandidateOrder,
  priors: PriorOrder[],
  now: Date = new Date(),
): DuplicateVerdict {
  if (priors.length === 0) return { band: 'allow', score: 0, reasons: [], match: null, gate: 'no-prior' }

  let best: DuplicateVerdict = { band: 'allow', score: 0, reasons: [], match: null, gate: 'no-prior' }
  for (const prior of priors) {
    const r = scoreAgainst(candidate, prior, now)
    if ('gate' in r) {
      if (!best.match) best = { ...best, gate: r.gate }
      continue
    }
    if (r.score > best.score || !best.match) {
      best = { band: bandFor(r.score), score: r.score, reasons: r.reasons, match: prior }
    }
  }
  return best
}

/** What the customer may be shown. Deliberately narrow: their own order's
 *  reference and what it contained. No score, no reasons, no other order. */
export interface DuplicateDisclosure {
  duplicate_detected: true
  existing_order_id: string
  existing_order_number: string
  total: number
  created_at: string
}

export function disclose(match: PriorOrder): DuplicateDisclosure {
  return {
    duplicate_detected: true,
    existing_order_id: match.id,
    existing_order_number: match.order_number,
    total: Number(match.total),
    created_at: match.created_at,
  }
}
