/**
 * useTheme
 *
 * Manages light / dark / system theme preference.
 * Persists to localStorage and applies the `dark` class to <html>.
 */

import { useEffect, useState } from 'react'

const KEY = 'gridflow_theme'

function applyTheme(preference) {
  const isDark =
    preference === 'dark' ||
    (preference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', isDark)
}

/** Call once before React renders to avoid flash of wrong theme. */
export function initTheme() {
  const pref = localStorage.getItem(KEY) ?? 'system'
  applyTheme(pref)
}

export function useTheme() {
  const [theme, setThemeState] = useState(
    () => localStorage.getItem(KEY) ?? 'system'
  )

  // Apply whenever preference changes
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // Re-apply when OS preference changes (only relevant when set to 'system')
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  function setTheme(pref) {
    localStorage.setItem(KEY, pref)
    setThemeState(pref)
  }

  return { theme, setTheme }
}
