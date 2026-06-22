import { describe, expect, it } from 'vitest'
import { normalizeMode, nextMode, resolveTheme } from '../../utils/theme'

describe('normalizeMode', () => {
  it('passes through valid modes', () => {
    expect(normalizeMode('light')).toBe('light')
    expect(normalizeMode('dark')).toBe('dark')
    expect(normalizeMode('system')).toBe('system')
  })
  it('falls back to system for anything else', () => {
    expect(normalizeMode(null)).toBe('system')
    expect(normalizeMode('purple')).toBe('system')
    expect(normalizeMode(undefined)).toBe('system')
  })
})

describe('resolveTheme', () => {
  it('returns the explicit mode when not system', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })
  it('follows the OS preference when on system', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })
})

describe('nextMode', () => {
  it('cycles system -> light -> dark -> system', () => {
    expect(nextMode('system')).toBe('light')
    expect(nextMode('light')).toBe('dark')
    expect(nextMode('dark')).toBe('system')
  })
})
