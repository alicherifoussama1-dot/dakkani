'use client'

import React from 'react'

interface State { hasError: boolean }

export class Hero3DErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}
