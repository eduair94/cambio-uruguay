import { useTheme } from 'vuetify'
import {
  normalizeMode,
  nextMode,
  resolveTheme,
  THEME_STORAGE_KEY,
  type AppliedTheme,
  type ThemeMode,
} from '~/utils/theme'

// Shared singleton state so the app-bar toggle and the drawer toggle stay in
// sync and a single matchMedia listener drives system-theme changes.
const mode = ref<ThemeMode>('system')
const systemDark = ref(true) // SSR-safe default (matches the dark default theme)
let initialized = false

/**
 * Dark/light theme controller backed by Vuetify's theme + localStorage.
 *
 * `init()` runs on the client after hydration (so the SSR markup keeps the dark
 * default and there is no hydration mismatch), reads the persisted preference,
 * applies it and starts following `prefers-color-scheme` while on `system`.
 */
export function useThemeMode() {
  const theme = useTheme()
  const track = useTrack()

  const applied = computed<AppliedTheme>(() => resolveTheme(mode.value, systemDark.value))

  function apply() {
    if (!import.meta.client) return
    theme.global.name.value = applied.value
    // Mirror the applied theme onto <html> so global CSS (body background,
    // app-bar) that lives outside Vuetify's theme class can react to it.
    document.documentElement.setAttribute('data-theme', applied.value)
  }

  function setMode(next: ThemeMode) {
    mode.value = next
    if (import.meta.client) {
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next)
      } catch {
        /* private mode / quota — preference just won't persist */
      }
      // GA4: do light/dark visitors differ? Cheap signal of toggle usage.
      track('theme_change', { mode: next })
    }
    apply()
  }

  function cycle() {
    setMode(nextMode(mode.value))
  }

  function init() {
    if (initialized || !import.meta.client) return
    initialized = true
    try {
      mode.value = normalizeMode(window.localStorage.getItem(THEME_STORAGE_KEY))
    } catch {
      /* storage blocked — fall back to system */
    }
    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      systemDark.value = mq.matches
      mq.addEventListener('change', e => {
        systemDark.value = e.matches
        if (mode.value === 'system') apply()
      })
    }
    apply()
  }

  return { mode: readonly(mode), applied, setMode, cycle, init }
}
