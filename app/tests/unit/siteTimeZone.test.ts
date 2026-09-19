// Una fecha formateada sin `timeZone` usa la zona de quien la corre: el servidor (UTC) y el
// navegador del lector (Uruguay, UTC-3). `new Date('2026-06-20')` es medianoche UTC, así que el
// servidor escribía "20 de junio" y el navegador, al hidratar, lo reescribía "19 de junio": una
// fecha equivocada para todo lector en Uruguay y un mismatch de hidratación. Medido en producción
// el 2026-09-19 en 23 familias de páginas (/terminos, /acerca, /guias…): con el navegador en UTC
// el mismatch desaparecía. No se ve en local, donde servidor y navegador comparten zona.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { SITE_TIME_ZONE, siteTimeZone } from '../../utils/format'

describe('siteTimeZone', () => {
  it('un día de calendario se formatea en UTC, la zona en la que new Date lo leyó', () => {
    expect(siteTimeZone('2026-06-20')).toBe('UTC')
    expect(siteTimeZone('2026-09-01T00:00:00.000Z')).toBe('UTC')
    expect(siteTimeZone(new Date('2026-09-01T00:00:00Z'))).toBe('UTC')
  })

  it('un instante se formatea en hora de Uruguay', () => {
    expect(SITE_TIME_ZONE).toBe('America/Montevideo')
    expect(siteTimeZone('2026-09-19T14:05:00.000Z')).toBe(SITE_TIME_ZONE)
    expect(siteTimeZone(new Date('2026-09-19T14:05:00Z'))).toBe(SITE_TIME_ZONE)
    expect(siteTimeZone(1_789_000_000_000)).toBe(SITE_TIME_ZONE)
  })

  it('el día que dice el dato es el que se lee, en cualquier zona', () => {
    const day = '2026-06-20'
    const label = new Date(day).toLocaleDateString('es-UY', {
      timeZone: siteTimeZone(day),
      day: 'numeric',
      month: 'long',
    })
    expect(label).toBe('20 de junio')
  })

  it('un instante de la madrugada UTC cae en el día de Uruguay', () => {
    const at = '2026-09-20T01:30:00.000Z' // 22:30 del 19 en Montevideo
    const label = new Date(at).toLocaleDateString('es-UY', {
      timeZone: siteTimeZone(at),
      day: 'numeric',
      month: 'long',
    })
    expect(label).toBe('19 de setiembre')
  })
})

// --- Tripwire: toda fecha que se formatea dice en qué zona ---
const APP_ROOT = path.resolve(__dirname, '..', '..')
const DIRS = ['pages', 'components', 'composables', 'layouts', 'plugins', 'utils']
const CALL = /\.(toLocaleDateString|toLocaleTimeString)\(|new Intl\.DateTimeFormat\(/g

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (/\.(?:vue|ts)$/.test(entry.name)) out.push(full)
  }
  return out
}

function callAt(source: string, open: number): string {
  let depth = 0
  for (let i = open; i < source.length; i++) {
    if (source[i] === '(') depth++
    else if (source[i] === ')' && --depth === 0) return source.slice(open, i + 1)
  }
  return source.slice(open)
}

describe('toda fecha formateada fija su zona', () => {
  const files = DIRS.flatMap(dir => walk(path.join(APP_ROOT, dir)))

  it('encuentra archivos (guarda de vacuidad)', () => {
    expect(files.length).toBeGreaterThan(300)
  })

  it('ningún toLocaleDateString / toLocaleTimeString / Intl.DateTimeFormat sin timeZone', () => {
    const hits: string[] = []
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8')
      for (const match of source.matchAll(CALL)) {
        const lineStart = source.lastIndexOf('\n', match.index) + 1
        if (/^\s*(?:\*|\/\/)/.test(source.slice(lineStart, match.index))) continue
        const call = callAt(source, match.index! + match[0].length - 1)
        if (/timeZone/.test(call)) continue
        // Opciones pasadas por nombre: se sigue una constante del mismo archivo.
        const named = call.match(/,\s*([A-Z_$][\w$]*)\s*\)$/i)
        if (named) {
          const def = source.match(
            new RegExp(`(?:const|let)\\s+${named[1]}\\b[^=]*=\\s*\\{[\\s\\S]{0,400}?\\}`)
          )
          if (def && /timeZone/.test(def[0])) continue
        }
        const line = source.slice(0, match.index).split('\n').length
        hits.push(`${path.relative(APP_ROOT, file)}:${line}`)
      }
    }
    expect(
      hits,
      `Fecha formateada sin timeZone: el servidor (UTC) y el lector (UTC-3) escriben días distintos. ` +
        `Agregá \`timeZone: siteTimeZone(<valor>)\` de utils/format.ts:\n${hits.join('\n')}`
    ).toEqual([])
  })
})
