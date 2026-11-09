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
//    bloque que depende del reloj (`new Date()`) tiene una hora en el servidor y otra en el
//    navegador: unhead no encuentra la copia del servidor y agrega otra. Resultado: dos WebPage y
//    dos FAQPage para la misma URL en /cotizacion/*, /frontera/* e /indicadores/*. En la portada,
//    que el borde guarda una hora, pasaba cada noche al cruzar la medianoche UTC.
//
// LA REGLA: (1) app.vue declara `ogSiteName`, en el nivel superior y en los dos lados, con el mismo
// valor que nuxt.config. (2) Ninguna llamada a `useHead` que registra `application/ld+json`
// depende del reloj, ni directamente ni a través de un nombre (`const hoy = new Date()` y después
// `dateModified: hoy`): el instante se toma una vez con `useState` (viaja en el payload) y el
// script lleva `key`, que unhead empareja aunque el contenido cambie. (3) El FAQPage de
// FaqSection/FaqBlock (useFaqSchema) lleva `key` por sus preguntas.
//
// LO QUE ESTE TEST NO VE: los nombres se siguen dentro de un mismo archivo. Lo que llega por props
// (las respuestas de una FAQ), por parámetros de un composable o por un helper que lee el reloj
// adentro no se rastrea. Para el camino más común, el FAQPage de ~100 páginas, alcanza con la regla
// (3): la pregunta no depende del día aunque la respuesta sí (/letras-de-regulacion-monetaria-uruguay
// nombra la próxima licitación), y con `key` unhead empareja el script del servidor.

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { callsTo, clockNames, hasString, parseScript, readsClock, walk } from './helpers/headScan'

const APP = join(__dirname, '..', '..')
const SCANNED = ['pages', 'components', 'layouts', 'composables', 'utils']

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return sourceFiles(full)
    return /\.(?:vue|ts)$/.test(name) ? [full] : []
  })
}

/** Each `useHead(...)` of a file that registers JSON-LD, and whether it depends on the clock. */
function jsonLdCalls(file: string, text?: string) {
  const source = parseScript(file, text)
  const clock = clockNames(source)
  return callsTo(source, 'useHead')
    .filter(call => hasString(call, 'application/ld+json'))
    .map(call => ({
      file: relative(APP, file).split(sep).join('/'),
      call,
      source,
      readsClock: readsClock(call, clock),
    }))
}

/** The string values of a property, wherever it appears in an object literal of `node`. */
function propertyStrings(node: ts.Node, name: string): string[] {
  const values: string[] = []
  walk(node, child => {
    if (
      ts.isPropertyAssignment(child) &&
      (ts.isIdentifier(child.name) || ts.isStringLiteral(child.name)) &&
      child.name.text === name &&
      ts.isStringLiteral(child.initializer)
    ) {
      values.push(child.initializer.text)
    }
  })
  return values
}

const all = SCANNED.flatMap(dir => sourceFiles(join(APP, dir))).flatMap(file => jsonLdCalls(file))

