'use client'
import { useState, useEffect } from 'react'

interface ScrollPosition {
  y: number
  scrollPercent: number
  isScrolled: boolean    // true when scrolled past threshold
  isAtTop: boolean       // true when at very top
  direction: 'up' | 'down' | 'none'
}

/**
 * Tracks scroll position for navbar transparency and scroll progress.
 * @param threshold - pixels scrolled before isScrolled becomes true (default: 80)
 */
export function useScrollPosition(threshold = 80): ScrollPosition {
  const [scroll, setScroll] = useState<ScrollPosition>({
    y: 0,
    scrollPercent: 0,
    isScrolled: false,
    isAtTop: true,
    direction: 'none',
  })

  useEffect(() => {
    let lastY = 0
    let ticking = false

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const y = window.scrollY
          const docHeight = document.documentElement.scrollHeight - window.innerHeight
          const scrollPercent = docHeight > 0 ? Math.round((y / docHeight) * 100) : 0

          setScroll({
            y,
            scrollPercent,
            isScrolled: y > threshold,
            isAtTop: y < 10,
            direction: y > lastY ? 'down' : y < lastY ? 'up' : 'none',
          })

          lastY = y
          ticking = false
        })
        ticking = true
      }
    }

    // Set initial value
    handleScroll()

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [threshold])

  return scroll
}
