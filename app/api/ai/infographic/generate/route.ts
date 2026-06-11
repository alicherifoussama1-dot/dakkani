// ============================================================
// Infographic Generator API — Premium SVG with Base64 Images
//
// POST /api/ai/infographic/generate
//
// Generates a PROFESSIONAL infographic as SVG with:
//   - Gradient overlays with blur effects
//   - Rounded panels and modern card design
//   - RTL Arabic typography with proper spacing
//   - Brand color theming
//   - Product images embedded via Base64 to be self-contained
//   - CTA bar with call-to-action
//   - Store branding footer
//
// NO @vercel/og, NO sharp, NO native binaries. Pure string SVG.
// ============================================================
import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { buildDefaultPanels, InfographicPanel } from '@/lib/ai/infographic-templates'

export const runtime = 'nodejs'
export const maxDuration = 60

const BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET ?? 'dakkani-uploads'
const W = 600

// ── helpers ────────────────────────────────────────────────────
function esc(s: string): string {
  return (s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .slice(0, 150)
}

function hexToRgb(hex: string) {
  const c = hex.replace('#', '')
  return {
    r: parseInt(c.substring(0, 2), 16) || 0,
    g: parseInt(c.substring(2, 4), 16) || 0,
    b: parseInt(c.substring(4, 6), 16) || 0,
  }
}

/** Lighten a hex color by a percentage */
function lighten(hex: string, pct: number): string {
  const { r, g, b } = hexToRgb(hex)
  const lr = Math.min(255, Math.round(r + (255 - r) * pct))
  const lg = Math.min(255, Math.round(g + (255 - g) * pct))
  const lb = Math.min(255, Math.round(b + (255 - b) * pct))
  return `rgb(${lr},${lg},${lb})`
}

/** Darken a hex color by a percentage */
function darken(hex: string, pct: number): string {
  const { r, g, b } = hexToRgb(hex)
  const dr = Math.round(r * (1 - pct))
  const dg = Math.round(g * (1 - pct))
  const db = Math.round(b * (1 - pct))
  return `rgb(${dr},${dg},${db})`
}

/** Word-wrap text into lines */
function wrapLines(text: string, maxChars: number): string[] {
  if (!text) return []
  const words = text.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars) {
      if (cur) lines.push(cur)
      cur = w
    } else {
      cur = cur ? cur + ' ' + w : w
    }
  }
  if (cur) lines.push(cur)
  return lines.slice(0, 4)
}

/** Fetch image and convert to base64 data URL */
async function toBase64DataUrl(url: string, origin: string): Promise<string> {
  try {
    if (!url) return ''
    if (url.startsWith('data:')) return url

    let absoluteUrl = url
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      // Resolve relative url
      absoluteUrl = new URL(url, origin).toString()
    }

    const res = await fetch(absoluteUrl)
    if (!res.ok) throw new Error(`failed to fetch image: ${res.statusText}`)
    const buffer = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    const base64 = Buffer.from(buffer).toString('base64')
    return `data:${contentType};base64,${base64}`
  } catch (e) {
    console.error(`Failed to convert image to base64: ${url}`, e)
    return url // fallback to original url
  }
}

// ── SVG Defs (shared gradients, filters, clip paths) ──────────
function svgDefs(brandColor: string, accentColor: string): string {
  const bc = hexToRgb(brandColor)
  const ac = hexToRgb(accentColor)
  return `<defs>
  <!-- Bottom gradient overlay for images -->
  <linearGradient id="fadeBottom" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#000" stop-opacity="0"/>
    <stop offset="50%" stop-color="#000" stop-opacity="0.1"/>
    <stop offset="100%" stop-color="#000" stop-opacity="0.85"/>
  </linearGradient>
  <!-- Brand gradient -->
  <linearGradient id="brandGrad" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="rgb(${bc.r},${bc.g},${bc.b})"/>
    <stop offset="100%" stop-color="${darken(brandColor, 0.25)}"/>
  </linearGradient>
  <!-- Accent gradient -->
  <linearGradient id="accentGrad" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="rgb(${ac.r},${ac.g},${ac.b})"/>
    <stop offset="100%" stop-color="${darken(accentColor, 0.15)}"/>
  </linearGradient>
  <!-- Soft brand bg -->
  <linearGradient id="brandSoft" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${lighten(brandColor, 0.92)}"/>
    <stop offset="100%" stop-color="${lighten(brandColor, 0.85)}"/>
  </linearGradient>
  <!-- Drop shadow filter -->
  <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
    <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000" flood-opacity="0.15"/>
  </filter>
  <!-- Rounded clip paths -->
  <clipPath id="roundedFull"><rect width="${W}" height="340" rx="0"/></clipPath>
  <clipPath id="roundedHalf"><rect width="${W / 2 - 4}" height="260" rx="12"/></clipPath>
</defs>\n`
}

