'use client'
import { useScrollPosition } from '@/hooks/useScrollPosition'

export default function ScrollProgress() {
  const { scrollPercent } = useScrollPosition()

  return (
    <div
      role="progressbar"
      aria-label="تقدم القراءة"
      aria-valuenow={scrollPercent}
      aria-valuemin={0}
      aria-valuemax={100}
      className="fixed top-0 right-0 z-[9999] h-[3px] w-full pointer-events-none"
      style={{ background: 'transparent' }}
    >
      <div
        className="h-full transition-[width] duration-100 ease-out"
        style={{
          width: `${scrollPercent}%`,
          backgroundColor: '#0D6EFD',
          boxShadow: '0 0 8px rgba(13,110,253,0.4)',
        }}
      />
    </div>
  )
}
