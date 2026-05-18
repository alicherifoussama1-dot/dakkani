'use client'
// ============================================================
// Animation components — CSS-first, framer-motion only for
// JS-critical interactions (drag, spring, presence)
// ============================================================
import {
  motion, AnimatePresence, useInView, type Variants,
} from 'framer-motion'
import { useRef, type ReactNode, type CSSProperties } from 'react'

const ease = [0.22, 1, 0.36, 1] as const

export const fadeUpVariants: Variants = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease } },
}
export const staggerVariants: Variants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.08 } },
}

// ── FadeUp on scroll (framer-motion) ─────────────────────
export function FadeUp({ children, delay = 0, className = '' }: {
  children: ReactNode; delay?: number; className?: string
}) {
  const ref    = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={fadeUpVariants}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ── Stagger (framer-motion) ───────────────────────────────
export function StaggerContainer({ children, className = '' }: {
  children: ReactNode; className?: string
}) {
  const ref    = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      variants={staggerVariants}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className = '' }: {
  children: ReactNode; className?: string
}) {
  return (
    <motion.div variants={fadeUpVariants} className={className}>
      {children}
    </motion.div>
  )
}

// ── Hover card — pure CSS fallback ───────────────────────
export function HoverCard({ children, className = '' }: {
  children: ReactNode; className?: string
}) {
  return (
    <div className={`transition-transform duration-300 hover:-translate-y-1 ${className}`}>
      {children}
    </div>
  )
}

// ── Page transition — CSS only ───────────────────────────
export function PageTransition({ children, className = '' }: {
  children: ReactNode; className?: string
}) {
  return <div className={`page-enter ${className}`}>{children}</div>
}

// ── Bounce button — CSS active scale ────────────────────
export function BounceButton({ children, className = '', onClick, disabled, type = 'button' }: {
  children: ReactNode; className?: string
  onClick?: () => void; disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`active:scale-95 hover:scale-[1.02] transition-transform duration-150 ${className}`}
    >
      {children}
    </button>
  )
}

// ── Skeleton card ─────────────────────────────────────────
export function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden bg-white shadow-card">
      <div className="skeleton aspect-[4/3]" />
      <div className="p-4 space-y-2">
        <div className="skeleton h-4 rounded-full w-3/4" />
        <div className="skeleton h-4 rounded-full w-1/2" />
        <div className="skeleton h-6 rounded-full w-1/3 mt-3" />
      </div>
    </div>
  )
}

// ── Reveal text — CSS animation ───────────────────────────
export function RevealText({ text, className = '' }: {
  text: string; className?: string
}) {
  return <span className={className}>{text}</span>
}

// Re-export motion primitives for direct use
export { motion, AnimatePresence, useInView }
