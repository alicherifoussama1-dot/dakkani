// ============================================================
// Infographic Generator API — SERVER-SIDE ONLY
//
// POST /api/ai/infographic/generate
// Body: { storeId, images[], aiContent, template, brandColor, accentColor, productName, price }
//
// Strategy: fetch each product image → use Sharp to composite them into
// a vertical infographic with colored panels and text drawn via SVG.
// No browser / Puppeteer needed. Works on Vercel Node.js runtime.
// ============================================================
import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
// @ts-ignore
import sharp from 'sharp'
import { buildDefaultPanels } from '@/lib/ai/infographic-templates'

export const runtime = 'nodejs'
export const maxDuration = 60

const BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET ?? 'dakkani-uploads'
const CANVAS_W = 600
const schema = z.object({
  storeId:     z.string().uuid(),
  images:      z.array(z.string()).min(1).max(6),
  aiContent:   z.any(),
  template:    z.enum(['story', 'grid']).default('story'),
  brandColor:  z.string().default('#7C3AED'),
  accentColor: z.string().default('#F59E0B'),
  productName: z.string().min(1),
  price:       z.preprocess((val) => Number(val), z.number().min(0)),
  storeName:   z.string().optional(),
})
/** Parse "#RRGGBB" → { r, g, b } */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '')
  return {
    r: parseInt(clean.substring(0, 2), 16) || 0,
    g: parseInt(clean.substring(2, 4), 16) || 0,
    b: parseInt(clean.substring(4, 6), 16) || 0,
  }
}

/** Escape text for safe embedding in SVG */
function svgText(str: string): string {
  return (str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .slice(0, 120) // hard cap to avoid overflow
}

/** Wrap long text into multiple SVG <tspan> lines (approx chars per line) */
function wrapSvgText(
  text: string,
  x: number,
  y: number,
  maxChars: number,
  dy: number,
  style: string,
): string {
  if (!text) return ''
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const w of words) {
    if ((current + ' ' + w).length > maxChars) {
      if (current) lines.push(current)
      current = w
    } else {
      current = current ? current + ' ' + w : w
    }
  }
  if (current) lines.push(current)
  return lines
    .slice(0, 4)
    .map((line, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : dy}" style="${style}">${svgText(line)}</tspan>`)
    .join('')
}

/** Fetch a remote image URL and resize it to exact dimensions via Sharp */
async function fetchAndResize(url: string, w: number, h: number): Promise<Buffer> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    return await sharp(buf)
      .resize(w, h, { fit: 'cover', position: 'centre' })
      .png()
      .toBuffer()
  } catch {
    // Return a solid colored placeholder
    return await sharp({
      create: { width: w, height: h, channels: 4, background: { r: 200, g: 200, b: 200, alpha: 1 } },
    }).png().toBuffer()
  }
}

