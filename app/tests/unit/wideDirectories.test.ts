// DESIGN.md → "The Directory Frame Rule". Los directorios (filtros + grilla de resultados) cambian
// la columna de 1280 por un marco de 2200 que contiene a la página Y al riel, así el aire sobrante
// queda parejo a los dos lados (medido el 2026-11-22: a 2048 px /autos-usados-uruguay mostraba dos
// tarjetas por fila y 376 px vacíos por lado; el primer arreglo dejó el anuncio a 12 px del borde
// y el contenido a 28). Nada de esto se ve en CI, así que se lee el código fuente.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = join(__dirname, '..', '..')
const read = (path: string): string => readFileSync(join(ROOT, path), 'utf8')

/** Cada página `wide` y dónde vive lo que marca `cu-listing` (la página o un componente suyo). */
const WIDE: Record<string, readonly string[]> = {
  'pages/alquileres-uruguay.vue': ['pages/alquileres-uruguay.vue'],
  'pages/autos-usados-uruguay/index.vue': ['components/cars/SidebarLayout.vue'],
  'pages/oportunidades-autos-usados-uruguay.vue': ['components/cars/SidebarLayout.vue'],
  'pages/autos-chocados-y-con-deuda-uruguay.vue': ['components/cars/SidebarLayout.vue'],
  'pages/equipar-casa-uruguay/productos/index.vue': [
    'components/equipar/Directorio.vue',
    'components/equipar/ListaBar.vue',
  ],
  'pages/equipar-casa-uruguay/productos/[categoria].vue': [
    'components/equipar/Directorio.vue',
    'components/equipar/ListaBar.vue',
  ],
  'pages/venta-viviendas-uruguay.vue': ['components/property-sales/Directory.vue'],
  'pages/oportunidades-inmobiliarias-uruguay.vue': [
    'pages/oportunidades-inmobiliarias-uruguay.vue',
  ],
  'pages/celulares-uruguay/index.vue': ['pages/celulares-uruguay/index.vue'],
}

const DECLARES_WIDE = /definePageMeta\(\{[\s\S]*?\bwide:\s*true\b/
const LISTING_CLASS = /class="[^"]*\bcu-listing\b[^"]*"/

const layout = read('layouts/default.vue')
const [, scoped = ''] = layout.match(/<style scoped>([\s\S]*?)<\/style>/) ?? []
const [, unscoped = ''] = layout.match(/<style>([\s\S]*?)<\/style>/) ?? []

/** The declarations of the first rule whose selector is exactly `selector`. */
function rule(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return (
    css.match(
      new RegExp(`(?:^|[}{])\\s*(?:\\/\\*[\\s\\S]*?\\*\\/\\s*)*${escaped}\\s*\\{([^}]*)\\}`)
    )?.[1] ?? ''
  )
}

function px(declarations: string, property: string): number | undefined {
  const value = declarations.match(new RegExp(`(?:^|;|\\s)${property}\\s*:\\s*([^;]+)`))?.[1]
  const number = value?.match(/(\d+)px/)?.[1]
  return number === undefined ? undefined : Number(number)
}

function vuePages(dir = 'pages'): string[] {
  return (readdirSync(join(ROOT, dir), { recursive: true }) as string[])
    .filter(file => file.endsWith('.vue'))
    .map(file => `${dir}/${file.replaceAll('\\', '/')}`)
}

describe('directorios con marco ancho', () => {
  it('sólo las páginas de la lista declaran `wide` (un directorio nuevo se suma acá)', () => {
    const declared = vuePages().filter(page => DECLARES_WIDE.test(read(page)))
    expect(declared.sort()).toEqual(Object.keys(WIDE).sort())
  })

  it.each(Object.entries(WIDE))('%s marca qué usa el ancho', (_page, files) => {
    expect(files.some(file => LISTING_CLASS.test(read(file)))).toBe(true)
  })

  it('la ficha de una venta es lectura: apaga el marco que hereda del directorio padre', () => {
    expect(read('pages/venta-viviendas-uruguay/[key].vue')).toMatch(
      /definePageMeta\(\{\s*wide:\s*false\s*\}\)/
    )
  })

  it('el layout enciende el marco con la meta de la ruta, en servidor y cliente', () => {
    expect(layout).toMatch(/'container_custom--wide':\s*wideOn/)
    expect(layout).toMatch(/const wideOn = computed\(\(\) => route\.meta\.wide === true\)/)
  })

  it('el marco contiene página y riel, centrado, con el riel a la distancia del texto', () => {
    const frame = rule(scoped, '.container_custom--wide')
    expect(px(frame, 'max-width')).toBe(2200)
    expect(rule(scoped, '.container_custom')).toMatch(/margin:\s*0 auto/)
    // El margen crece con la pantalla: + los 16 del <VContainer> da clamp(28px, 5vw, 80px), con
    // los 28 del teléfono de todo el sitio como piso (DESIGN.md → "The Page Brings Its Container").
    expect(frame).toMatch(/--frame-gutter:\s*clamp\(12px,\s*5vw - 16px,\s*64px\)/)
    expect(frame).toMatch(/padding-inline:\s*var\(--frame-gutter\)/)
    // Junto a la grilla del riel: sin scope y sólo desde 1280 (adRail.test.ts exige las dos cosas).
    // Del lado del riel no hay <VContainer>, así que el marco le suma esos 16.
    const media = unscoped.slice(unscoped.indexOf('@media (min-width: 1280px)'))
    const railGap = rule(media, '.container_custom.container_custom--wide.container_custom--rail')
    expect(railGap).toMatch(/padding-inline-end:\s*calc\(var\(--frame-gutter\) \+ 16px\)/)
  })

  it('un solo borde izquierdo: la lectura va a 1224 sin centrar, y el pie del layout también', () => {
    const tail = rule(scoped, '.layout-tail')
    const tailInner = px(tail, 'max-width')! - 2 * px(tail, 'padding-inline')!
    const reading = rule(
      unscoped,
      '.container_custom.container_custom--wide > .v-container > :not(.cu-listing)'
    )
    expect(px(reading, 'max-width')).toBe(tailInner)
    expect(reading).not.toMatch(/margin/)
    expect(rule(scoped, '.container_custom--wide .layout-tail')).toMatch(/margin-inline:\s*0\b/)
    expect(rule(unscoped, '.container_custom.container_custom--wide > .v-container')).toMatch(
      /max-width:\s*none/
    )
  })
})
