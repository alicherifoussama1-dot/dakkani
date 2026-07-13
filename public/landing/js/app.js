// ═══════════════════════════════════════════════════════════════
// COMMERCO LANDING v6 — app.js
// « La landing est le film. » Un seul rAF propage --p (0..1) sur
// chaque scène épinglée ; les metteurs en scène (directors) gèrent
// ce que le CSS ne sait pas faire ; toutes les surfaces sont vives.
// ═══════════════════════════════════════════════════════════════

const $ = (s, r = document) => r.querySelector(s)
const $$ = (s, r = document) => [...r.querySelectorAll(s)]
const NS = 'http://www.w3.org/2000/svg'
const el = (tag, attrs = {}) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n }
const clamp01 = v => Math.min(1, Math.max(0, v))
const lerp = (a, b, t) => a + (b - a) * t
const ease = t => 1 - Math.pow(1 - t, 3)
const fmtDA = n => n.toLocaleString('fr-FR')

/* ═══════════ 1 · MOTEUR DE SCÈNES ═══════════ */
const scenes = $$('.sc')
for (const s of scenes) s.style.height = (parseInt(s.dataset.len || '220', 10)) + 'vh'

const directors = {}   // id → fn(p, scene)
const lastP = new Map()

/* La caméra a de l'inertie : --p affiché converge vers la cible réelle
   (lerp .16/frame) — tout le film devient flotté, jamais mécanique. */
const disp = new Map()
function frame() {
  const vh = innerHeight
  for (const s of scenes) {
    const r = s.getBoundingClientRect()
    if (r.bottom < -vh || r.top > vh * 2) { disp.delete(s); continue }  // hors champ
    const p = clamp01(-r.top / (s.offsetHeight - vh))
    let d = disp.get(s) ?? p
    d += (p - d) * .16
    if (Math.abs(p - d) < .0006) d = p
    disp.set(s, d)
    if (Math.abs((lastP.get(s) ?? -1) - d) < .0004) continue
    lastP.set(s, d)
    s.style.setProperty('--p', d.toFixed(4))
    directors[s.id]?.(d, s)
  }
  updateChrome()
  requestAnimationFrame(frame)
}

/* Nav : progression globale, chapitre courant, bascule sombre */
const navChapter = $('#navChapter'), navProgress = $('#navProgress')
const chapterEls = $$('[data-chapter]')
function updateChrome() {
  const doc = document.documentElement
  const sp = clamp01(scrollY / (doc.scrollHeight - innerHeight))
  navProgress.style.setProperty('--sp', sp.toFixed(4))
  let label = 'Un OS, pas un logiciel', dark = false
  for (const c of chapterEls) {
    const r = c.getBoundingClientRect()
    if (r.top < innerHeight * .5) { label = c.dataset.chapter; dark = c.dataset.dark === '1' }
  }
  if (navChapter.textContent !== label) navChapter.textContent = label
  document.body.classList.toggle('on-dark', dark)
  document.body.classList.toggle('at-top', scrollY < 30)
  for (const [i, s] of railTargets.entries()) {
    const r = s.getBoundingClientRect()
    railDots[i]?.classList.toggle('on', r.top < innerHeight * .5 && r.bottom > innerHeight * .5)
  }
}

/* Rail de chapitres */
const RAIL = [['#sc-hero','OS'],['#sc-builder','Builder'],['#sc-orders','Vendre'],['#sc-shipping','Livrer'],
  ['#sc-analytics','Piloter'],['#sc-studio','Studio IA'],['#sc-domain','Connecter'],['#sc-mobile','Mobile'],['#sc-cta','Se lancer']]
const rail = $('#rail')
const railTargets = RAIL.map(([sel]) => $(sel)).filter(Boolean)
const railDots = RAIL.map(([sel, label]) => {
  const a = document.createElement('a')
  a.dataset.label = label
  a.addEventListener('click', () => $(sel)?.scrollIntoView({ behavior: 'smooth' }))
  rail.appendChild(a); return a
})

/* data-goto + data-href + chapitres .seen */
$$('[data-goto]').forEach(b => b.addEventListener('click', () => $(b.dataset.goto)?.scrollIntoView({ behavior: 'smooth' })))
$$('[data-href]').forEach(b => b.addEventListener('click', () => { location.href = b.dataset.href }))
const seer = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('seen', e.isIntersecting)), { threshold: .35 })
$$('.chapter').forEach(c => seer.observe(c))

/* Trajectoires de curseur (waypoints en % de la fenêtre hôte) */
function cursorAt(waypoints, p) {
  if (p <= waypoints[0].t) return waypoints[0]
  const last = waypoints[waypoints.length - 1]
  if (p >= last.t) return last
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i], b = waypoints[i + 1]
    if (p >= a.t && p <= b.t) { const t = ease((p - a.t) / (b.t - a.t)); return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) } }
  }
  return last
}
function placeCursor(cur, path, p, presses = []) {
  if (!cur) return
  const { x, y } = cursorAt(path, p)
  cur.style.left = x + '%'; cur.style.top = y + '%'
  cur.style.transform = presses.some(([a, b]) => p > a && p < b) ? 'scale(.86)' : 'scale(1)'
}

/* ═══════════ 2 · HERO — boot ═══════════ */
{
  const heroType = $('#heroType'), bootLine = $('#heroBootLine'), dock = $('#heroDock')
  const WORD = 'commerco os'
  const LINES = ['initialisation des modules…', 'boutique · commandes · livraison ✓', 'confirmili · studio ia · analytique ✓', 'prêt.']
  const MODULES = [
    ['#i-grid', 'Store Builder', '#sc-builder'], ['#i-tag', 'Produits', '#sc-products'], ['#i-box', 'Inventaire', '#sc-inventory'],
    ['#i-cart', 'Commandes', '#sc-orders'], ['#i-phone', 'Confirmili', '#sc-confirmili'], ['#i-users', 'Clients', '#sc-customers'],
    ['#i-truck', 'Livraison', '#sc-shipping'], ['#i-globe', 'Carte 58 wilayas', '#sc-map'], ['#i-chart', 'Analytique', '#sc-analytics'],
    ['#i-wallet', 'Finance', '#sc-finance'], ['#i-spark', 'Studio IA', '#sc-studio'], ['#i-plane', 'Marketing', '#sc-marketing'],
    ['#i-bell', 'Notifications', '#sc-notifications'],
  ]
  MODULES.forEach(([ic, label, goto], i) => {
    const b = document.createElement('button')
    b.className = 'dock-ic'; b.dataset.label = label
    b.style.setProperty('--di', i)
    b.innerHTML = `<svg><use href="${ic}"/></svg>`
    b.addEventListener('click', () => $(goto)?.scrollIntoView({ behavior: 'smooth' }))
    dock.appendChild(b)
  })
  directors['sc-hero'] = p => {
    const k = clamp01(p / .12)
    const n = Math.round(k * WORD.length)
    const txt = WORD.slice(0, n)
    if (heroType.textContent !== txt) heroType.textContent = txt
    const li = Math.min(LINES.length - 1, Math.floor(k * LINES.length))
    if (bootLine.textContent !== LINES[li]) bootLine.textContent = LINES[li]
  }
}

