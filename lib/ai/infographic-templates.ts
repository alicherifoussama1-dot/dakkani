// ============================================================
// Infographic HTML Templates — rendered server-side via @vercel/og
//
// Two layout families:
//   "story"  → vertical 5-panel stack (like Ayor/Ilaf Hijab style)
//   "grid"   → 2-column photo grid with text overlays
//
// All templates use RTL + Arabic-compatible styles.
// Fonts loaded at render time from Google Fonts CDN.
// ============================================================

export type InfographicTemplate = 'story' | 'grid' | 'hero'

export interface InfographicData {
  productName: string
  price: number
  images: string[]          // up to 5 product image URLs
  panels: InfographicPanel[]
  brandColor: string        // hex e.g. "#7C3AED"
  accentColor: string       // hex e.g. "#F59E0B"
  storeName?: string
}

export interface InfographicPanel {
  imageUrl?: string
  headline: string          // bold headline (Darija)
  subtext?: string          // smaller supporting text
  badge?: string            // optional badge e.g. "⭐⭐⭐⭐⭐ + 🚚"
  layout?: 'image-right' | 'image-left' | 'image-full' | 'text-only'
}

// ── Default panel layouts ──────────────────────────────────────────────────
export function buildDefaultPanels(data: {
  productName: string
  price: number
  images: string[]
  aiContent: any
}): InfographicPanel[] {
  const imgs = data.images
  const c = data.aiContent

  return [
    // Panel 1 — Problem hook
    {
      imageUrl: imgs[0],
      headline: c?.product_story?.hook ?? `كرهتي تطلبي من الانترنت وما يوصلك ما توقعتيه؟`,
      subtext: c?.hero?.subheadline,
      layout: 'image-full',
    },
    // Panel 2 — Solution intro
    {
      imageUrl: imgs[1] ?? imgs[0],
      headline: c?.hero?.headline ?? `${data.productName} — الحل اللي كنتِ تستنّيه`,
      subtext: c?.product_story?.body,
      layout: 'image-right',
    },
    // Panel 3 — Benefits
    {
      imageUrl: imgs[2] ?? imgs[0],
      headline: c?.benefits?.[0]?.title ?? 'جودة تستاهل',
      subtext: (c?.benefits ?? []).slice(0, 3).map((b: any) => `${b.icon ?? '✅'} ${b.title}`).join('  '),
      layout: 'image-left',
    },
    // Panel 4 — Sizes/Variants or details
    {
      imageUrl: imgs[3] ?? imgs[0],
      headline: 'ماتحيريش في المقاس — متوفر كل القياسات',
      subtext: c?.product_details?.specs?.slice(0, 3).join(' • ') ?? '',
      layout: 'image-right',
    },
    // Panel 5 — Trust + CTA
    {
      imageUrl: imgs[4] ?? imgs[0],
      headline: c?.final_cta?.headline ?? `يصلك كما في الصورة — التوصيل لـ58 ولاية`,
      subtext: `الدفع عند الاستلام • ${data.price.toLocaleString('fr-DZ')} دج`,
      badge: '⭐⭐⭐⭐⭐ + 🚚',
      layout: 'image-left',
    },
  ]
}