// ── STORY SVG builder ──────────────────────────────────────────
function buildStorySVG(opts: {
  panels: InfographicPanel[]
  images: string[]
  brandColor: string
  accentColor: string
  price: number
  storeName: string
  productName: string
}): string {
  const { panels, images, brandColor, accentColor, price, storeName, productName } = opts

  // Layout: header(48) + panel0(340) + gap(8) + panels1-3(260×3 + gaps) + panel4(340) + gap(8) + CTA(64) + footer
  const headerH = 48
  const fullPanelH = 340
  const splitPanelH = 260
  const panelGap = 6
  const ctaH = 64
  const footerH = storeName ? 48 : 0
  const px = 12 // horizontal padding

  const totalH = headerH + fullPanelH + panelGap +
    3 * (splitPanelH + panelGap) +
    fullPanelH + panelGap + ctaH + footerH

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${totalH}" viewBox="0 0 ${W} ${totalH}">\n`
  svg += svgDefs(brandColor, accentColor)

  // Background
  svg += `<rect width="${W}" height="${totalH}" fill="${lighten(brandColor, 0.95)}"/>\n`

  let y = 0

  // ── Header bar ──
  svg += `<rect x="0" y="0" width="${W}" height="${headerH}" fill="url(#brandGrad)"/>\n`
  svg += `<text x="${W / 2}" y="${headerH / 2 + 6}" text-anchor="middle" fill="#fff" font-size="18" font-weight="900" font-family="Cairo, Tajawal, system-ui, -apple-system, sans-serif">${esc(productName)}</text>\n`
  y += headerH

  for (let i = 0; i < 5; i++) {
    const panel = panels[i] ?? panels[0]
    const imgUrl = panel.imageUrl ?? images[i] ?? images[0]
    const isFullWidth = panel.layout === 'image-full' || panel.layout === 'text-only' || i === 0 || i === 4

    if (isFullWidth) {
      const h = fullPanelH
      // Full-width image panel with gradient overlay
      svg += `<rect x="${px}" y="${y}" width="${W - px * 2}" height="${h}" rx="16" fill="#222" filter="url(#shadow)"/>\n`
      svg += `<clipPath id="clip-full-${i}"><rect x="${px}" y="${y}" width="${W - px * 2}" height="${h}" rx="16"/></clipPath>\n`
      if (panel.layout !== 'text-only' && imgUrl) {
        svg += `<image href="${esc(imgUrl)}" x="${px}" y="${y}" width="${W - px * 2}" height="${h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#clip-full-${i})"/>\n`
        svg += `<rect x="${px}" y="${y}" width="${W - px * 2}" height="${h}" rx="16" fill="url(#fadeBottom)"/>\n`
      } else {
        // Text-only: fill with brand soft gradient
        svg += `<rect x="${px}" y="${y}" width="${W - px * 2}" height="${h}" rx="16" fill="url(#brandSoft)" clip-path="url(#clip-full-${i})"/>\n`
      }

      // Headline
      const headLines = wrapLines(panel.headline, 26)
      const textBaseY = y + h - 28 - (headLines.length - 1) * 36 - (panel.subtext ? 28 : 0)
      const textColor = (panel.layout === 'text-only') ? darken(brandColor, 0.6) : '#fff'
      const subtextColor = (panel.layout === 'text-only') ? darken(brandColor, 0.4) : 'rgba(255,255,255,0.85)'

      svg += `<text text-anchor="end" x="${W - px - 20}" y="${textBaseY}" fill="${textColor}" font-size="28" font-weight="900" font-family="Cairo, Tajawal, system-ui, -apple-system, sans-serif" direction="rtl">\n`
      headLines.forEach((line, li) => {
        svg += `  <tspan x="${W - px - 20}" dy="${li === 0 ? 0 : 36}">${esc(line)}</tspan>\n`
      })
      svg += `</text>\n`

      if (panel.subtext) {
        svg += `<text text-anchor="end" x="${W - px - 20}" y="${y + h - 20}" fill="${subtextColor}" font-size="14" font-family="Cairo, Tajawal, system-ui, -apple-system, sans-serif" direction="rtl">${esc(panel.subtext.slice(0, 65))}</text>\n`
      }

      if (panel.badge) {
        svg += `<rect x="${px + 16}" y="${y + h - 50}" width="160" height="32" rx="16" fill="url(#accentGrad)"/>\n`
        svg += `<text x="${px + 96}" y="${y + h - 29}" text-anchor="middle" fill="#fff" font-size="14" font-weight="700" font-family="Cairo, Tajawal, system-ui, -apple-system, sans-serif">${esc(panel.badge)}</text>\n`
      }

      y += h + panelGap
    } else {
      // Split panel: image side + branded text side
      const h = splitPanelH
      const halfW = (W - px * 2 - panelGap) / 2
      
      let isTextRight = i % 2 === 1
      if (panel.layout === 'image-right') isTextRight = false
      if (panel.layout === 'image-left') isTextRight = true

      const imgX = isTextRight ? px : px + halfW + panelGap
      const textX = isTextRight ? px + halfW + panelGap : px

      // Image side with rounded corners
      svg += `<clipPath id="clip-split-img-${i}"><rect x="${imgX}" y="${y}" width="${halfW}" height="${h}" rx="14"/></clipPath>\n`
      svg += `<rect x="${imgX}" y="${y}" width="${halfW}" height="${h}" rx="14" fill="#ddd" filter="url(#shadow)"/>\n`
      if (imgUrl) {
        svg += `<image href="${esc(imgUrl)}" x="${imgX}" y="${y}" width="${halfW}" height="${h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#clip-split-img-${i})"/>\n`
      }

      // Text side with brand gradient + rounded corners
      svg += `<rect x="${textX}" y="${y}" width="${halfW}" height="${h}" rx="14" fill="url(#brandGrad)" filter="url(#shadow)"/>\n`

      // Headline
      const headLines = wrapLines(panel.headline, 14)
      const headY = y + 45
      svg += `<text text-anchor="end" x="${textX + halfW - 18}" y="${headY}" fill="#fff" font-size="19" font-weight="900" font-family="Cairo, Tajawal, system-ui, -apple-system, sans-serif" direction="rtl">\n`
      headLines.forEach((line, li) => {
        svg += `  <tspan x="${textX + halfW - 18}" dy="${li === 0 ? 0 : 28}">${esc(line)}</tspan>\n`
      })
      svg += `</text>\n`

      // Subtext
      if (panel.subtext) {
        const subY = headY + headLines.length * 28 + 16
        const subLines = wrapLines(panel.subtext, 16)
        svg += `<text text-anchor="end" x="${textX + halfW - 18}" y="${subY}" fill="rgba(255,255,255,0.8)" font-size="12" font-family="Cairo, Tajawal, system-ui, -apple-system, sans-serif" direction="rtl">\n`
        subLines.forEach((line, li) => {
          svg += `  <tspan x="${textX + halfW - 18}" dy="${li === 0 ? 0 : 18}">${esc(line)}</tspan>\n`
        })
        svg += `</text>\n`
      }

      // Badge pill
      if (panel.badge) {
        svg += `<rect x="${textX + 14}" y="${y + h - 48}" width="150" height="30" rx="15" fill="url(#accentGrad)"/>\n`
        svg += `<text x="${textX + 89}" y="${y + h - 28}" text-anchor="middle" fill="#fff" font-size="13" font-weight="700" font-family="Cairo, Tajawal, system-ui, -apple-system, sans-serif">${esc(panel.badge)}</text>\n`
      }

      y += h + panelGap
    }
  }

  // ── CTA bar ──
  svg += `<rect x="${px}" y="${y}" width="${W - px * 2}" height="${ctaH}" rx="16" fill="url(#accentGrad)" filter="url(#shadow)"/>\n`
  svg += `<text x="${W / 2}" y="${y + ctaH / 2 + 7}" text-anchor="middle" fill="#fff" font-size="22" font-weight="900" font-family="Cairo, Tajawal, system-ui, -apple-system, sans-serif">🛒 اطلب الان — ${price.toLocaleString('fr-DZ')} دج</text>\n`
  svg += `<text x="${W / 2}" y="${y + ctaH / 2 + 26}" text-anchor="middle" fill="rgba(255,255,255,0.85)" font-size="12" font-family="Cairo, Tajawal, system-ui, -apple-system, sans-serif">الدفع عند الاستلام • التوصيل لـ 58 ولاية</text>\n`
  y += ctaH + panelGap

  // ── Footer ──
  if (storeName) {
    svg += `<rect x="0" y="${y}" width="${W}" height="${footerH}" fill="url(#brandGrad)"/>\n`
    svg += `<text x="${W / 2}" y="${y + footerH / 2 + 6}" text-anchor="middle" fill="#fff" font-size="15" font-weight="700" font-family="Cairo, Tajawal, system-ui, -apple-system, sans-serif">${esc(storeName)}</text>\n`
  }

  svg += `</svg>`
  return svg
}

