'use client'
import { useEffect } from 'react'
import { PixelProvider, usePixels } from '@/components/pixels/PixelProvider'

interface Props {
  metaPixelId?: string | null
  tiktokPixelId?: string | null
  product: { id: string; name: string; price: number }
}

function PixelEvents({ metaPixelId, tiktokPixelId, product }: Props) {
  const { trackViewContent } = usePixels({ metaPixelId, tiktokPixelId })

  useEffect(() => {
    trackViewContent(product.id, product.name, product.price)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id])

  return null
}

export default function ProductPagePixels({ metaPixelId, tiktokPixelId, product }: Props) {
  if (!metaPixelId && !tiktokPixelId) return null
  return (
    <PixelProvider metaPixelId={metaPixelId} tiktokPixelId={tiktokPixelId}>
      <PixelEvents metaPixelId={metaPixelId} tiktokPixelId={tiktokPixelId} product={product} />
    </PixelProvider>
  )
}

export { usePixels }
