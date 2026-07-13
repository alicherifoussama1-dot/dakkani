// Assemble une galerie autonome (base64) des 30 frames v6 pour approbation.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const SHOTS = join(ROOT, 'shots')

const CHAPTERS = [
  ['Ouverture', 'L’OS boote, un éclair d’exposition, le titre monte de ses masques, le dock invite au scroll.', ['00a-hero-boot', '00-hero']],
  ['Chapitre 1 · Construire', 'Store Builder, catalogue, fiche produit, inventaire.', ['01-builder', '02-products', '03-pagebuilder', '04-inventory']],
  ['Chapitre 2 · Vendre', 'Le convoyeur de commandes, Confirmili, le CRM.', ['05b-orders-belt', '05-orders', '06-confirmili', '07b-customers-orb', '07-customers']],
  ['Chapitre 3 · Livrer', 'Le quai d’expédition, les transporteurs, la carte des 58 wilayas.', ['08-shipping', '09-couriers', '10b-map-zoom', '10-map']],
  ['Chapitre 4 · Piloter', 'Rack focus analytique et trésorerie COD.', ['11-analytics', '11b-analytics-fun', '12-finance']],
  ['Chapitre 5 · Amplifier', 'Le beat sombre : Studio IA et marketing.', ['13-studio', '14-marketing']],
  ['Chapitre 6 · Connecter', 'Domaine, GA4, Sheets, Pixel, WhatsApp.', ['15-domain', '16-ga', '17-sheets', '18-pixel', '19-whatsapp']],
  ['Chapitre 7 · Emporter', 'L’app mobile et les notifications.', ['20-mobile', '21-notifications']],
  ['Chapitre 8 · Se lancer', 'Témoignages, tarifs, FAQ, convergence finale.', ['22-testimonials', '23-pricing', '24-faq', '25-cta']],
]
const NOTES = {
  '00a-hero-boot': 'Ouverture keynote : écran presque nu, le wordmark se tape au rythme du scroll, letterbox déjà posé.',
  '00-hero': 'Après l’éclair d’exposition : les deux lignes du titre montent de leurs masques, un rai de lumière traverse, le dock cascade icône par icône. En sortie, la caméra traverse le titre (push-through).',
  '01-builder': 'Over-the-shoulder : drag du bloc Grille, drop, recolor violet. Les pastilles d’accent et les segments sont cliquables.',
  '02-products': 'Plan zénithal : la table se distribue comme un jeu de cartes. Les statuts tournent au clic.',
  '03-pagebuilder': 'Travelling latéral + wipe : le formulaire édité à gauche vit à droite. Titre/prix/description réellement éditables.',
  '04-inventory': 'Grue verticale le long des rayonnages ; jauges, steppers ±, alerte stock et réassort en un clic.',
  '05b-orders-belt': 'Le convoyeur : les commandes défilent devant la caméra au rythme du scroll.',
  '05-orders': 'La commande vedette quitte le tapis et s’ouvre : panier, risque, timeline, envoi vers Confirmili.',
  '06-confirmili': 'Split-screen agent / client. Appel, WhatsApp, disposition « Confirmée » réelle, toast Yalidine.',
  '07b-customers-orb': 'Constellation : les avatars orbitent, reliés en réseau (tooltips au survol).',
  '07-customers': '…et convergent dans le CRM. Filtres Fidèles / Nouveaux / À risque réels.',
  '08-shipping': 'Grue plongeante sur le kanban d’expédition ; les colis sautent de colonne en colonne (FLIP).',
  '09-couriers': 'Amarrage : chaque transporteur se dock au hub, interrupteurs et LED réels.',
  '10b-map-zoom': 'La caméra part serrée sur Alger…',
  '10-map': '…et recule pour révéler 58 wilayas en matrice de points, arcs de flux, tooltips vivants.',
  '11-analytics': 'Rack focus : la netteté voyage des KPIs aux zones suivantes. Périodes 7/30/90 j réelles.',
  '11b-analytics-fun': 'Fin du rack focus : heatmap et funnel nets.',
  '12-finance': 'Poussée avant : les versements COD se réconcilient, le solde se compte, la carte se retourne au clic.',
  '13-studio': 'Explosion radiale (beat sombre) : une phrase → six livrables. Le prompt est un vrai champ.',
  '14-marketing': 'Éventail polaroïd : cinq campagnes s’étalent, A/B switch réel, hover qui soulève.',
  '15-domain': 'Contre-plongée terminal : les DNS se tapent seuls, le cadenas SSL se ferme, boutons copier réels.',
  '16-ga': 'Tiroir latéral : GA4 branché, compteur temps réel, sparkline scrubbable au survol.',
  '17-sheets': 'Panoramique interne : chaque commande devient une ligne verte. « Sync » rejoue l’export.',
  '18-pixel': 'Vue câblée : les événements voyagent de la boutique vers Meta. Cliquables un par un.',
  '19-whatsapp': 'Gros plan : le fil se construit bulle par bulle, réponses rapides cliquables.',
  '20-mobile': 'Redressement 3D : le téléphone se lève, trois écrans balayés (drag réel).',
  '21-notifications': 'Pluie : les bannières tombent et s’empilent. Balayage pour classer.',
  '22-testimonials': 'Travelling avant : la caméra traverse trois boutiques réelles en profondeur.',
  '23-pricing': 'Assemblage : trois plans arrivent de trois directions. Mensuel/annuel réel.',
  '24-faq': 'Respiration en flux naturel — accordéons fluides.',
  '25-cta': 'Convergence : tous les modules du film spiralent vers un seul bouton magnétique.',
}

