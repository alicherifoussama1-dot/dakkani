'use client'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'

interface Props { images: { url: string }[]; productName: string }

export default function ProductGallery({ images, productName }: Props) {
  const [active, setActive] = useState(0)
  const [zoom, setZoom]     = useState(false)

  if (!images.length) {
    return (
      <div className="aspect-square bg-gray-100 rounded-2xl flex items-center justify-center text-6xl text-gray-200">
        {productName[0]}
      </div>
    )
  }

  const prev = () => setActive(i => (i - 1 + images.length) % images.length)
  const next = () => setActive(i => (i + 1) % images.length)

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="relative aspect-square bg-white rounded-2xl border border-gray-100 overflow-hidden group">
        <img
          src={images[active].url}
          alt={productName}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Navigation arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 hover:bg-white rounded-full shadow flex items-center justify-center transition"
            >
              <ChevronRight className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={next}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 hover:bg-white rounded-full shadow flex items-center justify-center transition"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
          </>
        )}

        {/* Zoom button */}
        <button
          onClick={() => setZoom(true)}
          className="absolute top-3 left-3 w-9 h-9 bg-white/90 hover:bg-white rounded-full shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
        >
          <ZoomIn className="w-4 h-4 text-gray-600" />
        </button>

        {/* Image counter */}
        {images.length > 1 && (
          <div className="absolute bottom-3 right-1/2 translate-x-1/2 bg-black/40 text-white text-xs px-2 py-1 rounded-full">
            {active + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden border-2 transition ${
                i === active ? 'border-[#0D6EFD]' : 'border-transparent hover:border-gray-300'
              }`}
            >
              {/* Thumbnails render at 64px but the src is the FULL original
                  (~1.35MB average, up to 3.4MB). Without a lazy hint a
                  7-image product downloaded ~10MB of thumbnails before the
                  page settled. `lazy` defers the off-screen ones; `async`
                  decoding keeps the main image's paint off the decode queue.
                  Purely loading hints — the markup and visuals are unchanged. */}
              <img
                src={img.url}
                alt=""
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {zoom && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setZoom(false)}
        >
          <img
            src={images[active].url}
            alt={productName}
            decoding="async"
            className="max-w-full max-h-full object-contain rounded-2xl"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setZoom(false)}
            className="absolute top-4 right-4 text-white text-2xl font-bold w-10 h-10 bg-white/10 rounded-full hover:bg-white/20 transition"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