/* ═══════════ 3 · STORE BUILDER ═══════════ */
{
  const win = $('#sbWin')
  const SB_PATH = [
    { t: .16, x: 9, y: 42 }, { t: .28, x: 11, y: 45 }, { t: .42, x: 38, y: 66 }, { t: .54, x: 46, y: 72 },
    { t: .62, x: 46, y: 72 }, { t: .74, x: 86, y: 24 }, { t: .80, x: 87.2, y: 22.5 }, { t: .92, x: 82, y: 34 },
  ]
  const ghost = $('#sbGhost')
  directors['sc-builder'] = p => {
    placeCursor($('#sbCur'), SB_PATH, p, [[.615, .70], [.775, .83]])
    const on = clamp01((p - .27) * 14) * clamp01((.56 - p) * 14)
    const { x, y } = cursorAt(SB_PATH, p)
    ghost.style.opacity = String(Math.min(1, on))
    ghost.style.left = `calc(${x}% + 14px)`; ghost.style.top = `calc(${y}% + 10px)`
  }
  // interactions réelles : swatches + segments
  $('#sbSwatches').addEventListener('click', e => {
    const sw = e.target.closest('.sw'); if (!sw) return
    win.classList.add('user-took-over')
    win.style.setProperty('--sw-auto', '0')
    win.style.setProperty('--user-accent', sw.dataset.c)
    $$('#sbSwatches .sw').forEach(s => s.classList.toggle('sw-live', s === sw))
  })
  $$('.seg', win).forEach(seg => seg.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return
    $$('button', seg).forEach(x => x.classList.toggle('seg-on', x === b))
    if (seg.dataset.seg === 'radius') {
      const r = { 'Nets': '3px', 'Doux': '12px', 'Ronds': '22px' }[b.textContent] || '12px'
      win.style.setProperty('--sf-r', r)
    }
  }))
}

/* ═══════════ 4 · PRODUITS — cartes distribuées ═══════════ */
{
  const rows = $('#pmRows')
  const DATA = [
    ['Montre Atlas Or Rose', 'ATL-001 · Or rose', 't-a', '18 900 DA', .82, 0, ['#D9A063', '#98A5BD', '#22304F'], 'pub'],
    ['Montre Atlas Acier', 'ATL-002 · 38 mm', 't-b', '14 500 DA', .12, 1, ['#98A5BD', '#22304F'], 'out'],
    ['Montre Atlas Nuit', 'ATL-003 · Édition limitée', 't-c', '16 200 DA', .64, 0, ['#22304F'], 'pub'],
    ['Bracelet cuir Casbah', 'ACC-014 · Cognac', 't-a', '2 400 DA', .91, 0, ['#8A5A2B', '#0A0F1C'], 'pub'],
    ['Coffret cadeau Atlas', 'PCK-002', 't-b', '1 200 DA', .45, 0, ['#EEF1F8'], 'drf'],
    ['Montre Atlas Sable', 'ATL-004 · Précommande', 't-c', '17 800 DA', .3, 0, ['#D9C9A3', '#98A5BD'], 'drf'],
    ['Boucle acier 20 mm', 'ACC-021', 't-b', '900 DA', .77, 0, ['#98A5BD'], 'pub'],
    ['Écrin voyage', 'ACC-030', 't-a', '3 100 DA', .58, 0, ['#22304F', '#8A5A2B'], 'pub'],
  ]
  const ST = { pub: ['Publié', 'st-pub'], drf: ['Brouillon', 'st-drf'], out: ['Rupture', 'st-out'] }
  const ORDER = ['pub', 'drf', 'out']
  rows.innerHTML = DATA.map(([name, sku, tile, price, stock, low, vars, st], i) => `
    <div class="pm-row" style="--i:${i}; --rot:${((i % 3) - 1) * 3.2}deg">
      <span class="pm-prod"><span class="pm-thumb ${tile}"></span><span><b>${name}</b><i>${sku}</i></span></span>
      <b class="num">${price}</b>
      <span class="pm-stock"><span class="pm-gauge ${low ? 'low' : ''}"><i style="--w:${stock * 100}%"></i></span><i class="num" style="font-style:normal;font-size:10px;color:var(--ink-3)">${Math.round(stock * 120)}</i></span>
      <span class="pm-var">${vars.map(c => `<i style="--c:${c}"></i>`).join('')}</span>
      <button class="pm-status ${ST[st][1]}" data-st="${st}">${ST[st][0]}</button>
    </div>`).join('')
  rows.addEventListener('click', e => {
    const b = e.target.closest('.pm-status'); if (!b) return
    const next = ORDER[(ORDER.indexOf(b.dataset.st) + 1) % ORDER.length]
    b.dataset.st = next; b.textContent = ST[next][0]; b.className = 'pm-status ' + ST[next][1]
  })
}

/* ═══════════ 5 · FICHE PRODUIT — miroir édition → aperçu ═══════════ */
{
  $$('.pb-field').forEach((f, i) => f.style.setProperty('--fi', i))
  const wire = (src, dst, suffix = '') => {
    const s = $(src), d = $(dst)
    s?.addEventListener('input', () => { d.textContent = s.textContent.trim() + suffix })
  }
  wire('#pbTitle', '#pvTitle')
  wire('#pbPrice', '#pvPrice', ' DA')
  wire('#pbDesc', '#pvDesc')
}

/* ═══════════ 6 · INVENTAIRE — rayonnages + steppers ═══════════ */
{
  const shelves = $('#invShelves')
  const DATA = [
    ['Montre Atlas Or Rose', 'Rayon A-1 · ATL-001', 't-a', 98, 120],
    ['Montre Atlas Acier 38 mm', 'Rayon A-2 · ATL-002', 't-b', 12, 120],
    ['Montre Atlas Nuit', 'Rayon A-3 · ATL-003', 't-c', 77, 120],
    ['Bracelet cuir Casbah', 'Rayon B-1 · ACC-014', 't-a', 214, 260],
    ['Coffret cadeau Atlas', 'Rayon B-2 · PCK-002', 't-b', 156, 200],
    ['Boucle acier 20 mm', 'Rayon C-1 · ACC-021', 't-b', 340, 400],
    ['Écrin voyage', 'Rayon C-2 · ACC-030', 't-a', 187, 240],
    ['Montre Atlas Sable', 'Rayon D-1 · ATL-004', 't-c', 200, 220],
  ]
  const track = document.createElement('div'); track.className = 'inv-track'
  track.innerHTML = DATA.map(([name, loc, tile, qty, max], i) => `
    <div class="inv-shelf" data-max="${max}">
      <span class="pm-thumb ${tile}"></span>
      <span class="inv-id"><b>${name}</b><i>${loc}</i></span>
      <span class="inv-bar ${qty / max < .15 ? 'low' : ''}"><i style="--w:${(qty / max * 100).toFixed(1)}%"></i></span>
      <span class="inv-qty"><button class="inv-step" data-d="-1">−</button><b class="num">${qty}</b><button class="inv-step" data-d="1">+</button></span>
    </div>`).join('')
  shelves.appendChild(track)
  const refreshTotal = () => { $('#invTotal').textContent = fmtDA($$('.inv-qty b', track).reduce((a, b) => a + parseInt(b.textContent.replace(/\s/g, '')), 0)) + ' unités' }
  refreshTotal()
  shelves.addEventListener('click', e => {
    const btn = e.target.closest('.inv-step'); if (!btn) return
    const shelf = btn.closest('.inv-shelf'), out = $('.inv-qty b', shelf), bar = $('.inv-bar', shelf)
    const max = +shelf.dataset.max
    let q = Math.max(0, Math.min(max, parseInt(out.textContent.replace(/\s/g, '')) + (+btn.dataset.d) * 5))
    out.textContent = fmtDA(q)
    $('i', bar).style.setProperty('--w', (q / max * 100).toFixed(1) + '%')
    bar.classList.toggle('low', q / max < .15)
    if (shelf === track.children[1]) $('#invLowCount').textContent = q
    refreshTotal()
  })
  const reorder = $('.inv-reorder')
  reorder.addEventListener('click', () => {
    if (reorder.classList.contains('done')) return
    reorder.classList.add('done'); reorder.textContent = 'Commandé ✓'
    const shelf = track.children[1], out = $('.inv-qty b', shelf), bar = $('.inv-bar', shelf)
    const q = parseInt(out.textContent.replace(/\s/g, '')) + 50
    out.textContent = fmtDA(q)
    $('i', bar).style.setProperty('--w', (q / 120 * 100).toFixed(1) + '%')
    bar.classList.remove('low'); refreshTotal()
  })
}

