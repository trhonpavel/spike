import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'spike_theme'
type Theme = 'dark' | 'light'

function getInitial(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch { /* no storage */ }
  return 'dark'
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'light') {
    root.classList.add('light')
  } else {
    root.classList.remove('light')
  }
  // Update theme-color meta for browser chrome
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme === 'light' ? '#f0f0f3' : '#000000')
}

// Apply on load before React hydrates (prevents flash)
applyTheme(getInitial())

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getInitial)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      try { localStorage.setItem(STORAGE_KEY, next) } catch { /* */ }
      return next
    })
  }, [])

  return { theme, toggle } as const
}