// ── GRID SVG builder ───────────────────────────────────────────
function buildGridSVG(opts: {
  panels: InfographicPanel[]
  images: string[]
  brandColor: string
  accentColor: string
  price: number
  storeName: string
  productName: string
}): string {
  const { panels, images, brandColor, accentColor, price, storeName, productName } = opts

  const headerH = 56
  const cellH = 240
  const cellGap = 6
  const px = 12
  const cols = 2
  const imgCount = Math.min(images.length, 6)
  const rows = Math.ceil(imgCount / cols)
  const cellW = (W - px * 2 - cellGap) / cols
  const ctaH = 64
  const footerH = storeName ? 48 : 0
  const totalH = headerH + rows * (cellH + cellGap) + ctaH + cellGap + footerH

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${totalH}" viewBox="0 0 ${W} ${totalH}">\n`
  svg += svgDefs(brandColor, accentColor)

  // Background
  svg += `<rect width="${W}" height="${totalH}" fill="${lighten(brandColor, 0.95)}"/>\n`

  // Header
  svg += `<rect x="0" y="0" width="${W}" height="${headerH}" fill="url(#brandGrad)"/>\n`
  svg += `<text x="${W / 2}" y="${headerH / 2 + 7}" text-anchor="middle" fill="#fff" font-size="22" font-weight="900" font-family="Cairo, Tajawal, system-ui, -apple-system, sans-serif">${esc(productName)}</text>\n`

  // Grid cells
  for (let i = 0; i < imgCount; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = px + col * (cellW + cellGap)
    const y = headerH + cellGap + row * (cellH + cellGap)

    const panel = panels[i]
    const imgUrl = panel?.imageUrl ?? images[i] ?? images[0]

    // Rounded image cell
    svg += `<clipPath id="clip-cell-${i}"><rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" rx="14"/></clipPath>\n`
    svg += `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" rx="14" fill="#ddd" filter="url(#shadow)"/>\n`
    if (imgUrl) {
      svg += `<image href="${esc(imgUrl)}" x="${x}" y="${y}" width="${cellW}" height="${cellH}" preserveAspectRatio="xMidYMid slice" clip-path="url(#clip-cell-${i})"/>\n`
    }
    // Gradient overlay
    svg += `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" rx="14" fill="url(#fadeBottom)"/>\n`

    if (panel) {
      const headLines = wrapLines(panel.headline, 13)
      svg += `<text text-anchor="end" x="${x + cellW - 12}" y="${y + cellH - 36}" fill="#fff" font-size="15" font-weight="900" font-family="Cairo, Tajawal, system-ui, -apple-system, sans-serif" direction="rtl">\n`
      headLines.forEach((line, li) => {
        svg += `  <tspan x="${x + cellW - 12}" dy="${li === 0 ? 0 : 20}">${esc(line)}</tspan>\n`
      })
      svg += `</text>\n`

      if (panel.subtext) {
        svg += `<text text-anchor="end" x="${x + cellW - 12}" y="${y + cellH - 14}" fill="rgba(255,255,255,0.8)" font-size="11" font-family="Cairo, Tajawal, system-ui, -apple-system, sans-serif" direction="rtl">${esc(panel.subtext.slice(0, 30))}</text>\n`
      }
    }
  }

  // CTA
  const ctaY = headerH + cellGap + rows * (cellH + cellGap)
  svg += `<rect x="${px}" y="${ctaY}" width="${W - px * 2}" height="${ctaH}" rx="16" fill="url(#accentGrad)" filter="url(#shadow)"/>\n`
  svg += `<text x="${W / 2}" y="${ctaY + ctaH / 2 + 7}" text-anchor="middle" fill="#fff" font-size="22" font-weight="900" font-family="Cairo, Tajawal, system-ui, -apple-system, sans-serif">🛒 اطلب الان — ${price.toLocaleString('fr-DZ')} دج</text>\n`
  svg += `<text x="${W / 2}" y="${ctaY + ctaH / 2 + 26}" text-anchor="middle" fill="rgba(255,255,255,0.85)" font-size="12" font-family="Cairo, Tajawal, system-ui, -apple-system, sans-serif">الدفع عند الاستلام • التوصيل لـ 58 ولاية</text>\n`

  // Footer
  if (storeName) {
    const fY = ctaY + ctaH + cellGap
    svg += `<rect x="0" y="${fY}" width="${W}" height="${footerH}" fill="url(#brandGrad)"/>\n`
    svg += `<text x="${W / 2}" y="${fY + footerH / 2 + 6}" text-anchor="middle" fill="#fff" font-size="15" font-weight="700" font-family="Cairo, Tajawal, system-ui, -apple-system, sans-serif">${esc(storeName)}</text>\n`
  }

  svg += `</svg>`
  return svg
}

