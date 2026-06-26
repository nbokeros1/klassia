'use client'
import { useState, useEffect } from 'react'

export type Theme = 'dark' | 'light'

export function useTheme() {
  // Mode sombre désactivé temporairement — voir skill klassia-design.
  // Ne pas réactiver sans demande explicite.
  const [theme] = useState<Theme>('light')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light')
    /* Original behavior (disabled — dark mode off):
    const saved = localStorage.getItem('klassia-theme') as Theme
    const initial: Theme = saved || 'dark'
    setTheme(initial)
    document.documentElement.setAttribute('data-theme', initial)
    */
  }, [])

  const toggleTheme = () => {
    /* Disabled — dark mode temporarily off:
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('klassia-theme', next)
    document.documentElement.setAttribute('data-theme', next)
    */
  }

  const setThemeExplicit = (_t: Theme) => {
    /* Disabled — dark mode temporarily off:
    setTheme(t)
    localStorage.setItem('klassia-theme', t)
    document.documentElement.setAttribute('data-theme', t)
    */
  }

  return { theme, toggleTheme, setThemeExplicit }
}
