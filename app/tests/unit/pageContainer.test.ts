// Toda página de la app se envuelve en un <VContainer>: es lo que le da el margen lateral.
//
// Por qué existe este archivo: el 2026-09-12 se midió el sitio en vivo, plantilla por plantilla,
// y 60 de 214 tenían el contenido a 12 px del borde del viewport en el celular (y a 12 px del borde
// del cap de 1280 en escritorio) mientras las otras 150 lo tenían a 28. No lo rompió nadie: el
// layout aporta 12 px (`.container_custom`) y el resto lo pone el <VContainer> de cada página. Las
// que arrancaban con un <div> pelado o con un <v-row> directo nunca lo tuvieron, y en Vuetify 4 el
// grid ya no compensa con márgenes negativos, así que no había nada que lo disimulara. Se notó en
// /comparar, donde la tarjeta del hero ocupa todo el ancho y el borde canta.
//
// La comprobación es grep sobre el fuente, igual que h1Contract.test.ts: lo que hay que garantizar
// es que la plantilla declare el contenedor, no reproducir un render.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

const APP_DIR = join(__dirname, '..', '..')
const PAGES_DIR = join(APP_DIR, 'pages')

/** Rutas que a propósito no llevan contenedor, con el motivo al lado. */
const FULL_BLEED: Record<string, string> = {
  'index.vue': 'la home es full-bleed por clase de ruta (.index_main quita el padding del layout)',
  'avanzado.vue': 'ruta full-bleed (.avanzado_main); trae su propio px-3',
  'widget.vue': 'layout `widget`: sin cabecera ni contenedor, se embebe en otros sitios',
  'pizarra.vue': 'layout `widget`: pantalla completa, sin chrome',
}

/** Componentes que hacen de raíz de una página y tienen que cumplir el mismo contrato. */
const SHARED_ROOTS: Record<string, string> = {
  ToolShell: 'components/ToolShell.vue',
  CasasComparativa: 'components/CasasComparativa.vue',
  PropertySalesDirectory: 'components/property-sales/Directory.vue',
}

const CONTAINER_TAGS = new Set(['VContainer', 'v-container'])

/** Todos los `.vue` bajo `pages/`, como ruta posix relativa a `pages/`. */
function pageFiles(dir: string = PAGES_DIR): string[] {
  return readdirSync(dir).flatMap(name => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return pageFiles(full)
    if (!name.endsWith('.vue')) return []
    return [relative(PAGES_DIR, full).split(sep).join('/')]
  })
}

/** Los dos primeros tags del bloque <template> de nivel superior, sin comentarios. */
function firstTags(source: string): string[] {
  const start = source.indexOf('<template>')
  const end = source.indexOf('\n</template>', start)
  if (start < 0 || end < 0) return []
  const body = source.slice(start + '<template>'.length, end).replace(/<!--[\s\S]*?-->/g, '')
  return [...body.matchAll(/<([a-z][\w-]*)/gi)].map(m => m[1] as string).slice(0, 2)
}

/** Raíz = contenedor, o envoltorio <div>/<main> cuyo primer hijo es el contenedor. */
function hasContainerRoot(tags: string[]): boolean {
  const [root, child] = tags
  if (!root) return false
  if (CONTAINER_TAGS.has(root)) return true
  return (root === 'div' || root === 'main') && !!child && CONTAINER_TAGS.has(child)
}

describe('cada página arranca con un VContainer', () => {
  const files = pageFiles().filter(f => !(f in FULL_BLEED))

  it.each(files)('%s', file => {
    const tags = firstTags(readFileSync(join(PAGES_DIR, file), 'utf8'))
    const [root] = tags
    // Una página que delega su raíz en un componente compartido o en una ruta hija
    // se mide en el componente (abajo) o en la página hija (esta misma lista).
    if (root && (root in SHARED_ROOTS || root === 'NuxtPage')) return
    expect(hasContainerRoot(tags), `${file}: la raíz es <${tags.join('> <')}>`).toBe(true)
  })

  it.each(Object.entries(SHARED_ROOTS))('%s (%s) también', (_name, rel) => {
    const tags = firstTags(readFileSync(join(APP_DIR, rel), 'utf8'))
    expect(hasContainerRoot(tags), `${rel}: la raíz es <${tags.join('> <')}>`).toBe(true)
  })

  it('la lista de excepciones no esconde páginas que ya no existen', () => {
    const all = pageFiles()
    for (const file of Object.keys(FULL_BLEED)) expect(all).toContain(file)
  })
})