/* ═══════════ 7 · COMMANDES — convoyeur + fiche ═══════════ */
{
  const belt = $('#odBelt')
  const NAMES = [['Rania G.', '5 600', 'cf', 'Sétif'], ['Amine K.', '8 700', 'tr', 'Oran'], ['Meriem L.', '3 200', 'cf', 'Alger'],
    ['Lina Hadj', '21 700', 'new', 'Alger', 1], ['Yacine B.', '12 400', 'new', 'Blida'], ['Sarah M.', '4 900', 'cf', 'Hydra'],
    ['Karim Z.', '7 300', 'tr', 'Annaba'], ['Nadia B.', '2 800', 'cf', 'Oran'], ['Walid T.', '15 200', 'new', 'Constantine'], ['Ines M.', '6 100', 'cf', 'Tizi Ouzou']]
  const ST = { new: ['Nouvelle', 'st-new'], cf: ['Confirmée', 'st-cf'], tr: ['En transit', 'st-tr'] }
  belt.innerHTML = NAMES.map(([name, amt, st, city, star], i) => `
    <div class="od-mini ${star ? 'od-star' : ''}">
      <div class="od-top"><b>#COM-${2655 - i}</b><span class="od-st ${ST[st][1]}">${ST[st][0]}</span></div>
      <div class="od-who"><span class="q-av">${name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}</span>${name} · ${city}</div>
      <div class="od-amt"><span>COD</span><b class="num">${amt} DA</b></div>
    </div>`).join('')
  const steps = $$('#odTimeline .od-step')
  directors['sc-orders'] = p => {
    steps[1]?.classList.toggle('done', p > .68 || sent)
    steps[2]?.classList.toggle('done', p > .8 || sent)
    steps[3]?.classList.toggle('done', p > .9)
  }
  let sent = false
  $('#odPush').addEventListener('click', function () {
    sent = true; this.classList.add('sent')
    this.innerHTML = '<svg><use href="#i-check"/></svg>Envoyée à Confirmili ✓'
  })
}

/* ═══════════ 8 · CONFIRMILI ═══════════ */
{
  const CF_PATH = [{ t: .18, x: 62, y: 46 }, { t: .40, x: 46, y: 78 }, { t: .58, x: 38.5, y: 88.5 }, { t: .66, x: 38.5, y: 88.5 }, { t: .84, x: 52, y: 74 }]
  const timer = $('#cfTimer')
  directors['sc-confirmili'] = p => {
    placeCursor($('#cfCur'), CF_PATH, p, [[.615, .70]])
    const s = 22 + Math.round(p * 60)
    timer.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  }
  $('#cfConfirm').addEventListener('click', () => {
    $('#cfWin').style.setProperty('--force', '1')
    $('#cfPhone').style.setProperty('--force', '1')
    $('#cfQueueN').textContent = '4'
  })
}

/* ═══════════ 9 · CLIENTS — constellation → CRM ═══════════ */
{
  const field = $('#csField'), links = $('#csLinks'), rowsEl = $('#csRows')
  const PEOPLE = [
    ['Sarah Medjahed', 'Alger · Hydra', 'vip', 12, '58 300'], ['Yacine Brahimi', 'Blida', 'new', 1, '12 400'],
    ['Meriem Larbi', 'Alger centre', 'vip', 9, '41 800'], ['Amine Kaci', 'Oran', 'risk', 4, '19 600'],
    ['Rania Guendouz', 'Sétif', 'new', 2, '8 400'], ['Karim Ziani', 'Annaba', 'vip', 15, '84 100'],
    ['Nadia Bensalem', 'Oran', 'new', 1, '2 800'], ['Walid Terbah', 'Constantine', 'risk', 6, '31 500'],
    ['Ines Mansouri', 'Tizi Ouzou', 'vip', 8, '37 900'], ['Sofiane Rahmani', 'Béjaïa', 'new', 2, '9 700'],
    ['Lina Hadj', 'Alger · Kouba', 'new', 1, '21 700'], ['Mohamed Saidi', 'Ghardaïa', 'vip', 11, '52 300'],
  ]
  const pos = []
  PEOPLE.forEach(([name, city, seg], i) => {
    const a = (i / PEOPLE.length) * Math.PI * 2 + (i % 3) * .35
    const rx = 34 + (i % 4) * 5.5, ry = 30 + ((i * 7) % 3) * 7
    const sx = 50 + Math.cos(a) * rx, sy = 44 + Math.sin(a) * ry
    pos.push([sx, sy])
    const d = document.createElement('span')
    d.className = `cs-dot ${seg}`
    d.dataset.name = name; d.dataset.info = city
    d.textContent = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    d.style.cssText = `--i:${i}; --sx:${sx}%; --sy:${sy}%; --tx:50%; --ty:54%; --spin:${(i % 2 ? 1 : -1) * (14 + i * 2)}deg; --van:${i < 3 ? 0 : 1}`
    field.appendChild(d)
  })
  for (let i = 0; i < PEOPLE.length; i++) {
    const j = (i + 3) % PEOPLE.length
    links.appendChild(el('line', { x1: pos[i][0] + '%', y1: pos[i][1] + '%', x2: pos[j][0] + '%', y2: pos[j][1] + '%' }))
  }
  const B = { vip: ['Fidèle', 'b-vip'], new: ['Nouveau', 'b-new'], risk: ['À risque', 'b-risk'] }
  rowsEl.innerHTML = PEOPLE.slice(0, 7).map(([name, city, seg, orders, ltv]) => `
    <div class="cs-row" data-seg="${seg}">
      <span class="cs-name"><span class="q-av">${name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}</span><span><b>${name}</b><i>${city}</i></span></span>
      <span class="cs-lt"><b class="num">${ltv} DA</b> <span>valeur vie</span></span>
      <span class="num">${orders} commandes</span>
      <span class="cs-badge ${B[seg][1]}">${B[seg][0]}</span>
    </div>`).join('')
  $('#csSegs').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return
    $$('#csSegs button').forEach(x => x.classList.toggle('on', x === b))
    $$('.cs-row', rowsEl).forEach(r => r.classList.toggle('hide', b.dataset.seg !== 'all' && r.dataset.seg !== b.dataset.seg))
  })
}

