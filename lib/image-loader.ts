// ============================================================
// next/image custom loader.
//
// Wired via `images.loaderFile` in next.config.mjs, so EVERY <Image> in the
// app routes through it without a single component edit. Supabase images go
// to /api/img (edge-cached, sharp-resized); everything else — static
// imports, /public assets, third-party hosts — passes through unchanged.
//
// Choosing a custom loader also means next/image no longer calls Vercel's
// Image Optimization service, whose transformation quota is exhausted.
// ============================================================
import { cdnImage } from './image-url'

export default function loader({ src, width, quality }: {
  src: string
  width: number
  quality?: number
}): string {
  const out = cdnImage(src, width, quality)
  // cdnImage passes non-Supabase sources straight back. Returning them as-is
  // is exactly right: a custom loader is expected to hand back a usable URL,
  // and for a /public asset the original path already is one.
  return out || src
}
