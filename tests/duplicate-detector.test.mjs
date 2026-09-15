// ============================================================
// SECOND-LAYER DETECTOR TESTS — pure, offline, no database.
//
//   node --test tests/
//
// Uses node:test so the repo gains a permanent suite without gaining a
// dependency. The detector is pure by design — priors and the clock are both
// injected — which is what lets the whole policy be pinned down here rather
// than only observed against production.
//
// The cases that matter most are the ones asserting a customer is ALLOWED
// through. A duplicate detector that is merely accurate is not good enough on
// a store spending money on ads; it has to be provably harmless first.
// ============================================================
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  evaluate, scoreAgainst, namesMatch, normalizeName, bandFor, disclose,
  enforcementApplies, shouldSoftBlock, monitorDiagnostic, DUPLICATE_POLICY,
} from '../lib/orders/duplicate-detector.ts'
import { readFileSync } from 'node:fs'

const HOUR = 3_600_000
const NOW = new Date('2026-09-08T12:00:00Z')
const ago = h => new Date(NOW.getTime() - h * HOUR).toISOString()

const candidate = (o = {}) => ({
  store_id: 'store-1',
  customer_phone: '0555111111',
  customer_name: 'محمد بن علي',
  total: 5000,
  delivery_type: 'home',
  wilaya_id: 16,
  baladia: 'باب الوادي',
  items: [{ product_id: 'p1', variant_key: 'أزرق|38', quantity: 1 }],
  ...o,
})

const prior = (o = {}) => ({
  id: 'ord-1',
  order_number: 'DAK-260908-1001',
  customer_name: 'محمد بن علي',
  total: 5000,
  delivery_type: 'home',
  wilaya_id: 16,
  baladia: 'باب الوادي',
  status: 'new',
  created_at: ago(20),
  items: [{ product_id: 'p1', variant_key: 'أزرق|38', quantity: 1 }],
  ...o,
})

describe('identity gates — these may only ALLOW', () => {
  test('7. same product, DIFFERENT variant → allowed, never scored', () => {
    const r = scoreAgainst(candidate(), prior({ items: [{ product_id: 'p1', variant_key: 'أزرق|40', quantity: 1 }] }), NOW)
    assert.deepEqual(r, { gate: 'different-variant' })
  })

  test('7b. different colour, same size → allowed', () => {
    const r = scoreAgainst(candidate(), prior({ items: [{ product_id: 'p1', variant_key: 'أحمر|38', quantity: 1 }] }), NOW)
    assert.deepEqual(r, { gate: 'different-variant' })
  })

  test('7c. a variant change cannot be outweighed by every other signal', () => {
    // Identical customer, total, destination, one minute apart — the single
    // strongest possible match apart from the size. Still allowed.
    const v = evaluate(
      candidate(),
      [prior({ created_at: ago(0.016), items: [{ product_id: 'p1', variant_key: 'أزرق|40', quantity: 1 }] })],
      NOW,
    )
    assert.equal(v.band, 'allow')
    assert.equal(v.match, null)
  })

  test('different product → allowed', () => {
    const r = scoreAgainst(candidate(), prior({ items: [{ product_id: 'p2', variant_key: 'أزرق|38', quantity: 1 }] }), NOW)
    assert.deepEqual(r, { gate: 'different-product' })
  })

  test('14. meaningfully different name (shared phone, family) → allowed', () => {
    const r = scoreAgainst(candidate(), prior({ customer_name: 'فاطمة الزهراء' }), NOW)
    assert.deepEqual(r, { gate: 'different-name' })
  })

  test("'default' and '' variants are the same absence of a variant", () => {
    const r = scoreAgainst(
      candidate({ items: [{ product_id: 'p1', variant_key: 'default', quantity: 1 }] }),
      prior({ items: [{ product_id: 'p1', variant_key: '', quantity: 1 }] }),
      NOW,
    )
    assert.ok(!('gate' in r), 'default and empty must not read as different variants')
  })
})

describe('13. fuzzy name matching', () => {
  test('case and spacing folded', () => {
    assert.ok(namesMatch('Mohamed Ali', '  mohamed   ali '))
    assert.ok(namesMatch('MOHAMED ALI', 'Mohamed Ali'))
  })
  test('Arabic orthography variants folded', () => {
    assert.ok(namesMatch('أحمد', 'احمد'))
    assert.ok(namesMatch('فاطمة', 'فاطمه'))
    assert.ok(namesMatch('يحيى', 'يحيي'))
  })
  test('one-character typo accepted', () => {
    assert.ok(namesMatch('bessioud assia', 'bessioud assja'))
  })
  test('different people NOT merged', () => {
    assert.ok(!namesMatch('محمد بن علي', 'فاطمة الزهراء'))
    assert.ok(!namesMatch('Karim', 'Sofiane'))
  })
  test('blank is never a match', () => {
    assert.ok(!namesMatch('', 'محمد'))
    assert.ok(!namesMatch(null, undefined))
  })
  test('normalizeName strips punctuation and collapses space', () => {
    assert.equal(normalizeName('  Mohamed,  Ali!! '), 'mohamed ali')
  })
})

