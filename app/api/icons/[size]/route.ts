// Dynamic PWA icon generator — returns SVG with COMMERCO C brand icon
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: { size: string } }) {
  const size = parseInt(params.size) || 192
  const s = size.toString()

  // Generate SVG icon matching COMMERCO brand identity
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 48 48">
  <defs>
    <linearGradient id="flow" x1="0%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%" stop-color="#0066FF"/>
      <stop offset="55%" stop-color="#0088FF"/>
      <stop offset="100%" stop-color="#00C49F"/>
    </linearGradient>
  </defs>
  <rect width="48" height="48" rx="10" fill="#FFFFFF"/>
  <path d="M34.3 14.2A14 14 0 1 0 34.3 33.8"
        fill="none" stroke="url(#flow)" stroke-width="9"
        stroke-linecap="round"/>
  <circle cx="36.6" cy="24" r="3.4" fill="#FF8C00"/>
</svg>`

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
