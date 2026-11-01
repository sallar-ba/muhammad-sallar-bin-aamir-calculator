import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

const STORAGE_KEY = 'theme'
const PAGE_COLOUR: Record<Theme, string> = { light: '#f3f4f8', dark: '#121214' }

/** The theme the user picked, if any. Storage can be unavailable (private mode), so failures mean "none". */
function savedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

/**
 * Light/dark switch. index.html applies the saved theme, or the system one, before the first
 * paint; until the user picks, the page keeps following the system setting.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'))

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', PAGE_COLOUR[theme])
  }, [theme])

  useEffect(() => {
    const system = matchMedia('(prefers-color-scheme: dark)')
    const follow = () => {
      if (!savedTheme()) setTheme(system.matches ? 'dark' : 'light')
    }
    system.addEventListener('change', follow)
    return () => system.removeEventListener('change', follow)
  }, [])

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Not saved, but the switch still works for this visit.
    }
  }

  const dark = theme === 'dark'
  return (
    <button
      type="button"
      aria-label="Dark theme"
      aria-pressed={dark}
      title={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={toggle}
      className="grid size-11 place-items-center rounded-xl text-muted transition-colors hover:bg-field hover:text-ink"
    >
      <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        {dark ? (
          <>
            <circle cx="10" cy="10" r="3.5" />
            <path d="M10 2v1.5M10 16.5V18M2 10h1.5M16.5 10H18M4.3 4.3l1.1 1.1M14.6 14.6l1.1 1.1M4.3 15.7l1.1-1.1M14.6 5.4l1.1-1.1" />
          </>
        ) : (
          <path d="M16.5 12.3A7 7 0 0 1 7.7 3.5a7 7 0 1 0 8.8 8.8Z" strokeLinejoin="round" />
        )}
      </svg>
    </button>
  )
}
