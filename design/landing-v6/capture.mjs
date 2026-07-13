// V6 landing capture : chaque scène figée via ?shot=<id>&p=<v> à 1440x900.
import { execSync } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const sharp = createRequire('F:/dakkani/package.json')('sharp')
const ROOT = dirname(fileURLToPath(import.meta.url))
const SHOTS = join(ROOT, 'shots')
mkdirSync(SHOTS, { recursive: true })

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://127.0.0.1:4521/?'
const W = 1440, H = 900

const frames = [
  { file: '00a-hero-boot',    shot: 'sc-hero',          p: .09, note: 'Hero — boot de l’OS (wordmark tapé)' },
  { file: '00-hero',          shot: 'sc-hero',          p: .55, note: 'Hero — OS révélé + dock modules' },
  { file: '01-builder',       shot: 'sc-builder',       p: .88, note: 'Store Builder — grille + recolor violet' },
  { file: '02-products',      shot: 'sc-products',      p: .75, note: 'Produits — cartes distribuées' },
  { file: '03-pagebuilder',   shot: 'sc-pagebuilder',   p: .7,  note: 'Fiche produit — split wipe' },
  { file: '04-inventory',     shot: 'sc-inventory',     p: .78, note: 'Inventaire — grue + alerte stock' },
  { file: '05-orders',        shot: 'sc-orders',        p: .8,  note: 'Commandes — fiche ouverte' },
  { file: '05b-orders-belt',  shot: 'sc-orders',        p: .25, note: 'Commandes — convoyeur' },
  { file: '06-confirmili',    shot: 'sc-confirmili',    p: .88, note: 'Confirmili — confirmée + toast' },
  { file: '07-customers',     shot: 'sc-customers',     p: .7,  note: 'Clients — CRM posé' },
  { file: '07b-customers-orb',shot: 'sc-customers',     p: .18, note: 'Clients — constellation' },
  { file: '08-shipping',      shot: 'sc-shipping',      p: .75, note: 'Expédition — colonnes + colis déplacés' },
  { file: '09-couriers',      shot: 'sc-couriers',      p: .85, note: 'Transporteurs — amarrés, LED vertes' },
  { file: '10-map',           shot: 'sc-map',           p: .7,  note: 'Carte Algérie — dots + arcs' },
  { file: '10b-map-zoom',     shot: 'sc-map',           p: .12, note: 'Carte — zoom Alger' },
  { file: '11-analytics',     shot: 'sc-analytics',     p: .35, note: 'Analytique — rack focus KPIs' },
  { file: '11b-analytics-fun',shot: 'sc-analytics',     p: .88, note: 'Analytique — funnel net' },
  { file: '12-finance',       shot: 'sc-finance',       p: .75, note: 'Finance — versements + solde' },
  { file: '13-studio',        shot: 'sc-studio',        p: .9,  note: 'Studio IA — burst complet' },
  { file: '14-marketing',     shot: 'sc-marketing',     p: .75, note: 'Marketing — éventail' },
  { file: '15-domain',        shot: 'sc-domain',        p: .85, note: 'Domaine — DNS vérifié + SSL' },
  { file: '16-ga',            shot: 'sc-ga',            p: .7,  note: 'Google Analytics — temps réel' },
  { file: '17-sheets',        shot: 'sc-sheets',        p: .7,  note: 'Google Sheets — lignes synchro' },
  { file: '18-pixel',         shot: 'sc-pixel',         p: .75, note: 'Meta Pixel — compteurs' },
  { file: '19-whatsapp',      shot: 'sc-whatsapp',      p: .85, note: 'WhatsApp — fil complet' },
  { file: '20-mobile',        shot: 'sc-mobile',        p: .55, note: 'Mobile — app redressée' },
  { file: '21-notifications', shot: 'sc-notifications', p: .8,  note: 'Notifications — pile posée' },
  { file: '22-testimonials',  shot: 'sc-testimonials',  p: .38, note: 'Témoignages — carte 2 nette' },
  { file: '23-pricing',       shot: 'sc-pricing',       p: .7,  note: 'Tarifs — trois plans assemblés' },
  { file: '24-faq',           shot: 'sc-faq',           p: .5,  note: 'FAQ — accordéon' },
  { file: '25-cta',           shot: 'sc-cta',           p: .75, note: 'CTA final — convergence' },
]

const sleep = ms => new Promise(r => setTimeout(r, ms))
rmSync(join(ROOT, '.chrome-tmp'), { recursive: true, force: true })

for (const { file, shot, p, note } of frames) {
  const url = `${BASE}shot=${shot}&p=${p}`
  const png = join(ROOT, `_seg-${file}.png`)
  for (let attempt = 1; ; attempt++) {
    try {
      execSync(
        `"${CHROME}" --headless=new --disable-gpu --mute-audio --hide-scrollbars --force-color-profile=srgb --user-data-dir="${join(ROOT, '.chrome-tmp')}" --window-size=${W},${H} --virtual-time-budget=6000 --screenshot="${png}" "${url}" 2>nul`,
        { shell: 'cmd.exe' }
      )
      break
    } catch (e) {
      if (attempt >= 3) throw e
      console.log(`  retry ${attempt} — ${file}`)
      await sleep(1200)
    }
  }
  await sharp(png).extract({ left: 0, top: 0, width: W, height: H })
    .jpeg({ quality: 86, mozjpeg: true }).toFile(join(SHOTS, `${file}.jpg`))
  console.log(file, '  ', note)
}

execSync(`del /q "${ROOT.replace(/\//g, '\\')}\\_seg-*.png" 2>nul`, { shell: 'cmd.exe' })
console.log('ALLDONE')
