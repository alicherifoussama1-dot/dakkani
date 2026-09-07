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
  DUPLICATE_POLICY,
} from '../lib/orders/duplicate-detector.ts'

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