/* ═══════════ 10 · EXPÉDITION — colis voyageurs (FLIP) ═══════════ */
{
  const lists = $$('#shCols .sh-list')
  const PARCELS = [
    ['#COM-2653', 'Alger · stopdesk', 'YA', 0, [0, 0, 0, 0]],
    ['#COM-2652', 'Tizi Ouzou · domicile', 'ZR', 0, [0, 0, 0, 0]],
    ['#COM-2650', 'Alger · domicile', 'YA', 0, [.0, .3, .55, .8]],
    ['#COM-2649', 'Oran · stopdesk', 'ZR', 0, [.0, .42, .68, 2]],
    ['#COM-2648', 'Sétif · domicile', 'MA', 0, [.0, .5, 2, 2]],
    ['#COM-2647', 'Hydra · domicile', 'YA', 1, [0, 0, .38, .72]],
    ['#COM-2646', 'Blida · stopdesk', 'ZR', 1, [0, 0, .58, 2]],
    ['#COM-2645', 'Alger · domicile', 'YA', 2, [0, 0, 0, .45]],
    ['#COM-2644', 'Oran · domicile', 'MA', 2, [0, 0, 0, .62]],
    ['#COM-2643', 'Sétif · stopdesk', 'YA', 3, [0, 0, 0, 0]],
    ['#COM-2642', 'Annaba · domicile', 'ZR', 3, [0, 0, 0, 0]],
    ['#COM-2641', 'Constantine', 'MA', 3, [0, 0, 0, 0]],
  ]
  const nodes = PARCELS.map(([id, dest, carrier, col, journey]) => {
    const d = document.createElement('div')
    d.className = 'sh-p'; d.dataset.carrier = carrier
    d.dataset.track = `${carrier === 'YA' ? 'Yalidine' : carrier === 'ZR' ? 'ZR Express' : 'Maystro'} · ${id.slice(1)} · maj il y a 12 min`
    d.innerHTML = `<b>${id}</b><i>${dest}</i><span class="sh-carrier">${carrier}</span>`
    lists[col].appendChild(d)
    return { d, journey, col }
  })
  const counts = () => $$('#shCols .sh-col > small').forEach((s, i) => s.dataset.n = lists[i].children.length)
  counts()
  directors['sc-shipping'] = p => {
    let moved = false, done = 3
    for (const n of nodes) {
      let target = n.col
      for (let c = 3; c > n.col; c--) if (n.journey[c] !== 0 && n.journey[c] <= p && n.journey[c] <= 1) { target = c; break }
      if (target !== +(n.d.parentElement === lists[target] ? target : -1) && n.d.parentElement !== lists[target]) {
        const first = n.d.getBoundingClientRect()
        lists[target].appendChild(n.d)
        const last = n.d.getBoundingClientRect()
        n.d.animate([{ transform: `translate(${first.left - last.left}px, ${first.top - last.top}px)` }, { transform: 'none' }],
          { duration: 520, easing: 'cubic-bezier(.22,1,.32,1)' })
        moved = true
      }
    }
    if (moved) counts()
    $('#shDone').textContent = 40 + Math.round(p * 14)
  }
}

/* ═══════════ 11 · TRANSPORTEURS — amarrage ═══════════ */
{
  const slots = $('#coSlots')
  const COURIERS = [
    ['Yalidine', 'YA', '#2952E3', 'Domicile + stopdesk · 58 wilayas', .3],
    ['ZR Express', 'ZR', '#B25409', 'Express Alger–Oran–Constantine', .38],
    ['Maystro Delivery', 'MA', '#0F8377', 'Last-mile + COD digitalisé', .46],
    ['Guepex', 'GX', '#7C3AED', 'Réseau stopdesk national', .54],
    ['DHD Livraison', 'DH', '#0A0F1C', 'Sud & hauts plateaux', .62],
    ['EMS Algérie', 'EM', '#C2410C', 'Officiel · international', .7],
  ]
  const dirs = [[-40, -20, -6], [0, -34, 4], [40, -20, 7], [-40, 24, 5], [0, 36, -4], [40, 24, -7]]
  slots.innerHTML = COURIERS.map(([name, code, color, desc], i) => `
    <div class="co-slot" data-t="${COURIERS[i][4]}" style="--i:${i}; --fx:${dirs[i][0]}vw; --fy:${dirs[i][1]}vh; --fr:${dirs[i][2]}deg">
      <span class="co-logo" style="background:${color}">${code}</span>
      <div><b>${name}</b><i>${desc}</i></div>
      <span class="co-led"></span><span class="co-switch"></span>
    </div>`).join('')
  const slotEls = $$('.co-slot', slots)
  const userTouched = new Set()
  directors['sc-couriers'] = p => {
    slotEls.forEach(s => { if (!userTouched.has(s)) s.classList.toggle('on', p > +s.dataset.t + .18) })
  }
  slots.addEventListener('click', e => {
    const sw = e.target.closest('.co-switch'); if (!sw) return
    const slot = sw.closest('.co-slot'); userTouched.add(slot); slot.classList.toggle('on')
  })
}

/* ═══════════ 12 · CARTE ALGÉRIE ═══════════ */
{
  const svg = $('#mpSvg'), tip = $('#mpTip'), rig = $('#mpRig')
  const POLY = [[-8.7, 27.4], [-8.7, 28.8], [-7.6, 29.4], [-5.5, 29.9], [-4.9, 30.6], [-3.6, 31.1], [-2.9, 32.1], [-1.2, 32.1], [-1.5, 33.1], [-1.7, 34.8], [-2.2, 35.1], [-1, 35.7], [.5, 36.3], [2.9, 36.8], [4.8, 36.9], [6.5, 37.1], [8.6, 36.9], [8.2, 36.5], [8.3, 35.2], [8.1, 34.6], [7.5, 33.9], [7.6, 33.2], [9.1, 32.1], [9.5, 30.2], [9.8, 27.8], [9.9, 26.1], [11.9, 24], [11.9, 23.5], [10.2, 22.8], [7.5, 20.9], [5.6, 19.4], [4.2, 19.1], [3.2, 19.8], [1.8, 20.3], [1.2, 20.7], [-1.5, 22.7], [-4.8, 24.9], [-6.5, 25.9]]
  const X = lon => (lon + 8.9) / 21.1 * 940 + 30
  const Y = lat => (37.3 - lat) / 18.4 * 820 + 20
  const inside = (x, y) => {
    let c = false
    for (let i = 0, j = POLY.length - 1; i < POLY.length; j = i++) {
      const xi = X(POLY[i][0]), yi = Y(POLY[i][1]), xj = X(POLY[j][0]), yj = Y(POLY[j][1])
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c
    }
    return c
  }
  const AX = X(3.05), AY = Y(36.75)   // Alger (hub)
  // matrice de points
  const g = el('g')
  for (let x = 36; x < 990; x += 24) for (let y = 30; y < 850; y += 24) {
    if (!inside(x, y)) continue
    const dist = Math.hypot(x - AX, y - AY) / 900
    const dot = el('circle', { cx: x, cy: y, r: 2.6, class: 'mp-dot lit' })
    dot.style.opacity = `calc(clamp(0, (var(--p, 0) - ${(0.16 + dist * .5).toFixed(3)}) * 7, 1) * .8 + .06)`
    g.appendChild(dot)
  }
  svg.appendChild(g)
  const CITIES = [
    ['Alger', 3.05, 36.75, 842, 1, -86, -18], ['Oran', -.63, 35.7, 512], ['Constantine', 6.6, 36.36, 298, 0, 14, 16], ['Sétif', 5.4, 36.19, 341, 0, 8, 26],
    ['Blida', 2.83, 36.47, 214, 0, -74, 24], ['Annaba', 7.75, 36.9, 176, 0, 12, -14], ['Tlemcen', -1.31, 34.88, 122], ['Batna', 6.17, 35.55, 143, 0, 14, 22],
    ['Ghardaïa', 3.67, 32.49, 87, 0, -92, 2], ['Ouargla', 5.33, 31.95, 98, 0, 16, 12], ['Béchar', -2.2, 31.6, 64], ['Tamanrasset', 5.52, 22.79, 31, 0, 16, 2],
  ]
  const arcs = el('g')
  for (const [name, lon, lat, n, hub, ldx, ldy] of CITIES) {
    const x = X(lon), y = Y(lat)
    if (!hub) {
      const mx = (AX + x) / 2 + (y - AY) * .18, my = (AY + y) / 2 - (x - AX) * .18
      const path = el('path', { d: `M${AX} ${AY} Q${mx} ${my} ${x} ${y}`, class: 'mp-arc' })
      arcs.appendChild(path)
      requestAnimationFrame(() => {
        const L = path.getTotalLength()
        path.style.strokeDasharray = String(L)
        path.style.strokeDashoffset = `calc(${L} * (1 - clamp(0, (var(--p, 0) - .34) * 2.6, 1)))`
      })
    }
    const city = el('g')
    city.appendChild(el('circle', { cx: x, cy: y, r: hub ? 7 : 4.5, class: hub ? 'mp-hub' : 'mp-city' }))
    city.appendChild(el('circle', { cx: x, cy: y, r: hub ? 13 : 9, class: hub ? 'mp-hub-halo' : 'mp-halo' }))
    const lx2 = x + (ldx ?? 12), ly2 = y + (ldy ?? -8)
    const lbl = el('text', { x: lx2, y: ly2, class: 'mp-label' }); lbl.textContent = name
    const num = el('text', { x: lx2, y: ly2 + 15, class: 'mp-n num' }); num.textContent = fmtDA(n)
    city.appendChild(lbl); city.appendChild(num)
    city.style.opacity = `clamp(0, (var(--p, 0) - ${hub ? .08 : (.42 + Math.random() * .2).toFixed(2)}) * 6, 1)`
    const hit = el('circle', { cx: x, cy: y, r: 22, class: 'mp-hit' })
    hit.addEventListener('pointerenter', () => {
      $('#mpTipCity').textContent = name
      $('#mpTipN').textContent = fmtDA(n) + ' colis / semaine'
      const rb = rig.getBoundingClientRect(), sb = svg.getBoundingClientRect()
      tip.style.left = (sb.left - rb.left + x / 1000 * sb.width) + 'px'
      tip.style.top = (sb.top - rb.top + y / 860 * sb.height) + 'px'
      tip.classList.add('show')
    })
    hit.addEventListener('pointerleave', () => tip.classList.remove('show'))
    city.appendChild(hit)
    arcs.appendChild(city)
  }
  svg.appendChild(arcs)
}