// ── CSS shared styles ──────────────────────────────────────────────────────
export function getSharedCSS(brandColor: string, accentColor: string): string {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Cairo', 'Tajawal', Arial, sans-serif;
      direction: rtl;
      background: #fff;
      width: 600px;
    }
    .panel {
      width: 600px;
      position: relative;
      overflow: hidden;
      display: flex;
    }
    .panel img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .panel-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.75) 100%);
    }
    .panel-text {
      position: absolute;
      bottom: 0;
      right: 0;
      left: 0;
      padding: 20px 24px;
      color: #fff;
    }
    .panel-text h2 {
      font-size: 26px;
      font-weight: 800;
      line-height: 1.35;
      text-shadow: 0 2px 8px rgba(0,0,0,.5);
      margin-bottom: 8px;
    }
    .panel-text p {
      font-size: 16px;
      font-weight: 500;
      opacity: .9;
      line-height: 1.5;
    }
    .panel-split {
      display: flex;
      height: 260px;
    }
    .panel-split .img-side {
      width: 50%;
      position: relative;
      overflow: hidden;
    }
    .panel-split .text-side {
      width: 50%;
      background: ${brandColor};
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 20px 18px;
      color: #fff;
    }
    .panel-split .text-side h2 {
      font-size: 22px;
      font-weight: 800;
      line-height: 1.35;
      margin-bottom: 10px;
    }
    .panel-split .text-side p {
      font-size: 14px;
      opacity: .9;
      line-height: 1.6;
    }
    .badge {
      display: inline-block;
      background: ${accentColor};
      color: #fff;
      border-radius: 20px;
      padding: 4px 12px;
      font-size: 14px;
      font-weight: 700;
      margin-top: 10px;
    }
    .footer-bar {
      background: ${brandColor};
      color: #fff;
      text-align: center;
      padding: 14px;
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .cta-bar {
      background: ${accentColor};
      color: #fff;
      text-align: center;
      padding: 18px;
      font-size: 22px;
      font-weight: 900;
    }
  `
}

// ── Story template HTML builder ─────────────────────────────────────────────
export function buildStoryHTML(data: InfographicData): string {
  const { brandColor, accentColor, panels, storeName, productName, price } = data
  const css = getSharedCSS(brandColor, accentColor)

  const panelHTMLs = panels.map((panel, i) => {
    // Panel 0 and 4 → full-width image with bottom text overlay
    if (panel.layout === 'image-full' || i === 0 || i === 4) {
      return `
        <div class="panel" style="height:320px; flex-direction:column;">
          ${panel.imageUrl
            ? `<img src="${panel.imageUrl}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" />`
            : `<div style="position:absolute;inset:0;background:${brandColor};"></div>`
          }
          <div class="panel-overlay"></div>
          <div class="panel-text">
            <h2>${escapeHtml(panel.headline)}</h2>
            ${panel.subtext ? `<p>${escapeHtml(panel.subtext)}</p>` : ''}
            ${panel.badge ? `<div class="badge">${panel.badge}</div>` : ''}
          </div>
        </div>`
    }

    // Even panels → image on right, text on left (RTL = image-right visually)
    if (i % 2 === 1) {
      return `
        <div class="panel panel-split">
          <div class="text-side">
            <h2>${escapeHtml(panel.headline)}</h2>
            ${panel.subtext ? `<p>${escapeHtml(panel.subtext)}</p>` : ''}
            ${panel.badge ? `<div class="badge">${panel.badge}</div>` : ''}
          </div>
          <div class="img-side">
            ${panel.imageUrl
              ? `<img src="${panel.imageUrl}" style="width:100%;height:100%;object-fit:cover;" />`
              : `<div style="width:100%;height:100%;background:${brandColor}55;"></div>`
            }
          </div>
        </div>`
    }

    // Odd panels → image on left, text on right
    return `
      <div class="panel panel-split">
        <div class="img-side">
          ${panel.imageUrl
            ? `<img src="${panel.imageUrl}" style="width:100%;height:100%;object-fit:cover;" />`
            : `<div style="width:100%;height:100%;background:${brandColor}55;"></div>`
          }
        </div>
        <div class="text-side">
          <h2>${escapeHtml(panel.headline)}</h2>
          ${panel.subtext ? `<p>${escapeHtml(panel.subtext)}</p>` : ''}
          ${panel.badge ? `<div class="badge">${panel.badge}</div>` : ''}
        </div>
      </div>`
  })

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@500;700;900&display=swap" rel="stylesheet" />
  <style>${css}</style>
</head>
<body>
  ${panelHTMLs.join('\n')}
  <div class="cta-bar">🛒 اطلب الآن — ${price.toLocaleString('fr-DZ')} دج — الدفع عند الاستلام</div>
  ${storeName ? `<div class="footer-bar">${escapeHtml(storeName)}</div>` : ''}
</body>
</html>`
}

// ── Grid template HTML builder ──────────────────────────────────────────────
export function buildGridHTML(data: InfographicData): string {
  const { brandColor, accentColor, panels, storeName, price } = data
  const css = getSharedCSS(brandColor, accentColor)
  const imgs = data.images.slice(0, 6)

  const cells = imgs.map((url, i) => {
    const panel = panels[i]
    return `
      <div style="position:relative;overflow:hidden;background:#eee;">
        <img src="${url}" style="width:100%;height:240px;object-fit:cover;display:block;" />
        ${panel ? `
          <div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 40%,rgba(0,0,0,.7));"></div>
          <div style="position:absolute;bottom:0;right:0;left:0;padding:12px 14px;color:#fff;">
            <div style="font-size:16px;font-weight:800;line-height:1.3;">${escapeHtml(panel.headline)}</div>
            ${panel.subtext ? `<div style="font-size:12px;opacity:.85;margin-top:4px;">${escapeHtml(panel.subtext)}</div>` : ''}
          </div>` : ''}
      </div>`
  })

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@500;700;900&display=swap" rel="stylesheet" />
  <style>
    ${css}
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3px; width: 600px; background: #fff; }
  </style>
</head>
<body>
  <div style="background:${brandColor};color:#fff;text-align:center;padding:16px;font-size:20px;font-weight:900;font-family:Cairo,sans-serif;">
    ${escapeHtml(data.productName)}
  </div>
  <div class="grid">
    ${cells.join('\n')}
  </div>
  <div class="cta-bar" style="font-family:Cairo,sans-serif;">🛒 اطلب الآن — ${price.toLocaleString('fr-DZ')} دج</div>
  ${storeName ? `<div class="footer-bar" style="font-family:Cairo,sans-serif;">${escapeHtml(storeName)}</div>` : ''}
</body>
</html>`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