describe('el head no cambia al hidratar', () => {
  it('app.vue declara og:site_name en los dos lados, con el valor de nuxt.config', () => {
    const config = readFileSync(join(APP, 'nuxt.config.ts'), 'utf8')
    const configured = /property: 'og:site_name', content: '([^']+)'/.exec(config)?.[1]
    expect(configured).toBe('Cambio Uruguay')

    const app = parseScript(join(APP, 'app.vue'))
    const declaring = callsTo(app, 'useSeoMeta').filter(
      call => propertyStrings(call, 'ogSiteName').length > 0
    )
    expect(declaring).toHaveLength(1)
    expect(propertyStrings(declaring[0]!, 'ogSiteName')).toEqual([configured])
    // A statement of its own at the top of <script setup>: not inside an `if`, a hook or a
    // callback, which could leave it on one side only.
    expect(ts.isExpressionStatement(declaring[0]!.parent)).toBe(true)
    expect(ts.isSourceFile(declaring[0]!.parent.parent)).toBe(true)
    // And not the server-only flavours, which are the ones that left the browser without it.
    expect(callsTo(app, 'useServerSeoMeta')).toEqual([])
    expect(callsTo(app, 'useServerHead')).toEqual([])
  })

  it('ningún JSON-LD registrado con useHead depende del reloj', () => {
    const offenders = all.filter(entry => entry.readsClock).map(entry => entry.file)
    expect(offenders, offenders.join('\n')).toEqual([])
  })

  // El guardarraíl del guardarraíl: si el lector dejara de encontrar las llamadas, o de ver el
  // reloj en una, el test de arriba quedaría verde sin mirar nada.
  it('encuentra los JSON-LD y reconoce el reloj, directo o a través de nombres', () => {
    expect(all.length).toBeGreaterThan(200)
    const verdict = (code: string) => jsonLdCalls('x.ts', code).map(entry => entry.readsClock)
    const ld = (inner: string) =>
      `useHead({ script: [{ type: 'application/ld+json', innerHTML: ${inner} }] })`
    expect(verdict(ld('JSON.stringify({ dateModified: new Date().toISOString() })'))).toEqual([
      true,
    ])
    expect(
      verdict(`const hoy = new Date().toISOString().split('T')[0]
        const schema = computed(() => ({ name: 'x', dateModified: hoy }))
        ${ld('computed(() => JSON.stringify(schema.value))')}`)
    ).toEqual([true])
    expect(
      verdict(`const hoy = useState('d', () => new Date().toISOString()).value
        // new Date() in a comment, and in a string: 'new Date()'
        ${ld("JSON.stringify({ dateModified: hoy, note: 'new Date()' })")}`)
    ).toEqual([false])
    expect(verdict(ld('JSON.stringify({ datePublished: new Date(post.createdAt) })'))).toEqual([
      false,
    ])
    expect(verdict('// useHead({ new Date() })')).toEqual([])
  })

  it('los bloques que llevan la hora del render la toman de useState y llevan key', () => {
    for (const page of [
      'pages/index.vue',
      'pages/cotizacion/[moneda].vue',
      'pages/cotizacion/index.vue',
      'pages/frontera/[ruta].vue',
      'pages/indicadores/index.vue',
      'pages/indicadores/[indicador].vue',
      'pages/por-que-sube-el-dolar.vue',
    ]) {
      const source = parseScript(join(APP, page))
      const renderInstant = callsTo(source, 'useState').filter(call =>
        call.arguments.some(argument => readsClock(argument))
      )
      expect(renderInstant.length, page).toBe(1)
      const keys = jsonLdCalls(join(APP, page)).flatMap(entry => propertyStrings(entry.call, 'key'))
      expect(keys.length, page).toBeGreaterThan(0)
      for (const key of keys) expect(key, page).toMatch(/-jsonld$/)
    }
  })

  it('el FAQPage de los componentes lleva key por sus preguntas, no por sus respuestas', () => {
    const source = parseScript(join(APP, 'composables/useFaqSchema.ts'))
    const [call] = callsTo(source, 'useHead')
    expect(call).toBeDefined()
    const keys: ts.Expression[] = []
    walk(call!, node => {
      if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) && node.name.text === 'key') {
        keys.push(node.initializer)
      }
    })
    expect(keys).toHaveLength(1)
    // The name the key holds is built from the questions only.
    const name = keys[0]!.getText(source)
    let built = ''
    walk(source, node => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name) {
        built = node.initializer?.getText(source) ?? ''
      }
    })
    expect(built).toMatch(/\.question\b/)
    expect(built).not.toMatch(/\.answer\b/)
  })

  // The FAQ names the next LRM auction from TODAY. While hydrating the server's HTML it must be
  // the server's day (the payload's); on any later visit in the same tab, today: a plain useState
  // would freeze it for the whole session and show a past auction as the next one.
  it('la próxima licitación de LRM: al hidratar, el día del servidor; después, el de hoy', () => {
    const source = parseScript(join(APP, 'pages/letras-de-regulacion-monetaria-uruguay.vue'))
    const initializers = new Map<string, ts.Expression>()
    walk(source, node => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
        initializers.set(node.name.text, node.initializer)
      }
    })
    const today = initializers.get('TODAY')
    expect(today !== undefined && ts.isConditionalExpression(today)).toBe(true)
    const choice = today as ts.ConditionalExpression
    expect(choice.condition.getText(source)).toContain('isHydrating')
    // Hydrating: the payload's day. Otherwise: the clock, read again.
    const hydrating = choice.whenFalse.getText(source)
    expect(hydrating).toMatch(/^\w+\.value$/)
    const state = initializers.get(hydrating.replace(/\.value$/, ''))
    expect(
      state !== undefined && ts.isCallExpression(state) && state.expression.getText(source)
    ).toBe('useState')
    expect(readsClock(choice.whenTrue, clockNames(source))).toBe(true)
  })
})