/* ═══════════ 13 · ANALYTIQUE — rack focus + périodes ═══════════ */
{
  const CURVE_W = 640, CURVE_H = 220, PAD = 18
  const SETS = {
    7:  { cur: [78, 74, 86, 92, 88, 99, 112], prev: [70, 68, 74, 79, 76, 84, 90], max: 120, rev: '412 K DA' },
    30: { cur: [42, 45, 44, 49, 53, 50, 56, 58, 55, 62, 60, 66, 71, 68, 74, 72, 78, 83, 80, 86, 84, 90, 95, 92, 99, 104, 101, 108, 114, 121], prev: [40, 42, 41, 44, 46, 45, 48, 50, 49, 52, 51, 54, 57, 55, 58, 57, 60, 62, 61, 64, 63, 66, 68, 67, 70, 72, 71, 74, 76, 79], max: 130, rev: '1,84 M DA' },
    90: { cur: [30, 34, 32, 38, 41, 39, 45, 48, 46, 53, 51, 58, 62, 60, 67, 65, 72, 78, 75, 83, 81, 89, 95, 92, 101, 108, 105, 114, 121, 130], prev: [28, 30, 29, 32, 34, 33, 36, 38, 37, 41, 40, 43, 46, 44, 47, 46, 49, 52, 51, 55, 54, 58, 61, 60, 64, 67, 66, 70, 73, 77], max: 140, rev: '5,1 M DA' },
  }
  const linePath = (data, max) => {
    const step = (CURVE_W - PAD * 2) / (data.length - 1)
    return data.map((v, i) => `${i ? 'L' : 'M'}${(PAD + i * step).toFixed(1)} ${(CURVE_H - PAD - (v / max) * (CURVE_H - PAD * 2)).toFixed(1)}`).join(' ')
  }
  const anCurve = $('#anCurve')
  for (let i = 1; i <= 3; i++)
    anCurve.appendChild(el('line', { x1: PAD, x2: CURVE_W - PAD, y1: PAD + i * (CURVE_H - PAD * 2) / 4, y2: PAD + i * (CURVE_H - PAD * 2) / 4, class: 'crv-grid' }))
  const area = el('path', { fill: 'url(#areaGrad)' })
  const prev = el('path', { class: 'crv-prev' })
  const cur = el('path', { class: 'crv-cur' })
  const halo = el('circle', { r: 9, class: 'crv-halo' })
  const dot = el('circle', { r: 4, class: 'crv-dot' })
  anCurve.append(area, prev, cur, halo, dot)
  let curLen = 0
  function setPeriod(per) {
    const S = SETS[per]
    area.setAttribute('d', linePath(S.cur, S.max) + ` L${CURVE_W - PAD} ${CURVE_H - PAD} L${PAD} ${CURVE_H - PAD} Z`)
    prev.setAttribute('d', linePath(S.prev, S.max))
    cur.setAttribute('d', linePath(S.cur, S.max))
    const lx = CURVE_W - PAD, ly = CURVE_H - PAD - (S.cur[S.cur.length - 1] / S.max) * (CURVE_H - PAD * 2)
    halo.setAttribute('cx', lx); halo.setAttribute('cy', ly); dot.setAttribute('cx', lx); dot.setAttribute('cy', ly)
    curLen = cur.getTotalLength()
    cur.style.strokeDasharray = String(curLen)
    cur.style.strokeDashoffset = '0'
    $('#anRev').textContent = S.rev
    $('#anCurveTitle').textContent = `Revenus — ${per} jours`
  }
  setPeriod(30)
  $('#anPeriod').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return
    $$('#anPeriod button').forEach(x => x.classList.toggle('on', x === b))
    setPeriod(+b.dataset.per)
    cur.animate([{ strokeDashoffset: curLen }, { strokeDashoffset: 0 }], { duration: 900, easing: 'cubic-bezier(.22,1,.32,1)' })
  })
  const anDonutG = $('#anDonut g')
  { const R = 46, C = 2 * Math.PI * R; let off = 0
    for (const [pct, color] of [[68, '#0F8377'], [17, '#2952E3'], [9, '#8FA8F9'], [6, '#99A2B4']]) {
      const len = pct / 100 * C
      anDonutG.appendChild(el('circle', { cx: 60, cy: 60, r: R, stroke: color, 'stroke-dasharray': `${len - 2.5} ${C - len + 2.5}`, 'stroke-dashoffset': String(-off) }))
      off += len
    } }
  $('#anWil').innerHTML = [['Alger', 842, 1], ['Oran', 512, .61], ['Sétif', 341, .4], ['Constantine', 298, .35], ['Blida', 214, .25]]
    .map(([n, v, w]) => `<div class="wil-row"><span>${n}</span><span class="wil-bar"><i style="--w:${w * 100}%"></i></span><b class="num">${fmtDA(v)}</b></div>`).join('')
  { let html = ''
    for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) {
      const o = Math.min(1, (Math.exp(-((h - 20) ** 2) / 14) + .55 * Math.exp(-((h - 13) ** 2) / 10)) * (d >= 4 ? 1.18 : 1) * (.72 + .28 * Math.abs(Math.sin(d * 5.7 + h * 2.3))))
      html += `<i style="--o:${Math.max(.05, o).toFixed(2)}"></i>`
    }
    $('#anHeat').innerHTML = html }
  $('#anFun').innerHTML = [['Sessions', 69400, 1], ['Panier', 8950, .58], ['Checkout', 5120, .42], ['Confirmation', 3410, .3], ['Livraison', 2980, .26]]
    .map(([n, v, w]) => `<div class="fun-row"><span>${n}</span><span class="fun-bar"><i style="--w:${w * 100}%"></i></span><b class="num">${fmtDA(v)}</b></div>`).join('')
  const anBody = $('.an-body'), anZones = $$('.an-zone')
  directors['sc-analytics'] = p => {
    if (p < .18 || p > .97) { anBody.classList.remove('rack'); anZones.forEach(z => z.classList.remove('focused')); return }
    anBody.classList.add('rack')
    const idx = Math.min(3, Math.floor((p - .18) / .79 * 4))
    anZones.forEach(z => z.classList.toggle('focused', +z.dataset.zone === idx))
  }
}

