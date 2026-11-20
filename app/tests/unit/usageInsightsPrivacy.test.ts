import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

// El tablero de uso mezcla tráfico por página de varias fuentes: es privado. Este guardia vive
// también en la suite del app (además de tests/insights/privacy.test.ts en la raíz) porque un push
// que sólo toca `app/pages/**` no corre la suite del backend.
const APP = join(__dirname, '..', '..')
const pagesDir = join(APP, 'pages')
const ROUTE = join(APP, 'server', 'api', 'usage-insights.get.ts')
const PAGE = join(pagesDir, 'estadisticas-de-uso.vue')
const MENTION = /UsageInsightSnapshot|usageinsightsnapshots|usageinsightdays/

function files(dir: string, ext: RegExp): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return files(full, ext)
    return ext.test(entry.name) ? [full] : []
  })
}

const rel = (base: string, full: string) => relative(base, full).split(sep).join('/')

describe('privacidad del tablero de uso', () => {
  it('sólo la página privada pide /api/usage-insights', () => {
    const pages = files(pagesDir, /\.vue$/)
      .filter(f => readFileSync(f, 'utf8').includes('/api/usage-insights'))
      .map(f => rel(pagesDir, f))
    expect(pages).toEqual(['estadisticas-de-uso.vue'])
  })

  it('la ruta exige admin antes de leer, no se cachea y nunca devuelve el estado del job', () => {
    const src = readFileSync(ROUTE, 'utf8')
    expect(src).toMatch(/await requireAdmin\(event\)[\s\S]*findOne/)
    expect(src).toMatch(/'private, no-store'/)
    expect(src).toMatch(/key: 'site'/)
    expect(src).toMatch(/state: 0/)
  })

  it('toda ruta o utilidad del servidor que nombra la colección exige admin', () => {
    const dirs = ['api', 'routes', 'utils', 'tasks'].map(d => join(APP, 'server', d))
    const offenders = dirs
      .flatMap(d => files(d, /\.ts$/))
      .filter(f => {
        const src = readFileSync(f, 'utf8')
        return MENTION.test(src) && !/await requireAdmin\(event\)/.test(src)
      })
      .map(f => rel(APP, f))
    expect(offenders).toEqual([])
  })

  it('la página es noindex, pide login y no lee el ingreso publicitario', () => {
    const src = readFileSync(PAGE, 'utf8')
    expect(src).toMatch(/noindex, nofollow/)
    expect(src).toMatch(/middleware: 'auth'/)
    expect(src).not.toMatch(/\/api\/site-revenue/)
  })
})
