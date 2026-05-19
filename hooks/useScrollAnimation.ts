'use client'
import { useEffect, useRef, useCallback } from 'react'

interface UseScrollAnimationOptions {
  threshold?: number
  rootMargin?: string
  staggerDelay?: number // ms between each child animation
}

/**
 * Intersection Observer based scroll animation hook.
 * Elements start at opacity:0 + translateY(24px)
 * and animate to opacity:1 + translateY(0) when in view.
 */
export function useScrollAnimation(options: UseScrollAnimationOptions = {}) {
  const {
    threshold   = 0.1,
    rootMargin  = '-60px',
    staggerDelay = 80,
  } = options

  const ref = useRef<HTMLElement | null>(null)

  const setRef = useCallback((node: HTMLElement | null) => {
    ref.current = node
  }, [])

  useEffect(() => {
    // Respect prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (ref.current) {
        ref.current.style.opacity = '1'
        ref.current.style.transform = 'none'
      }
      return
    }

    const el = ref.current
    if (!el) return

    // Set initial state
    el.style.opacity = '0'
    el.style.transform = 'translateY(24px)'
    el.style.transition = 'opacity 0.5s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.16,1,0.3,1)'

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement
            target.style.opacity = '1'
            target.style.transform = 'translateY(0)'
            observer.unobserve(target) // animate once
          }
        })
      },
      { threshold, rootMargin }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, rootMargin])

  return setRef
}

/**
 * Stagger animation for grid children.
 * Each child gets a delayed fade-up animation.
 */
export function useStaggerAnimation(options: UseScrollAnimationOptions = {}) {
  const {
    threshold    = 0.05,
    rootMargin   = '-40px',
    staggerDelay = 80,
  } = options

  const containerRef = useRef<HTMLElement | null>(null)

  const setRef = useCallback((node: HTMLElement | null) => {
    containerRef.current = node
  }, [])

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const container = containerRef.current
    if (!container) return

    const children = Array.from(container.children) as HTMLElement[]

    if (reducedMotion) {
      children.forEach(child => {
        child.style.opacity = '1'
        child.style.transform = 'none'
      })
      return
    }

    // Set initial state for all children
    children.forEach((child, i) => {
      child.style.opacity = '0'
      child.style.transform = 'translateY(24px)'
      child.style.transition = `opacity 0.5s cubic-bezier(0.16,1,0.3,1) ${i * staggerDelay}ms, transform 0.5s cubic-bezier(0.16,1,0.3,1) ${i * staggerDelay}ms`
    })

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement
            const kids   = Array.from(target.children) as HTMLElement[]
            kids.forEach(child => {
              child.style.opacity = '1'
              child.style.transform = 'translateY(0)'
            })
            observer.unobserve(target)
          }
        })
      },
      { threshold, rootMargin }
    )

    observer.observe(container)
    return () => observer.disconnect()
  }, [threshold, rootMargin, staggerDelay])

  return setRef
}