/* ═══════════ 14 · FINANCE — compteur + flip ═══════════ */
{
  const rows = $('#fiRows')
  const DATA = [
    ['Versement Yalidine', 'Lot #Y-2214 · 38 commandes', '412 300 DA', 'Rapproché', 'Frais : 15 200 DA · 38 × COD'],
    ['Versement ZR Express', 'Lot #Z-0871 · 21 commandes', '236 800 DA', 'Rapproché', 'Frais : 9 100 DA · 21 × COD'],
    ['Versement Maystro', 'Lot #M-1130 · 17 commandes', '188 400 DA', 'Rapproché', 'Frais : 7 300 DA · 17 × COD'],
    ['Versement Yalidine', 'Lot #Y-2213 · 29 commandes', '301 200 DA', 'Rapproché', 'Frais : 11 800 DA · 29 × COD'],
    ['Retours & litiges', '6 colis retournés', '−41 200 DA', 'Traité', '4 refus + 2 absents'],
    ['Versement Guepex', 'Lot #G-0402 · 12 commandes', '136 400 DA', 'En cours', 'Attendu demain'],
  ]
  rows.innerHTML = DATA.map(([t, sub, amt, chip, fees], i) => `
    <div class="fi-row" style="--i:${i}" data-fees="${fees}">
      <span class="fi-ic"><svg><use href="#i-wallet"/></svg></span>
      <span><b>${t}</b><i>${sub}</i></span>
      <b class="fi-amt num">${amt}</b>
      <span></span>
      <span class="fi-chip">${chip}</span>
    </div>`).join('')
  const total = $('#fiTotal'), TARGET = 1275100
  directors['sc-finance'] = p => {
    const k = ease(clamp01((p - .15) / .45))
    total.textContent = fmtDA(Math.round(TARGET * k)) + ' DA'
  }
  $('#fiBalance').addEventListener('click', function () { this.classList.toggle('flip') })
}

/* ═══════════ 15 · STUDIO IA — typewriter + écho ═══════════ */
{
  const aiType = $('#aiType'), TXT = 'Je veux vendre une montre de luxe.'
  let userOwns = false
  aiType.addEventListener('focus', () => { userOwns = true })
  aiType.addEventListener('input', () => {
    const raw = aiType.textContent.trim()
    const m = raw.match(/vendre\s+(?:une?\s+|des\s+)?(.{3,40})/i)
    const prod = (m ? m[1] : raw).replace(/[.!?]+$/, '').trim()
    if (prod.length > 2) {
      const cap = prod[0].toUpperCase() + prod.slice(1)
      $('#aiName').textContent = cap
      $('.ai-echo').textContent = cap.slice(0, 22)
      $('.ai-echo-seo').textContent = `${cap} — Atlas & Co`
    }
  })
  directors['sc-studio'] = p => {
    if (userOwns) return
    const k = clamp01((p - .06) / .28)
    const txt = TXT.slice(0, Math.round(k * TXT.length))
    if (aiType.textContent !== txt) aiType.textContent = txt
  }
}

/* ═══════════ 16 · MARKETING — A/B ═══════════ */
$$('[data-ab]').forEach(ab => ab.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return
  $$('button', ab).forEach(x => x.classList.toggle('on', x === b))
  const card = ab.closest('.mk-card'), vis = $('.mk-visual', card)
  if (vis && !vis.classList.contains('mk-sms') && !vis.classList.contains('mk-wa')) {
    const cls = ['t-a', 't-b', 't-c']
    const cu = cls.find(c => vis.classList.contains(c))
    vis.classList.remove(cu); vis.classList.add(cls[(cls.indexOf(cu) + 1) % 3])
  }
}))

/* ═══════════ 17 · DOMAINE & DNS — frappe ═══════════ */
{
  const lines = $('#dmLines'), state = $('#dmState')
  const RECORDS = [
    ['$', 'commerco domains connect atlas-co.dz', .1],
    ['A', '@ → 172.64.110.24', .26],
    ['CNAME', 'www → edge.commerco.dz', .38],
    ['TXT', 'commerco-verify=7f3a9c', .5],
    ['OK', '✓ domaine vérifié — SSL émis (Let’s Encrypt)', .64],
  ]
  lines.innerHTML = RECORDS.map(([t, v], i) => `
    <div class="dm-l" data-i="${i}"><span class="dm-t ${t === 'OK' ? 'dm-ok' : ''}">${t === '$' ? '$' : t}</span><span class="dm-v ${t === 'OK' ? 'dm-ok' : ''}" data-full="${v}"></span>
    ${t !== '$' && t !== 'OK' ? '<button class="dm-copy"><svg><use href="#i-copy"/></svg>copier</button>' : ''}</div>`).join('')
  const vEls = $$('.dm-v', lines)
  directors['sc-domain'] = p => {
    RECORDS.forEach(([, , t0], i) => {
      const full = vEls[i].dataset.full
      const k = clamp01((p - t0) / .11)
      const txt = full.slice(0, Math.round(k * full.length))
      if (vEls[i].textContent !== txt) vEls[i].textContent = txt
    })
    const ok = p > .72
    if ((state.textContent === 'connecté ✓') !== ok) { state.textContent = ok ? 'connecté ✓' : 'vérification…'; state.style.color = ok ? 'var(--teal-500)' : '' }
  }
  lines.addEventListener('click', async e => {
    const b = e.target.closest('.dm-copy'); if (!b) return
    try { await navigator.clipboard.writeText($('.dm-v', b.parentElement).dataset.full) } catch {}
    b.innerHTML = '✓ copié'
    setTimeout(() => { b.innerHTML = '<svg><use href="#i-copy"/></svg>copier' }, 1400)
  })
}

