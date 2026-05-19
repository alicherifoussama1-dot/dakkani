'use client'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

interface AnimationContextValue {
  reducedMotion: boolean
  prefersReducedMotion: boolean
}

const AnimationContext = createContext<AnimationContextValue>({
  reducedMotion: false,
  prefersReducedMotion: false,
})

export function useAnimation() {
  return useContext(AnimationContext)
}

/**
 * AnimationProvider — detects prefers-reduced-motion and provides
 * context to all child components. Also adds/removes the
 * reduce-motion CSS class on <html> for CSS-based animations.
 */
export default function AnimationProvider({ children }: { children: ReactNode }) {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = (e: MediaQueryListEvent | MediaQueryList) => {
      setReducedMotion(e.matches)
      if (e.matches) {
        document.documentElement.classList.add('reduce-motion')
      } else {
        document.documentElement.classList.remove('reduce-motion')
      }
    }

    // Initial check
    update(mq)

    // Listen for changes
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return (
    <AnimationContext.Provider value={{ reducedMotion, prefersReducedMotion: reducedMotion }}>
      {children}
    </AnimationContext.Provider>
  )
}
