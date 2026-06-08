'use client'
import { useState, useEffect } from 'react'

export type Theme = 'dark' | 'light'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const saved = localStorage.getItem('klassia-theme') as Theme
    const initial: Theme = saved || 'dark'
    setTheme(initial)
    document.documentElement.setAttribute('data-theme', initial)
  }, [])

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('klassia-theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  const setThemeExplicit = (t: Theme) => {
    setTheme(t)
    localStorage.setItem('klassia-theme', t)
    document.documentElement.setAttribute('data-theme', t)
  }

  return { theme, toggleTheme, setThemeExplicit }
}