// ── Route handler ──────────────────────────────────────────────
export async function POST(req: Request) {
  const supabase = createServerClient()

  try {
    // Auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })

    const body = await req.json()

    // Manual validation
    const storeId      = body.storeId as string
    const images       = (body.images ?? []) as string[]
    const aiContent    = body.aiContent
    const template     = (body.template ?? 'story') as 'story' | 'grid'
    const brandColor   = (body.brandColor ?? '#7C3AED') as string
    const accentColor  = (body.accentColor ?? '#F59E0B') as string
    const productName  = (body.productName ?? '') as string
    const price        = Number(body.price) || 0
    const storeName    = body.storeName as string | undefined
    const customPanels = body.panels as InfographicPanel[] | undefined

    if (!storeId || !productName || images.length === 0) {
      return NextResponse.json({ error: 'بيانات ناقصة: storeId, productName, images مطلوبة' }, { status: 400 })
    }

    // Verify store ownership
    const { data: store } = await supabase
      .from('stores')
      .select('id, name')
      .eq('id', storeId)
      .eq('owner_id', user.id)
      .single()

    if (!store) return NextResponse.json({ error: 'المتجر غير موجود' }, { status: 404 })

    // Build panels from AI content or use custom panels
    let panels: InfographicPanel[]
    if (customPanels && Array.isArray(customPanels) && customPanels.length > 0) {
      panels = customPanels
    } else {
      panels = buildDefaultPanels({ productName, price, images, aiContent })
    }

    const resolvedStore = storeName ?? store.name ?? ''

    // Convert all unique images in the panels and images array to base64
    const origin = new URL(req.url).origin
    const uniqueUrls = new Set<string>()
    images.forEach(u => { if (u) uniqueUrls.add(u) })
    panels.forEach(p => { if (p.imageUrl) uniqueUrls.add(p.imageUrl) })

    const base64Map: Record<string, string> = {}
    await Promise.all(
      Array.from(uniqueUrls).map(async (url) => {
        base64Map[url] = await toBase64DataUrl(url, origin)
      })
    )

    // Replace URLs with their base64 representation
    const base64Images = images.map(u => base64Map[u] ?? u)
    const base64Panels = panels.map(p => ({
      ...p,
      imageUrl: p.imageUrl ? (base64Map[p.imageUrl] ?? p.imageUrl) : undefined
    }))

    // Build SVG
    let svgContent: string
    if (template === 'grid') {
      svgContent = buildGridSVG({
        panels: base64Panels, images: base64Images.slice(0, 6), brandColor, accentColor,
        price, storeName: resolvedStore, productName,
      })
    } else {
      svgContent = buildStorySVG({
        panels: base64Panels, images: base64Images.slice(0, 6), brandColor, accentColor,
        price, storeName: resolvedStore, productName,
      })
    }

    // Upload SVG to Supabase Storage
    const filename = `infographic/${storeId}/${Date.now()}-${template}.svg`
    const svgBuffer = new TextEncoder().encode(svgContent)

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(filename, svgBuffer, {
        contentType: 'image/svg+xml',
        upsert: true,
      })

    if (uploadErr) {
      console.error('Infographic upload error:', uploadErr)
      return NextResponse.json({ error: 'تعذر رفع الصورة: ' + uploadErr.message }, { status: 500 })
    }

    const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(filename)

    return NextResponse.json({
      status: 'done',
      url: publicUrlData.publicUrl,
      template,
    })

  } catch (err: any) {
    console.error('infographic/generate error:', err)
    return NextResponse.json({
      error: 'حدث خطأ أثناء توليد الإنفوغرافيك: ' + (err?.message ?? String(err)),
    }, { status: 500 })
  }
}
