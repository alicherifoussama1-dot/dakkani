interface PriceTagProps {
  price:          number
  originalPrice?: number
  size?:          'sm' | 'md' | 'lg'
}

const SIZES = {
  sm: { price: '14px', original: '11px' },
  md: { price: '18px', original: '13px' },
  lg: { price: '24px', original: '15px' },
}

export default function PriceTag({ price, originalPrice, size = 'md' }: PriceTagProps) {
  const s = SIZES[size]

  return (
    <div className="flex items-end gap-1.5">
      <span
        className="font-black leading-none"
        style={{
          fontSize: s.price,
          color: '#0D6EFD',
          fontFamily: 'var(--font-inter)',
        }}
      >
        {price.toLocaleString('ar-DZ')} دج
      </span>
      {originalPrice && originalPrice > price && (
        <span
          className="line-through leading-none"
          style={{
            fontSize: s.original,
            color: '#CCCCCC',
            fontFamily: 'var(--font-inter)',
            paddingBottom: '2px',
          }}
        >
          {originalPrice.toLocaleString('ar-DZ')} دج
        </span>
      )}
    </div>
  )
}
