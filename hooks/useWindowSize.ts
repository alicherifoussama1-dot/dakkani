'use client'
import { useState, useEffect } from 'react'

interface WindowSize {
  width:     number
  height:    number
  isMobile:  boolean   // < 768px
  isTablet:  boolean   // 768–1023px
  isDesktop: boolean   // >= 1024px
  isTouch:   boolean   // touch device
  breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

const BREAKPOINTS = {
  xs:  375,
  sm:  390,
  md:  768,
  lg:  1024,
  xl:  1280,
  '2xl': 1440,
}

function getBreakpoint(w: number): WindowSize['breakpoint'] {
  if (w >= BREAKPOINTS['2xl']) return '2xl'
  if (w >= BREAKPOINTS.xl)    return 'xl'
  if (w >= BREAKPOINTS.lg)    return 'lg'
  if (w >= BREAKPOINTS.md)    return 'md'
  if (w >= BREAKPOINTS.sm)    return 'sm'
  return 'xs'
}

export function useWindowSize(): WindowSize {
  const [size, setSize] = useState<WindowSize>({
    width:     375,
    height:    812,
    isMobile:  true,
    isTablet:  false,
    isDesktop: false,
    isTouch:   true,
    breakpoint: 'xs',
  })

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      setSize({
        width:     w,
        height:    h,
        isMobile:  w < 768,
        isTablet:  w >= 768 && w < 1024,
        isDesktop: w >= 1024,
        isTouch:   'ontouchstart' in window || navigator.maxTouchPoints > 0,
        breakpoint: getBreakpoint(w),
      })
    }

    update()

    const observer = new ResizeObserver(update)
    observer.observe(document.documentElement)
    return () => observer.disconnect()
  }, [])

  return size
}
