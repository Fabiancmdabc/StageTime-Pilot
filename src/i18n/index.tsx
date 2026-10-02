import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { LOCALE_STORAGE_KEY, type UiLocale } from '../types'
import { catalogs, type MessageKey } from './messages'

type Vars = Record<string, string | number>

interface LocaleContextValue {
  locale: UiLocale
  setLocale: (locale: UiLocale) => void
  t: (key: MessageKey, vars?: Vars) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

function detectLocale(): UiLocale {
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (raw === 'en' || raw === 'de') return raw
  } catch {
    /* ignore */
  }
  try {
    const nav = navigator.language?.toLowerCase() ?? 'de'
    return nav.startsWith('en') ? 'en' : 'de'
  } catch {
    return 'de'
  }
}

function format(template: string, vars?: Vars): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] !== undefined ? String(vars[key]) : `{${key}}`,
  )
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<UiLocale>(() => detectLocale())

  const setLocale = useCallback((next: UiLocale) => {
    setLocaleState(next)
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const t = useCallback(
    (key: MessageKey, vars?: Vars) => format(catalogs[locale][key] ?? catalogs.de[key], vars),
    [locale],
  )

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider')
  return ctx
}

export function useT() {
  return useLocale().t
}