describe('scoring signals', () => {
  test('8. identical repeat, unactioned prior, 20h → strong', () => {
    const v = evaluate(candidate(), [prior()], NOW)
    assert.equal(v.band, 'strong')
    assert.ok(v.score >= DUPLICATE_POLICY.thresholds.strong, `score ${v.score}`)
    assert.equal(v.match.order_number, 'DAK-260908-1001')
  })

  test('15. different total lowers confidence', () => {
    const same = evaluate(candidate(), [prior()], NOW).score
    const diff = evaluate(candidate({ total: 5400 }), [prior()], NOW).score
    assert.ok(diff < same, `${diff} should be < ${same}`)
  })

  test('16. different destination lowers confidence', () => {
    const same = evaluate(candidate(), [prior()], NOW).score
    const diff = evaluate(candidate({ wilaya_id: 31, baladia: 'وهران' }), [prior()], NOW).score
    assert.ok(diff < same, `${diff} should be < ${same}`)
  })

  test('17. cancelled prior lowers confidence below strong', () => {
    const v = evaluate(candidate(), [prior({ status: 'cancelled' })], NOW)
    assert.notEqual(v.band, 'strong')
  })

  test('17b. failed call attempts lower confidence', () => {
    for (const s of ['failed_1', 'failed_2', 'failed_3', 'returned']) {
      assert.notEqual(evaluate(candidate(), [prior({ status: s })], NOW).band, 'strong', s)
    }
  })

  test('17c. already-contacted customer → later order is a real purchase', () => {
    for (const s of ['confirmed', 'shipped', 'delivered']) {
      assert.notEqual(evaluate(candidate(), [prior({ status: s })], NOW).band, 'strong', s)
    }
  })

  test('18. a long gap strongly lowers confidence', () => {
    const near = evaluate(candidate(), [prior({ created_at: ago(2) })], NOW).score
    const week = evaluate(candidate(), [prior({ created_at: ago(24 * 5) })], NOW).score
    const month = evaluate(candidate(), [prior({ created_at: ago(24 * 38) })], NOW).score
    assert.ok(week < near && month < week, `${near} → ${week} → ${month}`)
    assert.notEqual(evaluate(candidate(), [prior({ created_at: ago(24 * 38) })], NOW).band, 'strong')
  })

  test('18b. time alone never blocks — a perfect match 5 days out is not strong', () => {
    const v = evaluate(candidate(), [prior({ created_at: ago(24 * 5) })], NOW)
    assert.notEqual(v.band, 'strong', `score ${v.score}`)
  })

  test('9. legitimate second purchase after contact remains possible', () => {
    const v = evaluate(candidate(), [prior({ status: 'delivered', created_at: ago(24 * 10) })], NOW)
    assert.equal(v.band, 'allow')
  })

  test('10. different customer entirely → allow', () => {
    const v = evaluate(candidate({ customer_name: 'ياسين مرابط' }), [prior()], NOW)
    assert.equal(v.band, 'allow')
  })

  test('worst-case prior wins when several exist', () => {
    const v = evaluate(candidate(), [prior({ id: 'old', created_at: ago(24 * 30) }), prior({ id: 'recent', created_at: ago(3) })], NOW)
    assert.equal(v.match.id, 'recent')
  })
})

describe('bands and disclosure', () => {
  test('band boundaries follow the single config object', () => {
    assert.equal(bandFor(DUPLICATE_POLICY.thresholds.strong), 'strong')
    assert.equal(bandFor(DUPLICATE_POLICY.thresholds.strong - 1), 'uncertain')
    assert.equal(bandFor(DUPLICATE_POLICY.thresholds.uncertain), 'uncertain')
    assert.equal(bandFor(DUPLICATE_POLICY.thresholds.uncertain - 1), 'allow')
  })

  test('default mode is monitor — enforcement is opt-in', () => {
    assert.equal(DUPLICATE_POLICY.mode, 'monitor')
  })

  test('disclosure leaks no diagnostics to the customer', () => {
    const d = disclose(prior())
    assert.deepEqual(Object.keys(d).sort(), [
      'created_at', 'duplicate_detected', 'existing_order_id', 'existing_order_number', 'total',
    ])
    assert.ok(!('score' in d) && !('reasons' in d) && !('customer_name' in d) && !('status' in d))
  })

  test('no prior orders → allow', () => {
    const v = evaluate(candidate(), [], NOW)
    assert.equal(v.band, 'allow')
    assert.equal(v.gate, 'no-prior')
  })
})

