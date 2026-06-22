// Pure theme-mode helpers shared by the theme composable + its tests.
//
// The site ships a `dark` and a `light` Vuetify theme. A user can pin one or
// stay on `system` (follow `prefers-color-scheme`). These helpers are pure (no
// Vue/Nuxt/DOM) so the resolution logic is unit-testable; the composable
// (`composables/useThemeMode.ts`) wires them to Vuetify + localStorage.

/** Theme preference: a pinned theme, or `system` to follow the OS. */
export type ThemeMode = 'light' | 'dark' | 'system'

/** A concrete Vuetify theme name. */
export type AppliedTheme = 'light' | 'dark'

/** localStorage key holding the persisted preference. */
export const THEME_STORAGE_KEY = 'cu_theme'

/** Coerce arbitrary stored input into a valid mode, defaulting to `system`. */
export function normalizeMode(raw: unknown): ThemeMode {
  return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system'
}

/** Resolve the concrete theme to apply from a mode + the current OS preference. */
export function resolveTheme(mode: ThemeMode, systemPrefersDark: boolean): AppliedTheme {
  if (mode === 'system') return systemPrefersDark ? 'dark' : 'light'
  return mode
}

/** Cycle order for the toggle button: system → light → dark → system. */
export function nextMode(mode: ThemeMode): ThemeMode {
  if (mode === 'system') return 'light'
  if (mode === 'light') return 'dark'
  return 'system'
}
