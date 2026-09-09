import {
  generateRobotsTxt,
  matchPathToRule,
  normalizeGroup,
  parseRobotsTxt,
} from '@nuxtjs/robots/util'
import { beforeAll, describe, expect, it, vi } from 'vitest'

let robots: ReturnType<typeof parseRobotsTxt>

beforeAll(async () => {
  vi.stubGlobal('defineNuxtConfig', (config: unknown) => config)
  try {
    const { default: config } = await import('../../nuxt.config')
    // Exercise the installed module's serializer and matcher, including the
    // explicit crawler groups, which do not inherit the wildcard group's rules.
    robots = parseRobotsTxt(
      generateRobotsTxt({
        groups: [
          normalizeGroup({ allow: config.robots.allow, disallow: config.robots.disallow }),
          ...config.robots.groups.map(normalizeGroup),
        ],
        sitemaps: [config.robots.sitemap],
      })
    )
    robots.groups = robots.groups.map(normalizeGroup)
  } finally {
    vi.unstubAllGlobals()
  }
})

describe('crawler access to the rendered site', () => {
  it.each([
    '/_nuxt/entry.synthetic.js',
    '/_nuxt/style.synthetic.css',
    '/_nuxt/font.synthetic.woff2',
  ])('allows the public render dependency %s in every crawler group', path => {
    expect(robots.errors).toEqual([])
    expect(robots.groups.some(group => group.userAgent.includes('*'))).toBe(true)
    expect(robots.groups.some(group => group.userAgent.includes('Bingbot'))).toBe(true)
    for (const group of robots.groups) {
      expect(
        matchPathToRule(path, group._rules)?.allow ?? true,
        `${group.userAgent.join(', ')} must be able to render ${path}`
      ).toBe(true)
    }
  })

  it('retains the existing admin and server exclusions', () => {
    for (const group of robots.groups) {
      for (const path of ['/admin/settings', '/server/private']) {
        expect(matchPathToRule(path, group._rules)?.allow).toBe(false)
      }
    }
    const defaults = robots.groups.find(group => group.userAgent.includes('*'))!
    expect(matchPathToRule('/estadisticas-de-busqueda', defaults._rules)?.allow).toBe(false)
  })
})
