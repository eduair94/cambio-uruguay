import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

// `definePageMeta` es un macro: su objeto se copia a la tabla de rutas, y la tabla de rutas va en
// el chunk de ENTRADA, el que baja y ejecuta cada visita a cualquier página. Un `validate` que usa
// una función importada arrastra ese módulo entero, con sus catálogos, a todas las páginas.
// Medido el 6/11/2026: 445 KB de los 1.861 KB del entry eran eso (tarjetas, mutualistas, Bankos,
// comparativas, equipar…). El arreglo es importar adentro del validador:
//
//   validate: async route => {
//     const catalogue = await import('~/utils/x')
//     return catalogue.isSlug(String(route.params.slug ?? ''))
//   },
const PAGES = resolve(__dirname, '../../pages')

/** Módulos sin dependencias y de pocos bytes, a propósito (ver su encabezado). */
const IMPORT_FREE = new Set(['~/utils/entityPageSlugs'])

function vueFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) vueFiles(path, out)
    else if (name.endsWith('.vue')) out.push(path)
  }
  return out
}

function staticImports(source: string): Map<string, string> {
  const names = new Map<string, string>()
  for (const match of source.matchAll(/^import\s+\{([^}]*)\}\s+from\s+'([^']+)'/gm)) {
    for (const raw of match[1]!.split(',')) {
      // `type X` se borra al compilar: no arrastra nada.
      if (/^\s*type\s/.test(raw)) continue
      const name = raw.split(' as ').pop()!.trim()
      if (name) names.set(name, match[2]!)
    }
  }
  return names
}

describe('validadores de página sin catálogos en el entry', () => {
  it('ningún validate usa una función importada de un módulo con peso', () => {
    const offenders: string[] = []
    for (const file of vueFiles(PAGES)) {
      const source = readFileSync(file, 'utf8')
      const start = source.indexOf('definePageMeta({')
      if (start < 0) continue
      // Sin comentarios: nombrar una función en un comentario no la importa.
      const block = source.slice(start, source.indexOf('\n})', start)).replace(/\/\/.*$/gm, '')
      if (!block.includes('validate')) continue
      for (const [name, from] of staticImports(source)) {
        if (IMPORT_FREE.has(from) || from.startsWith('vue') || from.startsWith('#')) continue
        if (new RegExp(`(?<![\\w.])${name}\\b`).test(block)) {
          offenders.push(`${relative(PAGES, file)}: ${name} (${from})`)
        }
      }
    }
    expect(offenders).toEqual([])
  })
})
