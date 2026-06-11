// ============================================================
// Infographic Generator API — SERVER-SIDE ONLY
//
// POST /api/ai/infographic/generate
// Body: { storeId, productId, images[], aiContent, template, brandColor, accentColor }
//
// Flow:
//   1. Validates auth + store ownership
//   2. Fetches all product images as base64 via Gemini-safe fetch
//   3. Builds HTML template (story | grid)
//   4. Uses @vercel/og (Satori) to render HTML → PNG
//   5. Uploads PNG to Supabase Storage
//   6. Returns { url, template, width, height }
// ============================================================
import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { ImageResponse } from '@vercel/og'
import {
  buildStoryHTML,
  buildGridHTML,
  buildDefaultPanels,
  type InfographicData,
  type InfographicTemplate,
} from '@/lib/ai/infographic-templates'

export const runtime = 'nodejs'
export const maxDuration = 60

const BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET ?? 'dakkani-uploads'

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

// Width for the infographic canvas
const CANVAS_WIDTH = 600
// Heights per template
const TEMPLATE_HEIGHTS: Record<InfographicTemplate, number> = {
  story:  1700,  // ~5 panels × 320px + bars
  grid:   800,   // 3 rows × 240px + bars
  hero:   800,
}

export async function POST(req: Request) {
  const supabase = createServerClient()

  try {
    // ── Auth ──────────────────────────────────────────────────
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })

    const body = await req.json()
    const parsed = schema.parse(body)
    const { storeId, images, aiContent, template, brandColor, accentColor, productName, price, storeName } = parsed

    // Verify store ownership
    const { data: store } = await supabase
      .from('stores')
      .select('id, name')
      .eq('id', storeId)
      .eq('owner_id', user.id)
      .single()
    if (!store) return NextResponse.json({ error: 'المتجر غير موجود' }, { status: 404 })

    // ── Build infographic data ────────────────────────────────
    const panels = buildDefaultPanels({ productName, price, images, aiContent })
    const infographicData: InfographicData = {
      productName,
      price,
      images,
      panels,
      brandColor,
      accentColor,
      storeName: storeName ?? store.name,
    }

    // ── Render HTML → PNG via @vercel/og ─────────────────────
    const html = template === 'grid'
      ? buildGridHTML(infographicData)
      : buildStoryHTML(infographicData)

    const height = TEMPLATE_HEIGHTS[template as InfographicTemplate]

    // Load Cairo font (Arabic) for proper text rendering
    let cairoFont: ArrayBuffer | undefined
    try {
      const fontRes = await fetch(
        'https://fonts.gstatic.com/s/cairo/v28/SLXVc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hOA-W1Q.woff2'
      )
      if (fontRes.ok) cairoFont = await fontRes.arrayBuffer()
    } catch {
      // Font load failed — fall back to system font (still readable)
    }

    const imageResponse = new ImageResponse(
      // We pass the HTML as a raw element using the iframe-style embed trick:
      // @vercel/og renders a subset of HTML/CSS via Satori.
      // For full HTML support we use the JSX form with dangerouslySetInnerHTML-equivalent.
      // Since Satori doesn't support full HTML, we use a minimal JSX tree
      // and embed our styles inline.
      buildSatoriJSX(infographicData, template as InfographicTemplate),
      {
        width:  CANVAS_WIDTH,
        height,
        fonts: cairoFont ? [{ name: 'Cairo', data: cairoFont, weight: 700, style: 'normal' }] : [],
      }
    )

    // Get the PNG buffer
    const pngBuffer = await imageResponse.arrayBuffer()

    // ── Upload to Supabase Storage ────────────────────────────
    const filename = `infographic/${storeId}/${Date.now()}-${template}.png`
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(filename, pngBuffer, {
        contentType: 'image/png',
        upsert: true,
      })

    if (uploadErr) {
      console.error('Infographic upload error:', uploadErr)
      return NextResponse.json({ error: 'تعذر رفع الصورة: ' + uploadErr.message }, { status: 500 })
    }

    const { data: publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(filename)

    return NextResponse.json({
      status: 'done',
      url: publicUrl.publicUrl,
      template,
      width:  CANVAS_WIDTH,
      height,
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'بيانات غير صالحة', details: err.errors }, { status: 400 })
    }
    console.error('infographic/generate error:', err)
    return NextResponse.json({ error: 'حدث خطأ أثناء توليد الإنفوغرافيك' }, { status: 500 })
  }
}

