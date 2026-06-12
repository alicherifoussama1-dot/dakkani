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
import { geminiEnhanceImage } from '@/lib/ai/gemini'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const maxDuration = 60

const BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET ?? 'dakkani-uploads'
const W = 600

function getCachePath(url: string, storeId: string): string {
  const hash = crypto.createHash('md5').update(url).digest('hex')
  return `infographic-cache/${storeId}/${hash}.png`
}

async function autoProcessImage(url: string, storeId: string, supabase: any, origin: string): Promise<string> {
  try {
    if (!url) return ''

    // If it's already a base64 string, or is already background-removed, return as-is
    if (url.startsWith('data:') || url.includes('removebg') || url.includes('landing-ai') || url.includes('infographic-cache')) {
      return url
    }

    // Resolve relative URL
    let absoluteUrl = url
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      absoluteUrl = new URL(url, origin).toString()
    }

    // Check if cached version exists in Supabase Storage
    const cachePath = getCachePath(absoluteUrl, storeId)
    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(cachePath)

    try {
      const headRes = await fetch(publicUrl, { method: 'HEAD' })
      if (headRes.ok) {
        console.log(`Cache hit for image background removal: ${publicUrl}`)
        return publicUrl
      }
    } catch (e) {
      // ignore check error, proceed to generate
    }

    console.log(`Cache miss: removing background for ${absoluteUrl}`)

    // Fetch the original image buffer
    const imgRes = await fetch(absoluteUrl)
    if (!imgRes.ok) throw new Error(`Failed to fetch image for background removal: ${imgRes.statusText}`)
    const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
    const imgBuffer = await imgRes.arrayBuffer()

    let processedBuffer: Buffer | null = null
    let processedMime = 'image/png'

    // Try Remove.bg first if configured
    const removeBgKey = process.env.REMOVEBG_API_KEY
    if (removeBgKey && removeBgKey !== 'your_removebg_api_key') {
      try {
        console.log('Using Remove.bg for automatic background removal...')
        const imgBlob = new Blob([imgBuffer], { type: contentType })
        const formData = new FormData()
        formData.append('image_file', imgBlob, 'image.jpg')
        formData.append('size', 'auto')
        formData.append('format', 'png')

        const bgRes = await fetch('https://api.remove.bg/v1.0/removebg', {
          method: 'POST',
          headers: { 'X-Api-Key': removeBgKey },
          body: formData,
        })

        if (bgRes.ok) {
          processedBuffer = Buffer.from(await bgRes.arrayBuffer())
          processedMime = 'image/png'
        } else {
          const errData = await bgRes.json().catch(() => ({}))
          console.warn('Remove.bg API failed, falling back to Gemini:', errData?.errors?.[0]?.title)
        }
      } catch (err) {
        console.warn('Error calling Remove.bg, falling back to Gemini:', err)
      }
    }

    // Fallback to Gemini if Remove.bg wasn't run or failed
    if (!processedBuffer && process.env.GEMINI_API_KEY) {
      console.log('Using Gemini for automatic background removal (Studio White backdrop)...')
      const imageBase64 = Buffer.from(imgBuffer).toString('base64')
      const instruction = 'Replace the background with a clean pure-white studio backdrop. Keep the product 100% unchanged. Add soft realistic studio lighting and a subtle shadow. High-quality photorealistic e-commerce photo.'

      const geminiRes = await geminiEnhanceImage({
        imageBase64,
        mimeType: contentType,
        instruction
      })

      if (geminiRes.ok) {
        processedBuffer = Buffer.from(geminiRes.base64, 'base64')
        processedMime = geminiRes.mimeType
      } else {
        console.error('Gemini background removal failed:', geminiRes.error)
      }
    }

    // If both failed or keys aren't configured, return original url
    if (!processedBuffer) {
      console.warn('No background removal keys configured or both failed. Using original image.')
      return url
    }

    // Upload processed image to Supabase Storage
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(cachePath, processedBuffer, {
        contentType: processedMime,
        upsert: true,
      })

    if (uploadErr) {
      console.error('Error uploading processed image to storage:', uploadErr.message)
      return url // fallback to original
    }

    return publicUrl
  } catch (e) {
    console.error(`autoProcessImage error for ${url}:`, e)
    return url
  }
}

