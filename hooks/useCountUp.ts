'use client'
import { useState, useEffect, useRef } from 'react'

interface UseCountUpOptions {
  start?:     number
  end:        number
  duration?:  number  // ms
  prefix?:    string
  suffix?:    string
  separator?: string
  decimals?:  number
}

/**
 * Animated count-up hook that triggers when element scrolls into view.
 * Returns { count, ref } — attach ref to the element to watch.
 */
export function useCountUp({
  start     = 0,
  end,
  duration  = 1800,
  prefix    = '',
  suffix    = '',
  separator = ',',
  decimals  = 0,
}: UseCountUpOptions) {
  const [count, setCount] = useState(start)
  const [started, setStarted] = useState(false)
  const ref = useRef<HTMLElement | null>(null)

  // Intersection observer to trigger when visible
  useEffect(() => {
    if (!ref.current) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) {
      setCount(end)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !started) {
            setStarted(true)
            observer.disconnect()
          }
        })
      },
      { threshold: 0.3 }
    )

    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [started, end])

  // Count-up animation
  useEffect(() => {
    if (!started) return

    let startTime: number | null = null
    const startVal = start
    const endVal   = end

    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const elapsed  = timestamp - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased    = easeOut(progress)
      const current  = startVal + (endVal - startVal) * eased

      setCount(parseFloat(current.toFixed(decimals)))

      if (progress < 1) {
        requestAnimationFrame(step)
      } else {
        setCount(end)
      }
    }

    requestAnimationFrame(step)
  }, [started, start, end, duration, decimals])

  // Format the number
  const formatted = count.toLocaleString('ar-DZ', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  return {
    count,
    formatted: `${prefix}${formatted}${suffix}`,
    ref: (node: HTMLElement | null) => { ref.current = node },
  }
}
