import Image from 'next/image'

interface Props { title?: string; images?: string[] }

// Lifestyle image gallery — responsive masonry-ish grid, theme-aware.
export default function GalleryBlock({ title, images }: Props) {
  const imgs = (images ?? []).filter(Boolean)
  if (imgs.length === 0) return null
  return (
    <section className="max-w-6xl mx-auto px-4 py-10 md:py-14">
      {title && (
        <h2 className="text-2xl md:text-3xl mb-6 text-center"
          style={{ color: 'var(--pt-text,#0F172A)', fontFamily: 'var(--pt-font-heading)', fontWeight: 'var(--pt-heading-weight,800)' as any }}>
          {title}
        </h2>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {imgs.slice(0, 6).map((src, i) => (
          <div key={i} className={`relative overflow-hidden rounded-2xl ${i === 0 ? 'col-span-2 row-span-2 aspect-square' : 'aspect-square'}`}
            style={{ background: 'var(--pt-surface-soft,#F2F2F2)' }}>
            <Image src={src} alt="" fill sizes="(max-width:768px) 50vw, 33vw" className="object-cover hover:scale-105 transition-transform duration-500" />
          </div>
        ))}
      </div>
    </section>
  )
}
