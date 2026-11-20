import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { guideHubs } from '../../utils/guideHubs'
import { temaVecinosRutas } from '../../utils/temaVecinos'
import { PRODUCTOS_VIDA_PRODUCTS } from '../../utils/productosVidaCatalog'

// La página se lee como texto: lo que se vigila acá es lo que los tests de presupuesto de SEO, de
// canonical y de hidratación leen del archivo, y las trampas que el render no muestra.
const APP = resolve(__dirname, '../..')
const PAGE = readFileSync(
  join(APP, 'pages/productos-que-te-cambian-la-vida-uruguay/index.vue'),
  'utf8'
)
const COMPONENTS_DIR = join(APP, 'components/productosVida')
const COMPONENTS = readdirSync(COMPONENTS_DIR)
  .filter(name => name.endsWith('.vue'))
  .map(name => ({ name, src: readFileSync(join(COMPONENTS_DIR, name), 'utf8') }))
const template = PAGE.split('<script setup')[0] ?? ''
const style = PAGE.slice(PAGE.indexOf('<style'))

describe('/productos-que-te-cambian-la-vida-uruguay', () => {
  it('un solo H1 con el texto exacto, dentro de un VContainer raíz', () => {
    const h1s = [...template.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)]
    expect(h1s).toHaveLength(1)
    expect(h1s[0]![1]!.trim()).toBe('Productos que te cambian la vida, según r/uruguay')
    expect(template).toMatch(/<template>\s*<VContainer class="vida-page py-6 py-md-10">/)
  })

  it('título y descripción literales, sin nada después de la comilla de cierre', () => {
    expect(PAGE).toMatch(/^const TITLE = '[^']+'$/m)
    expect(PAGE).toMatch(/^const DESCRIPTION =\n {2}'[^']+'$/m)
    const title = /^const TITLE = '([^']+)'$/m.exec(PAGE)![1]!
    expect(`${title} | Cambio Uruguay`.length).toBeLessThanOrEqual(60)
    const description = /^const DESCRIPTION =\n {2}'([^']+)'$/m.exec(PAGE)![1]!
    expect(description.length).toBeLessThanOrEqual(155)
  })

  it('el canonical es un literal de la página y apunta a sí misma', () => {
    expect(PAGE).toContain(
      "const canonicalUrl = 'https://cambio-uruguay.com/productos-que-te-cambian-la-vida-uruguay'"
    )
    expect(PAGE).toContain("rel: 'canonical', href: canonicalUrl")
    expect(PAGE).not.toContain('PRODUCTOS_VIDA_CANONICAL')
  })

  it('las migas pasan por el hub de directorios, en la vista y en el JSON-LD', () => {
    expect(PAGE).toContain('directoriosHubListItem(2)')
    expect(template).toContain('DIRECTORIOS_HUB.path')
  })

  it('las claves del payload y del JSON-LD', () => {
    expect(PAGE).toContain("key: 'productos-vida'")
    expect(PAGE).toContain("key: 'productos-vida-ld'")
  })

  it('extiende el WebPage del módulo en vez de escribir otro', () => {
    expect(PAGE).toContain('defineWebPage(')
    expect(PAGE).not.toContain("'@type': 'WebPage'")
    expect(PAGE).toContain('isBasedOn: PRODUCTOS_VIDA_THREAD.url')
  })

  it('enlaza el hilo', () => {
    expect(template).toContain(':href="PRODUCTOS_VIDA_THREAD.url"')
  })

  it('un producto escondido con hidden queda escondido aunque haya un display de autor', () => {
    expect(style).toMatch(/\.vida-item\[hidden\]\s*\{\s*display:\s*none\s*!important;\s*\}/)
  })

  it('ningún filtro usa @click.prevent: el clic modificado tiene que abrir otra pestaña', () => {
    expect(PAGE).not.toContain('@click.prevent')
    for (const component of COMPONENTS)
      expect(component.src, component.name).not.toContain('@click.prevent')
  })

  it('nada del render depende del reloj y nada pide no indexar', () => {
    for (const source of [PAGE, ...COMPONENTS.map(c => c.src)]) {
      expect(source).not.toMatch(/noindex/i)
      expect(source).not.toContain('Date.now(')
      expect(source).not.toContain('new Date(')
    }
  })

  it('la descripción nombra exactamente a los más nombrados: ni uno de menos ni uno de más', () => {
    const description = /^const DESCRIPTION =\n {2}'([^']+)'$/m.exec(PAGE)![1]!
    expect(description).toContain(' encabezan ')
    const named = description.split(' encabezan ')[0]!.split(/, | y /)
    const top = Math.max(...PRODUCTOS_VIDA_PRODUCTS.map(p => p.mentions))
    const topNames = PRODUCTOS_VIDA_PRODUCTS.filter(p => p.mentions === top).map(p =>
      p.name.toLowerCase()
    )
    expect(named.map(name => name.toLowerCase()).sort()).toEqual([...topNames].sort())
  })

  it('ningún texto llama «precio de hoy» a una banda de precios pedidos', () => {
    for (const source of [PAGE, ...COMPONENTS.map(c => c.src)])
      expect(source).not.toMatch(/precio de hoy|cuánto sale hoy/i)
  })

  it('un pedido fallido se lee como «no pudimos leer», no como «todavía no hubo lectura»', () => {
    expect(PAGE).toMatch(/const \{ data, error \} = await useFetch/)
    expect(PAGE).toContain('{ ...PRODUCTOS_VIDA_EMPTY, unavailable: true }')
  })

  it('cada enlace que abre otra pestaña lo dice a los lectores de pantalla', () => {
    for (const source of [PAGE, ...COMPONENTS.map(c => c.src)]) {
      const tpl = source.split('<script')[0] ?? ''
      for (const match of tpl.matchAll(/<a\s[^>]*target="_blank"[^>]*>([\s\S]*?)<\/a\s*>/g))
        expect(match[1], match[0].slice(0, 80)).toMatch(/se abre en otra pestaña/)
    }
  })

  it('«Seguí leyendo» no repite rutas de su propio tema (RelatedPages las descarta)', () => {
    const related = readFileSync(join(APP, 'utils/relatedPages.ts'), 'utf8')
    const entry = /'\/productos-que-te-cambian-la-vida-uruguay': \[([\s\S]*?)\]/.exec(related)
    expect(entry).not.toBeNull()
    const curated = [...entry![1]!.matchAll(/'([^']+)'/g)].map(m => m[1]!)
    expect(curated.length).toBeGreaterThanOrEqual(4)
    const tema = guideHubs.find(hub => hub.slug === 'alquiler-y-vivienda-uruguay')!
    const members = new Set((tema.resources ?? []).map(resource => resource.to))
    expect(members.has('/productos-que-te-cambian-la-vida-uruguay')).toBe(true)
    const shownByTema = new Set(temaVecinosRutas('/productos-que-te-cambian-la-vida-uruguay'))
    for (const route of curated) {
      expect(members.has(route), route).toBe(false)
      expect(shownByTema.has(route), route).toBe(false)
    }
  })
})
