// ============================================================
// Infographic Generator API — PURE SVG approach (zero native deps)
//
// POST /api/ai/infographic/generate
// Body: { storeId, images[], aiContent, template, brandColor, accentColor, productName, price }
//
// Strategy:
//   1. Build a self-contained SVG with embedded product images (via <image href>)
//   2. Upload SVG directly to Supabase Storage as image/svg+xml
//   3. Return public URL
//
// NO @vercel/og, NO sharp, NO native binaries. Just string manipulation.
// Works on ANY runtime (nodejs, edge, serverless).
// ============================================================
import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { buildDefaultPanels } from '@/lib/ai/infographic-templates'

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
    .slice(0, 120)
}

function hexToRgb(hex: string) {
  const c = hex.replace('#', '')
  return {
    r: parseInt(c.substring(0, 2), 16) || 0,
    g: parseInt(c.substring(2, 4), 16) || 0,
    b: parseInt(c.substring(4, 6), 16) || 0,
  }
}

/** Word-wrap Arabic/Latin text into lines for SVG <tspan> */
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
  return lines.slice(0, 3)
}

// ── STORY SVG builder ──────────────────────────────────────────
function buildStorySVG(opts: {
  panels: ReturnType<typeof buildDefaultPanels>
  images: string[]
  brandColor: string
  accentColor: string
  price: number
  storeName: string
}): string {
  const { panels, images, brandColor, accentColor, price, storeName } = opts
  const bc = hexToRgb(brandColor)
  const ac = hexToRgb(accentColor)

  // Panel heights: panels 0,4 = 320px full-width; panels 1,2,3 = 260px split
  const panelHeights = [320, 260, 260, 260, 320]
  const ctaH = 56
  const footerH = storeName ? 44 : 0
  const totalH = panelHeights.reduce((s, h) => s + h, 0) + ctaH + footerH

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${totalH}" viewBox="0 0 ${W} ${totalH}">\n`
  svg += `<defs>\n`
  svg += `  <linearGradient id="grad-bottom" x1="0" y1="0" x2="0" y2="1"><stop offset="30%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.78"/></linearGradient>\n`
  svg += `</defs>\n`
  // White background
  svg += `<rect width="${W}" height="${totalH}" fill="#fff"/>\n`

  let y = 0

  for (let i = 0; i < 5; i++) {
    const panel = panels[i] ?? panels[0]
    const h = panelHeights[i]
    const imgUrl = images[i] ?? images[0]
    const isFullWidth = i === 0 || i === 4
    const isTextRight = i % 2 === 1

    if (isFullWidth) {
      // Full-width image panel with gradient + text overlay
      svg += `<image href="${esc(imgUrl)}" x="0" y="${y}" width="${W}" height="${h}" preserveAspectRatio="xMidYMid slice"/>\n`
      svg += `<rect x="0" y="${y}" width="${W}" height="${h}" fill="url(#grad-bottom)"/>\n`

      // Headline
      const headLines = wrapLines(panel.headline, 24)
      const textStartY = y + h - 24 - (headLines.length - 1) * 34 - (panel.subtext ? 26 : 0)
      svg += `<text text-anchor="end" x="${W - 24}" y="${textStartY}" fill="#fff" font-size="26" font-weight="900" font-family="Arial,sans-serif" direction="rtl">\n`
      headLines.forEach((line, li) => {
        svg += `  <tspan x="${W - 24}" dy="${li === 0 ? 0 : 34}">${esc(line)}</tspan>\n`
      })
      svg += `</text>\n`

      if (panel.subtext) {
        svg += `<text text-anchor="end" x="${W - 24}" y="${y + h - 18}" fill="rgba(255,255,255,0.88)" font-size="15" font-family="Arial,sans-serif" direction="rtl">${esc(panel.subtext.slice(0, 60))}</text>\n`
      }

      if (panel.badge) {
        svg += `<rect x="16" y="${y + h - 44}" width="150" height="28" rx="14" fill="rgb(${ac.r},${ac.g},${ac.b})"/>\n`
        svg += `<text x="91" y="${y + h - 25}" text-anchor="middle" fill="#fff" font-size="13" font-weight="700" font-family="Arial,sans-serif">${esc(panel.badge)}</text>\n`
      }
    } else {
      // Split panel: half image + half colored text
      const halfW = W / 2
      const imgX = isTextRight ? 0 : halfW
      const textX = isTextRight ? halfW : 0

      // Image half
      svg += `<image href="${esc(imgUrl)}" x="${imgX}" y="${y}" width="${halfW}" height="${h}" preserveAspectRatio="xMidYMid slice"/>\n`

      // Colored text half
      svg += `<rect x="${textX}" y="${y}" width="${halfW}" height="${h}" fill="rgb(${bc.r},${bc.g},${bc.b})"/>\n`

      // Headline text
      const headLines = wrapLines(panel.headline, 16)
      svg += `<text text-anchor="end" x="${textX + halfW - 16}" y="${y + 55}" fill="#fff" font-size="19" font-weight="900" font-family="Arial,sans-serif" direction="rtl">\n`
      headLines.forEach((line, li) => {
        svg += `  <tspan x="${textX + halfW - 16}" dy="${li === 0 ? 0 : 26}">${esc(line)}</tspan>\n`
      })
      svg += `</text>\n`

      // Subtext
      if (panel.subtext) {
        const subLines = wrapLines(panel.subtext, 18)
        svg += `<text text-anchor="end" x="${textX + halfW - 16}" y="${y + 140}" fill="rgba(255,255,255,0.85)" font-size="13" font-family="Arial,sans-serif" direction="rtl">\n`
        subLines.forEach((line, li) => {
          svg += `  <tspan x="${textX + halfW - 16}" dy="${li === 0 ? 0 : 18}">${esc(line)}</tspan>\n`
        })
        svg += `</text>\n`
      }

      // Badge
      if (panel.badge) {
        svg += `<rect x="${textX + 12}" y="${y + h - 42}" width="140" height="28" rx="14" fill="rgb(${ac.r},${ac.g},${ac.b})"/>\n`
        svg += `<text x="${textX + 82}" y="${y + h - 23}" text-anchor="middle" fill="#fff" font-size="13" font-weight="700" font-family="Arial,sans-serif">${esc(panel.badge)}</text>\n`
      }
    }

    y += h
  }

  // CTA bar
  svg += `<rect x="0" y="${y}" width="${W}" height="${ctaH}" fill="rgb(${ac.r},${ac.g},${ac.b})"/>\n`
  svg += `<text x="${W / 2}" y="${y + 36}" text-anchor="middle" fill="#fff" font-size="20" font-weight="900" font-family="Arial,sans-serif">اطلب الان — ${price.toLocaleString('fr-DZ')} دج — الدفع عند الاستلام</text>\n`
  y += ctaH

  // Footer
  if (storeName) {
    svg += `<rect x="0" y="${y}" width="${W}" height="${footerH}" fill="rgb(${bc.r},${bc.g},${bc.b})"/>\n`
    svg += `<text x="${W / 2}" y="${y + 28}" text-anchor="middle" fill="#fff" font-size="16" font-weight="700" font-family="Arial,sans-serif">${esc(storeName)}</text>\n`
  }

  svg += `</svg>`
  return svg
}

