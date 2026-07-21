'use client'

import { useSearchParams, useRouter } from 'next/navigation'

interface Props {
  defaultValue: string
}

export default function SortSelect({ defaultValue }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const onChange = (value: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    params.set('sort', value)
    router.push(`?${params.toString()}`)
  }

  return (
    <select
      name="sort"
      value={defaultValue}
      onChange={e => onChange(e.target.value)}
      className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-primary/30 outline-none font-medium"
    >
      <option value="newest">الأحدث</option>
      <option value="price_asc">السعر: الأقل</option>
      <option value="price_desc">السعر: الأعلى</option>
    </select>
  )
}
