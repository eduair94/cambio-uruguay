// Tres cosas que sólo se ven midiendo la página publicada en un teléfono (16/11/2026, 390x844), y
// que ni el local ni la CI reproducen porque ahí no hay anuncios ni lector:
//
//  1. Auto Ads metía un bloque de enlaces DENTRO de la respuesta de /indicadores/unidad-reajustable,
//     entre «1 UR equivale a» y el número, que quedaba en y=799 de 844. Rebote ahí: 64 % en el
//     teléfono, 25 % en escritorio.
//  2. El pie medía 7.290 px de los 12.153 de esa página: el 60 % del alto era directorio.
//  3. Quien lee español y cae en /en/ (359 sesiones uruguayas en 28 días, varias desde asistentes
//     de IA) no tenía cómo saber que la página existe en su idioma.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LANGUAGE_HINT_DISMISS_KEY, shouldSuggestSpanish } from '../../utils/languageHint'

const APP = join(__dirname, '..', '..')
const read = (path: string): string => readFileSync(join(APP, path), 'utf8')

describe('una unidad de Auto Ads no parte la respuesta', () => {
  const css = read('assets/css/critical.css')

  it('dentro de `.cu-keep-together` la unidad va al final, entera y visible', () => {
    const rule = css.match(
      /\.cu-keep-together > \.google-auto-placed,\s*\.cu-keep-together > \.ap_container \{\s*order: (\d+);\s*\}/
    )
    expect(
      rule,
      'critical.css perdió la regla que saca la unidad de adentro de la respuesta'
    ).not.toBeNull()
    expect(Number(rule![1])).toBeGreaterThan(13)
    // Reordenar, nunca ocultar: esconder un anuncio de Google es lo que la política prohíbe.
    const block = css.slice(css.indexOf('.cu-keep-together {'), css.indexOf('/* Segunda capa'))
    expect(block).not.toMatch(/display:\s*none|visibility:\s*hidden/)
  })

  it('`order` existe porque el contenedor es flex: columna por defecto, fila con el modificador', () => {
    expect(css).toMatch(/\.cu-keep-together \{\s*display: flex;\s*flex-direction: column;\s*\}/)
    expect(css).toMatch(/\.cu-keep-together--row \{\s*flex-direction: row;\s*\}/)
  })

  it('el valor del indicador y su fila lo llevan', () => {
    const page = read('pages/indicadores/[indicador].vue')
    expect(page).toContain('<div class="cu-keep-together" data-testid="indicador-value">')
    expect(page).toContain(
      'class="cu-keep-together cu-keep-together--row align-center flex-wrap ga-6"'
    )
  })

  it('el valor de la UI de hoy y el resultado del conversor también', () => {
    const page = read('pages/herramientas/conversor-unidad-indexada.vue')
    expect(page).toContain('class="ui-today cu-keep-together mb-5"')
    expect(page).toContain('class="result-box cu-keep-together"')
  })
})

describe('el directorio del pie se pliega en el teléfono', () => {
  const footer = read('components/Footer.vue')

  it('bajo 600 px las listas arrancan cerradas por CSS, sin esperar a hidratar', () => {
    const mobile = footer.slice(footer.indexOf('@media (max-width: 599.98px)'))
    expect(mobile).toMatch(/\.cu-footer__list \{\s*display: none;/)
    expect(mobile).toMatch(/\.cu-footer__list--open \{\s*display: flex;/)
  })

  it('el botón y la media query del script usan el mismo corte que la hoja de estilos', () => {
    expect(footer).toContain("const FOOTER_COMPACT_QUERY = '(max-width: 599.98px)'")
    expect(footer).toContain('v-if="compact"')
    expect(footer).toContain(':aria-expanded="isOpen(section.id)"')
    expect(footer).toContain(':aria-controls="`cu-footer-dir-${section.id}`"')
  })

  it('los enlaces siguen todos en el HTML del servidor: se pliegan, no se quitan', () => {
    expect(footer).toContain('<li v-for="entry in section.entries" :key="entry.to">')
    expect(footer).toContain(':href="localePath(entry.to as string)"')
    // Ni v-if ni ClientOnly alrededor de la lista.
    const list = footer.slice(footer.indexOf('<ul'), footer.indexOf('</ul>'))
    expect(list).not.toMatch(/v-if|v-show|ClientOnly/)
  })

  it('sin JavaScript quedan abiertas', () => {
    expect(footer).toContain("innerHTML: '<style>.cu-footer__list{display:flex!important}</style>'")
    expect(footer).toMatch(/noscript: \[/)
  })
})

describe('la misma página, en español', () => {
  const ask = (locale: string, languages: string[], dismissed = false) =>
    shouldSuggestSpanish({ locale, languages, dismissed })

  it('se ofrece a quien tiene el navegador en español y está leyendo otra versión', () => {
    expect(ask('en', ['es-UY', 'es', 'en'])).toBe(true)
    expect(ask('pt', ['es'])).toBe(true)
    expect(ask('fr', ['es-419'])).toBe(true)
  })

  it('nunca en la versión en español', () => {
    expect(ask('es', ['es-UY'])).toBe(false)
  })

  it('no a quien eligió otro idioma primero, aunque tenga el español en la lista', () => {
    expect(ask('en', ['en-US', 'es-UY'])).toBe(false)
    expect(ask('en', ['pt-BR'])).toBe(false)
    expect(ask('en', [])).toBe(false)
    // "est" no es español: se compara el código, no el prefijo de la palabra.
    expect(ask('en', ['est'])).toBe(false)
  })

  it('una vez cerrado o usado, no se vuelve a preguntar', () => {
    expect(ask('en', ['es-UY'], true)).toBe(false)
    expect(LANGUAGE_HINT_DISMISS_KEY).toBe('cu_lang_hint')
  })

  it('es un enlace, no una redirección, y no existe en el HTML del servidor', () => {
    const hint = read('components/LanguageHint.vue')
    expect(hint).toContain(':href="spanishUrl"')
    expect(hint).toContain('onMounted(evaluate)')
    expect(hint).not.toMatch(/navigateTo|location\.(href|replace|assign)/)
    expect(read('layouts/default.vue')).toContain('<LanguageHint />')
    // El idioma lo sigue decidiendo sólo la URL.
    expect(read('nuxt.config.ts')).toContain('detectBrowserLanguage: false')
  })
})