// ── GRID SVG builder ───────────────────────────────────────────
function buildGridSVG(opts: {
  panels: ReturnType<typeof buildDefaultPanels>
  images: string[]
  brandColor: string
  accentColor: string
  price: number
  storeName: string
  productName: string
}): string {
  const { panels, images, brandColor, accentColor, price, storeName, productName } = opts
  const bc = hexToRgb(brandColor)
  const ac = hexToRgb(accentColor)

  const headerH = 60
  const cellH = 240
  const cellW = W / 2
  const gap = 3
  const cols = 2
  const imgCount = Math.min(images.length, 6)
  const rows = Math.ceil(imgCount / cols)
  const ctaH = 56
  const footerH = storeName ? 44 : 0
  const totalH = headerH + rows * (cellH + gap) + ctaH + footerH

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${totalH}" viewBox="0 0 ${W} ${totalH}">\n`
  svg += `<defs>\n`
  for (let i = 0; i < imgCount; i++) {
    svg += `  <linearGradient id="gg${i}" x1="0" y1="0.4" x2="0" y2="1"><stop offset="0%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.72"/></linearGradient>\n`
  }
  svg += `</defs>\n`
  svg += `<rect width="${W}" height="${totalH}" fill="#f0f0f0"/>\n`

  // Header
  svg += `<rect x="0" y="0" width="${W}" height="${headerH}" fill="rgb(${bc.r},${bc.g},${bc.b})"/>\n`
  svg += `<text x="${W / 2}" y="38" text-anchor="middle" fill="#fff" font-size="22" font-weight="900" font-family="Arial,sans-serif">${esc(productName)}</text>\n`

  // Grid cells
  for (let i = 0; i < imgCount; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = col * cellW
    const y = headerH + row * (cellH + gap)

    svg += `<image href="${esc(images[i])}" x="${x}" y="${y}" width="${cellW}" height="${cellH}" preserveAspectRatio="xMidYMid slice"/>\n`
    svg += `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" fill="url(#gg${i})"/>\n`

    const panel = panels[i]
    if (panel) {
      const headLines = wrapLines(panel.headline, 14)
      svg += `<text text-anchor="end" x="${x + cellW - 10}" y="${y + cellH - 40}" fill="#fff" font-size="15" font-weight="900" font-family="Arial,sans-serif" direction="rtl">\n`
      headLines.forEach((line, li) => {
        svg += `  <tspan x="${x + cellW - 10}" dy="${li === 0 ? 0 : 20}">${esc(line)}</tspan>\n`
      })
      svg += `</text>\n`

      if (panel.subtext) {
        svg += `<text text-anchor="end" x="${x + cellW - 10}" y="${y + cellH - 12}" fill="rgba(255,255,255,0.82)" font-size="11" font-family="Arial,sans-serif" direction="rtl">${esc(panel.subtext.slice(0, 35))}</text>\n`
      }
    }
  }

  // CTA
  const ctaY = headerH + rows * (cellH + gap)
  svg += `<rect x="0" y="${ctaY}" width="${W}" height="${ctaH}" fill="rgb(${ac.r},${ac.g},${ac.b})"/>\n`
  svg += `<text x="${W / 2}" y="${ctaY + 36}" text-anchor="middle" fill="#fff" font-size="20" font-weight="900" font-family="Arial,sans-serif">اطلب الان — ${price.toLocaleString('fr-DZ')} دج</text>\n`

  // Footer
  if (storeName) {
    const fY = ctaY + ctaH
    svg += `<rect x="0" y="${fY}" width="${W}" height="${footerH}" fill="rgb(${bc.r},${bc.g},${bc.b})"/>\n`
    svg += `<text x="${W / 2}" y="${fY + 28}" text-anchor="middle" fill="#fff" font-size="16" font-weight="700" font-family="Arial,sans-serif">${esc(storeName)}</text>\n`
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

    // Manual validation (no Zod edge cases)
    const storeId     = body.storeId as string
    const images      = (body.images ?? []) as string[]
    const aiContent   = body.aiContent
    const template    = (body.template ?? 'story') as 'story' | 'grid'
    const brandColor  = (body.brandColor ?? '#7C3AED') as string
    const accentColor = (body.accentColor ?? '#F59E0B') as string
    const productName = (body.productName ?? '') as string
    const price       = Number(body.price) || 0
    const storeName   = body.storeName as string | undefined

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

    // Build panels
    const panels = buildDefaultPanels({ productName, price, images, aiContent })
    const resolvedStore = storeName ?? store.name ?? ''

    // Build SVG
    let svgContent: string
    if (template === 'grid') {
      svgContent = buildGridSVG({
        panels, images: images.slice(0, 6), brandColor, accentColor,
        price, storeName: resolvedStore, productName,
      })
    } else {
      svgContent = buildStorySVG({
        panels, images: images.slice(0, 6), brandColor, accentColor,
        price, storeName: resolvedStore,
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
