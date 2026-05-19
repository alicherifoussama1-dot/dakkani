export default function SkeletonCard() {
  return (
    <div
      className="rounded-2xl overflow-hidden border"
      style={{ backgroundColor: '#FFFFFF', borderColor: '#EBEBEB' }}
      aria-hidden="true"
      role="status"
    >
      {/* Image skeleton */}
      <div className="skeleton aspect-square" />

      {/* Content skeleton */}
      <div className="p-3.5 space-y-2.5">
        <div className="skeleton h-3.5 rounded-full w-4/5" />
        <div className="skeleton h-3 rounded-full w-3/5" />
        <div className="skeleton h-3 rounded-full w-1/3 mt-1" />
        <div className="skeleton h-4 rounded-full w-2/5" />
        <div className="skeleton h-9 rounded-xl mt-1" />
      </div>
    </div>
  )
}

export function SkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 md:grid-cols-4 gap-4"
      aria-label="جارٍ التحميل..."
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}
