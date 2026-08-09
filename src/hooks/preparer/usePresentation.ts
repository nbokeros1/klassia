'use client'

// STUB — Mode présentation plein écran. Sprint 3.

import type { BlocPedagogique } from '@/lib/types/workspace'

export interface UsePresentationReturn {
  isActive:     boolean
  currentIndex: number
  blocs:        BlocPedagogique[]
  showNotes:    boolean
  enter:        () => void
  exit:         () => void
  next:         () => void
  prev:         () => void
  toggleNotes:  () => void
}

export function usePresentation(): UsePresentationReturn {
  // STUB
  return {
    isActive:     false,
    currentIndex: 0,
    blocs:        [],
    showNotes:    false,
    enter:        () => {},
    exit:         () => {},
    next:         () => {},
    prev:         () => {},
    toggleNotes:  () => {},
  }
}