describe('enforcement is scoped by order source', () => {
  test('storefront orders may be enforced', () => {
    assert.ok(enforcementApplies('storefront'))
  })

  test('a missing source is treated as storefront', () => {
    // The mobile app and older cached bundles omit it; the API defaults it the
    // same way, so the two must not disagree.
    assert.ok(enforcementApplies(undefined))
    assert.ok(enforcementApplies(null))
  })

  test('merchant-entered orders are never soft-blocked', () => {
    // Not a style preference. NewOrderClient answers any non-success from this
    // API by inserting the order directly, so a 409 would reroute the order
    // around the endpoint rather than stop it.
    assert.ok(!enforcementApplies('manual'))
  })

  test('an unknown source is not enforced', () => {
    assert.ok(!enforcementApplies('some_future_integration'))
  })
})

// ============================================================
// MONITOR MODE IS INERT
//
// These are the most important tests in the file. Monitor mode runs against
// live paid traffic, so "it does not interfere" cannot be a claim in a comment
// — it has to be a property something checks.
// ============================================================
describe('9 + 10. monitor mode never interrupts a customer', () => {
  test('a STRONG match in monitor mode does not block', () => {
    assert.equal(shouldSoftBlock({ mode: 'monitor', band: 'strong', hasMatch: true, source: 'storefront' }), false)
  })

  test('an UNCERTAIN match in monitor mode does not block', () => {
    assert.equal(shouldSoftBlock({ mode: 'monitor', band: 'uncertain', hasMatch: true, source: 'storefront' }), false)
  })

  test('monitor mode is false for EVERY combination of inputs', () => {
    for (const band of ['strong', 'uncertain', 'allow']) {
      for (const hasMatch of [true, false]) {
        for (const customerOverride of [true, false, undefined]) {
          for (const source of ['storefront', 'manual', null, undefined, 'anything']) {
            for (const hasCheckoutToken of [true, false]) {
              assert.equal(
                shouldSoftBlock({ mode: 'monitor', band, hasMatch, customerOverride, source, hasCheckoutToken }), false,
                `monitor blocked on band=${band} match=${hasMatch} override=${customerOverride} source=${source} token=${hasCheckoutToken}`,
              )
            }
          }
        }
      }
    }
  })

  test("'off' mode blocks nothing either", () => {
    assert.equal(shouldSoftBlock({ mode: 'off', band: 'strong', hasMatch: true, source: 'storefront' }), false)
  })

  test('only soft_block + strong + match + no override + storefront can block', () => {
    const ok = { mode: 'soft_block', band: 'strong', hasMatch: true, source: 'storefront', hasCheckoutToken: true }
    assert.equal(shouldSoftBlock(ok), true)
    // Each condition alone is enough to withhold it.
    assert.equal(shouldSoftBlock({ ...ok, band: 'uncertain' }), false)
    assert.equal(shouldSoftBlock({ ...ok, hasMatch: false }), false)
    assert.equal(shouldSoftBlock({ ...ok, customerOverride: true }), false)
    assert.equal(shouldSoftBlock({ ...ok, source: 'manual' }), false)
    assert.equal(shouldSoftBlock({ ...ok, hasCheckoutToken: false }), false)
  })

  test('a request without a checkout token is never blocked (old bundle, no prompt UI)', () => {
    assert.equal(shouldSoftBlock({ mode: 'soft_block', band: 'strong', hasMatch: true, source: 'storefront' }), false)
    assert.equal(shouldSoftBlock({ mode: 'soft_block', band: 'strong', hasMatch: true, source: 'storefront', hasCheckoutToken: false }), false)
  })

  test('an unrecognised env value degrades to harmless, never to blocking', () => {
    for (const mode of ['SOFT_BLOCK', 'softblock', 'true', '1', '', 'enabled']) {
      assert.equal(shouldSoftBlock({ mode, band: 'strong', hasMatch: true, source: 'storefront', hasCheckoutToken: true }), false, mode)
    }
  })
})

