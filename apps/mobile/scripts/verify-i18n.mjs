// ============================================================
// I18N COMPLETENESS — ar is the fallback, so a key missing from fr/en
// silently renders Arabic inside a French UI. Now that I18nProvider is
// actually mounted, that is user-visible. Run: node scripts/verify-i18n.mjs
// ============================================================
import fs from 'node:fs'

const read = (f) => {
  const src = fs.readFileSync(new URL(`../src/i18n/${f}.ts`, import.meta.url), 'utf8')
  const keys = [...src.matchAll(/^\s*'([^']+)':/gm)].map(m => m[1])
  return keys
}
const ar = read('ar'), fr = read('fr'), en = read('en')
const setAr = new Set(ar), setFr = new Set(fr), setEn = new Set(en)

let fail = 0
const report = (name, missing, extra) => {
  if (missing.length) { fail++; console.log(`  ✗ ${name} missing ${missing.length}: ${missing.join(', ')}`) }
  else console.log(`  ✓ ${name} covers every ar key (${ar.length})`)
  if (extra.length) { fail++; console.log(`  ✗ ${name} has ${extra.length} key(s) not in ar: ${extra.join(', ')}`) }
}
console.log('\nI18N DICTIONARIES')
report('fr', ar.filter(k => !setFr.has(k)), fr.filter(k => !setAr.has(k)))
report('en', ar.filter(k => !setEn.has(k)), en.filter(k => !setAr.has(k)))

const dupes = (arr) => arr.filter((k, i) => arr.indexOf(k) !== i)
for (const [n, arr] of [['ar', ar], ['fr', fr], ['en', en]]) {
  const d = dupes(arr)
  if (d.length) { fail++; console.log(`  ✗ ${n} has duplicate keys: ${[...new Set(d)].join(', ')}`) }
  else console.log(`  ✓ ${n} has no duplicate keys`)
}
console.log(`\n${fail ? 'FAIL ' + fail : 'ALL GOOD'}\n`)
process.exit(fail ? 1 : 0)