/* ═══════════ 18 · GOOGLE ANALYTICS — temps réel ═══════════ */
{
  const spark = $('#gaSpark'), now = $('#gaNow')
  const DATA = Array.from({ length: 30 }, (_, i) => 60 + 40 * Math.abs(Math.sin(i * .7)) + i * 1.6)
  const W = 260, H = 64
  const pth = DATA.map((v, i) => `${i ? 'L' : 'M'}${(i / 29 * W).toFixed(1)} ${(H - 6 - v / 160 * (H - 12)).toFixed(1)}`).join(' ')
  spark.appendChild(el('path', { d: pth + ` L${W} ${H} L0 ${H} Z`, class: 'ga-area' }))
  spark.appendChild(el('path', { d: pth, class: 'ga-line' }))
  const cursor = el('line', { y1: 4, y2: H - 4, class: 'ga-cursor' })
  spark.appendChild(cursor)
  const evts = [['purchase', 'Atlas Or Rose · Alger', '14:21'], ['add_to_cart', 'Bracelet Casbah · Oran', '14:21'], ['begin_checkout', 'Atlas Nuit · Sétif', '14:20'], ['page_view', '/collections/montres', '14:20']]
  $('#gaEvents').innerHTML = evts.map(([ev, d, t], i) => `<div class="ga-ev" style="--i:${i}"><i></i><b>${ev}</b> ${d}<span class="num">${t}</span></div>`).join('')
  directors['sc-ga'] = p => { now.textContent = String(96 + Math.round(clamp01((p - .1) / .5) * 32)) }
  spark.addEventListener('pointermove', e => {
    const r = spark.getBoundingClientRect()
    const t = clamp01((e.clientX - r.left) / r.width)
    const x = t * W
    cursor.setAttribute('x1', x); cursor.setAttribute('x2', x); cursor.style.opacity = '1'
    now.textContent = String(Math.round(DATA[Math.round(t * 29)]))
  })
  spark.addEventListener('pointerleave', () => { cursor.style.opacity = '0' })
}

/* ═══════════ 19 · GOOGLE SHEETS — lignes qui se synchronisent ═══════════ */
{
  const grid = $('#gsGrid')
  const HEAD = ['', 'Commande', 'Client', 'Montant', 'Wilaya', 'Statut']
  const ROWS = [
    ['#COM-2643', 'Rania Guendouz', '5 600', 'Sétif', 'Livrée', 0],
    ['#COM-2644', 'Amine Kaci', '8 700', 'Oran', 'En transit', 0],
    ['#COM-2645', 'Meriem Larbi', '3 200', 'Alger', 'Livrée', 0],
    ['#COM-2646', 'Yacine Brahimi', '12 400', 'Blida', 'Confirmée', 1],
    ['#COM-2647', 'Sarah Medjahed', '4 900', 'Alger', 'Confirmée', 1],
    ['#COM-2650', 'Walid Terbah', '15 200', 'Constantine', 'Nouvelle', 1],
    ['#COM-2651', 'Lina Hadj', '21 700', 'Alger', 'Nouvelle', 1],
  ]
  const render = () => {
    grid.innerHTML = `<div class="gs-r gs-head"><span class="gs-idx"></span>${HEAD.slice(1).map(h => `<span>${h}</span>`).join('')}</div>` +
      ROWS.map(([id, cl, amt, w, st, isNew], i) => `
      <div class="gs-r ${isNew ? 'gs-new' : ''}" style="--i:${isNew ? i - 3 : 0}"><span class="gs-idx num">${i + 2}</span><span class="num">${id}</span><span>${cl}</span><span class="num">${amt} DA</span><span>${w}</span><span>${st}</span></div>`).join('')
  }
  render()
  const replay = () => $$('.gs-r.gs-new', grid).forEach((r, i) => {
    r.classList.remove('flash'); void r.offsetWidth
    setTimeout(() => r.classList.add('flash'), i * 160)
  })
  $('#gsSync').addEventListener('click', replay)
  let gsFlashed = false
  directors['sc-sheets'] = p => {
    if (p > .45 && !gsFlashed) { gsFlashed = true; replay() }
    if (p < .08) gsFlashed = false
  }
}

/* ═══════════ 20 · META PIXEL — événements voyageurs ═══════════ */
{
  const path = $('#pxPath'), wire = $('#pxWire')
  const L = () => path.getTotalLength()
  const fire = (label) => {
    const dot = el('circle', { r: 4.5, class: 'px-dot' })
    const txt = el('text', { class: 'px-dot-label', dy: -9 }); txt.textContent = label
    wire.append(dot, txt)
    const len = L(), t0 = performance.now(), dur = 1100
    const step = t => {
      const k = Math.min(1, (t - t0) / dur)
      const pt = path.getPointAtLength(ease(k) * len)
      dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y)
      txt.setAttribute('x', pt.x); txt.setAttribute('y', pt.y)
      if (k < 1) requestAnimationFrame(step)
      else {
        dot.remove(); txt.remove()
        const c = $(`[data-count="${label}"]`)
        if (c) { c.textContent = fmtDA(parseInt(c.textContent.replace(/\s/g, '')) + 1); c.classList.add('bump'); setTimeout(() => c.classList.remove('bump'), 500) }
      }
    }
    requestAnimationFrame(step)
  }
  $$('.px-ev').forEach(b => b.addEventListener('click', () => fire(b.dataset.ev)))
  let fired = new Set()
  directors['sc-pixel'] = p => {
    for (const [t, ev] of [[.3, 'ViewContent'], [.5, 'AddToCart'], [.7, 'Purchase']])
      if (p > t && !fired.has(t)) { fired.add(t); fire(ev) }
    if (p < .1) fired.clear()
  }
}

/* ═══════════ 21 · WHATSAPP — fil qui se construit ═══════════ */
{
  const thread = $('#wpThread')
  const MSGS = [
    ['in', 'Bonjour Sarah 👋 Votre commande <b>#COM-2647</b> est confirmée. Livraison Yalidine sous 24–72 h.', '09:14', .18],
    ['out', 'Merci ! Je peux suivre le colis ?', '09:16', .34],
    ['in', 'Bien sûr — suivi en direct : <b>yal.dz/t/2647</b>. Vous recevrez chaque étape ici même.', '09:16', .48],
    ['in', '📦 Votre colis est <b>arrivé au centre Hydra</b>. Livraison prévue aujourd’hui 13 h – 17 h.', '12:02', .64],
    ['out', 'Parfait, je suis à la maison 🙌', '12:05', .78],
  ]
  const els2 = MSGS.map(([dir, html, t]) => {
    const d = document.createElement('div')
    d.className = `wa-bub wa-${dir}`
    d.style.cssText = 'opacity:0; transform:translateY(10px) scale(.95); transition:opacity .5s var(--eo), transform .5s var(--spring)'
    d.innerHTML = `${html}<span class="wa-time num">${t}${dir === 'out' ? ' ✓✓' : ''}</span>`
    thread.appendChild(d); return d
  })
  directors['sc-whatsapp'] = p => {
    MSGS.forEach(([, , , t0], i) => {
      const on = p > t0
      els2[i].style.opacity = on ? '1' : '0'
      els2[i].style.transform = on ? 'none' : 'translateY(10px) scale(.95)'
    })
  }
  $('#wpQuick').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return
    const d = document.createElement('div')
    d.className = 'wa-bub wa-out'
    d.innerHTML = `${b.dataset.reply}<span class="wa-time num">12:06 ✓✓</span>`
    thread.appendChild(d)
    b.disabled = true; b.style.opacity = '.4'
  })
  $$('.wp-stat').forEach((s, i) => s.style.setProperty('--i', i))
}

