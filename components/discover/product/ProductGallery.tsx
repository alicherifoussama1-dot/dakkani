'use client'

import { useRef, useState } from 'react'
import { Play, ZoomIn, X } from 'lucide-react'
import { cdnImage } from '@/lib/image-url'

interface MediaItem { type: 'image' | 'video'; url: string }

interface Props {
  images: { url: string }[]
  videoUrl?: string | null
  alt: string
}

export default function ProductGallery({ images, videoUrl, alt }: Props) {
  const media: MediaItem[] = [
    ...images.filter(i => i?.url).map(i => ({ type: 'image' as const, url: i.url })),
    ...(videoUrl ? [{ type: 'video' as const, url: videoUrl }] : []),
  ]
  const [active, setActive] = useState(0)
  const [zoomOpen, setZoomOpen] = useState(false)
  const [zoomStyle, setZoomStyle] = useState<{ transformOrigin: string; transform: string } | null>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  const current = media[active]

  // Desktop hover-zoom
  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!frameRef.current || current?.type !== 'image') return
    const rect = frameRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setZoomStyle({ transformOrigin: `${x}% ${y}%`, transform: 'scale(2)' })
  }
  const onMouseLeave = () => setZoomStyle(null)

  // Mobile swipe
  const touchStartX = useRef<number | null>(null)
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 40) {
      if (dx > 0) setActive(a => Math.max(0, a - 1))   // swipe right → previous (RTL)
      else setActive(a => Math.min(media.length - 1, a + 1))
    }
    touchStartX.current = null
  }

  if (media.length === 0) {
    return (
      <div className="pt-radius-lg pt-surface-soft" style={{
        aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 64, border: '1px solid var(--pt-border)',
      }}>
        📦
      </div>
    )
  }

  return (
    <div>
      {/* Main frame */}
      <div
        ref={frameRef}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClick={() => current?.type === 'image' && setZoomOpen(true)}
        style={{
          position: 'relative',
          aspectRatio: '1/1',
          borderRadius: 'var(--pt-radius-lg)',
          overflow: 'hidden',
          border: '1px solid var(--pt-border)',
          background: 'var(--pt-surface-soft)',
          cursor: current?.type === 'image' ? 'zoom-in' : 'default',
          touchAction: 'pan-y',
        }}>
        {current?.type === 'video' ? (
          <video
            src={current.url}
            controls
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <img
            src={cdnImage(current?.url, 1080)}
            alt={alt}
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              transition: zoomStyle ? 'none' : 'transform 0.25s ease',
              ...(zoomStyle ?? {}),
            }}
            draggable={false}
          />
        )}

        {/* Zoom hint — desktop only */}
        {current?.type === 'image' && (
          <div className="hidden md:flex" style={{
            position: 'absolute', bottom: 12, left: 12,
            alignItems: 'center', gap: 6,
            background: 'rgba(0,0,0,0.55)', color: '#fff',
            fontSize: 11, padding: '5px 10px', borderRadius: 'var(--pt-radius-pill)',
            pointerEvents: 'none',
          }}>
            <ZoomIn size={12} /> مرر للتكبير
          </div>
        )}

        {/* Slide counter — mobile */}
        {media.length > 1 && (
          <div className="md:hidden" style={{
            position: 'absolute', bottom: 12, insetInlineEnd: 12,
            background: 'rgba(0,0,0,0.55)', color: '#fff',
            fontSize: 11, padding: '4px 10px', borderRadius: 'var(--pt-radius-pill)',
          }}>
            {active + 1} / {media.length}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {media.length > 1 && (
        <div ref={trackRef} style={{
          display: 'flex', gap: 8, marginTop: 10,
          overflowX: 'auto', WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}>
          {media.map((m, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              style={{
                flexShrink: 0, width: 60, height: 60,
                borderRadius: 'var(--pt-radius-sm)',
                overflow: 'hidden', position: 'relative',
                border: i === active ? '2px solid var(--pt-accent)' : '2px solid transparent',
                background: 'var(--pt-surface-soft)',
                cursor: 'pointer', padding: 0,
              }}>
              {m.type === 'video' ? (
                <div style={{
                  width: '100%', height: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--pt-surface-soft)',
                }}>
                  <Play size={18} style={{ color: 'var(--pt-accent)' }} />
                </div>
              ) : (
                <img src={cdnImage(m.url, 96)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen zoom modal — mobile/tap */}
      {zoomOpen && current?.type === 'image' && (
        <div
          onClick={() => setZoomOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <button
            onClick={() => setZoomOpen(false)}
            aria-label="إغلاق"
            style={{
              position: 'absolute', top: 16, insetInlineEnd: 16,
              width: 40, height: 40, borderRadius: '50%',
              background: 'rgba(255,255,255,0.12)', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', cursor: 'pointer',
            }}>
            <X size={20} />
          </button>
          <img
            src={cdnImage(current.url, 1920)}
            alt={alt}
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '94vw', maxHeight: '88vh', objectFit: 'contain',
              touchAction: 'pinch-zoom',
            }}
          />
        </div>
      )}
    </div>
  )
}
