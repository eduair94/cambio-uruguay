// El head que manda el servidor es el mismo que queda después de hidratar.
//
// POR QUÉ ESTE TEST. Las vistas previas al compartir (WhatsApp, Discord, X, Facebook) leen el HTML
// del servidor y no ejecutan JavaScript; Google renderiza la página y lee el head ya hidratado. Si
// el navegador reescribe el head, cada uno ve una página distinta. Medido en producción el
// 2026-11-09, HTML crudo contra head hidratado en una URL por plantilla (~500), dos formas:
//
// 1. `og:site_name`. nuxt.config lo declara en `app.head`, que existe sólo en el render del
//    servidor. nuxt-seo-utils agrega en los dos lados su propio valor por defecto (`site.name`,
//    prioridad baja), así que después de hidratar era la única entrada viva y reescribía la
//    etiqueta con "Cambio Uruguay - Cotización del Dólar en Uruguay Hoy" en TODAS las páginas.
//
// 2. JSON-LD duplicado. unhead identifica un `<script>` sin `key` ni `id` por su CONTENIDO. Un
//    bloque que lee el reloj (`new Date()`) tiene una hora en el servidor y otra en el navegador:
//    unhead no encuentra la copia del servidor y agrega otra. Resultado: dos WebPage y dos FAQPage
//    para la misma URL en /cotizacion/*, /frontera/* e /indicadores/*.
//
// LA REGLA: (1) app.vue declara `ogSiteName` con el mismo valor que nuxt.config. (2) Ninguna
// llamada a `useHead` que registra `application/ld+json` lee el reloj: el instante se toma una vez
// con `useState` (viaja en el payload) y el script lleva `key`, que unhead empareja aunque el
// contenido cambie.

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

const APP = join(__dirname, '..', '..')
const SCANNED = ['pages', 'components', 'layouts', 'composables', 'utils']

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return sourceFiles(full)
    return /\.(?:vue|ts)$/.test(name) ? [full] : []
  })
}

/**
 * The index of the `)` that closes the `(` at `open`, skipping strings, template literals and
 * comments, so a `)` inside a string or a comment does not end the call early.
 */
function closingParen(source: string, open: number): number {
  let depth = 0
  for (let i = open; i < source.length; i++) {
    const c = source[i]
    const next = source[i + 1]
    if (c === '/' && next === '/') {
      i = source.indexOf('\n', i)
      if (i === -1) return source.length
      continue
    }
    if (c === '/' && next === '*') {
      i = source.indexOf('*/', i + 2) + 1
      if (i === 0) return source.length
      continue
    }
    if (c === "'" || c === '"' || c === '`') {
      for (i++; i < source.length && source[i] !== c; i++) if (source[i] === '\\') i++
      continue
    }
    if (c === '(') depth++
    else if (c === ')' && --depth === 0) return i
  }
  return source.length
}

/** Every `useHead(...)` call in a source, whole. */
function useHeadCalls(source: string): string[] {
  const calls: string[] = []
  for (const match of source.matchAll(/\buseHead\s*\(/g)) {
    const open = match.index! + match[0].length - 1
    calls.push(source.slice(match.index!, closingParen(source, open) + 1))
  }
  return calls
}

const READS_THE_CLOCK = /\bnew Date\(\s*\)|\bDate\.now\(\s*\)/

const jsonLdCalls = SCANNED.flatMap(dir => sourceFiles(join(APP, dir))).flatMap(file =>
  useHeadCalls(readFileSync(file, 'utf8'))
    .filter(call => call.includes('application/ld+json'))
    .map(call => ({ file: relative(APP, file).split(sep).join('/'), call }))
)

describe('el head no cambia al hidratar', () => {
  it('app.vue declara og:site_name con el mismo valor que nuxt.config', () => {
    const config = readFileSync(join(APP, 'nuxt.config.ts'), 'utf8')
    const app = readFileSync(join(APP, 'app.vue'), 'utf8')
    const configured = /property: 'og:site_name', content: '([^']+)'/.exec(config)?.[1]
    const declared = /useSeoMeta\(\{[\s\S]*?ogSiteName: '([^']+)'/.exec(app)?.[1]
    expect(configured).toBe('Cambio Uruguay')
    expect(declared).toBe(configured)
  })

  it('ningún JSON-LD registrado con useHead lee el reloj', () => {
    const offenders = jsonLdCalls
      .filter(({ call }) => READS_THE_CLOCK.test(call))
      .map(({ file }) => file)
    expect(offenders, offenders.join('\n')).toEqual([])
  })

  // El guardarraíl del guardarraíl: si el lector dejara de encontrar las llamadas, o de ver el
  // reloj dentro de una, el test de arriba quedaría verde sin mirar nada.
  it('encuentra los JSON-LD y reconoce una llamada que lee el reloj', () => {
    expect(jsonLdCalls.length).toBeGreaterThan(200)
    const bad = `useHead({ script: [{ type: 'application/ld+json', innerHTML: JSON.stringify({
      // a ) in a comment
      name: 'a ) in a string', dateModified: new Date().toISOString() }) }] })`
    const [call] = useHeadCalls(`const x = 1\n${bad}\nconst y = 2`)
    expect(call).toBe(bad)
    expect(READS_THE_CLOCK.test(call!)).toBe(true)
    expect(READS_THE_CLOCK.test('new Date(post.createdAt)')).toBe(false)
  })

  it('los bloques que llevan la hora del render la toman de useState y llevan key', () => {
    for (const page of [
      'pages/cotizacion/[moneda].vue',
      'pages/cotizacion/index.vue',
      'pages/frontera/[ruta].vue',
      'pages/indicadores/index.vue',
      'pages/indicadores/[indicador].vue',
    ]) {
      const source = readFileSync(join(APP, page), 'utf8')
      expect(source, page).toMatch(
        /const renderedAt = useState\('[\w-]+', \(\) => new Date\(\)\.toISOString\(\)\)/
      )
      const [call] = useHeadCalls(source).filter(c => c.includes('application/ld+json'))
      expect(call, page).toMatch(/key: '[\w-]+-jsonld'/)
      expect(call, page).toContain('dateModified: renderedAt.value')
    }
  })
})