const img = f => `data:image/jpeg;base64,${readFileSync(join(SHOTS, f + '.jpg')).toString('base64')}`

let sections = ''
for (const [title, sub, files] of CHAPTERS) {
  sections += `<section><h2>${title}</h2><p class="sub">${sub}</p>`
  for (const f of files)
    sections += `<figure><img src="${img(f)}" alt="${f}" loading="lazy"><figcaption><b>${f}</b> — ${NOTES[f] || ''}</figcaption></figure>`
  sections += '</section>'
}

const html = `<title>Commerco — Landing V6 · La landing est le film</title>
<style>
  :root { color-scheme: light dark; }
  body { margin:0; font-family:Inter,system-ui,sans-serif; background:#F4F6FB; color:#0A0F1C; }
  @media (prefers-color-scheme: dark) { body { background:#0A0F1E; color:#EEF1F8; } .sub, figcaption { color:#AAB4C8 !important; } }
  :root[data-theme="dark"] body { background:#0A0F1E; color:#EEF1F8; }
  :root[data-theme="light"] body { background:#F4F6FB; color:#0A0F1C; }
  main { max-width:1080px; margin:0 auto; padding:48px 20px 90px; }
  header { text-align:center; margin-bottom:40px; }
  header h1 { font-size:clamp(26px,4vw,40px); letter-spacing:-.03em; margin:0 0 8px; }
  header p { color:#6A7488; max-width:64ch; margin:0 auto; line-height:1.6; }
  h2 { font-size:20px; letter-spacing:-.02em; margin:52px 0 4px; }
  .sub { color:#6A7488; margin:0 0 18px; font-size:14px; }
  figure { margin:0 0 26px; }
  img { width:100%; border-radius:14px; box-shadow:0 20px 50px rgba(10,15,28,.18); display:block; }
  figcaption { font-size:13px; color:#6A7488; line-height:1.55; margin-top:9px; }
  figcaption b { color:inherit; font-weight:600; }
  .pill { display:inline-block; font-size:12px; font-weight:600; letter-spacing:.12em; text-transform:uppercase;
    color:#2952E3; background:rgba(41,82,227,.09); border-radius:999px; padding:6px 14px; margin-bottom:14px; }
</style>
<main>
  <header>
    <span class="pill">Landing V6 · un seul scroll continu</span>
    <h1>La landing <em>est</em> le film.</h1>
    <p>Plus de reel : une vraie page. 26 scènes épinglées, chacune avec sa propre caméra, toutes les interfaces
    vivantes en HTML (zéro capture d’écran), et de l’interaction réelle partout — pastilles, steppers,
    interrupteurs, prompts, swipes. Frames capturées à 1440×900 depuis <code>design/landing-v6</code>.</p>
  </header>
  ${sections}
</main>`

writeFileSync(join(ROOT, 'gallery.html'), html)
console.log('gallery.html —', (html.length / 1048576).toFixed(2), 'MB')
