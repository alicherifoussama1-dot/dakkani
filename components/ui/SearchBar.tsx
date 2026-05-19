'use client'
import { useState, useRef } from 'react'
import { Search, X } from 'lucide-react'

interface SearchBarProps {
  placeholder?: string
  onSearch?:    (q: string) => void
  onClear?:     () => void
  defaultValue?: string
  className?:   string
}

export default function SearchBar({
  placeholder  = 'ابحث عن منتجاتك...',
  onSearch,
  onClear,
  defaultValue = '',
  className    = '',
}: SearchBarProps) {
  const [value,   setValue]   = useState(defaultValue)
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClear = () => {
    setValue('')
    onClear?.()
    inputRef.current?.focus()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (value.trim()) onSearch?.(value.trim())
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`relative flex items-center ${className}`}
      role="search"
      dir="rtl"
    >
      {/* Search icon (right side in RTL) */}
      <div
        className="absolute right-4 pointer-events-none flex items-center"
        aria-hidden="true"
      >
        <Search
          size={18}
          style={{ color: focused ? '#E8431A' : '#999999', transition: 'color 200ms ease' }}
        />
      </div>

      {/* Input */}
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={e => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        dir="rtl"
        className="w-full h-12 rounded-full pr-11 pl-11 text-sm outline-none transition-all"
        style={{
          backgroundColor: '#F3F3F3',
          border: focused ? '2px solid #E8431A' : '2px solid transparent',
          color: '#111111',
          fontFamily: 'var(--font-tajawal)',
          boxShadow: focused ? '0 0 0 3px rgba(232,67,26,0.10)' : 'none',
        }}
        aria-label="البحث عن منتجات"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />

      {/* Clear button */}
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute left-3 flex items-center justify-center w-7 h-7 rounded-full transition-colors"
          style={{ backgroundColor: '#EBEBEB' }}
          aria-label="مسح البحث"
        >
          <X size={13} style={{ color: '#999999' }} />
        </button>
      )}

      {/* Hidden submit */}
      <button type="submit" className="sr-only">بحث</button>
    </form>
  )
}