describe('12. the second layer is independent of the checkout token', () => {
  test('the detector takes no token and cannot read one', () => {
    // Structural, not behavioural: a new attempt carries a new token, and the
    // second layer must judge it on the purchase itself. If a token ever became
    // an input here, the two layers would stop being independent.
    // Comments discuss the first layer by name, so strip them: the question
    // is whether any CODE here touches a token, not whether the prose does.
    const code = readFileSync('lib/orders/duplicate-detector.ts', 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*/g, '')
    const body = code.slice(0, code.indexOf('export function monitorDiagnostic'))
    assert.ok(!/checkout_?[tT]oken/.test(body), 'the detector must not read the checkout token')
  })

  test('a second attempt with the same purchase is still scored', () => {
    const v = evaluate(candidate(), [prior()], NOW)
    assert.equal(v.band, 'strong')
  })
})

// ============================================================
// SOURCE GUARDS
//
// Store isolation and the abandoned-draft exclusion are SQL filters in the
// route, not logic in this module, so they cannot be exercised without a
// database. These assert the filters are present in the source. That is a
// regression guard, NOT proof of behaviour, and it is labelled as such.
// ============================================================
describe('13 + 14. route-level filters (source guard, not a behavioural test)', () => {
  const route = readFileSync('app/api/orders/route.ts', 'utf8')
  const layer2 = route.slice(route.indexOf('SECOND LAYER'), route.indexOf('5c. Wilaya'))

  test('13. the prior-order lookup is scoped to one store', () => {
    assert.match(layer2, /\.eq\('store_id', data\.store_id\)/)
  })

  test('14. abandoned drafts are excluded from the prior-order lookup', () => {
    assert.match(layer2, /\.neq\('status', 'abandoned'\)/)
  })

  test('11. the token fast path is scoped and excludes abandoned drafts', () => {
    const layer1 = route.slice(route.indexOf('4a. Idempotency by TOKEN'), route.indexOf('const idemSince'))
    assert.match(layer1, /\.eq\('checkout_token', data\.checkout_token\)/)
    assert.match(layer1, /\.eq\('store_id', data\.store_id\)/)
    assert.match(layer1, /\.neq\('status', 'abandoned'\)/)
  })

  test('the 409 is reachable only through shouldSoftBlock', () => {
    const count = (layer2.match(/status: 409/g) ?? []).length
    assert.equal(count, 1, 'exactly one 409 in layer 2')
    assert.match(layer2, /if \(shouldSoftBlock\(\{/)
  })
})

describe('6. monitor diagnostics are complete and non-identifying', () => {
  const v = evaluate(candidate(), [prior()], NOW)
  const d = monitorDiagnostic({
    verdict: v, storeId: 'store-1', phoneMask: '0555•••111',
    source: 'storefront', checkoutToken: 'abcdef0123456789', priorsConsidered: 3,
  })

  test('carries every field needed to judge the detector', () => {
    for (const k of ['classification', 'score', 'store_id', 'prior_order_id', 'prior_order_number',
      'signals', 'source', 'priors_considered', 'would_soft_block_if_enforced']) {
      assert.ok(k in d, `missing ${k}`)
    }
    for (const k of ['same_quantity', 'same_total', 'same_delivery_type', 'same_wilaya',
      'same_commune', 'name_match', 'gap_hours', 'prior_status', 'prior_status_class']) {
      assert.ok(k in d.signals, `missing signal ${k}`)
    }
  })

  test('carries no customer name and no full phone number', () => {
    const blob = JSON.stringify(d)
    assert.ok(!blob.includes('محمد بن علي'), 'customer name leaked into diagnostics')
    assert.ok(!blob.includes('0555111111'), 'full phone leaked into diagnostics')
    assert.ok(!blob.includes('باب الوادي'), 'address leaked into diagnostics')
  })

  test('the attempt id is truncated, not the whole token', () => {
    assert.equal(d.attempt, 'abcdef01')
  })

  test('reports what enforcement WOULD have done, without doing it', () => {
    assert.equal(d.mode, 'monitor')
    assert.equal(d.would_soft_block_if_enforced, true)
  })

  test('signals reflect the actual comparison', () => {
    const diff = evaluate(candidate({ total: 9999, wilaya_id: 31 }), [prior()], NOW)
    assert.equal(diff.signals.same_total, false)
    assert.equal(diff.signals.same_wilaya, false)
    assert.equal(diff.signals.prior_status_class, 'unactioned')
  })
})

describe('missing-column fallback matches the errors the database really returns', () => {
  const route = readFileSync('app/api/orders/route.ts', 'utf8')
  test('route recognises PGRST204 and 42703 for checkout_token', () => {
    const block = route.slice(route.indexOf('Column missing (migration 033'), route.indexOf("finalStatus === 'duplicate' && insertRes.error.message"))
    assert.match(block, /PGRST204/)
    assert.match(block, /42703/)
  })
})
