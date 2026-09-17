// Toda capa de tiles tiene que pedir su propia política de Referer.
//
// nuxt.config.ts declara `<meta name="referrer" content="no-referrer">` para
// todo el sitio. Un tile sin `referrerPolicy` sale sin Referer y OpenStreetMap
// contesta con la imagen "403 Access blocked" en cada casilla: el mapa se ve
// entero, cubierto de carteles, y ninguna prueba se entera (visto en
// /descuentos-con-tarjeta-uruguay el 2026-09-16). Ver utils/mapTiles.ts.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = join(__dirname, '..', '..')

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(?:vue|ts)$/.test(full)) out.push(full)
  }
  return out
}

const files = ['pages', 'components', 'composables', 'utils', 'layouts'].flatMap(dir =>
  walk(join(ROOT, dir))
)

function lineOf(source: string, index: number): number {
  return source.slice(0, index).split('\n').length
}

describe('capas de tiles con Referer', () => {
  it('encuentra archivos (guarda de vacuidad)', () => {
    expect(files.length).toBeGreaterThan(100)
  })

  it('encuentra las capas de tiles que conocemos', () => {
    const layers = files.filter(file =>
      /tileLayer\(|<LTileLayer\b/.test(readFileSync(file, 'utf8'))
    )
    expect(layers.length).toBeGreaterThanOrEqual(4)
  })

  it('cada L.tileLayer(...) y <LTileLayer> declara referrerPolicy', () => {
    const offenders: string[] = []
    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      for (const match of source.matchAll(/tileLayer\(/g)) {
        const end = source.indexOf('addTo(', match.index)
        const call = source.slice(match.index, end === -1 ? match.index + 600 : end)
        if (!call.includes('referrerPolicy'))
          offenders.push(`${relative(ROOT, file)}:${lineOf(source, match.index!)}`)
      }
      for (const match of source.matchAll(/<LTileLayer\b[\s\S]*?\/?>/g)) {
        if (!match[0].includes('referrerPolicy'))
          offenders.push(`${relative(ROOT, file)}:${lineOf(source, match.index!)}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('ningún tile de OSM por http ni por subdominio a/b/c', () => {
    const offenders: string[] = []
    const config = join(ROOT, 'nuxt.config.ts')
    for (const file of [...files, config]) {
      const source = readFileSync(file, 'utf8')
      for (const match of source.matchAll(/http:\/\/[^'"`\s]*tile|\{s\}\.tile\./g))
        offenders.push(`${relative(ROOT, file)}:${lineOf(source, match.index!)}`)
    }
    expect(offenders).toEqual([])
  })
})