/* ═══════════ 22 · APP MOBILE — écrans balayés ═══════════ */
{
  const screens = $('#mbScreens'), dots = $$('#mbDots i')
  const spark = $('#mbSpark')
  const D = [30, 34, 31, 40, 44, 41, 50, 56, 52, 61, 66, 74]
  const pth = D.map((v, i) => `${i ? 'L' : 'M'}${(i / 11 * 220).toFixed(1)} ${(66 - v / 80 * 58).toFixed(1)}`).join(' ')
  spark.appendChild(el('path', { d: pth + ' L220 70 L0 70 Z', class: 'ga-area' }))
  spark.appendChild(el('path', { d: pth, class: 'ga-line' }))
  let userSlide = -1, lastAuto = 0
  const setSlide = n => { screens.style.setProperty('--slide', n); dots.forEach((d, i) => d.classList.toggle('on', i === n)) }
  directors['sc-mobile'] = p => {
    const auto = p < .45 ? 0 : p < .72 ? 1 : 2
    if (auto !== lastAuto) { lastAuto = auto; userSlide = -1 }
    setSlide(userSlide >= 0 ? userSlide : auto)
  }
  let sx = null
  screens.addEventListener('pointerdown', e => { sx = e.clientX })
  addEventListener('pointerup', e => {
    if (sx === null) return
    const dx = e.clientX - sx; sx = null
    if (Math.abs(dx) < 40) return
    const cu = userSlide >= 0 ? userSlide : lastAuto
    userSlide = Math.max(0, Math.min(2, cu + (dx < 0 ? 1 : -1)))
    setSlide(userSlide)
  })
}

/* ═══════════ 23 · NOTIFICATIONS — pluie + swipe ═══════════ */
{
  const rig = $('#ntRig')
  const NOTES = [
    ['nt-blue', '#i-cart', 'Nouvelle commande — 21 700 DA', 'Lina Hadj · Alger Kouba · COD', 'à l’instant', '1.5deg'],
    ['nt-teal', '#i-check', 'Commande confirmée', '#COM-2647 · envoyée à Yalidine', 'il y a 2 min', '-1.2deg'],
    ['nt-amber', '#i-bell', 'Stock faible — Atlas Acier', 'Restant : 12 · seuil : 15', 'il y a 9 min', '1deg'],
    ['nt-teal', '#i-wallet', 'Versement reçu — 412 300 DA', 'Yalidine · lot #Y-2214 rapproché', 'il y a 1 h', '-1.6deg'],
  ]
  rig.innerHTML = NOTES.map(([tone, ic, t, sub, time, tilt], i) => `
    <div class="nt-card" style="--i:${i}; --tilt:${tilt}">
      <span class="nt-ic ${tone}"><svg><use href="${ic}"/></svg></span>
      <span><b>${t}</b><span>${sub}</span></span>
      <span class="nt-time">${time}</span>
    </div>`).join('') + '<div class="nt-hint">balayez pour classer →</div>'
  let drag = null
  rig.addEventListener('pointerdown', e => {
    const c = e.target.closest('.nt-card'); if (!c) return
    drag = { c, x0: e.clientX }; c.setPointerCapture(e.pointerId)
  })
  rig.addEventListener('pointermove', e => {
    if (!drag) return
    const dx = e.clientX - drag.x0
    drag.c.style.translate = `${dx}px 0`
    drag.c.style.opacity = String(1 - Math.min(.6, Math.abs(dx) / 300))
  })
  const release = e => {
    if (!drag) return
    const dx = e.clientX - drag.x0
    if (Math.abs(dx) > 90) { drag.c.classList.add('gone'); setTimeout(c => c.remove(), 450, drag.c) }
    else { drag.c.style.translate = ''; drag.c.style.opacity = '' }
    drag = null
  }
  rig.addEventListener('pointerup', release); rig.addEventListener('pointercancel', release)
}

/* ═══════════ 24 · TARIFS — cycle mensuel/annuel ═══════════ */
{
  $$('.pr-card').forEach((c, i) => c.style.setProperty('--i', i))
  $('#prToggle').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return
    $$('#prToggle button').forEach(x => x.classList.toggle('on', x === b))
    const cy = b.dataset.cycle
    $$('.pr-price b').forEach(p => {
      p.animate([{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-8px)' }], { duration: 160, easing: 'ease-in' })
        .onfinish = () => {
          p.textContent = p.dataset[cy === 'y' ? 'y' : 'm']
          p.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 220, easing: 'cubic-bezier(.22,1,.32,1)' })
        }
    })
  })
}

/* ═══════════ 25 · FAQ — accordéon fluide ═══════════ */
$$('#faqList details p').forEach(p => {
  const body = document.createElement('div'); body.className = 'faq-body'
  const inner = document.createElement('div'); inner.style.overflow = 'hidden'
  p.replaceWith(body); inner.appendChild(p); body.appendChild(inner)
})

/* ═══════════ 26 · CTA FINAL — convergence ═══════════ */
{
  const orbit = $('#ctOrbit')
  const ICONS = ['#i-grid', '#i-tag', '#i-box', '#i-cart', '#i-phone', '#i-users', '#i-truck', '#i-globe', '#i-chart', '#i-wallet', '#i-spark', '#i-plane', '#i-bell', '#i-lock', '#i-msg', '#i-heart', '#i-img', '#i-search']
  const place = () => {
    orbit.innerHTML = ''
    const W = orbit.clientWidth, H = orbit.clientHeight
    ICONS.forEach((ic, i) => {
      const a = i / ICONS.length * Math.PI * 2 + (i % 2) * .3
      const rx = W * (.32 + (i % 3) * .075), ry = H * (.3 + (i % 4) * .055)
      const x = W / 2 + Math.cos(a) * rx - 22, y = H / 2 + Math.sin(a) * ry - 22
      const d = document.createElement('span')
      d.className = 'ct-ic'
      d.style.cssText = `--i:${i}; left:${x}px; top:${y}px; --dx:${(W / 2 - 22 - x).toFixed(0)}px; --dy:${(H / 2 + 30 - y).toFixed(0)}px; --whirl:${(i % 2 ? 1 : -1) * (90 + i * 14)}deg`
      d.innerHTML = `<svg><use href="${ic}"/></svg>`
      orbit.appendChild(d)
    })
  }
  place()
  addEventListener('resize', place)
  // bouton magnétique → inscription
  const btn = $('#ctBtn')
  btn.addEventListener('click', () => { location.href = '/register' })
  btn.addEventListener('pointermove', e => {
    const r = btn.getBoundingClientRect()
    btn.style.translate = `${(e.clientX - r.left - r.width / 2) * .14}px ${(e.clientY - r.top - r.height / 2) * .2}px`
  })
  btn.addEventListener('pointerleave', () => { btn.style.translate = '' })
}

/* ═══════════ MODE CAPTURE — ?shot=<id>&p=<v> fige une scène ═══════════ */
const PARAMS = new URLSearchParams(location.search)
if (PARAMS.has('shot')) {
  document.documentElement.classList.add('static')
  const shot = document.getElementById(PARAMS.get('shot'))
  const p = parseFloat(PARAMS.get('p') || '0.8')
  if (shot) {
    scenes.forEach(s => { if (s !== shot) s.style.display = 'none' })
    $$('.chapter, .faq-flow, .foot').forEach(n => { n.style.display = n === shot ? '' : 'none' })
    if (shot.id === 'sc-faq') $('#faqList details')?.setAttribute('open', '')
    const stage = $('.stage', shot)
    if (stage) Object.assign(stage.style, { position: 'fixed', inset: '0', width: '100vw', height: '100vh', zIndex: 50 })
    shot.style.setProperty('--p', p.toFixed(4))
    document.body.classList.toggle('on-dark', shot.dataset.dark === '1')
    // deux passes pour les directors dépendant d'un franchissement de seuil
    directors[shot.id]?.(Math.max(0, p - .3), shot)
    directors[shot.id]?.(p, shot)
  }
} else {
  requestAnimationFrame(frame)
}
