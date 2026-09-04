// Un componente que no resuelve NO falla: queda en el DOM como elemento desconocido, en silencio.
//
// Medido en producción el 2026-09-04, en la misma tarde: la vista de mapa de /alquileres-uruguay
// dibujaba CERO contenedores Leaflet (`<locationsmap>` crudo en el DOM), su paginación no existía
// (`<vpagination>` crudo), las cuatro pestañas de /api-cotizacion-intradia mostraban los cuatro
// paneles a la vez porque `VWindow` no estaba registrado, y la línea de tiempo de
// /que-pasa-si-no-pago-antel eran siete elementos desconocidos con el texto suelto.
//
// Ninguna de las cuatro rompía el build, ninguna tiraba un error en el navegador y la suite entera
// pasaba en verde: los tests de esas páginas miran el TEXTO del archivo, no el render. El único
// rastro era un "[Vue warn] Failed to resolve component" en el log de SSR del VPS, mezclado con
// 20.000 líneas de volcados de vnodes.
//
// Este archivo cierra la clase entera de bug con las dos reglas que la producen.
import { readFileSync } from 'node:fs'
import { join, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import fg from 'fast-glob'

const APP = join(__dirname, '..', '..')

const read = (p: string) => readFileSync(join(APP, p), 'utf8')

/** Los nombres que el plugin de Vuetify registra a mano. Vuetify NO se auto-importa acá. */
function registeredVuetify(): Set<string> {
  const plugin = read('plugins/vuetify.ts')
  const block = plugin.match(/components:\s*\{(.*?)\n {4}\}/s)
  expect(block, 'no encontré el bloque components: {...} en plugins/vuetify.ts').toBeTruthy()
  return new Set(block![1].match(/\bV[A-Za-z0-9]+\b/g) || [])
}

/**
 * Los bloques <script> del SFC, sin comentarios. Es lo que decide si un componente está importado.
 *
 * Se aíslan por los tags <script>, NO cortando en el primer `</template>`: una plantilla que use
 * slots (`<template #default>`) tiene varios cierres, y cortar en el primero deja media plantilla
 * adentro del supuesto "script". Con ese bug el test daba verde con el fallo puesto, porque el
 * propio `<LocationsMap>` de la plantilla contaba como si fuera su import.
 *
 * Los comentarios se sacan por el mismo motivo: el comentario que explica por qué hay que importar
 * `LocationsMap` menciona `LocationsMap`, y eso alcanzaba para darlo por importado.
 */
const scriptOf = (src: string) =>
  (src.match(/<script[\s\S]*?<\/script>/g) || [])
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')

/** Todo lo que NO es <script> ni <style>: la plantilla, con sus slots. */
const templateOf = (src: string) =>
  src.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ')

const pascal = (tag: string) =>
  tag
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')

const vueFiles = () =>
  fg.sync(['pages/**/*.vue', 'components/**/*.vue', 'layouts/**/*.vue'], { cwd: APP })

describe('todo componente usado tiene que resolver', () => {
  // REGLA 1 — Vuetify se registra a mano, así que usar uno que no está en la lista lo deja crudo.
  it('ningún componente de Vuetify se usa sin estar registrado en el plugin', () => {
    const registered = registeredVuetify()
    const missing: string[] = []

    for (const file of vueFiles()) {
      const src = read(file)
      const tpl = templateOf(src)
      if (!tpl) continue
      const script = scriptOf(src)

      const used = new Set<string>([
        ...(tpl.match(/<V[A-Z][A-Za-z0-9]*/g) || []).map(t => t.slice(1)),
        ...(tpl.match(/<v-[a-z0-9-]+/g) || []).map(t => pascal(t.slice(1))),
      ])

      for (const name of used) {
        if (registered.has(name)) continue
        // Un componente propio puede llamarse VAlgo y estar importado o definido en el archivo.
        if (new RegExp(`\\b${name}\\b`).test(script)) continue
        missing.push(`${file.split('/').join(sep)}: <${name}>`)
      }
    }

    expect(
      missing,
      `Vuetify no auto-importa: agregalos a plugins/vuetify.ts\n${missing.join('\n')}`
    ).toEqual([])
  })

  // REGLA 2 — `components/` es un namespace CON PREFIJO DE RUTA.
  //
  // No hay `components:` en nuxt.config, así que rige el default de Nuxt: `pathPrefix: true`. El
  // nombre auto-importado es el directorio + el archivo, PERO Nuxt colapsa el prefijo cuando el
  // archivo ya empieza con él. Por eso `Faq/FaqSection.vue` sí se llama `FaqSection` (verificado en
  // producción: cero elementos `<faqsection>` crudos) y `map/LocationsMap.vue` se llama
  // `MapLocationsMap`, no `LocationsMap`.
  //
  // O sea que la trampa es angosta y silenciosa: sólo cae el componente cuyo directorio NO es
  // prefijo de su nombre, y sólo se nota mirando el DOM.
  it('un componente cuyo nombre auto-importado no es el corto se importa a mano', () => {
    const trampa = new Map<string, string>()
    for (const file of fg.sync('components/*/**/*.vue', { cwd: APP })) {
      const partes = file
        .replace(/^components\//, '')
        .replace(/\.vue$/, '')
        .split('/')
      const base = partes.pop()!.replace(/\.(client|server)$/, '')
      const prefijo = partes.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join('')
      const auto = base.toLowerCase().startsWith(prefijo.toLowerCase()) ? base : prefijo + base
      if (auto !== base) trampa.set(base, file)
    }

    const offenders: string[] = []
    for (const file of vueFiles()) {
      const src = read(file)
      const tpl = templateOf(src)
      if (!tpl) continue
      const script = scriptOf(src)
      for (const [name, origin] of trampa) {
        if (!new RegExp(`<${name}[\\s/>]`).test(tpl)) continue
        if (new RegExp(`\\b${name}\\b`).test(script)) continue
        if (file === origin) continue
        offenders.push(
          `${file.split('/').join(sep)}: <${name}> se auto-importa como otra cosa (vive en ${origin})`
        )
      }
    }

    expect(
      offenders,
      `importalos explícitamente o usá su nombre auto-importado\n${offenders.join('\n')}`
    ).toEqual([])
  })
})
