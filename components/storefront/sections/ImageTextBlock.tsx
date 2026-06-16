import Image from 'next/image'
import Link from 'next/link'

interface Props {
  title?: string
  body?: string
  image_url?: string
  reverse?: boolean
  cta_label?: string
  cta_href?: string
}

// Image + text block — theme-aware, RTL, mobile-first (stacks on mobile).
export default function ImageTextBlock({ title, body, image_url, reverse, cta_label, cta_href }: Props) {
  if (!title && !body && !image_url) return null
  return (
    <section className="max-w-6xl mx-auto px-4 py-10 md:py-14">
      <div className={`grid gap-6 md:gap-10 items-center md:grid-cols-2 ${reverse ? 'md:[direction:ltr]' : ''}`}>
        {image_url && (
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden" style={{ background: 'var(--pt-surface-soft,#F2F2F2)' }}>
            <Image src={image_url} alt={title ?? ''} fill sizes="(max-width:768px) 100vw, 50vw" className="object-cover" />
          </div>
        )}
        <div className={reverse ? 'md:[direction:rtl]' : ''}>
          {title && (
            <h2 className="text-2xl md:text-3xl mb-3"
              style={{ color: 'var(--pt-text,#0F172A)', fontFamily: 'var(--pt-font-heading)', fontWeight: 'var(--pt-heading-weight,800)' as any }}>
              {title}
            </h2>
          )}
          {body && <p className="text-base leading-8" style={{ color: 'var(--pt-text-soft,#475569)' }}>{body}</p>}
          {cta_label && cta_href && (
            <Link href={cta_href} className="inline-flex items-center mt-5 px-6 h-11 rounded-[var(--pt-btn-radius,12px)] font-bold"
              style={{ background: 'var(--pt-btn-primary-bg,#0D6EFD)', color: 'var(--pt-btn-primary-text,#fff)' }}>
              {cta_label}
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