// ── Satori JSX builder ────────────────────────────────────────────────────
// @vercel/og uses Satori which renders a subset of React JSX.
// We build the layout using plain objects (React.createElement style).
function buildSatoriJSX(data: InfographicData, template: InfographicTemplate): React.ReactElement {
  const { brandColor, accentColor, panels, productName, price, storeName } = data

  if (template === 'grid') {
    const imgs = data.images.slice(0, 6)
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '600px',
          backgroundColor: '#fff',
          fontFamily: 'Cairo, Arial, sans-serif',
        }}
      >
        {/* Header */}
        <div style={{
          background: brandColor,
          color: '#fff',
          textAlign: 'center',
          padding: '18px',
          fontSize: '22px',
          fontWeight: 900,
          display: 'flex',
          justifyContent: 'center',
        }}>
          {productName}
        </div>

        {/* Grid */}
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          {imgs.map((url, i) => {
            const panel = panels[i]
            return (
              <div key={i} style={{ width: '300px', height: '240px', position: 'relative', overflow: 'hidden' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.72) 100%)',
                  display: 'flex',
                }} />
                {panel && (
                  <div style={{
                    position: 'absolute', bottom: 0, right: 0, left: 0,
                    padding: '10px 14px', color: '#fff', display: 'flex', flexDirection: 'column',
                  }}>
                    <span style={{ fontSize: '15px', fontWeight: 800, lineHeight: 1.3 }}>{panel.headline}</span>
                    {panel.subtext && (
                      <span style={{ fontSize: '12px', opacity: 0.85, marginTop: '4px' }}>{panel.subtext}</span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* CTA */}
        <div style={{
          background: accentColor, color: '#fff', textAlign: 'center',
          padding: '18px', fontSize: '20px', fontWeight: 900, display: 'flex', justifyContent: 'center',
        }}>
          {'🛒 اطلب الآن — ' + price.toLocaleString('fr-DZ') + ' دج'}
        </div>
        {storeName && (
          <div style={{
            background: brandColor, color: '#fff', textAlign: 'center',
            padding: '12px', fontSize: '14px', fontWeight: 700, display: 'flex', justifyContent: 'center',
          }}>
            {storeName}
          </div>
        )}
      </div>
    ) as unknown as React.ReactElement
  }

  // ── Story template ────────────────────────────────────────────
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '600px',
        backgroundColor: '#fff',
        fontFamily: 'Cairo, Arial, sans-serif',
      }}
    >
      {panels.map((panel, i) => {
        const isFullWidth = i === 0 || i === 4
        const isTextRight = i % 2 === 1

        if (isFullWidth) {
          return (
            <div key={i} style={{ position: 'relative', width: '600px', height: '320px', display: 'flex' }}>
              {panel.imageUrl
                ? <img src={panel.imageUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ position: 'absolute', inset: 0, background: brandColor, display: 'flex' }} />
              }
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.78) 100%)',
                display: 'flex',
              }} />
              <div style={{
                position: 'absolute', bottom: 0, right: 0, left: 0,
                padding: '20px 24px', color: '#fff', display: 'flex', flexDirection: 'column',
              }}>
                <span style={{ fontSize: '26px', fontWeight: 900, lineHeight: 1.3, marginBottom: '8px' }}>
                  {panel.headline}
                </span>
                {panel.subtext && (
                  <span style={{ fontSize: '15px', opacity: 0.9 }}>{panel.subtext}</span>
                )}
                {panel.badge && (
                  <span style={{
                    display: 'flex', marginTop: '10px', background: accentColor,
                    color: '#fff', borderRadius: '20px', padding: '4px 14px',
                    fontSize: '14px', fontWeight: 700, width: 'fit-content',
                  }}>
                    {panel.badge}
                  </span>
                )}
              </div>
            </div>
          )
        }

        // Split panel
        const textBlock = (
          <div style={{
            width: '300px', background: brandColor,
            display: 'flex', flexDirection: 'column',
            justifyContent: 'center', padding: '20px 18px', color: '#fff',
          }}>
            <span style={{ fontSize: '20px', fontWeight: 900, lineHeight: 1.35, marginBottom: '10px' }}>
              {panel.headline}
            </span>
            {panel.subtext && (
              <span style={{ fontSize: '13px', opacity: 0.9, lineHeight: 1.6 }}>{panel.subtext}</span>
            )}
            {panel.badge && (
              <span style={{
                display: 'flex', marginTop: '10px', background: accentColor,
                color: '#fff', borderRadius: '20px', padding: '4px 14px',
                fontSize: '13px', fontWeight: 700, width: 'fit-content',
              }}>
                {panel.badge}
              </span>
            )}
          </div>
        )
        const imageBlock = (
          <div style={{ width: '300px', height: '260px', overflow: 'hidden', display: 'flex' }}>
            {panel.imageUrl
              ? <img src={panel.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', background: brandColor + '55', display: 'flex' }} />
            }
          </div>
        )

        return (
          <div key={i} style={{ display: 'flex', width: '600px', height: '260px' }}>
            {isTextRight ? <>{textBlock}{imageBlock}</> : <>{imageBlock}{textBlock}</>}
          </div>
        )
      })}

      {/* CTA Bar */}
      <div style={{
        background: accentColor, color: '#fff', display: 'flex',
        justifyContent: 'center', padding: '18px',
        fontSize: '20px', fontWeight: 900,
      }}>
        {'🛒 اطلب الآن — ' + price.toLocaleString('fr-DZ') + ' دج — الدفع عند الاستلام'}
      </div>
      {storeName && (
        <div style={{
          background: brandColor, color: '#fff', display: 'flex',
          justifyContent: 'center', padding: '12px', fontSize: '14px', fontWeight: 700,
        }}>
          {storeName}
        </div>
      )}
    </div>
  ) as unknown as React.ReactElement
}
