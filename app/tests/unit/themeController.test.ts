import { computed, readonly, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { change, track } = vi.hoisted(() => ({ change: vi.fn(), track: vi.fn() }))
vi.mock('vuetify', () => ({ useTheme: () => ({ change }) }))

type ThemeHead = {
  htmlAttrs: { 'data-theme': string }
  meta: Array<{ name: string; content: string }>
}

async function controller(stored: string | null, osDark: boolean, blockedStorage = false) {
  const storage = {
    getItem: vi.fn(() => {
      if (blockedStorage) throw new Error('Storage unavailable')
      return stored
    }),
    setItem: vi.fn(),
  }
  const listeners: Array<(event: { matches: boolean }) => void> = []
  const mq = {
    matches: osDark,
    addEventListener: vi.fn((_event: string, listener: (event: { matches: boolean }) => void) => {
      listeners.push(listener)
    }),
  }
  const setAttribute = vi.fn()
  const heads: Array<() => ThemeHead> = []
  vi.stubGlobal('window', { localStorage: storage, matchMedia: () => mq })
  vi.stubGlobal('document', { documentElement: { setAttribute } })
  vi.stubGlobal('useHead', (head: () => ThemeHead) => heads.push(head))
  const { useThemeMode } = await import('../../composables/useThemeMode')
  const theme = useThemeMode()
  return {
    theme,
    storage,
    setAttribute,
    head: () => heads[0](),
    useThemeMode,
    mq,
    changeSystem: (dark: boolean) => listeners.forEach(listener => listener({ matches: dark })),
  }
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('computed', computed)
  vi.stubGlobal('readonly', readonly)
  vi.stubGlobal('useTrack', () => track)
})
afterEach(() => vi.unstubAllGlobals())

describe('theme initialization and saved preferences', () => {
  it('renders a light head before initialization and stays light on a dark OS without saving a choice', async () => {
    const c = await controller(null, true)
    expect(c.head().htmlAttrs['data-theme']).toBe('light')
    expect(c.head().meta).toContainEqual({ name: 'theme-color', content: '#f6f7f9' })
    c.theme.init()
    expect(c.theme.mode.value).toBe('light')
    expect(c.theme.applied.value).toBe('light')
    expect(change).toHaveBeenLastCalledWith('light')
    expect(c.storage.setItem).not.toHaveBeenCalled()
    expect(track).not.toHaveBeenCalled()
  })

  it('preserves an explicitly saved dark theme independently of the OS', async () => {
    const c = await controller('dark', false)
    c.theme.init()
    c.changeSystem(true)
    c.changeSystem(false)
    expect(c.theme.mode.value).toBe('dark')
    expect(c.theme.applied.value).toBe('dark')
    expect(change).toHaveBeenLastCalledWith('dark')
    expect(c.setAttribute).toHaveBeenLastCalledWith('data-theme', 'dark')
    expect(c.head().meta).toContainEqual({ name: 'theme-color', content: '#0a0e1a' })
    expect(c.storage.setItem).not.toHaveBeenCalled()
  })

  it('preserves an explicit system preference and follows subsequent OS changes', async () => {
    const c = await controller('system', true)
    c.theme.init()
    expect(c.theme.applied.value).toBe('dark')
    c.changeSystem(false)
    expect(c.theme.mode.value).toBe('system')
    expect(c.theme.applied.value).toBe('light')
    expect(change).toHaveBeenLastCalledWith('light')
    expect(c.head().htmlAttrs['data-theme']).toBe('light')
    c.changeSystem(true)
    expect(change).toHaveBeenLastCalledWith('dark')
    expect(c.storage.setItem).not.toHaveBeenCalled()
  })

  it('keeps a saved light preference when the OS changes to dark', async () => {
    const c = await controller('light', false)
    c.theme.init()
    c.changeSystem(true)
    expect(c.theme.mode.value).toBe('light')
    expect(c.theme.applied.value).toBe('light')
    expect(change).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['unrecognized', false],
    [null, true],
  ] as const)(
    'uses light when the stored preference is unusable (%s, blocked: %s)',
    async (stored, blocked) => {
      const c = await controller(stored, true, blocked)
      c.theme.init()
      expect(c.theme.applied.value).toBe('light')
      expect(change).toHaveBeenLastCalledWith('light')
    }
  )

  it('shares one OS listener and the explicit selection between header and drawer controls', async () => {
    const c = await controller(null, true)
    const second = c.useThemeMode()
    c.theme.init()
    second.init()
    expect(c.mq.addEventListener).toHaveBeenCalledTimes(1)
    second.cycle()
    expect(c.theme.mode.value).toBe('dark')
    expect(c.head().htmlAttrs['data-theme']).toBe('dark')
    expect(c.storage.setItem).toHaveBeenLastCalledWith('cu_theme', 'dark')
    expect(track).toHaveBeenLastCalledWith('theme_change', { mode: 'dark' })
    c.theme.cycle()
    expect(second.mode.value).toBe('system')
    c.changeSystem(false)
    expect(second.applied.value).toBe('light')
  })
})