// ── helpers ────────────────────────────────────────────────────
function esc(s: string): string {
  return (s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .slice(0, 150)
}

function isBackgroundRemoved(url: string): boolean {
  if (!url) return false
  return url.includes('removebg') || url.includes('landing-ai') || url.includes('infographic-cache') || url.startsWith('data:image/png')
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
    const isBgRemoved = isBackgroundRemoved(imgUrl)

    if (isFullWidth) {
      const h = fullPanelH
      
      if (isBgRemoved && panel.layout !== 'text-only' && imgUrl) {
        // Premium layout for background-removed image: Floating card on left, text on right, soft brand gradient bg
        svg += `<rect x="${px}" y="${y}" width="${W - px * 2}" height="${h}" rx="16" fill="url(#brandSoft)" filter="url(#shadow)"/>\n`
        
        // Floating white card on left
        const cardW = 210
        const cardH = 250
        const cardX = px + 20
        const cardY = y + (h - cardH) / 2
        svg += `<rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="14" fill="#fff" filter="url(#shadow)"/>\n`
        svg += `<clipPath id="clip-card-${i}"><rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="14"/></clipPath>\n`
        svg += `<image href="${esc(imgUrl)}" x="${cardX + 10}" y="${cardY + 10}" width="${cardW - 20}" height="${cardH - 20}" preserveAspectRatio="xMidYMid contain" clip-path="url(#clip-card-${i})"/>\n`

        // Headline (on right)
        const headLines = wrapLines(panel.headline, 20)
        const headBaseY = y + 70
        const textColor = darken(brandColor, 0.6)
        const subtextColor = darken(brandColor, 0.4)

        svg += `<text text-anchor="end" x="${W - px - 24}" y="${headBaseY}" fill="${textColor}" font-size="24" font-weight="900" font-family="Cairo, Tajawal, system-ui, -apple-system, sans-serif" direction="rtl">\n`
        headLines.forEach((line, li) => {
          svg += `  <tspan x="${W - px - 24}" dy="${li === 0 ? 0 : 32}">${esc(line)}</tspan>\n`
        })
        svg += `</text>\n`

        // Subtext (on right)
        if (panel.subtext) {
          const subLines = wrapLines(panel.subtext, 22)
          const subBaseY = headBaseY + headLines.length * 32 + 10
          svg += `<text text-anchor="end" x="${W - px - 24}" y="${subBaseY}" fill="${subtextColor}" font-size="13" font-family="Cairo, Tajawal, system-ui, -apple-system, sans-serif" direction="rtl">\n`
          subLines.forEach((line, li) => {
            svg += `  <tspan x="${W - px - 24}" dy="${li === 0 ? 0 : 18}">${esc(line)}</tspan>\n`
          })
          svg += `</text>\n`
        }

        // Badge (on right)
        if (panel.badge) {
          svg += `<rect x="${W - px - 24 - 150}" y="${y + h - 56}" width="150" height="30" rx="15" fill="url(#accentGrad)"/>\n`
          svg += `<text x="${W - px - 24 - 75}" y="${y + h - 36}" text-anchor="middle" fill="#fff" font-size="13" font-weight="700" font-family="Cairo, Tajawal, system-ui, -apple-system, sans-serif">${esc(panel.badge)}</text>\n`
        }
      } else {
        // Classic Full-width image panel (stretched) with gradient overlay
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
      
      const cellBg = isBgRemoved ? '#ffffff' : '#dddddd'
      svg += `<rect x="${imgX}" y="${y}" width="${halfW}" height="${h}" rx="14" fill="${cellBg}" filter="url(#shadow)"/>\n`
      
      if (imgUrl) {
        const aspect = isBgRemoved ? 'xMidYMid contain' : 'xMidYMid slice'
        const padding = isBgRemoved ? 8 : 0
        svg += `<image href="${esc(imgUrl)}" x="${imgX + padding}" y="${y + padding}" width="${halfW - padding * 2}" height="${h - padding * 2}" preserveAspectRatio="${aspect}" clip-path="url(#clip-split-img-${i})"/>\n`
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
    const isBgRemoved = isBackgroundRemoved(imgUrl)

    // Rounded image cell
    svg += `<clipPath id="clip-cell-${i}"><rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" rx="14"/></clipPath>\n`
    
    const cellBg = isBgRemoved ? '#ffffff' : '#dddddd'
    svg += `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" rx="14" fill="${cellBg}" filter="url(#shadow)"/>\n`
    
    if (imgUrl) {
      const aspect = isBgRemoved ? 'xMidYMid contain' : 'xMidYMid slice'
      const padding = isBgRemoved ? 10 : 0
      svg += `<image href="${esc(imgUrl)}" x="${x + padding}" y="${y + padding}" width="${cellW - padding * 2}" height="${cellH - padding * 2}" preserveAspectRatio="${aspect}" clip-path="url(#clip-cell-${i})"/>\n`
    }
    
    // Gradient overlay (only if NOT background removed)
    if (!isBgRemoved) {
      svg += `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" rx="14" fill="url(#fadeBottom)"/>\n`
    }

    if (panel) {
      const headLines = wrapLines(panel.headline, 13)
      
      // If background is removed, draw a nice brand-colored footer overlay at the bottom for readability
      if (isBgRemoved) {
        const barH = headLines.length * 22 + (panel.subtext ? 16 : 0) + 16
        svg += `<rect x="${x}" y="${y + cellH - barH}" width="${cellW}" height="${barH}" fill="url(#brandGrad)" clip-path="url(#clip-cell-${i})"/>\n`
      }

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

    // Auto-process unique images to remove background automatically (Remove.bg or Gemini Studio White)
    const processedUrlsMap: Record<string, string> = {}
    await Promise.all(
      Array.from(uniqueUrls).map(async (url) => {
        processedUrlsMap[url] = await autoProcessImage(url, storeId, supabase, origin)
      })
    )

    // Map input arrays to their processed background-removed counterparts
    const cleanImages = images.map(u => processedUrlsMap[u] ?? u)
    const cleanPanels = panels.map(p => ({
      ...p,
      imageUrl: p.imageUrl ? (processedUrlsMap[p.imageUrl] ?? p.imageUrl) : undefined
    }))

    // Convert all unique processed images to base64
    const uniqueProcessedUrls = new Set<string>()
    cleanImages.forEach(u => { if (u) uniqueProcessedUrls.add(u) })
    cleanPanels.forEach(p => { if (p.imageUrl) uniqueProcessedUrls.add(p.imageUrl) })

    const base64Map: Record<string, string> = {}
    await Promise.all(
      Array.from(uniqueProcessedUrls).map(async (url) => {
        base64Map[url] = await toBase64DataUrl(url, origin)
      })
    )

    // Replace URLs with their base64 representation
    const base64Images = cleanImages.map(u => base64Map[u] ?? u)
    const base64Panels = cleanPanels.map(p => ({
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