// ── STORY template (5 vertical panels) ───────────────────────────────────
async function buildStory(
  panels: ReturnType<typeof buildDefaultPanels>,
  images: string[],
  brandColor: string,
  accentColor: string,
  price: number,
  storeName: string,
): Promise<Buffer> {
  const { r: br, g: bg, b: bb } = hexToRgb(brandColor)
  const { r: ar, g: ag, b: ab } = hexToRgb(accentColor)

  const composites: any[] = []
  let totalH = 0

  const panelDefs = panels.map((panel, i) => ({
    panel,
    imageUrl: images[i] ?? images[0] ?? null,
    h: (i === 0 || i === 4) ? 320 : 260,
    isFullWidth: i === 0 || i === 4,
    isTextRight: i % 2 === 1,
  }))

  const base = sharp({
    create: {
      width: CANVAS_W,
      height: panelDefs.reduce((s, p) => s + p.h, 0) + 56 + (storeName ? 44 : 0),
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })

  // Build each panel
  for (const { panel, imageUrl, h, isFullWidth, isTextRight } of panelDefs) {
    if (isFullWidth) {
      // Full-width image with gradient overlay + text
      const imgBuf = imageUrl ? await fetchAndResize(imageUrl, CANVAS_W, h) : null

      // Gradient overlay SVG
      const overlaySvg = `<svg width="${CANVAS_W}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="30%" stop-color="#000" stop-opacity="0"/>
            <stop offset="100%" stop-color="#000" stop-opacity="0.78"/>
          </linearGradient>
        </defs>
        <rect width="${CANVAS_W}" height="${h}" fill="url(#g)"/>
        <text x="${CANVAS_W - 24}" y="${h - 72}" text-anchor="end"
          style="fill:#fff;font-size:26px;font-weight:900;font-family:Arial,sans-serif;direction:rtl;">
          ${wrapSvgText(panel.headline, CANVAS_W - 24, h - 72, 22, 34, 'fill:#fff;font-size:26px;font-weight:900;font-family:Arial,sans-serif;')}
        </text>
        ${panel.subtext ? `<text x="${CANVAS_W - 24}" y="${h - 24}" text-anchor="end"
          style="fill:rgba(255,255,255,0.88);font-size:16px;font-family:Arial,sans-serif;direction:rtl;">
          ${svgText(panel.subtext.slice(0, 80))}
        </text>` : ''}
      </svg>`

      if (imgBuf) {
        composites.push({ input: imgBuf, top: totalH, left: 0 })
      } else {
        const solidBg = await sharp({
          create: { width: CANVAS_W, height: h, channels: 4, background: { r: br, g: bg, b: bb, alpha: 1 } },
        }).png().toBuffer()
        composites.push({ input: solidBg, top: totalH, left: 0 })
      }
      composites.push({ input: Buffer.from(overlaySvg), top: totalH, left: 0 })
    } else {
      // Split panel: image half + colored text half
      const imgW = 300
      const imgBuf = imageUrl ? await fetchAndResize(imageUrl, imgW, h) : null

      // Colored text block SVG
      const textSvg = `<svg width="${imgW}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${imgW}" height="${h}" fill="rgb(${br},${bg},${bb})"/>
        <text x="${imgW - 16}" y="60" text-anchor="end"
          style="fill:#fff;font-size:20px;font-weight:900;font-family:Arial,sans-serif;direction:rtl;">
          ${wrapSvgText(panel.headline, imgW - 16, 60, 18, 28, 'fill:#fff;font-size:20px;font-weight:900;font-family:Arial,sans-serif;')}
        </text>
        ${panel.subtext ? `<text x="${imgW - 16}" y="150" text-anchor="end"
          style="fill:rgba(255,255,255,0.88);font-size:13px;font-family:Arial,sans-serif;direction:rtl;">
          ${wrapSvgText(panel.subtext.slice(0, 100), imgW - 16, 150, 18, 18, 'fill:rgba(255,255,255,0.88);font-size:13px;font-family:Arial,sans-serif;')}
        </text>` : ''}
        ${panel.badge ? `<rect x="8" y="${h - 40}" width="140" height="28" rx="14" fill="rgb(${ar},${ag},${ab})"/>
        <text x="78" y="${h - 21}" text-anchor="middle"
          style="fill:#fff;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">${svgText(panel.badge)}</text>` : ''}
      </svg>`

      const textBuf = Buffer.from(textSvg)
      const [imgLeft, textLeft] = isTextRight ? [imgW, 0] : [0, imgW]

      if (imgBuf) composites.push({ input: imgBuf, top: totalH, left: imgLeft })
      composites.push({ input: textBuf, top: totalH, left: textLeft })
    }

    totalH += h
  }

  // CTA bar
  const ctaSvg = `<svg width="${CANVAS_W}" height="56" xmlns="http://www.w3.org/2000/svg">
    <rect width="${CANVAS_W}" height="56" fill="rgb(${ar},${ag},${ab})"/>
    <text x="${CANVAS_W / 2}" y="36" text-anchor="middle"
      style="fill:#fff;font-size:20px;font-weight:900;font-family:Arial,sans-serif;">
      اطلب الان - ${price.toLocaleString('fr-DZ')} دج - الدفع عند الاستلام
    </text>
  </svg>`
  composites.push({ input: Buffer.from(ctaSvg), top: totalH, left: 0 })
  totalH += 56

  if (storeName) {
    const footerSvg = `<svg width="${CANVAS_W}" height="44" xmlns="http://www.w3.org/2000/svg">
      <rect width="${CANVAS_W}" height="44" fill="rgb(${br},${bg},${bb})"/>
      <text x="${CANVAS_W / 2}" y="28" text-anchor="middle"
        style="fill:#fff;font-size:16px;font-weight:700;font-family:Arial,sans-serif;">${svgText(storeName)}</text>
    </svg>`
    composites.push({ input: Buffer.from(footerSvg), top: totalH, left: 0 })
  }

  return base.composite(composites).png({ compressionLevel: 8 }).toBuffer()
}

// ── GRID template (2-column photo grid) ───────────────────────────────────
async function buildGrid(
  panels: ReturnType<typeof buildDefaultPanels>,
  images: string[],
  brandColor: string,
  accentColor: string,
  price: number,
  storeName: string,
  productName: string,
): Promise<Buffer> {
  const { r: br, g: bg, b: bb } = hexToRgb(brandColor)
  const { r: ar, g: ag, b: ab } = hexToRgb(accentColor)

  const cellH = 240
  const cols = 2
  const rows = Math.ceil(Math.min(images.length, 6) / cols)
  const totalH = 60 + rows * (cellH + 3) + 56 + (storeName ? 44 : 0)

  const base = sharp({
    create: { width: CANVAS_W, height: totalH, channels: 4, background: { r: 240, g: 240, b: 240, alpha: 1 } },
  })
  const composites: any[] = []

  // Header
  const headerSvg = `<svg width="${CANVAS_W}" height="60" xmlns="http://www.w3.org/2000/svg">
    <rect width="${CANVAS_W}" height="60" fill="rgb(${br},${bg},${bb})"/>
    <text x="${CANVAS_W / 2}" y="38" text-anchor="middle"
      style="fill:#fff;font-size:22px;font-weight:900;font-family:Arial,sans-serif;">
      ${svgText(productName)}
    </text>
  </svg>`
  composites.push({ input: Buffer.from(headerSvg), top: 0, left: 0 })

  for (let i = 0; i < Math.min(images.length, 6); i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = col * (CANVAS_W / cols)
    const y = 60 + row * (cellH + 3)
    const cellW = CANVAS_W / cols

    const imgBuf = await fetchAndResize(images[i], cellW, cellH)
    composites.push({ input: imgBuf, top: y, left: x })

    const panel = panels[i]
    if (panel) {
      const overlaySvg = `<svg width="${cellW}" height="${cellH}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g${i}" x1="0" y1="0.4" x2="0" y2="1">
            <stop offset="0%" stop-color="#000" stop-opacity="0"/>
            <stop offset="100%" stop-color="#000" stop-opacity="0.72"/>
          </linearGradient>
        </defs>
        <rect width="${cellW}" height="${cellH}" fill="url(#g${i})"/>
        <text x="${cellW - 10}" y="${cellH - 46}" text-anchor="end"
          style="fill:#fff;font-size:16px;font-weight:900;font-family:Arial,sans-serif;direction:rtl;">
          ${wrapSvgText(panel.headline, cellW - 10, cellH - 46, 15, 22, 'fill:#fff;font-size:16px;font-weight:900;font-family:Arial,sans-serif;')}
        </text>
        ${panel.subtext ? `<text x="${cellW - 10}" y="${cellH - 12}" text-anchor="end"
          style="fill:rgba(255,255,255,0.82);font-size:12px;font-family:Arial,sans-serif;direction:rtl;">
          ${svgText(panel.subtext.slice(0, 40))}
        </text>` : ''}
      </svg>`
      composites.push({ input: Buffer.from(overlaySvg), top: y, left: x })
    }
  }

  const ctaY = 60 + rows * (cellH + 3)
  const ctaSvg = `<svg width="${CANVAS_W}" height="56" xmlns="http://www.w3.org/2000/svg">
    <rect width="${CANVAS_W}" height="56" fill="rgb(${ar},${ag},${ab})"/>
    <text x="${CANVAS_W / 2}" y="36" text-anchor="middle"
      style="fill:#fff;font-size:20px;font-weight:900;font-family:Arial,sans-serif;">
      اطلب الان - ${price.toLocaleString('fr-DZ')} دج
    </text>
  </svg>`
  composites.push({ input: Buffer.from(ctaSvg), top: ctaY, left: 0 })

  if (storeName) {
    const footerSvg = `<svg width="${CANVAS_W}" height="44" xmlns="http://www.w3.org/2000/svg">
      <rect width="${CANVAS_W}" height="44" fill="rgb(${br},${bg},${bb})"/>
      <text x="${CANVAS_W / 2}" y="28" text-anchor="middle"
        style="fill:#fff;font-size:16px;font-weight:700;font-family:Arial,sans-serif;">${svgText(storeName)}</text>
    </svg>`
    composites.push({ input: Buffer.from(footerSvg), top: ctaY + 56, left: 0 })
  }

  return base.composite(composites).png({ compressionLevel: 8 }).toBuffer()
}

// ── Route handler ──────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const supabase = createServerClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })

    const body = await req.json()
    const parsed = schema.parse(body)
    const { storeId, images, aiContent, template, brandColor, accentColor, productName, price, storeName } = parsed

    const { data: store } = await supabase
      .from('stores')
      .select('id, name')
      .eq('id', storeId)
      .eq('owner_id', user.id)
      .single()
    if (!store) return NextResponse.json({ error: 'المتجر غير موجود' }, { status: 404 })

    const panels = buildDefaultPanels({ productName, price, images, aiContent })
    const resolvedStore = storeName ?? store.name ?? ''

    // ── Render with Sharp ─────────────────────────────────────
    let pngBuffer: Buffer
    if (template === 'grid') {
      pngBuffer = await buildGrid(panels, images, brandColor, accentColor, price, resolvedStore, productName)
    } else {
      pngBuffer = await buildStory(panels, images, brandColor, accentColor, price, resolvedStore)
    }

    // ── Upload to Supabase Storage ─────────────────────────────
    const filename = `infographic/${storeId}/${Date.now()}-${template}.png`
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(filename, pngBuffer, { contentType: 'image/png', upsert: true })

    if (uploadErr) {
      console.error('Infographic upload error:', uploadErr)
      return NextResponse.json({ error: 'تعذر رفع الصورة: ' + uploadErr.message }, { status: 500 })
    }

    const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(filename)
    return NextResponse.json({ status: 'done', url: publicUrlData.publicUrl, template })

  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'بيانات غير صالحة', details: err.errors }, { status: 400 })
    }
    console.error('infographic/generate error:', err)
    return NextResponse.json({ error: 'حدث خطأ أثناء توليد الإنفوغرافيك: ' + String(err) }, { status: 500 })
  }
}
