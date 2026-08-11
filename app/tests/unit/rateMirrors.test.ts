import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  RATE_MIRRORS,
  isRateMirror,
  mirrorOf,
  mirrorSourcePath,
  publishesOwnStats,
} from '../../utils/rateMirrors'

const SCRAPERS = path.resolve(__dirname, '../../../classes/cambios')

describe('la lista de espejos', () => {
  it('resuelve por slug y es indiferente al caso', () => {
    expect(mirrorOf('cambio_romantico')?.source).toBe('brou')
    expect(mirrorOf('CAMBIO_ROMANTICO')?.source).toBe('brou')
    expect(mirrorOf('  cambio_federal  ')?.source).toBe('brou')
  })

  it('las casas con pizarra propia no son espejos', () => {
    for (const o of ['brou', 'itau', 'prex', 'gales', 'cambio_principal', 'bcu']) {
      expect(mirrorOf(o)).toBeUndefined()
      expect(isRateMirror(o)).toBe(false)
      expect(publishesOwnStats(o)).toBe(true)
    }
  })

  it('no rompe con entradas vacías', () => {
    expect(mirrorOf(undefined)).toBeUndefined()
    expect(mirrorOf(null)).toBeUndefined()
    expect(mirrorOf('')).toBeUndefined()
    expect(publishesOwnStats(undefined)).toBe(true)
  })

  // La regla que este módulo existe para hacer cumplir.
  it('un espejo no publica estadísticas propias', () => {
    for (const m of RATE_MIRRORS) {
      expect(publishesOwnStats(m.origin)).toBe(false)
      expect(mirrorSourcePath(m)).toBe(`/casa/${m.source}`)
    }
  })

  it('ningún espejo se apunta a sí mismo ni encadena', () => {
    const origins = new Set(RATE_MIRRORS.map(m => m.origin))
    for (const m of RATE_MIRRORS) {
      expect(m.source).not.toBe(m.origin)
      // Si la fuente fuera a su vez un espejo, el aviso mandaría al lector a otra copia.
      expect(origins.has(m.source)).toBe(false)
    }
  })
})

// El riesgo real no es que la lista esté mal hoy: es que alguien agregue un scraper espejo nuevo
// y esta lista no se entere, y volvamos a publicar cuatro páginas con los mismos récords.
describe('la lista está sincronizada con los scrapers reales', () => {
  const files = fs.existsSync(SCRAPERS)
    ? fs.readdirSync(SCRAPERS).filter(f => f.endsWith('.ts'))
    : []

  it('encuentra el directorio de scrapers', () => {
    expect(files.length).toBeGreaterThan(20)
  })

  it('todo scraper que lee las filas de otro origen está declarado como espejo', () => {
    const declared = new Set(RATE_MIRRORS.map(m => m.origin))
    const found: string[] = []
    for (const f of files) {
      const src = fs.readFileSync(path.join(SCRAPERS, f), 'utf8')
      // El patrón del espejo: pedirle a la base las filas de OTRO origen en vez de scrapear.
      if (/allEntries\(\s*\{\s*origin:\s*["'][a-z_]+["']/.test(src))
        found.push(f.replace(/\.ts$/, ''))
    }
    for (const origin of found) {
      expect(
        declared.has(origin),
        `${origin} lee las filas de otro origen pero no está en RATE_MIRRORS: sus récords van a salir idénticos a los de la fuente`
      ).toBe(true)
    }
  })

  it('cada espejo declarado existe como scraper y apunta al origen que realmente lee', () => {
    for (const m of RATE_MIRRORS) {
      const file = path.join(SCRAPERS, `${m.origin}.ts`)
      expect(fs.existsSync(file), `falta el scraper ${m.origin}.ts`).toBe(true)
      const src = fs.readFileSync(file, 'utf8')
      expect(src).toMatch(new RegExp(`origin:\\s*["']${m.source}["']`))
      for (const ex of m.excludes ?? []) expect(src).toContain(ex)
    }
  })
})
