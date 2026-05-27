// Dynamic PWA icon generator — returns SVG-based PNG
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: { size: string } }) {
  const size = parseInt(params.size) || 192
  const s    = size.toString()

  // Generate SVG icon
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0D6EFD"/>
      <stop offset="100%" style="stop-color:#0B5ED7"/>
    </linearGradient>
  </defs>
  <rect width="${s}" height="${s}" rx="${Math.round(size * 0.22)}" fill="url(#g)"/>
  <text
    x="50%"
    y="54%"
    font-family="Arial, sans-serif"
    font-weight="900"
    font-size="${Math.round(size * 0.5)}"
    fill="white"
    text-anchor="middle"
    dominant-baseline="middle"
  >د</text>
</svg>`

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
